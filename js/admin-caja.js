// js/admin-caja.js
// Módulo Caja dentro de admin: embebe todo el POS (pos.html?embed=1)

window.mostrarSeccionCaja = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  // Quitar padding del contenedor para iframe a pantalla completa del área de trabajo
  content.classList.remove('p-4', 'md:p-8');
  content.classList.add('p-0');
  content.style.overflow = 'hidden';

  var esCajero = window.usuarioActual && window.usuarioActual.role === 'cajero';

  content.innerHTML =
    '<div class="flex flex-col h-full" style="height:calc(100vh - 0px)">' +
    (esCajero
      ? ''
      : '<div class="px-4 py-2 bg-green-50 border-b flex items-center justify-between gap-2 shrink-0">' +
        '<div class="text-sm text-green-800"><i class="fas fa-money-bill-wave mr-1"></i> <b>Módulo Caja</b> · Ventas de mostrador</div>' +
        '<span class="text-xs text-gray-500">Usuario: ' +
        ((window.usuarioActual && window.usuarioActual.nombre) || '') +
        '</span></div>') +
    '<iframe id="iframe-caja-pos" src="pos.html?embed=1" title="Caja POS" ' +
    'class="w-full flex-1 border-0 bg-white" style="min-height:70vh;height:100%"></iframe>' +
    '</div>';

  // Ajuste de altura del área principal
  var wrap = content.parentElement;
  if (wrap) {
    content.style.height = '100%';
  }
};

/** Restaurar padding al salir de caja */
window._restaurarPaddingAdmin = function () {
  var content = document.getElementById('main-content');
  if (!content) return;
  content.classList.add('p-4', 'md:p-8');
  content.classList.remove('p-0');
  content.style.overflow = '';
  content.style.height = '';
};

// Al navegar a otra sección, restaurar layout
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
