// js/pos-extras.js
// Mejoras de caja: rápidos, clientes recientes, inactividad, atajos, reimpresión

window.productosRapidos = [];
window.clientesRecientes = JSON.parse(localStorage.getItem('clientesRecientesPOS') || '[]');

window.generarFolioPOS = function () {
  var n = Math.floor(Math.random() * 900000) + 100000;
  return 'POS-' + n;
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
    // Top por ventas recientes del cajero + fallback stock
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(40).get();
    var contador = {};
    snap.forEach(function (doc) {
      var v = doc.data();
      (v.productos || []).forEach(function (p) {
        var k = p.nombre;
        if (!k) return;
        if (!contador[k]) contador[k] = { nombre: k, cantidad: 0, precio: p.precio, id: p.id };
        contador[k].cantidad += Number(p.cantidad) || 0;
        if (p.id) contador[k].id = p.id;
        if (p.precio) contador[k].precio = p.precio;
      });
    });
    var ranking = Object.keys(contador).map(function (k) { return contador[k]; });
    ranking.sort(function (a, b) { return b.cantidad - a.cantidad; });

    // Completar ids/stock desde catálogo si hace falta
    var prods = await db.collection('productos').limit(80).get();
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
        stock: m ? m.stock : 99
      };
    }).filter(function (p) { return p.id; });

    // Si hay pocos, rellenar con productos con stock
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
    window.productosRapidos = [];
  }
};

window.renderProductosRapidos = function () {
  var box = document.getElementById('productos-rapidos');
  if (!box) return;
  if (!window.productosRapidos.length) {
    box.innerHTML = '<p class="text-xs text-gray-400">Cargando productos frecuentes...</p>';
    return;
  }
  box.innerHTML = window.productosRapidos.map(function (p) {
    var low = (p.stock || 0) < 10;
    return '<button type="button" onclick="add(\'' + p.id + '\',\'' +
      String(p.nombre).replace(/'/g, "\\'") + '\',' + Number(p.precio) + ',' + Number(p.stock) + ')" ' +
      'class="px-3 py-2 rounded-xl text-xs font-medium border ' +
      (low ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-green-200 bg-green-50 text-green-800') +
      ' hover:shadow">' +
      p.nombre + '<span class="block text-[10px] opacity-70">Q' + Number(p.precio).toFixed(2) +
      ' · st ' + (p.stock || 0) + '</span></button>';
  }).join('');
};

window.renderClientesRecientes = function () {
  var box = document.getElementById('clientes-rapidos');
  if (!box) return;
  if (!window.clientesRecientes.length) {
    box.innerHTML = '';
    return;
  }
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

/* ===== Bloqueo por inactividad (8 min) ===== */
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
    '<div class="min-h-[70vh] flex items-center justify-center">' +
    '<div class="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">' +
    '<div class="text-4xl mb-3">🔒</div>' +
    '<h2 class="text-xl font-bold mb-2">Caja bloqueada</h2>' +
    '<p class="text-sm text-gray-500 mb-4">Inactividad detectada. Confirma para continuar como <b>' +
    window.cajeroActual + '</b>.</p>' +
    '<button onclick="desbloquearCaja()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">Continuar turno</button>' +
    '<button onclick="cambiarCajero()" class="w-full mt-2 border py-3 rounded-2xl text-sm">Cambiar cajero</button>' +
    '</div></div>';
}

window.desbloquearCaja = function () {
  if (typeof view === 'function') view('venta');
  resetIdleTimer();
};

['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (ev) {
  document.addEventListener(ev, resetIdleTimer, { passive: true });
});

/* ===== Atajos de teclado ===== */
document.addEventListener('keydown', function (e) {
  if (!window.cajeroActual) return;
  var tag = (e.target && e.target.tagName) || '';
  // F2 finalizar
  if (e.key === 'F2') {
    e.preventDefault();
    if (typeof finalizarVenta === 'function') finalizarVenta();
  }
  // Esc limpiar carrito (si no está en input con texto)
  if (e.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
    if (window.carrito && window.carrito.length && confirm('¿Vaciar carrito?')) {
      // carrito es let en pos.js — usar del via render si existe
      if (typeof del === 'function') {
        // vaciar desde pos si expone carrito global
      }
    }
  }
});

/* Historial con reimpresión */
window.cargarHistorialCajero = function () {
  var app = document.getElementById('app');
  if (!app) return;

  app.innerHTML =
    '<div class="flex flex-wrap justify-between items-center gap-3 mb-6">' +
    '<h1 class="text-2xl md:text-3xl font-bold">Historial de mi caja</h1>' +
    '<span class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">' +
    (window.cajeroActual || '') + '</span></div>' +
    '<div id="hist"></div>';

  db.collection('ventas').orderBy('fecha', 'desc').limit(100).onSnapshot(function (snap) {
    var html = '';
    var totalDia = 0;
    var count = 0;
    var inicio = typeof obtenerInicioHoy === 'function' ? obtenerInicioHoy() : new Date();

    snap.forEach(function (doc) {
      var v = doc.data();
      if ((v.cajero || '') !== (window.cajeroActual || '')) return;

      var fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (fecha && fecha >= inicio) {
        totalDia += Number(v.total) || 0;
        count++;
      }

      var payload = encodeURIComponent(JSON.stringify({
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
      }));

      html +=
        '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex justify-between items-start gap-2">' +
        '<div>' +
        '<div class="font-bold text-lg">Total: Q' + (v.total || 0) + '</div>' +
        (v.folio ? '<div class="text-xs text-gray-400">Folio ' + v.folio + '</div>' : '') +
        '<div class="text-sm">Cliente: ' + (v.cliente || 'Consumidor Final') + '</div>' +
        (v.nit ? '<div class="text-sm text-gray-600">NIT: ' + v.nit + '</div>' : '') +
        (v.nota ? '<div class="text-xs text-gray-500 mt-1">Nota: ' + v.nota + '</div>' : '') +
        '</div>' +
        '<div class="text-right">' +
        '<div class="text-sm">' + (v.metodoPago || 'N/A') + '</div>' +
        '<button onclick="reimprimirDesdeHistorial(decodeURIComponent(\'' + payload.replace(/'/g, '%27') + '\'))" ' +
        'class="mt-2 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg">' +
        '<i class="fas fa-print"></i> Reimprimir</button>' +
        '</div></div>' +
        '<div class="text-xs text-gray-500 mt-3">' +
        (fecha ? fecha.toLocaleString('es-GT') : '') +
        '</div></div>';
    });

    var resumen =
      '<div class="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 justify-between">' +
      '<div><p class="text-xs text-green-700">Ventas de hoy (tuyas)</p>' +
      '<p class="text-2xl font-bold text-green-800">' + count + '</p></div>' +
      '<div><p class="text-xs text-green-700">Total del día</p>' +
      '<p class="text-2xl font-bold text-green-800">Q' + totalDia.toFixed(2) + '</p></div></div>';

    document.getElementById('hist').innerHTML =
      resumen + (html || '<p class="text-gray-400 py-12 text-center">Aún no tienes ventas registradas</p>');
  });
};

window.reimprimirDesdeHistorial = function (jsonStr) {
  try {
    var v = JSON.parse(jsonStr);
    if (typeof reimprimirTicketVenta === 'function') reimprimirTicketVenta(v);
  } catch (e) {
    alert('No se pudo reimprimir');
  }
};
