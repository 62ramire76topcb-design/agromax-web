// js/pos-extras.js
// Mejoras de caja: rápidos, clientes, inactividad, atajos, reimpresión, nota, stock

window.productosRapidos = [];
window.clientesRecientes = JSON.parse(localStorage.getItem('clientesRecientesPOS') || '[]');

window.generarFolioPOS = function () {
  return 'POS-' + (Math.floor(Math.random() * 900000) + 100000);
};

window.guardarClienteReciente = function (nombre, nit) {
  if (!nombre || nombre === 'Consumidor Final') return;
  var list = window.clientesRecientes.filter(function (c) {
    return c.nombre.toLowerCase() !== nombre.toLowerCase();
  });
  list.unshift({ nombre: nombre, nit: nit || '' });
  window.clientesRecientes = list.slice(0, 6);
  localStorage.setItem('clientesRecientesPOS', JSON.stringify(window.clientesRecientes));
};

window.cargarProductosRapidos = async function () {
  try {
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(40).get();
    var contador = {};
    snap.forEach(function (doc) {
      (doc.data().productos || []).forEach(function (p) {
        if (!p.nombre) return;
        if (!contador[p.nombre]) contador[p.nombre] = { nombre: p.nombre, cantidad: 0, precio: p.precio, id: p.id };
        contador[p.nombre].cantidad += Number(p.cantidad) || 0;
        if (p.id) contador[p.nombre].id = p.id;
        if (p.precio) contador[p.nombre].precio = p.precio;
      });
    });
    var ranking = Object.keys(contador).map(function (k) { return contador[k]; });
    ranking.sort(function (a, b) { return b.cantidad - a.cantidad; });

    var prods = await db.collection('productos').limit(100).get();
    var byName = {};
    prods.forEach(function (d) {
      var p = d.data();
      byName[(p.nombre || '').toLowerCase()] = { id: d.id, stock: p.stock || 0, precio: p.precio, nombre: p.nombre };
    });

    window.productosRapidos = ranking.slice(0, 10).map(function (r) {
      var m = byName[(r.nombre || '').toLowerCase()];
      return {
        id: r.id || (m && m.id),
        nombre: r.nombre,
        precio: r.precio || (m && m.precio) || 0,
        stock: m ? m.stock : 0
      };
    }).filter(function (p) { return p.id; });

    if (window.productosRapidos.length < 6) {
      prods.forEach(function (d) {
        if (window.productosRapidos.length >= 8) return;
        var p = d.data();
        if ((p.stock || 0) <= 0) return;
        if (window.productosRapidos.some(function (x) { return x.id === d.id; })) return;
        window.productosRapidos.push({ id: d.id, nombre: p.nombre, precio: p.precio, stock: p.stock || 0 });
      });
    }
  } catch (e) {
    console.warn('rapidos:', e);
  }
};

