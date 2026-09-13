// js/pos-ui-pro.js
// UI profesional de caja: layout 3 columnas, teclado, exito, carrito +/-

window.calcularTotalesPOS = function () {
  var cart = (typeof carrito !== 'undefined') ? carrito : [];
  var sub = cart.reduce(function (s, p) { return s + Number(p.precio) * Number(p.cantidad); }, 0);
  var desc = Math.min(Number(window.descuentoAplicado || 0), sub);
  var total = Math.max(0, sub - desc);
  return { sub: sub, desc: desc, total: total, n: cart.length };
};

window.renderVentaProfesional = function () {
  var app = document.getElementById('app');
  if (!app) return;
  if (!window.cajeroActual && typeof cajeroActual !== 'undefined') window.cajeroActual = cajeroActual;
  if (!window.cajeroActual) return;

  var user = window.cajeroActual || '';
  var role = window.rolCaja || (window.perfilCaja && window.perfilCaja.role) || '';
  var turno = window.turnoActual;
  var fondo = turno && turno.montoInicial != null ? Number(turno.montoInicial).toFixed(2) : '—';
  var estadoTurno = !turno ? 'Sin turno'
    : (turno.id ? 'Turno abierto' : (turno.estado === 'libre' ? 'Libre' : 'Sin turno'));
  var hora = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  app.innerHTML =
    // Barra de estado profesional
    '<div id="pos-topbar" class="mb-3 px-3 py-2.5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center gap-2 text-xs md:text-sm shadow-lg">' +
    '<span class="font-bold text-green-400">🌱 AGROMAX</span>' +
    '<span class="opacity-40">|</span>' +
    '<span><i class="fas fa-user-circle mr-1"></i>' + user + (role ? ' <span class="opacity-70">(' + role + ')</span>' : '') + '</span>' +
    '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ' +
    (turno && turno.id ? 'bg-green-500/30 text-green-200' : 'bg-amber-500/30 text-amber-200') + '">' + estadoTurno + '</span>' +
    '<span class="opacity-80">Fondo Q' + fondo + '</span>' +
    '<span class="ml-auto font-mono opacity-70" id="pos-clock">' + hora + '</span>' +
    '</div>' +

    // Cliente compacto
    '<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 mb-3">' +
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">' +
    '<div class="sm:col-span-1">' +
    '<label class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Cliente</label>' +
    '<input id="nombreCliente" type="text" placeholder="Buscar cliente..." ' +
    'class="w-full mt-1 p-2.5 border border-gray-200 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none" ' +
    'onkeyup="buscarClienteEnVivo()">' +
    '<div id="listaClientes" class="mt-1 max-h-40 overflow-auto border rounded-xl bg-white shadow hidden z-20 relative"></div></div>' +
    '<div>' +
    '<label class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">NIT</label>' +
    '<input id="nitCliente" type="text" placeholder="Opcional" class="w-full mt-1 p-2.5 border border-gray-200 rounded-xl outline-none focus:border-green-500">' +
    '</div>' +
    '<div class="flex gap-2">' +
    '<button type="button" onclick="document.getElementById(\'nombreCliente\').value=\'Consumidor Final\';document.getElementById(\'nitCliente\').value=\'\';" ' +
    'class="flex-1 mt-1 py-2.5 px-3 rounded-xl bg-gray-50 border text-xs font-semibold text-gray-600 hover:bg-gray-100">CF</button>' +
    '<button type="button" onclick="cerrarTurnoCaja()" class="mt-1 py-2.5 px-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold border border-red-100">Turno</button>' +
    '</div></div></div>' +

    // Grid principal 3 zonas
    '<div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pb-24 xl:pb-0">' +

    // Columna productos
    '<div class="xl:col-span-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col min-h-[320px]">' +
    '<div class="relative mb-2">' +
    '<i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>' +
    '<input id="search" placeholder="Buscar nombre o código (F3)" ' +
    'class="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-500 text-base" onkeyup="buscar()">' +
    '</div>' +
    '<div id="productos-rapidos" class="grid grid-cols-2 gap-1.5 mb-2"></div>' +
    '<div id="results" class="flex-1 overflow-auto space-y-1 max-h-72"></div>' +
    '</div>' +

    // Columna carrito
    '<div class="xl:col-span-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex flex-col min-h-[280px]">' +
    '<div class="flex items-center justify-between mb-2">' +
    '<h2 class="font-bold text-gray-800"><i class="fas fa-shopping-basket text-green-600 mr-1"></i> Carrito</h2>' +
    '<button type="button" onclick="vaciarCarritoPro()" class="text-xs text-red-500 hover:underline">Vaciar</button></div>' +
    '<div id="cart" class="flex-1 overflow-auto max-h-64"></div>' +
    '</div>' +

    // Columna cobro
    '<div class="xl:col-span-3 bg-slate-900 text-white rounded-2xl shadow-lg p-4 flex flex-col">' +
    '<p class="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Total a cobrar</p>' +
    '<div id="total-grande" class="text-4xl md:text-5xl font-bold font-mono text-green-400 leading-none mb-1">Q0.00</div>' +
    '<div id="total-detalle" class="text-xs text-slate-400 mb-3">0 líneas</div>' +

    '<p class="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5">Método de pago</p>' +
    '<div id="cobro-rapido" class="grid grid-cols-2 gap-1.5 mb-3"></div>' +
    '<select id="metodoPago" class="sr-only">' +
    '<option value="">Seleccione</option>' +
    '<option value="Efectivo">Efectivo</option>' +
    '<option value="Tarjeta">Tarjeta</option>' +
    '<option value="Transferencia">Transferencia</option>' +
    '<option value="Credito">Credito</option></select>' +

    '<div id="efectivoBox" class="hidden mb-3">' +
    '<label class="text-[10px] uppercase text-slate-400">Recibido</label>' +
    '<input type="number" id="montoRecibido" class="w-full mt-1 p-3 rounded-xl bg-slate-800 border border-slate-600 text-white text-xl font-mono outline-none" placeholder="0.00">' +
    '<div class="mt-2 text-sm">Cambio: <b id="cambioTexto" class="text-green-400 text-lg">Q0.00</b></div>' +
    '<div id="teclado-num" class="grid grid-cols-3 gap-1.5 mt-2"></div>' +
    '<div class="flex flex-wrap gap-1 mt-2" id="efectivo-atajos"></div>' +
    '</div>' +

    '<input id="notaVenta" type="text" placeholder="Nota interna (opcional)" class="w-full p-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200 mb-3 outline-none">' +

    '<button type="button" onclick="finalizarVenta()" id="btn-cobrar" ' +
    'class="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-slate-900 font-black text-lg tracking-wide shadow-lg transition active:scale-[0.98]">' +
    'COBRAR</button>' +
    '<button type="button" onclick="guardarPendiente()" class="w-full mt-2 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-800">' +
    'Guardar pendiente</button>' +
    '<p class="text-[10px] text-slate-500 text-center mt-2">F2 = Cobrar</p>' +
    '</div></div>' +

    // Barra móvil sticky
    '<div id="mobile-pay-bar" class="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-2xl border-t border-slate-700">' +
    '<div><div class="text-[10px] text-slate-400">Total</div><div id="mobile-total" class="text-xl font-bold font-mono text-green-400">Q0.00</div></div>' +
    '<button type="button" onclick="document.getElementById(\'btn-cobrar\').scrollIntoView({behavior:\'smooth\'});finalizarVenta();" ' +
    'class="bg-green-500 text-slate-900 font-black px-6 py-3 rounded-xl">COBRAR</button></div>';

  // Métodos
  var metodos = [
    { v: 'Efectivo', icon: 'fa-money-bill-wave' },
    { v: 'Tarjeta', icon: 'fa-credit-card' },
    { v: 'Transferencia', icon: 'fa-university' },
    { v: 'Credito', icon: 'fa-book' }
  ];
  var box = document.getElementById('cobro-rapido');
  if (box) {
    box.innerHTML = metodos.map(function (m) {
      return '<button type="button" data-metodo="' + m.v + '" onclick="seleccionarMetodoPro(\'' + m.v + '\')" ' +
        'class="metodo-btn p-2.5 rounded-xl border border-slate-600 bg-slate-800 text-xs font-semibold hover:border-green-400 hover:text-green-300 transition">' +
        '<i class="fas ' + m.icon + ' block mb-1 text-base"></i>' + m.v + '</button>';
    }).join('');
  }

  // Teclado numérico
  var teclado = document.getElementById('teclado-num');
  if (teclado) {
    var keys = ['1','2','3','4','5','6','7','8','9','00','0','⌫'];
    teclado.innerHTML = keys.map(function (k) {
      return '<button type="button" onclick="teclaNumPOS(\'' + k + '\')" class="py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-sm font-bold hover:bg-slate-700">' + k + '</button>';
    }).join('');
  }

  // Atajos efectivo
  var at = document.getElementById('efectivo-atajos');
  if (at) {
    at.innerHTML =
      '<button type="button" class="text-[10px] px-2 py-1 rounded-lg bg-slate-700" onclick="pagoExacto()">Exacto</button>' +
      '<button type="button" class="text-[10px] px-2 py-1 rounded-lg bg-slate-700" onclick="pagoSugerido(50)">50</button>' +
      '<button type="button" class="text-[10px] px-2 py-1 rounded-lg bg-slate-700" onclick="pagoSugerido(100)">100</button>' +
      '<button type="button" class="text-[10px] px-2 py-1 rounded-lg bg-slate-700" onclick="pagoSugerido(200)">200</button>';
  }

  var metodoSelect = document.getElementById('metodoPago');
  if (metodoSelect) {
    metodoSelect.addEventListener('change', function () {
      var ef = document.getElementById('efectivoBox');
      if (this.value === 'Efectivo') {
        ef.classList.remove('hidden');
      } else {
        ef.classList.add('hidden');
        var mr = document.getElementById('montoRecibido');
        if (mr) mr.value = '';
        var ct = document.getElementById('cambioTexto');
        if (ct) ct.innerText = 'Q0.00';
      }
    });
  }
  var montoInput = document.getElementById('montoRecibido');
  if (montoInput) {
    montoInput.addEventListener('input', actualizarCambioPro);
  }

  if (typeof render === 'function') render();
  else renderCarritoPro();
  actualizarTotalesPro();

  if (typeof cargarProductosRapidos === 'function') {
    cargarProductosRapidos().then(function () {
      if (typeof renderProductosRapidos === 'function') renderProductosRapidos();
    });
  }
  if (typeof activarEscannerUI === 'function') setTimeout(activarEscannerUI, 50);
  if (typeof renderClientesRecientes === 'function') renderClientesRecientes();
};

