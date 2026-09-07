// js/bonificaciones.js

auth.onAuthStateChanged(function (user) {
  if (!user) window.location.href = 'admin.html';
  else mostrarSeccion('lista');
});

window.mostrarSeccion = function (s) {
  var c = document.getElementById('main-content');
  if (s === 'nueva') formNueva(c);
  else if (s === 'lista') formLista(c);
  else if (s === 'historial') formHistorialUso(c);
};

function formNueva(c) {
  c.innerHTML =
    '<h1 class="text-2xl md:text-3xl font-bold mb-6">Nueva bonificación / promo</h1>' +
    '<div class="max-w-2xl bg-white p-6 rounded-3xl shadow space-y-3">' +
    '<label class="text-sm font-medium">Nombre de la promo</label>' +
    '<input id="b-nombre" class="w-full p-3 border rounded-2xl" placeholder="Ej. 10% en fertilizantes">' +
    '<label class="text-sm font-medium">Tipo</label>' +
    '<select id="b-tipo" class="w-full p-3 border rounded-2xl" onchange="toggleTipoBonif()">' +
    '<option value="porcentaje">% Descuento</option>' +
    '<option value="monto">Monto fijo Q</option>' +
    '<option value="2x1">2x1 / lleva N paga M</option>' +
    '</select>' +
    '<div id="campo-valor"><label class="text-sm">Valor</label>' +
    '<input id="b-valor" type="number" step="0.01" class="w-full p-3 border rounded-2xl" placeholder="10"></div>' +
    '<div id="campo-nxm" class="hidden grid grid-cols-2 gap-2">' +
    '<div><label class="text-sm">Lleva</label><input id="b-lleva" type="number" class="w-full p-3 border rounded-2xl" value="2"></div>' +
    '<div><label class="text-sm">Paga</label><input id="b-paga" type="number" class="w-full p-3 border rounded-2xl" value="1"></div></div>' +
    '<label class="text-sm">Aplica a</label>' +
    '<select id="b-aplica" class="w-full p-3 border rounded-2xl">' +
    '<option value="todos">Todos los productos</option>' +
    '<option value="producto">Un producto</option>' +
    '<option value="monto_min">Monto mínimo de venta</option></select>' +
    '<div id="campo-producto" class="hidden">' +
    '<label class="text-sm">Producto</label><select id="b-producto" class="w-full p-3 border rounded-2xl"></select></div>' +
    '<div id="campo-min" class="hidden">' +
    '<label class="text-sm">Monto mínimo Q</label><input id="b-min" type="number" class="w-full p-3 border rounded-2xl" value="100"></div>' +
    '<label class="text-sm">Código cupón (opcional)</label>' +
    '<input id="b-codigo" class="w-full p-3 border rounded-2xl" placeholder="Ej. AGRO10" style="text-transform:uppercase">' +
    '<div class="grid grid-cols-2 gap-2">' +
    '<div><label class="text-sm">Desde</label><input id="b-desde" type="date" class="w-full p-3 border rounded-2xl"></div>' +
    '<div><label class="text-sm">Hasta</label><input id="b-hasta" type="date" class="w-full p-3 border rounded-2xl"></div></div>' +
    '<label class="text-sm">Límite de usos (0 = ilimitado)</label>' +
    '<input id="b-limite" type="number" class="w-full p-3 border rounded-2xl" value="0">' +
    '<label class="text-sm">Motivo / notas</label>' +
    '<input id="b-motivo" class="w-full p-3 border rounded-2xl" placeholder="Campaña marzo">' +
    '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="b-activa" checked> Activa</label>' +
    '<button onclick="guardarBonificacion()" class="w-full bg-green-700 text-white py-4 rounded-2xl font-bold">Guardar</button></div>';

  document.getElementById('b-desde').valueAsDate = new Date();
  var hasta = new Date(); hasta.setDate(hasta.getDate() + 30);
  document.getElementById('b-hasta').valueAsDate = hasta;
  cargarProductosBonif();
  document.getElementById('b-aplica').onchange = function () {
    document.getElementById('campo-producto').classList.toggle('hidden', this.value !== 'producto');
    document.getElementById('campo-min').classList.toggle('hidden', this.value !== 'monto_min');
  };
}

window.toggleTipoBonif = function () {
  var t = document.getElementById('b-tipo').value;
  document.getElementById('campo-valor').classList.toggle('hidden', t === '2x1');
  document.getElementById('campo-nxm').classList.toggle('hidden', t !== '2x1');
};

async function cargarProductosBonif() {
  var sel = document.getElementById('b-producto');
  if (!sel) return;
  var snap = await db.collection('productos').limit(200).get();
  sel.innerHTML = '<option value="">Seleccionar</option>';
  snap.forEach(function (d) {
    var p = d.data();
    var o = document.createElement('option');
    o.value = d.id;
    o.textContent = p.nombre;
    o.dataset.nombre = p.nombre;
    sel.appendChild(o);
  });
}