window.renderProductosRapidos = function () {
  var box = document.getElementById('productos-rapidos');
  if (!box) return;
  if (!window.productosRapidos.length) {
    box.innerHTML = '<p class="text-xs text-gray-400 col-span-full">Sin productos frecuentes aún</p>';
    return;
  }
  box.innerHTML = window.productosRapidos.map(function (p) {
    var low = (p.stock || 0) < 10;
    return '<button type="button" onclick="add(\'' + p.id + '\',\'' +
      String(p.nombre).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\',' +
      Number(p.precio) + ',' + Number(p.stock) + ')" class="px-3 py-2 rounded-xl text-left text-xs font-medium border ' +
      (low ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-green-200 bg-green-50 text-green-900') +
      ' hover:shadow-sm">' + p.nombre +
      '<span class="block text-[10px] opacity-70">Q' + Number(p.precio).toFixed(2) + ' · stock ' + (p.stock || 0) + '</span></button>';
  }).join('');
};

window.renderClientesRecientes = function () {
  var box = document.getElementById('clientes-rapidos');
  if (!box) return;
  if (!window.clientesRecientes.length) { box.innerHTML = ''; return; }
  box.innerHTML = '<p class="text-xs text-gray-500 mb-2">Clientes recientes</p><div class="flex flex-wrap gap-2">' +
    window.clientesRecientes.map(function (c, i) {
      return '<button type="button" onclick="usarClienteReciente(' + i + ')" class="px-3 py-1.5 rounded-full text-xs bg-slate-100 hover:bg-green-50 border">' +
        c.nombre + '</button>';
    }).join('') + '</div>';
};

window.usarClienteReciente = function (i) {
  var c = window.clientesRecientes[i];
  if (!c) return;
  var n = document.getElementById('nombreCliente');
  var nit = document.getElementById('nitCliente');
  if (n) n.value = c.nombre;
  if (nit) nit.value = c.nit || '';
};

/* Stock warning on add */
(function () {
  var _add = window.add;
  window.add = function (id, nombre, precio, stock) {
    if (typeof _add === 'function') _add(id, nombre, precio, stock);
    else {
      // fallback if add not global yet
      if (stock <= 0) return alert('Sin stock disponible');
    }
    if (stock > 0 && stock < 10) {
      var toast = document.getElementById('pos-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pos-toast';
        toast.className = 'fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm z-[300]';
        document.body.appendChild(toast);
      }
      toast.textContent = '⚠️ Stock bajo: ' + nombre + ' (quedan ' + stock + ')';
      toast.style.display = 'block';
      setTimeout(function () { toast.style.display = 'none'; }, 2500);
    }
  };
})();

/* Enhance view('venta') after render */
(function () {
  var _view = null;
  function install() {
    if (typeof view !== 'function' || view.__extras) return;
    _view = view;
    window.view = function (v) {
      _view(v);
      if (v === 'venta') {
        setTimeout(function () {
          // Insertar zona rápidos + nota si no existen
          var results = document.getElementById('results');
          if (results && !document.getElementById('productos-rapidos')) {
            var wrap = document.createElement('div');
            wrap.className = 'mb-4';
            wrap.innerHTML = '<p class="text-xs font-semibold text-gray-500 mb-2">Productos rápidos</p>' +
              '<div id="productos-rapidos" class="grid grid-cols-2 sm:grid-cols-3 gap-2"></div>';
            results.parentNode.insertBefore(wrap, results);
          }
          var clienteBox = document.querySelector('#nombreCliente');
          if (clienteBox && !document.getElementById('clientes-rapidos')) {
            var cr = document.createElement('div');
            cr.id = 'clientes-rapidos';
            cr.className = 'mt-3';
            clienteBox.parentNode.appendChild(cr);
          }
          var metodo = document.getElementById('metodoPago');
          if (metodo && !document.getElementById('notaVenta')) {
            var notaWrap = document.createElement('div');
            notaWrap.className = 'mt-4';
            notaWrap.innerHTML = '<label class="block mb-2 font-semibold text-gray-700 text-sm">Nota interna (opcional)</label>' +
              '<input id="notaVenta" type="text" placeholder="Ej. Cliente regresa por el resto" class="w-full p-3 border rounded-xl text-sm">' +
              '<p class="text-[10px] text-gray-400 mt-2">Atajos: <b>F2</b> finalizar venta</p>';
            metodo.parentNode.appendChild(notaWrap);
          }
          renderClientesRecientes();
          cargarProductosRapidos().then(renderProductosRapidos);
          resetIdleTimer();
        }, 60);
      }
    };
    window.view.__extras = true;
  }
  // pos.js carga antes; instalar al final
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else setTimeout(install, 0);
  setTimeout(install, 300);
})();

/* Finalizar venta: folio, nota, ticket enriquecido */
(function () {
  function wrapFinalizar() {
    if (typeof finalizarVenta !== 'function' || finalizarVenta.__extras) return;
    var _fin = finalizarVenta;
    window.finalizarVenta = async function () {
      // Monkey-patch abrirTicket for this sale
      var _ticket = window.abrirTicket;
      var folio = typeof generarFolioPOS === 'function' ? generarFolioPOS() : ('POS-' + Date.now().toString().slice(-6));
      var notaEl = document.getElementById('notaVenta');
      var nota = notaEl ? notaEl.value.trim() : '';
      var cliente = (document.getElementById('nombreCliente') && document.getElementById('nombreCliente').value.trim()) || 'Consumidor Final';
      var nit = (document.getElementById('nitCliente') && document.getElementById('nitCliente').value.trim()) || '';

      window.abrirTicket = function (carrito, total, metodoPago, montoRecibido, cambio, cli, n) {
        _ticket(carrito, total, metodoPago, montoRecibido, cambio, cli || cliente, n || nit, {
          folio: folio,
          cajero: window.cajeroActual || '',
          nota: nota
        });
      };

      // Intercept transaction set via temporary hook on db - too heavy.
      // Instead call original then update last sale with folio/nota if possible.
      try {
        await _fin();
        guardarClienteReciente(cliente, nit);
        // Best-effort: update most recent sale by this cashier with folio/nota
        try {
          var snap = await db.collection('ventas').where('cajero', '==', window.cajeroActual || '').orderBy('fecha', 'desc').limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({ folio: folio, nota: nota || '' });
          }
        } catch (e) { /* index may be missing; ignore */ }
      } finally {
        window.abrirTicket = _ticket;
      }
    };
    window.finalizarVenta.__extras = true;
  }
  setTimeout(wrapFinalizar, 100);
  setTimeout(wrapFinalizar, 500);
})();