window.seleccionarMetodoPro = function (metodo) {
  var sel = document.getElementById('metodoPago');
  if (sel) {
    sel.value = metodo;
    sel.dispatchEvent(new Event('change'));
  }
  document.querySelectorAll('.metodo-btn').forEach(function (b) {
    if (b.getAttribute('data-metodo') === metodo) {
      b.classList.add('ring-2', 'ring-green-400', 'border-green-400', 'text-green-300');
    } else {
      b.classList.remove('ring-2', 'ring-green-400', 'border-green-400', 'text-green-300');
    }
  });
  if (metodo === 'Efectivo') {
    var inp = document.getElementById('montoRecibido');
    if (inp) setTimeout(function () { inp.focus(); }, 50);
  }
};

window.teclaNumPOS = function (k) {
  var inp = document.getElementById('montoRecibido');
  if (!inp) return;
  if (k === '⌫') {
    inp.value = String(inp.value).slice(0, -1);
  } else {
    inp.value = String(inp.value || '') + k;
  }
  inp.dispatchEvent(new Event('input'));
};

window.actualizarCambioPro = function () {
  var t = calcularTotalesPOS().total;
  var recibido = parseFloat((document.getElementById('montoRecibido') || {}).value) || 0;
  var cambio = recibido - t;
  var el = document.getElementById('cambioTexto');
  if (el) {
    el.innerText = 'Q' + (cambio >= 0 ? cambio.toFixed(2) : '0.00');
    el.className = cambio >= 0 ? 'text-green-400 text-lg' : 'text-red-400 text-lg';
  }
};

