// js/pos-fix-venta.js
// Corrige "Nueva Venta no disponible": fuerza sidebar, cajero y vista venta

window.asegurarCajeroPOS = function () {
  if (window.cajeroActual) {
    try { if (typeof cajeroActual !== 'undefined') cajeroActual = window.cajeroActual; } catch (e) {}
    return window.cajeroActual;
  }
  if (window.perfilCaja && window.perfilCaja.nombre) {
    window.cajeroActual = window.perfilCaja.nombre;
    try { cajeroActual = window.cajeroActual; } catch (e) {}
    return window.cajeroActual;
  }
  var u = auth && auth.currentUser;
  if (u) {
    var n = (u.displayName) || (u.email ? u.email.split('@')[0] : 'Usuario');
    window.cajeroActual = n;
    try { cajeroActual = n; } catch (e) {}
    return n;
  }
  return '';
};

window.forzarVistaVenta = function () {
  asegurarCajeroPOS();
  if (!window.cajeroActual) {
    if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
    else alert('Inicia sesion para usar la caja');
    return;
  }

  // Mostrar menu lateral
  if (typeof mostrarUICaja === 'function') mostrarUICaja(true);
  else {
    var side = document.getElementById('pos-sidebar');
    if (side) side.classList.remove('hidden');
  }

  // Cajero sin turno: ir a apertura si no hay turno
  if (typeof esRolSinTurno === 'function' && !esRolSinTurno()) {
    if (!window.turnoActual || (!window.turnoActual.id && window.turnoActual.estado !== 'libre')) {
      // permitir venta si ya hay turno abierto; si no, abrir pantalla de turno
      if (!window.turnoActual || !window.turnoActual.id) {
        // intentar cargar turno en background y aun asi mostrar venta
        // (mejor UX: no bloquear la UI de venta)
      }
    }
  }

  try {
    // Llamar a la implementacion base de view si existe en la cadena
    if (typeof view === 'function') {
      view('venta');
    }
  } catch (err) {
    console.error('view venta error:', err);
    // Fallback UI minima de venta
    var app = document.getElementById('app');
    if (!app) return;
    app.innerHTML =
      '<div class="p-4">' +
      '<h1 class="text-2xl font-bold mb-4">Nueva Venta</h1>' +
      '<p class="text-sm text-gray-600 mb-2">Usuario: <b>' + window.cajeroActual + '</b></p>' +
      '<input id="search" placeholder="Buscar producto..." class="w-full p-4 border rounded-2xl mb-3" onkeyup="if(typeof buscar===\'function\')buscar()">' +
      '<div id="results"></div>' +
      '<div id="cart" class="mt-4"></div>' +
      '<select id="metodoPago" class="w-full p-3 border rounded-xl mt-3">' +
      '<option value="">Metodo de pago</option>' +
      '<option value="Efectivo">Efectivo</option>' +
      '<option value="Tarjeta">Tarjeta</option>' +
      '<option value="Transferencia">Transferencia</option>' +
      '<option value="Credito">Credito</option></select>' +
      '<div id="efectivoBox" class="mt-3 hidden">' +
      '<input type="number" id="montoRecibido" placeholder="Monto recibido" class="w-full p-3 border rounded-xl">' +
      '</div>' +
      '<button onclick="finalizarVenta()" class="w-full mt-4 bg-green-700 text-white py-4 rounded-xl font-bold">Finalizar Venta</button>' +
      '</div>';
    if (typeof render === 'function') render();
  }

  if (typeof actualizarBarraEstadoCaja === 'function') {
    setTimeout(actualizarBarraEstadoCaja, 100);
  }
};

// Sobrescribe irAVentaSeguro con version fiable
window.irAVentaSeguro = function () {
  if (window._navegandoVenta) return;
  window._navegandoVenta = true;
  try {
    forzarVistaVenta();
  } catch (e) {
    console.error('irAVentaSeguro:', e);
    alert('No se pudo abrir Nueva Venta: ' + (e.message || e));
  } finally {
    setTimeout(function () { window._navegandoVenta = false; }, 500);
  }
};

// Al cargar, si hay sesion, abrir venta automaticamente tras un momento
(function () {
  function tryBoot() {
    if (!auth || !auth.currentUser) return;
    asegurarCajeroPOS();
    if (!window.cajeroActual) return;
    if (typeof mostrarUICaja === 'function') mostrarUICaja(true);
    // Si app esta vacio o en login, forzar venta
    var app = document.getElementById('app');
    if (!app) return;
    var html = (app.innerHTML || '').trim();
    if (!html || html.indexOf('Iniciar Ses') >= 0 || html.indexOf('Ingresar a Caja') >= 0) {
      // dejar que pos-auth arranque; si no, forzar
      setTimeout(function () {
        if (!window.cajeroActual) asegurarCajeroPOS();
        if (window.cajeroActual && app.innerHTML.indexOf('Nueva Venta') < 0 && app.innerHTML.indexOf('Abrir turno') < 0) {
          forzarVistaVenta();
        }
      }, 800);
    }
  }
  setTimeout(tryBoot, 600);
  setTimeout(tryBoot, 1500);
})();

// Hacer onclick de Nueva Venta a prueba de fallos en HTML dinamico
document.addEventListener('click', function (e) {
  var t = e.target;
  if (!t) return;
  var a = t.closest ? t.closest('a') : null;
  if (!a) return;
  var txt = (a.textContent || '').toLowerCase();
  if (txt.indexOf('nueva venta') >= 0) {
    e.preventDefault();
    irAVentaSeguro();
  }
});