/* Idle lock 8 min */
var _idleTimer = null;
var IDLE_MS = 8 * 60 * 1000;

function resetIdleTimer() {
  if (_idleTimer) clearTimeout(_idleTimer);
  if (!window.cajeroActual) return;
  _idleTimer = setTimeout(bloquearCajaPorInactividad, IDLE_MS);
}

function bloquearCajaPorInactividad() {
  if (!window.cajeroActual) return;
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="min-h-[70vh] flex items-center justify-center p-4">' +
    '<div class="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">' +
    '<div class="text-4xl mb-3">🔒</div>' +
    '<h2 class="text-xl font-bold mb-2">Caja bloqueada</h2>' +
    '<p class="text-sm text-gray-500 mb-4">Inactividad. Continuar como <b>' + window.cajeroActual + '</b></p>' +
    '<button onclick="desbloquearCaja()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">Continuar turno</button>' +
    '<button onclick="cambiarCajero()" class="w-full mt-2 border py-3 rounded-2xl text-sm">Cambiar cajero</button></div></div>';
}

window.desbloquearCaja = function () {
  if (typeof view === 'function') view('venta');
  resetIdleTimer();
};

['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (ev) {
  document.addEventListener(ev, resetIdleTimer, { passive: true });
});

document.addEventListener('keydown', function (e) {
  if (!window.cajeroActual) return;
  if (e.key === 'F2') {
    e.preventDefault();
    if (typeof finalizarVenta === 'function') finalizarVenta();
  }
});

/* Historial + reimprimir */
window.cargarHistorialCajero = function () {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="flex flex-wrap justify-between items-center gap-3 mb-6">' +
    '<h1 class="text-2xl md:text-3xl font-bold">Historial de mi caja</h1>' +
    '<span class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">' + (window.cajeroActual || '') + '</span></div>' +
    '<div id="hist"></div>';

  db.collection('ventas').orderBy('fecha', 'desc').limit(80).onSnapshot(function (snap) {
    var html = '';
    var totalDia = 0, count = 0;
    var inicio = typeof obtenerInicioHoy === 'function' ? obtenerInicioHoy() : new Date(new Date().setHours(0,0,0,0));

    snap.forEach(function (doc) {
      var v = doc.data();
      if ((v.cajero || '') !== (window.cajeroActual || '')) return;
      var fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (fecha && fecha >= inicio) { totalDia += Number(v.total) || 0; count++; }

      var safe = JSON.stringify({
        productos: v.productos || [],
        total: v.total,
        metodoPago: v.metodoPago,
        montoRecibido: v.montoRecibido,
        cambio: v.cambio,
        cliente: v.cliente,
        nit: v.nit,
        folio: v.folio,
        cajero: v.cajero,
        nota: v.nota
      }).replace(/&/g, '&').replace(/"/g, '"');

      html += '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex justify-between gap-2"><div>' +
        '<div class="font-bold text-lg">Total: Q' + (v.total || 0) + '</div>' +
        (v.folio ? '<div class="text-xs text-gray-400">Folio ' + v.folio + '</div>' : '') +
        '<div class="text-sm">Cliente: ' + (v.cliente || 'Consumidor Final') + '</div>' +
        (v.nota ? '<div class="text-xs text-gray-500">Nota: ' + v.nota + '</div>' : '') +
        '</div><div class="text-right">' +
        '<div class="text-sm">' + (v.metodoPago || '') + '</div>' +
        '<button data-venta="' + safe + '" onclick="reimprimirDesdeBtn(this)" class="mt-2 text-xs px-3 py-1.5 bg-slate-100 rounded-lg">' +
        '<i class="fas fa-print"></i> Reimprimir</button></div></div>' +
        '<div class="text-xs text-gray-500 mt-2">' + (fecha ? fecha.toLocaleString('es-GT') : '') + '</div></div>';
    });

    document.getElementById('hist').innerHTML =
      '<div class="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 justify-between">' +
      '<div><p class="text-xs text-green-700">Ventas de hoy</p><p class="text-2xl font-bold text-green-800">' + count + '</p></div>' +
      '<div><p class="text-xs text-green-700">Total del día</p><p class="text-2xl font-bold text-green-800">Q' + totalDia.toFixed(2) + '</p></div></div>' +
      (html || '<p class="text-gray-400 py-12 text-center">Sin ventas</p>');
  });
};

window.reimprimirDesdeBtn = function (btn) {
  try {
    var v = JSON.parse(btn.getAttribute('data-venta'));
    if (typeof reimprimirTicketVenta === 'function') reimprimirTicketVenta(v);
  } catch (e) {
    alert('No se pudo reimprimir');
  }
};
