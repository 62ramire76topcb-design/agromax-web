// js/admin-bonificaciones.js

function fmtQB(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.mostrarBonificaciones = function () {
  var c = document.getElementById('main-content');
  if (!c) return;
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold text-slate-900">Bonificaciones</h1>' +
    '<p class="text-sm text-slate-500">Promociones, descuentos y códigos</p></div>' +
    '<button type="button" onclick="bonifTab(\'nueva\')" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><i class="fas fa-plus mr-1"></i> Nueva promo</button></div>' +
    '<div class="flex flex-wrap gap-1.5 mb-4">' +
    bTab('lista', 'Activas') + bTab('nueva', 'Nueva') + bTab('historial', 'Uso / historial') +
    '</div><div id="bonif-body"></div>';
  bonifTab('lista');
};

function bTab(id, label) {
  return '<button type="button" data-btab="' + id + '" onclick="bonifTab(\'' + id + '\')" class="btab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-white text-slate-600 border-slate-200">' + label + '</button>';
}

window.bonifTab = function (id) {
  document.querySelectorAll('.btab').forEach(function (b) {
    var on = b.getAttribute('data-btab') === id;
    b.className = 'btab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  if (id === 'lista') renderBonifLista();
  else if (id === 'nueva') renderBonifNueva();
  else if (id === 'historial') renderBonifHistorial();
};

function renderBonifLista() {
  var body = document.getElementById('bonif-body');
  body.innerHTML = '<p class="text-slate-400 text-center py-8"><i class="fas fa-spinner fa-spin"></i></p>';
  if (window._unsubBonif) try { window._unsubBonif(); } catch (e) {}
  window._unsubBonif = db.collection('bonificaciones').orderBy('creado', 'desc').limit(80).onSnapshot(function (snap) {
    if (snap.empty) {
      body.innerHTML = '<div class="text-center text-slate-400 py-14"><div class="text-4xl mb-2">🎁</div><p>Sin promociones</p>' +
        '<button type="button" onclick="bonifTab(\'nueva\')" class="mt-3 text-green-700 font-semibold text-sm">Crear la primera</button></div>';
      return;
    }
    var html = '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">';
    snap.forEach(function (d) {
      var b = Object.assign({ id: d.id }, d.data());
      var activa = b.activo !== false;
      var tipo = b.tipo || 'porcentaje';
      var valorTxt = tipo === 'monto' ? fmtQB(b.valor) : (Number(b.valor) || 0) + '%';
      html += '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ' + (activa ? '' : 'opacity-60') + '">' +
        '<div class="flex justify-between gap-2">' +
        '<div class="font-bold text-slate-900">' + (b.nombre || b.codigo || 'Promo') + '</div>' +
        '<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ' + (activa ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500') + '">' +
        (activa ? 'Activa' : 'Inactiva') + '</span></div>' +
        '<div class="text-2xl font-bold text-green-700 mt-2">' + valorTxt + '</div>' +
        '<div class="text-xs text-slate-400 mt-1">Código: <b class="text-slate-700">' + (b.codigo || '—') + '</b></div>' +
        (b.descripcion ? '<p class="text-xs text-slate-500 mt-2 line-clamp-2">' + b.descripcion + '</p>' : '') +
        '<div class="flex gap-2 mt-3">' +
        '<button type="button" onclick="toggleBonif(\'' + b.id + '\',' + (!activa) + ')" class="px-3 py-1.5 rounded-xl border text-xs font-semibold">' +
        (activa ? 'Desactivar' : 'Activar') + '</button>' +
        '<button type="button" onclick="eliminarBonif(\'' + b.id + '\')" class="px-3 py-1.5 rounded-xl text-red-600 text-xs font-semibold">Eliminar</button></div></div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }, function (err) {
    body.innerHTML = '<p class="text-red-600 p-4">' + err.message + '</p>';
  });
}

function renderBonifNueva() {
  var body = document.getElementById('bonif-body');
  body.innerHTML =
    '<div class="max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">' +
    '<h2 class="font-bold text-lg">Nueva bonificación</h2>' +
    '<input id="bon-nombre" placeholder="Nombre de la promo" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="bon-codigo" placeholder="Código (ej. AGRO10)" class="w-full p-3 border border-slate-200 rounded-2xl uppercase">' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<select id="bon-tipo" class="p-3 border border-slate-200 rounded-2xl bg-white"><option value="porcentaje">Porcentaje %</option><option value="monto">Monto fijo Q</option></select>' +
    '<input id="bon-valor" type="number" step="0.01" min="0" placeholder="Valor" class="p-3 border border-slate-200 rounded-2xl"></div>' +
    '<input id="bon-minimo" type="number" step="0.01" min="0" placeholder="Compra mínima (opcional)" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<textarea id="bon-desc" rows="2" placeholder="Descripción" class="w-full p-3 border border-slate-200 rounded-2xl"></textarea>' +
    '<button type="button" onclick="guardarBonif()" class="w-full bg-green-600 text-white py-3.5 rounded-2xl font-bold">Guardar promo</button></div>';
}

window.guardarBonif = async function () {
  var nombre = (document.getElementById('bon-nombre').value || '').trim();
  var codigo = (document.getElementById('bon-codigo').value || '').trim().toUpperCase();
  var valor = parseFloat(document.getElementById('bon-valor').value);
  if (!nombre || !codigo || isNaN(valor)) return alert('Nombre, código y valor son obligatorios');
  try {
    await db.collection('bonificaciones').add({
      nombre: nombre,
      codigo: codigo,
      tipo: document.getElementById('bon-tipo').value,
      valor: valor,
      minimo: parseFloat(document.getElementById('bon-minimo').value) || 0,
      descripcion: (document.getElementById('bon-desc').value || '').trim(),
      activo: true,
      usos: 0,
      creado: new Date()
    });
    if (typeof adminToast === 'function') adminToast('Promo guardada', 'ok');
    else alert('Promo guardada');
    bonifTab('lista');
  } catch (e) { alert(e.message); }
};

window.toggleBonif = async function (id, activar) {
  try {
    await db.collection('bonificaciones').doc(id).update({ activo: !!activar });
  } catch (e) { alert(e.message); }
};

window.eliminarBonif = async function (id) {
  if (!confirm('Eliminar esta promoción?')) return;
  try {
    await db.collection('bonificaciones').doc(id).delete();
  } catch (e) { alert(e.message); }
};

function renderBonifHistorial() {
  var body = document.getElementById('bonif-body');
  body.innerHTML =
    '<div class="bg-white rounded-2xl border border-slate-100 p-5 text-sm text-slate-600">' +
    '<p class="font-semibold text-slate-900 mb-2">Uso de bonificaciones</p>' +
    '<p>Cuando una venta en Caja aplica un código, puedes registrar el uso en la colección <code>bonificaciones_uso</code>.</p>' +
    '<p class="mt-2 text-slate-400">Por ahora se listan las promos y cuántos usos tienen en el campo <b>usos</b>.</p></div>';
  db.collection('bonificaciones').orderBy('usos', 'desc').limit(30).get().then(function (snap) {
    if (snap.empty) return;
    var html = '<div class="mt-4 space-y-2">';
    snap.forEach(function (d) {
      var b = d.data();
      html += '<div class="bg-white rounded-xl border p-3 flex justify-between text-sm">' +
        '<span>' + (b.nombre || b.codigo) + '</span><b>' + (b.usos || 0) + ' usos</b></div>';
    });
    html += '</div>';
    body.innerHTML += html;
  }).catch(function () {});
}

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'bonificaciones') return mostrarBonificaciones();
    if (typeof prev === 'function') return prev(seccion);
  };
})();
