// js/pos-ux.js
// Mejoras UX caja: barra de estado, cobro rapido, total sticky, favoritos reforzados

window.actualizarBarraEstadoCaja = function () {
  var bar = document.getElementById('pos-status-bar');
  if (!bar) return;
  var user = window.cajeroActual || (window.perfilCaja && window.perfilCaja.nombre) || '—';
  var role = window.rolCaja || (window.perfilCaja && window.perfilCaja.role) || '';
  var turno = window.turnoActual;
  var fondo = turno && turno.montoInicial != null ? 'Q' + Number(turno.montoInicial).toFixed(2) : '—';
  var estado = !turno ? 'Sin turno'
    : (turno.estado === 'libre' || !turno.id) ? 'Libre (sin arqueo)'
    : (turno.estado === 'abierto') ? 'Turno abierto'
    : String(turno.estado || '');

  bar.innerHTML =
    '<div class="flex flex-wrap items-center gap-2 text-xs md:text-sm">' +
    '<span class="font-semibold text-green-800"><i class="fas fa-user-circle mr-1"></i>' + user + '</span>' +
    (role ? '<span class="px-2 py-0.5 rounded-full bg-white border text-gray-600">' + role + '</span>' : '') +
    '<span class="px-2 py-0.5 rounded-full ' +
    (turno && turno.id ? 'bg-green-200 text-green-900' : 'bg-amber-100 text-amber-800') + '">' + estado + '</span>' +
    '<span class="text-gray-600">Fondo: <b>' + fondo + '</b></span>' +
    '<span class="text-gray-400 ml-auto hidden sm:inline">F2 = Cobrar</span>' +
    '</div>';
};