window.actualizarTotalesPro = function () {
  var t = calcularTotalesPOS();
  var g = document.getElementById('total-grande');
  var d = document.getElementById('total-detalle');
  var m = document.getElementById('mobile-total');
  if (g) g.textContent = 'Q' + t.total.toFixed(2);
  if (d) d.textContent = t.n + ' línea(s)' + (t.desc > 0 ? ' · Desc. -Q' + t.desc.toFixed(2) : '');
  if (m) m.textContent = 'Q' + t.total.toFixed(2);
  var sticky = document.getElementById('total-sticky');
  if (sticky) sticky.innerHTML = '<div class="text-lg font-bold">Total Q' + t.total.toFixed(2) + '</div>';
  actualizarCambioPro();
};

window.vaciarCarritoPro = function () {
  if (typeof carrito === 'undefined' || !carrito.length) return;
  if (!confirm('¿Vaciar carrito?')) return;
  carrito.length = 0;
  window.descuentoAplicado = 0;
  if (typeof limpiarCarritoSesion === 'function') limpiarCarritoSesion();
  if (typeof render === 'function') render();
  else renderCarritoPro();
  actualizarTotalesPro();
};

window.renderCarritoPro = function () {
  var box = document.getElementById('cart');
  if (!box || typeof carrito === 'undefined') return;
  if (!carrito.length) {
    box.innerHTML = '<div class="text-center text-gray-400 py-10 text-sm"><i class="fas fa-shopping-basket text-2xl mb-2 opacity-40"></i><br>Carrito vacío</div>';
    actualizarTotalesPro();
    return;
  }
  box.innerHTML = carrito.map(function (p, i) {
    var line = (Number(p.precio) * Number(p.cantidad)).toFixed(2);
    return '<div class="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100 mb-1.5 animate-fade">' +
      '<div class="flex-1 min-w-0">' +
      '<div class="font-medium text-sm truncate">' + p.nombre + '</div>' +
      '<div class="text-[10px] text-gray-400">Q' + Number(p.precio).toFixed(2) + ' c/u</div></div>' +
      '<div class="flex items-center gap-1">' +
      '<button type="button" onclick="cambiarCantidadPro(' + i + ',-1)" class="w-8 h-8 rounded-lg bg-white border text-gray-600 font-bold hover:bg-gray-100">−</button>' +
      '<span class="w-7 text-center font-bold text-sm">' + p.cantidad + '</span>' +
      '<button type="button" onclick="cambiarCantidadPro(' + i + ',1)" class="w-8 h-8 rounded-lg bg-white border text-gray-600 font-bold hover:bg-gray-100">+</button></div>' +
      '<div class="w-16 text-right font-semibold text-sm">Q' + line + '</div>' +
      '<button type="button" onclick="del(' + i + ')" class="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50"><i class="fas fa-times"></i></button></div>';
  }).join('');
  actualizarTotalesPro();
};

