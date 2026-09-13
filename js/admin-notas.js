// js/admin-notas.js
// Bloc de notas y recordatorios

window.mostrarNotas = function () {
  var c = document.getElementById('main-content');
  if (!c) return;
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold text-slate-900">Recordatorios</h1>' +
    '<p class="text-sm text-slate-500">Bloc de notas del equipo AGROMAX</p></div>' +
    '<button type="button" onclick="nuevaNota()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><i class="fas fa-plus mr-1"></i> Nueva nota</button></div>' +

    '<div class="grid lg:grid-cols-5 gap-4">' +
    '<div class="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3" id="nota-form-box">' +
    formNotaHTML(null) +
    '</div>' +
    '<div class="lg:col-span-3">' +
    '<div class="flex flex-wrap gap-2 mb-3">' +
    '<button type="button" onclick="filtroNotas(\'todas\')" class="nf px-3 py-1.5 rounded-full border text-xs font-semibold bg-green-600 text-white border-green-600" data-nf="todas">Todas</button>' +
    '<button type="button" onclick="filtroNotas(\'pendiente\')" class="nf px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-slate-600 border-slate-200" data-nf="pendiente">Pendientes</button>' +
    '<button type="button" onclick="filtroNotas(\'hecho\')" class="nf px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-slate-600 border-slate-200" data-nf="hecho">Hechas</button>' +
    '<button type="button" onclick="filtroNotas(\'urgente\')" class="nf px-3 py-1.5 rounded-full border text-xs font-semibold bg-white text-slate-600 border-slate-200" data-nf="urgente">Urgentes</button>' +
    '</div>' +
    '<div id="lista-notas" class="space-y-2"><p class="text-slate-400 text-center py-8"><i class="fas fa-spinner fa-spin"></i></p></div>' +
    '</div></div>';

  window._filtroNotas = 'todas';
  window._notaEditId = null;
  escucharNotas();
};

function formNotaHTML(n) {
  n = n || {};
  return '<h2 class="font-bold text-lg" id="nota-form-titulo">' + (n.id ? 'Editar nota' : 'Nueva nota') + '</h2>' +
    '<input type="hidden" id="nota-id" value="' + (n.id || '') + '">' +
    '<input id="nota-titulo" value="' + escAttr(n.titulo || '') + '" placeholder="Título" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<textarea id="nota-texto" rows="5" placeholder="Detalle / recordatorio..." class="w-full p-3 border border-slate-200 rounded-2xl text-sm">' +
    (n.texto || '') + '</textarea>' +
    '<div class="grid grid-cols-2 gap-2">' +
    '<div><label class="text-[10px] uppercase text-slate-400">Fecha recordatorio</label>' +
    '<input id="nota-fecha" type="date" value="' + (n.fechaRecordatorio || '') + '" class="w-full p-2.5 border border-slate-200 rounded-xl"></div>' +
    '<div><label class="text-[10px] uppercase text-slate-400">Prioridad</label>' +
    '<select id="nota-prioridad" class="w-full p-2.5 border border-slate-200 rounded-xl bg-white">' +
    '<option value="normal"' + (n.prioridad === 'normal' || !n.prioridad ? ' selected' : '') + '>Normal</option>' +
    '<option value="urgente"' + (n.prioridad === 'urgente' ? ' selected' : '') + '>Urgente</option>' +
    '<option value="baja"' + (n.prioridad === 'baja' ? ' selected' : '') + '>Baja</option></select></div></div>' +
    '<button type="button" onclick="guardarNota()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">' +
    (n.id ? 'Actualizar' : 'Guardar') + '</button>' +
    (n.id ? '<button type="button" onclick="nuevaNota()" class="w-full border py-2.5 rounded-2xl text-sm font-semibold">Cancelar edición</button>' : '');
}