window.guardarBonificacion = async function () {
  var nombre = document.getElementById('b-nombre').value.trim();
  if (!nombre) return alert('Nombre obligatorio');
  var tipo = document.getElementById('b-tipo').value;
  var aplica = document.getElementById('b-aplica').value;
  var prodSel = document.getElementById('b-producto');
  var data = {
    nombre: nombre,
    tipo: tipo,
    valor: parseFloat(document.getElementById('b-valor').value) || 0,
    lleva: parseInt(document.getElementById('b-lleva').value) || 2,
    paga: parseInt(document.getElementById('b-paga').value) || 1,
    aplicaA: aplica,
    productoId: aplica === 'producto' ? prodSel.value : null,
    productoNombre: aplica === 'producto' && prodSel.selectedIndex >= 0
      ? (prodSel.options[prodSel.selectedIndex].dataset.nombre || '') : null,
    montoMinimo: aplica === 'monto_min' ? (parseFloat(document.getElementById('b-min').value) || 0) : 0,
    codigo: (document.getElementById('b-codigo').value || '').trim().toUpperCase(),
    desde: document.getElementById('b-desde').value || null,
    hasta: document.getElementById('b-hasta').value || null,
    limiteUsos: parseInt(document.getElementById('b-limite').value) || 0,
    usos: 0,
    motivo: document.getElementById('b-motivo').value.trim(),
    activa: document.getElementById('b-activa').checked,
    fecha: new Date(),
    creadoPor: (auth.currentUser && auth.currentUser.email) || ''
  };
  await db.collection('bonificaciones').add(data);
  alert('✅ Bonificación guardada');
  mostrarSeccion('lista');
};

function formLista(c) {
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-6">' +
    '<h1 class="text-2xl md:text-3xl font-bold">Bonificaciones activas</h1>' +
    '<button onclick="mostrarSeccion(\'nueva\')" class="bg-green-600 text-white px-4 py-2 rounded-xl text-sm">+ Nueva</button></div>' +
    '<div id="lista-bonif" class="space-y-3">Cargando...</div>';

  db.collection('bonificaciones').orderBy('fecha', 'desc').limit(100).onSnapshot(function (snap) {
    var html = '';
    snap.forEach(function (doc) {
      var b = doc.data();
      var vigente = esVigente(b);
      html += '<div class="bg-white rounded-2xl shadow p-4 flex flex-wrap justify-between gap-3">' +
        '<div>' +
        '<div class="font-bold">' + (b.nombre || b.producto || 'Promo') + '</div>' +
        '<div class="text-sm text-green-700">' + descBonif(b) + '</div>' +
        '<div class="text-xs text-gray-500 mt-1">' +
        (b.codigo ? 'Código: <b>' + b.codigo + '</b> · ' : '') +
        (b.desde || '?') + ' → ' + (b.hasta || '?') +
        ' · Usos: ' + (b.usos || 0) + (b.limiteUsos ? '/' + b.limiteUsos : '') +
        '</div></div>' +
        '<div class="text-right space-y-1">' +
        '<div><span class="text-xs px-2 py-0.5 rounded-full ' +
        (b.activa && vigente ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600') + '">' +
        (b.activa && vigente ? 'Vigente' : (b.activa ? 'Fuera de fecha' : 'Inactiva')) + '</span></div>' +
        '<button onclick="toggleBonif(\'' + doc.id + '\',' + (!b.activa) + ')" class="text-xs text-blue-600">' +
        (b.activa ? 'Desactivar' : 'Activar') + '</button></div></div>';
    });
    document.getElementById('lista-bonif').innerHTML = html || '<p class="text-gray-400 text-center py-12">Sin bonificaciones</p>';
  });
}

function descBonif(b) {
  if (b.tipo === '2x1') return 'Lleva ' + (b.lleva || 2) + ' paga ' + (b.paga || 1);
  if (b.tipo === 'monto') return 'Q' + Number(b.valor || 0).toFixed(2) + ' de descuento';
  return (b.valor || b.porcentaje || 0) + '% de descuento' +
    (b.productoNombre ? ' en ' + b.productoNombre : '') +
    (b.producto && !b.productoNombre ? ' en ' + b.producto : '');
}

function esVigente(b) {
  var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  if (b.desde) {
    var d = new Date(b.desde); d.setHours(0, 0, 0, 0);
    if (hoy < d) return false;
  }
  if (b.hasta) {
    var h = new Date(b.hasta); h.setHours(23, 59, 59, 0);
    if (hoy > h) return false;
  }
  if (b.limiteUsos && (b.usos || 0) >= b.limiteUsos) return false;
  return true;
}

window.toggleBonif = async function (id, activa) {
  await db.collection('bonificaciones').doc(id).update({ activa: !!activa });
};

function formHistorialUso(c) {
  c.innerHTML =
    '<h1 class="text-2xl font-bold mb-4">Historial de uso en ventas</h1>' +
    '<p class="text-sm text-gray-500 mb-4">Se registra cuando el POS aplica un código o promo.</p>' +
    '<div id="uso-bonif">Cargando...</div>';
  db.collection('bonificaciones_uso').orderBy('fecha', 'desc').limit(50).onSnapshot(function (snap) {
    var html = '';
    snap.forEach(function (d) {
      var u = d.data();
      html += '<div class="bg-white p-4 rounded-xl shadow mb-2 text-sm">' +
        '<div class="font-medium">' + (u.nombrePromo || u.codigo || 'Promo') + '</div>' +
        '<div class="text-gray-500">Descuento: Q' + Number(u.descuento || 0).toFixed(2) +
        ' · Cajero: ' + (u.cajero || '-') +
        ' · ' + (u.fecha && u.fecha.toDate ? u.fecha.toDate().toLocaleString('es-GT') : '') + '</div></div>';
    });
    document.getElementById('uso-bonif').innerHTML = html || '<p class="text-gray-400 text-center py-10">Aún no hay usos registrados</p>';
  }, function () {
    document.getElementById('uso-bonif').innerHTML =
      '<p class="text-gray-400 text-sm">Colección bonificaciones_uso vacía o sin índice. Se llenará al aplicar promos en caja.</p>';
  });
}
