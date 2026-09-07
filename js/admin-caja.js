// js/admin-caja.js
// Modulo Caja en admin: POS completo embebido a pantalla del area de trabajo

window.mostrarSeccionCaja = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  content.classList.remove('p-4', 'md:p-8');
  content.classList.add('p-0');
  content.style.overflow = 'hidden';
  content.style.height = '100%';

  var nombre = (window.usuarioActual && window.usuarioActual.nombre) || '';
  var role = (window.usuarioActual && window.usuarioActual.role) || '';
  var esCajero = role === 'cajero';

  content.innerHTML =
    '<div class="flex flex-col h-full" style="height:100%;min-height:calc(100vh - 3.5rem)">' +
    '<div class="px-3 py-2 bg-green-800 text-white flex flex-wrap items-center justify-between gap-2 shrink-0 text-sm">' +
    '<div><i class="fas fa-money-bill-wave mr-1"></i> <b>Caja / Mostrador</b>' +
    (esCajero ? ' <span class="opacity-80 text-xs">· tu espacio de trabajo</span>' : '') +
    '</div>' +
    '<div class="text-xs opacity-90">' + nombre + (role ? ' · ' + role : '') + '</div>' +
    '</div>' +
    '<iframe id="iframe-caja-pos" src="pos.html?embed=1&v=3" title="Caja POS" ' +
    'class="w-full flex-1 border-0 bg-white" style="min-height:75vh;height:100%" allow="clipboard-write"></iframe>' +
    '</div>';
};

window._restaurarPaddingAdmin = function () {
  var content = document.getElementById('main-content');
  if (!content) return;
  content.classList.add('p-4', 'md:p-8');
  content.classList.remove('p-0');
  content.style.overflow = '';
  content.style.height = '';
};

(function () {
  var prev = window.navegarAdmin;
  window.navegarAdmin = function (seccion) {
    if (seccion !== 'caja' && typeof window._restaurarPaddingAdmin === 'function') {
      window._restaurarPaddingAdmin();
    }
    if (typeof prev === 'function') return prev(seccion);
    if (typeof mostrarSeccion === 'function') mostrarSeccion(seccion);
  };
})();