function escAttr(s) {
  return String(s).replace(/&/g, '&').replace(/"/g, '"').replace(/</g, '<');
}

window.nuevaNota = function () {
  window._notaEditId = null;
  var box = document.getElementById('nota-form-box');
  if (box) box.innerHTML = formNotaHTML(null);
};

window.editarNota = function (id) {
  var n = (window._notasCache || []).find(function (x) { return x.id === id; });
  if (!n) return;
  window._notaEditId = id;
  var box = document.getElementById('nota-form-box');
  if (box) box.innerHTML = formNotaHTML(n);
};

window.guardarNota = async function () {
  var titulo = (document.getElementById('nota-titulo').value || '').trim();
  var texto = (document.getElementById('nota-texto').value || '').trim();
  if (!titulo && !texto) return alert('Escribe un título o el texto');
  var data = {
    titulo: titulo || 'Sin título',
    texto: texto,
    fechaRecordatorio: document.getElementById('nota-fecha').value || null,
    prioridad: document.getElementById('nota-prioridad').value,
    estado: 'pendiente',
    actualizado: new Date(),
    autor: (window.usuarioActual && window.usuarioActual.nombre) || (auth.currentUser && auth.currentUser.email) || ''
  };
  try {
    var id = document.getElementById('nota-id').value || window._notaEditId;
    if (id) {
      await db.collection('notas').doc(id).update(data);
    } else {
      data.creado = new Date();
      data.estado = 'pendiente';
      await db.collection('notas').add(data);
    }
    if (typeof adminToast === 'function') adminToast('Nota guardada', 'ok');
    nuevaNota();
  } catch (e) {
    alert(e.message + '\n\nAgrega reglas Firestore para colección notas (auth).');
  }
};

window.filtroNotas = function (f) {
  window._filtroNotas = f;
  document.querySelectorAll('.nf').forEach(function (b) {
    var on = b.getAttribute('data-nf') === f;
    b.className = 'nf px-3 py-1.5 rounded-full border text-xs font-semibold ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  pintarNotas();
};

function escucharNotas() {
  if (window._unsubNotas) try { window._unsubNotas(); } catch (e) {}
  window._unsubNotas = db.collection('notas').orderBy('creado', 'desc').limit(80).onSnapshot(function (snap) {
    window._notasCache = [];
    snap.forEach(function (d) {
      window._notasCache.push(Object.assign({ id: d.id }, d.data()));
    });
    pintarNotas();
  }, function (err) {
    var box = document.getElementById('lista-notas');
    if (box) box.innerHTML = '<p class="text-red-600 text-sm p-4">' + err.message +
      '<br>Reglas: match /notas/{doc} { allow read, write: if request.auth != null; }</p>';
  });
}

function pintarNotas() {
  var box = document.getElementById('lista-notas');
  if (!box) return;
  var f = window._filtroNotas || 'todas';
  var list = (window._notasCache || []).filter(function (n) {
    if (f === 'pendiente') return n.estado !== 'hecho';
    if (f === 'hecho') return n.estado === 'hecho';
    if (f === 'urgente') return n.prioridad === 'urgente' && n.estado !== 'hecho';
    return true;
  });
  if (!list.length) {
    box.innerHTML = '<div class="text-center text-slate-400 py-12"><div class="text-3xl mb-2">📝</div><p>Sin notas</p></div>';
    return;
  }
  var hoy = new Date().toISOString().slice(0, 10);
  box.innerHTML = list.map(function (n) {
    var hecho = n.estado === 'hecho';
    var urg = n.prioridad === 'urgente';
    var vencida = n.fechaRecordatorio && n.fechaRecordatorio < hoy && !hecho;
    return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ' + (hecho ? 'opacity-60' : '') + '">' +
      '<div class="flex gap-3">' +
      '<button type="button" onclick="toggleNotaHecha(\'' + n.id + '\',' + (!hecho) + ')" class="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ' +
      (hecho ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300') + '">' +
      (hecho ? '<i class="fas fa-check text-[10px]"></i>' : '') + '</button>' +
      '<div class="flex-1 min-w-0">' +
      '<div class="flex flex-wrap items-center gap-2">' +
      '<span class="font-semibold text-slate-900 ' + (hecho ? 'line-through' : '') + '">' + (n.titulo || '') + '</span>' +
      (urg ? '<span class="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">Urgente</span>' : '') +
      (vencida ? '<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Vencida</span>' : '') +
      '</div>' +
      (n.texto ? '<p class="text-sm text-slate-600 mt-1 whitespace-pre-wrap">' + n.texto + '</p>' : '') +
      '<div class="text-[10px] text-slate-400 mt-2 flex flex-wrap gap-2">' +
      (n.fechaRecordatorio ? '<span><i class="far fa-calendar"></i> ' + n.fechaRecordatorio + '</span>' : '') +
      (n.autor ? '<span>' + n.autor + '</span>' : '') +
      '</div>' +
      '<div class="flex gap-2 mt-2">' +
      '<button type="button" onclick="editarNota(\'' + n.id + '\')" class="text-xs text-blue-600 font-semibold">Editar</button>' +
      '<button type="button" onclick="eliminarNota(\'' + n.id + '\')" class="text-xs text-red-500 font-semibold">Eliminar</button>' +
      '</div></div></div></div>';
  }).join('');
}

window.toggleNotaHecha = async function (id, hecho) {
  try {
    await db.collection('notas').doc(id).update({ estado: hecho ? 'hecho' : 'pendiente', actualizado: new Date() });
  } catch (e) { alert(e.message); }
};

window.eliminarNota = async function (id) {
  if (!confirm('Eliminar esta nota?')) return;
  try {
    await db.collection('notas').doc(id).delete();
  } catch (e) { alert(e.message); }
};

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'notas' || seccion === 'recordatorios') return mostrarNotas();
    if (typeof prev === 'function') return prev(seccion);
  };
})();
