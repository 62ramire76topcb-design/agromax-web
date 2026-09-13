// js/admin-auditoria.js — Log de auditoría

window.logAuditoria = async function (accion, detalle) {
  try {
    await db.collection('auditoria').add({
      accion: accion || 'evento',
      detalle: String(detalle || '').slice(0, 500),
      usuario: (window.usuarioActual && (window.usuarioActual.nombre || window.usuarioActual.email)) ||
        (typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.email) || 'sistema',
      uid: (window.usuarioActual && window.usuarioActual.uid) ||
        (typeof auth !== 'undefined' && auth.currentUser && auth.currentUser.uid) || '',
      fecha: new Date()
    });
  } catch (e) {
    console.warn('auditoria:', e);
  }
};

window.mostrarAuditoria = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<h1 class="text-2xl font-bold mb-2">Auditoría</h1>' +
    '<p class="text-sm text-slate-500 mb-4">Quién hizo qué y cuándo</p>' +
    '<div id="aud-lista" class="bg-white rounded-2xl border overflow-x-auto">' +
    '<p class="text-center text-slate-400 py-10"><i class="fas fa-spinner fa-spin"></i></p></div>';

  db.collection('auditoria').orderBy('fecha', 'desc').limit(100).onSnapshot(function (snap) {
    var box = document.getElementById('aud-lista');
    if (!box) return;
    if (snap.empty) {
      box.innerHTML = '<p class="text-center text-slate-400 py-12">Sin eventos aún. Se registran al crear clientes, gastos, créditos, etc.</p>';
      return;
    }
    var html = '<table class="w-full text-sm"><thead><tr class="bg-slate-50 text-left text-xs uppercase text-slate-500">' +
      '<th class="p-3">Fecha</th><th class="p-3">Usuario</th><th class="p-3">Acción</th><th class="p-3">Detalle</th></tr></thead><tbody>';
    snap.forEach(function (d) {
      var a = d.data();
      var f = a.fecha && a.fecha.toDate ? a.fecha.toDate().toLocaleString('es-GT') : '';
      html += '<tr class="border-t border-slate-50">' +
        '<td class="p-3 text-xs text-slate-500 whitespace-nowrap">' + f + '</td>' +
        '<td class="p-3 font-medium">' + (a.usuario || '') + '</td>' +
        '<td class="p-3"><code class="text-xs bg-slate-100 px-1.5 py-0.5 rounded">' + (a.accion || '') + '</code></td>' +
        '<td class="p-3 text-slate-600">' + (a.detalle || '') + '</td></tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;
  }, function (err) {
    var box = document.getElementById('aud-lista');
    if (box) box.innerHTML = '<p class="text-red-600 p-4">' + err.message +
      '<br>Regla: match /auditoria/{doc} { allow read, write: if request.auth != null; }</p>';
  });
};

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (s) {
    if (s === 'auditoria') return mostrarAuditoria();
    if (typeof prev === 'function') return prev(s);
  };
})();