window.cambiarCantidadPro = function (i, delta) {
  if (typeof carrito === 'undefined' || !carrito[i]) return;
  carrito[i].cantidad += delta;
  if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
  if (typeof render === 'function') render();
  else renderCarritoPro();
};

window.mostrarExitoVenta = function (data) {
  data = data || {};
  var app = document.getElementById('app');
  if (!app) return;
  var folio = data.folio || '';
  var total = Number(data.total || 0).toFixed(2);
  var cliente = data.cliente || 'Consumidor Final';
  app.innerHTML =
    '<div class="min-h-[70vh] flex items-center justify-center p-4">' +
    '<div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-green-100">' +
    '<div class="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl">✓</div>' +
    '<h2 class="text-2xl font-bold text-gray-900 mb-1">Venta exitosa</h2>' +
    '<p class="text-gray-500 text-sm mb-4">' + cliente + '</p>' +
    (folio ? '<p class="text-xs text-gray-400 mb-1">Folio</p><p class="font-mono font-bold text-lg mb-3">' + folio + '</p>' : '') +
    '<p class="text-4xl font-black text-green-600 font-mono mb-6">Q' + total + '</p>' +
    '<div class="grid grid-cols-1 gap-2">' +
    '<button onclick="irAVentaSeguro()" class="w-full py-3.5 rounded-2xl bg-green-600 text-white font-bold hover:bg-green-700">Nueva venta</button>' +
    '<button onclick="enviarTicketWhatsApp()" class="w-full py-3 rounded-2xl bg-[#25D366] text-white font-semibold"><i class="fab fa-whatsapp"></i> WhatsApp</button>' +
    (data.ventaObj ? '<button onclick=\'reimprimirTicketVenta(' + JSON.stringify(data.ventaObj).replace(/'/g, "\\'") + ')\' class="w-full py-3 rounded-2xl border font-semibold text-gray-700">Reimprimir ticket</button>' : '') +
    '</div></div></div>';
};

// Reloj
setInterval(function () {
  var c = document.getElementById('pos-clock');
  if (c) c.textContent = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}, 1000);

// Override render
(function () {
  function install() {
    if (typeof render !== 'function') {
      window.render = renderCarritoPro;
      return;
    }
    if (render.__pro) return;
    var _r = render;
    window.render = function () {
      // Si estamos en UI pro, usar carrito pro
      if (document.getElementById('total-grande')) {
        renderCarritoPro();
        if (typeof guardarCarritoSesion === 'function') guardarCarritoSesion();
        return;
      }
      _r();
      if (typeof actualizarTotalSticky === 'function') actualizarTotalSticky();
    };
    window.render.__pro = true;
  }
  setTimeout(install, 100);
  setTimeout(install, 600);
})();

// Override view venta
(function () {
  function install() {
    if (typeof view !== 'function' || view.__pro) return;
    var _v = view;
    window.view = function (v) {
      if (v === 'venta') {
        if (!window.cajeroActual && typeof cajeroActual !== 'undefined') window.cajeroActual = cajeroActual;
        if (!window.cajeroActual) {
          if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
          return;
        }
        if (typeof mostrarUICaja === 'function') mostrarUICaja(true);
        renderVentaProfesional();
        return;
      }
      return _v(v);
    };
    window.view.__pro = true;
    ['__ux', '__extras', '__modulos', '__authUser', '__bonif', '__extras2'].forEach(function (f) {
      if (_v[f]) window.view[f] = true;
    });
  }
  setTimeout(install, 200);
  setTimeout(install, 800);
  setTimeout(install, 1600);
})();

// Mejorar resultados de búsqueda visualmente
(function () {
  function install() {
    if (typeof buscar !== 'function' || buscar.__proCards) return;
    // leave unified search from extras2; enhance results after
    var _b = buscar;
    window.buscar = async function () {
      await _b();
      var box = document.getElementById('results');
      if (!box) return;
      // style existing children if plain
      box.querySelectorAll(':scope > div').forEach(function (el) {
        el.classList.add('hover:shadow-md', 'transition', 'border', 'border-transparent', 'hover:border-green-200');
      });
    };
    window.buscar.__proCards = true;
    if (_b.__unified) window.buscar.__unified = true;
  }
  setTimeout(install, 400);
  setTimeout(install, 1000);
})();

// Pantalla de éxito tras venta (hook)
(function () {
  function install() {
    if (typeof finalizarVenta !== 'function' || finalizarVenta.__proSuccess) return;
    var _f = finalizarVenta;
    window.finalizarVenta = async function () {
      var cliente = (document.getElementById('nombreCliente') && document.getElementById('nombreCliente').value.trim()) || 'Consumidor Final';
      var cartSnap = (typeof carrito !== 'undefined') ? carrito.slice() : [];
      var tot = calcularTotalesPOS().total;
      try {
        await _f();
        // Si el carrito se vació, venta OK
        if (typeof carrito !== 'undefined' && carrito.length === 0) {
          var folio = (window._ultimaVentaTicket && window._ultimaVentaTicket.folio) || '';
          var ventaObj = window._ultimaVentaTicket || {
            productos: cartSnap,
            total: tot,
            cliente: cliente,
            folio: folio,
            metodoPago: (document.getElementById('metodoPago') || {}).value || ''
          };
          mostrarExitoVenta({
            folio: ventaObj.folio || folio,
            total: ventaObj.total != null ? ventaObj.total : tot,
            cliente: ventaObj.cliente || cliente,
            ventaObj: ventaObj
          });
        }
      } catch (e) {
        throw e;
      }
    };
    window.finalizarVenta.__proSuccess = true;
    ['__wa', '__descuento', '__extras'].forEach(function (f) {
      if (_f[f]) window.finalizarVenta[f] = true;
    });
  }
  setTimeout(install, 500);
  setTimeout(install, 1500);
  setTimeout(install, 2500);
})();

// forzarVistaVenta usa UI pro
(function () {
  var prev = window.forzarVistaVenta;
  window.forzarVistaVenta = function () {
    if (typeof asegurarCajeroPOS === 'function') asegurarCajeroPOS();
    if (!window.cajeroActual) {
      if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
      return;
    }
    if (typeof mostrarUICaja === 'function') mostrarUICaja(true);
    try {
      renderVentaProfesional();
    } catch (e) {
      if (typeof prev === 'function') prev();
      else if (typeof view === 'function') view('venta');
    }
  };
})();