window.renderCobroRapido = function () {
  var box = document.getElementById('cobro-rapido');
  if (!box) return;
  var metodos = [
    { v: 'Efectivo', icon: 'fa-money-bill-wave', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    { v: 'Tarjeta', icon: 'fa-credit-card', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { v: 'Transferencia', icon: 'fa-university', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    { v: 'Credito', icon: 'fa-book', color: 'bg-amber-50 border-amber-200 text-amber-900' }
  ];
  box.innerHTML = metodos.map(function (m) {
    return '<button type="button" onclick="seleccionarMetodoRapido(\'' + m.v + '\')" class="flex-1 min-w-[70px] p-2.5 rounded-xl border text-xs font-semibold ' + m.color + '">' +
      '<i class="fas ' + m.icon + ' block text-base mb-1"></i>' + m.v + '</button>';
  }).join('');
};

window.seleccionarMetodoRapido = function (metodo) {
  var sel = document.getElementById('metodoPago');
  if (sel) {
    sel.value = metodo;
    sel.dispatchEvent(new Event('change'));
  }
  document.querySelectorAll('#cobro-rapido button').forEach(function (b) {
    b.classList.remove('ring-2', 'ring-green-600');
  });
  if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('ring-2', 'ring-green-600');
  }
  if (metodo === 'Efectivo') {
    var inp = document.getElementById('montoRecibido');
    if (inp) setTimeout(function () { inp.focus(); }, 50);
  }
};

window.actualizarTotalSticky = function () {
  var el = document.getElementById('total-sticky');
  if (!el) return;
  var cart = (typeof carrito !== 'undefined') ? carrito : [];
  var sub = cart.reduce(function (s, p) { return s + p.precio * p.cantidad; }, 0);
  var desc = Math.min(Number(window.descuentoAplicado || 0), sub);
  var total = Math.max(0, sub - desc);
  el.innerHTML =
    (desc > 0 ? '<div class="text-xs text-purple-700">Desc. -Q' + desc.toFixed(2) + '</div>' : '') +
    '<div class="text-lg font-bold text-green-800">Total Q' + total.toFixed(2) + '</div>' +
    '<div class="text-[10px] text-gray-500">' + cart.length + ' linea(s)</div>';
};

// Mejorar render del carrito + total
(function () {
  function installRender() {
    if (typeof render !== 'function' || render.__ux) return;
    var _r = render;
    window.render = function () {
      _r();
      actualizarTotalSticky();
      // botones +/- en carrito si existe
      var box = document.getElementById('cart');
      if (!box || typeof carrito === 'undefined') return;
    };
    window.render.__ux = true;
  }
  setTimeout(installRender, 100);
  setTimeout(installRender, 600);
})();

// Inyectar UI en vista venta
(function () {
  function installView() {
    if (typeof view !== 'function' || view.__ux) return;
    var _v = view;
    window.view = function (v) {
      _v(v);
      if (v !== 'venta') return;
      setTimeout(function () {
        // Barra de estado
        var app = document.getElementById('app');
        if (app && !document.getElementById('pos-status-bar')) {
          var bar = document.createElement('div');
          bar.id = 'pos-status-bar';
          bar.className = 'mb-4 px-3 py-2 rounded-2xl bg-green-50 border border-green-100';
          app.insertBefore(bar, app.firstChild);
        }
        actualizarBarraEstadoCaja();

        // Cobro rapido junto a metodo
        var metodo = document.getElementById('metodoPago');
        if (metodo && !document.getElementById('cobro-rapido')) {
          var wrap = document.createElement('div');
          wrap.className = 'mt-3';
          wrap.innerHTML =
            '<p class="text-xs font-semibold text-gray-500 mb-2">Cobro rapido</p>' +
            '<div id="cobro-rapido" class="flex flex-wrap gap-2"></div>';
          metodo.parentNode.insertBefore(wrap, metodo);
          // ocultar select feo pero mantenerlo para logica
          metodo.classList.add('sr-only');
          var lab = metodo.previousElementSibling;
          // label stays
        }
        renderCobroRapido();

        // Total sticky sobre botones
        var fin = document.querySelector('button[onclick="finalizarVenta()"]');
        if (fin && !document.getElementById('total-sticky')) {
          var t = document.createElement('div');
          t.id = 'total-sticky';
          t.className = 'mt-4 p-3 rounded-2xl bg-green-50 border border-green-200 text-center';
          fin.parentNode.insertBefore(t, fin);
        }
        actualizarTotalSticky();

        // Boton consumidor final
        var nit = document.getElementById('nitCliente');
        if (nit && !document.getElementById('btn-cf')) {
          var b = document.createElement('button');
          b.id = 'btn-cf';
          b.type = 'button';
          b.className = 'mt-2 text-xs text-green-700 underline';
          b.textContent = 'Usar Consumidor Final';
          b.onclick = function () {
            var n = document.getElementById('nombreCliente');
            if (n) n.value = 'Consumidor Final';
            nit.value = '';
          };
          nit.parentNode.appendChild(b);
        }

        // Atajos efectivo exacto / redondeo
        var ef = document.getElementById('efectivoBox');
        if (ef && !document.getElementById('efectivo-atajos')) {
          var at = document.createElement('div');
          at.id = 'efectivo-atajos';
          at.className = 'flex flex-wrap gap-2 mt-2';
          at.innerHTML =
            '<button type="button" class="text-xs px-2 py-1 rounded-lg bg-gray-100" onclick="pagoExacto()">Exacto</button>' +
            '<button type="button" class="text-xs px-2 py-1 rounded-lg bg-gray-100" onclick="pagoSugerido(50)">+50</button>' +
            '<button type="button" class="text-xs px-2 py-1 rounded-lg bg-gray-100" onclick="pagoSugerido(100)">+100</button>' +
            '<button type="button" class="text-xs px-2 py-1 rounded-lg bg-gray-100" onclick="pagoSugerido(200)">+200</button>';
          ef.appendChild(at);
        }
      }, 80);
    };
    // copiar flags
    window.view.__ux = true;
    if (_v.__extras) window.view.__extras = true;
    if (_v.__modulos) window.view.__modulos = true;
    if (_v.__authUser) window.view.__authUser = true;
    if (_v.__bonif) window.view.__bonif = true;
  }
  setTimeout(installView, 120);
  setTimeout(installView, 500);
  setTimeout(installView, 1000);
})();

window.pagoExacto = function () {
  var cart = (typeof carrito !== 'undefined') ? carrito : [];
  var sub = cart.reduce(function (s, p) { return s + p.precio * p.cantidad; }, 0);
  var desc = Math.min(Number(window.descuentoAplicado || 0), sub);
  var total = Math.max(0, sub - desc);
  var inp = document.getElementById('montoRecibido');
  if (inp) {
    inp.value = total.toFixed(2);
    inp.dispatchEvent(new Event('input'));
  }
};

window.pagoSugerido = function (extra) {
  var cart = (typeof carrito !== 'undefined') ? carrito : [];
  var sub = cart.reduce(function (s, p) { return s + p.precio * p.cantidad; }, 0);
  var desc = Math.min(Number(window.descuentoAplicado || 0), sub);
  var total = Math.max(0, sub - desc);
  var base = Math.ceil(total / 10) * 10;
  var inp = document.getElementById('montoRecibido');
  if (inp) {
    inp.value = (Math.max(base, total) + (Number(extra) || 0) - (base > total ? 0 : 0)).toFixed(2);
    // simpler: total rounded up to next 10 + optional
    var sug = Math.ceil(total / 10) * 10;
    if (extra && extra >= 50) sug = Math.max(sug, extra);
    if (extra === 50 || extra === 100 || extra === 200) {
      sug = Math.ceil(total / extra) * extra;
      if (sug < total) sug += extra;
    }
    inp.value = sug.toFixed(2);
    inp.dispatchEvent(new Event('input'));
  }
};

// Refrescar barra al abrir turno
(function () {
  var t = setInterval(function () {
    if (document.getElementById('pos-status-bar')) actualizarBarraEstadoCaja();
  }, 3000);
})();
