// js/admin-ui-pro.js
// Utilidades visuales profesionales del panel admin

window.adminToast = function (msg, tipo) {
  tipo = tipo || 'ok';
  var t = document.getElementById('admin-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:14px 20px;border-radius:14px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.2);max-width:min(360px,90vw);transition:opacity .2s;';
    document.body.appendChild(t);
  }
  t.style.background = tipo === 'error' ? '#dc2626' : tipo === 'warn' ? '#d97706' : tipo === 'info' ? '#2563eb' : '#059669';
  t.textContent = msg;
  t.style.opacity = '1';
  t.style.display = 'block';
  clearTimeout(window._adminToastTimer);
  window._adminToastTimer = setTimeout(function () {
    t.style.opacity = '0';
    setTimeout(function () { t.style.display = 'none'; }, 200);
  }, 3200);
};

window.adminConfirm = function (opts) {
  return new Promise(function (resolve) {
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 z-[300] flex items-center justify-center p-4';
    overlay.innerHTML =
      '<div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6">' +
      '<h3 class="text-lg font-bold text-slate-900 mb-2">' + (opts.title || 'Confirmar') + '</h3>' +
      '<p class="text-sm text-slate-600 mb-6">' + (opts.message || '¿Continuar?') + '</p>' +
      '<div class="flex gap-2">' +
      '<button type="button" data-a="no" class="flex-1 py-3 rounded-xl border text-slate-600 font-medium">' + (opts.cancelText || 'Cancelar') + '</button>' +
      '<button type="button" data-a="yes" class="flex-1 py-3 rounded-xl text-white font-bold ' +
      (opts.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700') + '">' +
      (opts.okText || 'Confirmar') + '</button></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-a');
      if (!a && e.target === overlay) a = 'no';
      if (!a) return;
      document.body.removeChild(overlay);
      resolve(a === 'yes');
    });
  });
};

window.estadoPill = function (estado) {
  var e = (estado || 'Pendiente').toString();
  var map = {
    'Pendiente': 'bg-amber-100 text-amber-800',
    'Pagado': 'bg-green-100 text-green-800',
    'Enviado': 'bg-blue-100 text-blue-800',
    'En proceso': 'bg-blue-100 text-blue-800',
    'Entregado': 'bg-emerald-100 text-emerald-800',
    'Cancelado': 'bg-red-100 text-red-800',
    'Preparando': 'bg-indigo-100 text-indigo-800',
    'Completado': 'bg-green-100 text-green-800',
    'Abierto': 'bg-green-100 text-green-800',
    'Cerrado': 'bg-slate-100 text-slate-600'
  };
  var cls = map[e] || 'bg-slate-100 text-slate-700';
  return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ' + cls + '">' + e + '</span>';
};

window.kpiCard = function (label, value, sub, color) {
  color = color || 'text-slate-900';
  return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5 hover:shadow-md transition">' +
    '<p class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">' + label + '</p>' +
    '<p class="text-2xl md:text-3xl font-bold ' + color + '">' + value + '</p>' +
    (sub ? '<p class="text-xs text-slate-400 mt-1">' + sub + '</p>' : '') +
    '</div>';
};

window.emptyState = function (icon, title, hint, btnText, btnAction) {
  return '<div class="text-center py-14 px-4">' +
    '<div class="text-4xl mb-3 opacity-40">' + (icon || '📭') + '</div>' +
    '<p class="font-semibold text-slate-700">' + (title || 'Sin datos') + '</p>' +
    (hint ? '<p class="text-sm text-slate-400 mt-1">' + hint + '</p>' : '') +
    (btnText && btnAction ? '<button type="button" onclick="' + btnAction + '" class="mt-4 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium">' + btnText + '</button>' : '') +
    '</div>';
};

/* Campana de notificaciones */
window._adminNotifs = [];

window.pushAdminNotif = function (item) {
  window._adminNotifs.unshift({
    id: Date.now() + Math.random(),
    title: item.title || 'Aviso',
    body: item.body || '',
    time: new Date(),
    read: false,
    type: item.type || 'info'
  });
  window._adminNotifs = window._adminNotifs.slice(0, 30);
  renderNotifBell();
};

window.renderNotifBell = function () {
  var badge = document.getElementById('notif-badge');
  var list = document.getElementById('notif-list');
  var unread = window._adminNotifs.filter(function (n) { return !n.read; }).length;
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : String(unread);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
  if (!list) return;
  if (!window._adminNotifs.length) {
    list.innerHTML = '<p class="text-sm text-slate-400 p-4 text-center">Sin notificaciones</p>';
    return;
  }
  list.innerHTML = window._adminNotifs.map(function (n) {
    var t = n.time.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    return '<div class="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 ' + (n.read ? '' : 'bg-green-50/50') + '">' +
      '<div class="text-sm font-semibold text-slate-800">' + n.title + '</div>' +
      '<div class="text-xs text-slate-500">' + n.body + '</div>' +
      '<div class="text-[10px] text-slate-400 mt-1">' + t + '</div></div>';
  }).join('');
};

window.toggleNotifPanel = function () {
  var p = document.getElementById('notif-panel');
  if (!p) return;
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) {
    window._adminNotifs.forEach(function (n) { n.read = true; });
    renderNotifBell();
  }
};

window.marcarNotifsLeidas = function () {
  window._adminNotifs.forEach(function (n) { n.read = true; });
  renderNotifBell();
};

/* Reloj header */
setInterval(function () {
  var el = document.getElementById('admin-clock');
  if (el) {
    el.textContent = new Date().toLocaleString('es-GT', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }
}, 1000);

/* Resaltar item activo del menú */
window.marcarMenuActivo = function (seccion) {
  document.querySelectorAll('#admin-sidebar [data-seccion]').forEach(function (el) {
    if (el.getAttribute('data-seccion') === seccion) {
      el.classList.add('bg-green-50', 'text-green-800', 'font-semibold');
    } else {
      el.classList.remove('bg-green-50', 'text-green-800', 'font-semibold');
    }
  });
};

(function () {
  var prev = window.navegarAdmin;
  window.navegarAdmin = function (seccion) {
    marcarMenuActivo(seccion);
    if (typeof prev === 'function') return prev(seccion);
    if (typeof mostrarSeccion === 'function') mostrarSeccion(seccion);
  };
})();
