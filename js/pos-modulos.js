// js/pos-modulos.js
// Reimpresión, corte diario, escáner, dashboard caja, pendientes, vencimientos

window._ventasCache = {};

/** Jornada de caja: de 01:00 a 24:00 (medianoche) */
window.obtenerRangoJornada = function () {
  var ahora = new Date();
  var inicio = new Date(ahora);
  // Si es antes de la 1 AM, la jornada es del día anterior 1 AM
  if (ahora.getHours() < 1) {
    inicio.setDate(inicio.getDate() - 1);
  }
  inicio.setHours(1, 0, 0, 0);
  var fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  fin.setHours(0, 0, 0, 0); // medianoche siguiente = fin de jornada
  return { inicio: inicio, fin: fin };
};

/* ========== REIMPRESIÓN FIABLE ========== */
window.reimprimirVentaPorId = async function (id) {
  try {
    var v = window._ventasCache[id];
    if (!v) {
      var doc = await db.collection('ventas').doc(id).get();
      if (!doc.exists) throw new Error('Venta no encontrada');
      v = doc.data();
    }
    if (typeof reimprimirTicketVenta === 'function') {
      reimprimirTicketVenta(v);
    } else if (typeof abrirTicket === 'function') {
      abrirTicket(
        v.productos || [],
        Number(v.total) || 0,
        v.metodoPago || '',
        Number(v.montoRecibido) || 0,
        Number(v.cambio) || 0,
        v.cliente || 'Consumidor Final',
        v.nit || '',
        { folio: v.folio || id.slice(-8), cajero: v.cajero || '', nota: v.nota || '' }
      );
    } else {
      alert('Función de ticket no disponible');
    }
  } catch (e) {
    alert('No se pudo reimprimir: ' + (e.message || e));
  }
};

/* ========== HISTORIAL CON REIMPRESIÓN ========== */
window.cargarHistorialCajero = function () {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="flex flex-wrap justify-between items-center gap-3 mb-4">' +
    '<h1 class="text-2xl font-bold">Mi historial</h1>' +
    '<div class="flex gap-2">' +
    '<button onclick="imprimirCorteDia()" class="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl">' +
    '<i class="fas fa-file-alt"></i> Documento del día</button>' +
    '<span class="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full self-center">' +
    (window.cajeroActual || '') + '</span></div></div>' +
    '<div id="hist"></div>';

  db.collection('ventas').orderBy('fecha', 'desc').limit(100).onSnapshot(function (snap) {
    var rango = obtenerRangoJornada();
    var html = '';
    var totalDia = 0, count = 0;
    window._ventasCache = {};

    snap.forEach(function (doc) {
      var v = doc.data();
      window._ventasCache[doc.id] = v;
      if ((v.cajero || '') !== (window.cajeroActual || '')) return;

      var fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (fecha && fecha >= rango.inicio && fecha < rango.fin) {
        totalDia += Number(v.total) || 0;
        count++;
      }

      html +=
        '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex justify-between gap-2">' +
        '<div>' +
        '<div class="font-bold text-lg">Total: Q' + (Number(v.total) || 0).toFixed(2) + '</div>' +
        (v.folio ? '<div class="text-xs text-gray-400">Folio ' + v.folio + '</div>' : '') +
        '<div class="text-sm">Cliente: ' + (v.cliente || 'Consumidor Final') + '</div>' +
        (v.nota ? '<div class="text-xs text-gray-500">Nota: ' + v.nota + '</div>' : '') +
        '</div>' +
        '<div class="text-right">' +
        '<div class="text-sm">' + (v.metodoPago || '') + '</div>' +
        '<button onclick="reimprimirVentaPorId(\'' + doc.id + '\')" ' +
        'class="mt-2 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg">' +
        '<i class="fas fa-print"></i> Reimprimir</button>' +
        '</div></div>' +
        '<div class="text-xs text-gray-500 mt-2">' +
        (fecha ? fecha.toLocaleString('es-GT') : '') +
        '</div></div>';
    });

    document.getElementById('hist').innerHTML =
      '<div class="bg-green-50 border border-green-100 rounded-2xl p-4 mb-4 flex flex-wrap gap-4 justify-between">' +
      '<div><p class="text-xs text-green-700">Ventas jornada (1am–12am)</p>' +
      '<p class="text-2xl font-bold text-green-800">' + count + '</p></div>' +
      '<div><p class="text-xs text-green-700">Total jornada</p>' +
      '<p class="text-2xl font-bold text-green-800">Q' + totalDia.toFixed(2) + '</p></div></div>' +
      (html || '<p class="text-gray-400 py-12 text-center">Sin ventas</p>');
  });
};

/* ========== DOCUMENTO / CORTE DEL DÍA ========== */
window.imprimirCorteDia = async function () {
  if (!window.cajeroActual) return alert('Selecciona cajero');
  var rango = obtenerRangoJornada();
  try {
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(200).get();
    var filas = [];
    var total = 0;
    var porMetodo = {};
    var n = 0;

    snap.forEach(function (doc) {
      var v = doc.data();
      if ((v.cajero || '') !== window.cajeroActual) return;
      var f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (!f || f < rango.inicio || f >= rango.fin) return;
      n++;
      total += Number(v.total) || 0;
      var m = v.metodoPago || 'Otro';
      porMetodo[m] = (porMetodo[m] || 0) + (Number(v.total) || 0);
      filas.push({
        hora: f.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        cliente: v.cliente || 'Consumidor Final',
        folio: v.folio || doc.id.slice(-6),
        metodo: m,
        total: Number(v.total) || 0
      });
    });

    var metodosHtml = Object.keys(porMetodo).map(function (m) {
      return '<tr><td>' + m + '</td><td style="text-align:right">Q' + porMetodo[m].toFixed(2) + '</td></tr>';
    }).join('');

    var ventasHtml = filas.map(function (r) {
      return '<tr><td>' + r.hora + '</td><td>' + r.folio + '</td><td>' + r.cliente +
        '</td><td>' + r.metodo + '</td><td style="text-align:right">Q' + r.total.toFixed(2) + '</td></tr>';
    }).join('');

    var win = window.open('', 'CORTE', 'width=700,height=900');
    win.document.write(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Corte del día</title>' +
      '<style>body{font-family:Arial;padding:24px;font-size:13px}' +
      'h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}' +
      'th,td{border-bottom:1px solid #ddd;padding:6px;text-align:left}' +
      '.tot{font-size:18px;font-weight:bold;margin-top:16px}</style></head><body>' +
      '<h1>🌱 AGROMAXGTM — Corte de caja</h1>' +
      '<p>Cajero: <b>' + window.cajeroActual + '</b><br>' +
      'Jornada: ' + rango.inicio.toLocaleString('es-GT') + ' → ' + rango.fin.toLocaleString('es-GT') +
      '<br>Generado: ' + new Date().toLocaleString('es-GT') + '</p>' +
      '<h3>Resumen por método</h3><table><thead><tr><th>Método</th><th>Total</th></tr></thead><tbody>' +
      metodosHtml + '</tbody></table>' +
      '<p class="tot">Ventas: ' + n + ' &nbsp;|&nbsp; TOTAL: Q' + total.toFixed(2) + '</p>' +
      '<h3>Detalle</h3><table><thead><tr><th>Hora</th><th>Folio</th><th>Cliente</th><th>Pago</th><th>Total</th></tr></thead><tbody>' +
      (ventasHtml || '<tr><td colspan="5">Sin ventas en la jornada</td></tr>') +
      '</tbody></table>' +
      '<script>window.print()</script></body></html>'
    );
    win.document.close();
  } catch (e) {
    alert('Error al generar documento: ' + e.message);
  }
};

/* ========== PENDIENTES MEJORADAS ========== */
window.cargarPendientesMejoradas = function () {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="flex flex-wrap justify-between items-center gap-3 mb-4">' +
    '<h1 class="text-2xl font-bold">Ventas pendientes</h1>' +
    '<button onclick="view(\'venta\')" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">+ Nueva venta</button>' +
    '</div><div id="pend"></div>';

  db.collection('ventas_pendientes').where('estado', '==', 'pendiente').onSnapshot(function (snap) {
    var html = '';
    snap.forEach(function (doc) {
      var v = doc.data();
      if (v.cajero && window.cajeroActual && v.cajero !== window.cajeroActual) return;
      var items = (v.productos || []).map(function (p) {
        return p.nombre + ' x' + p.cantidad;
      }).join(', ');
      var sub = (v.productos || []).reduce(function (s, p) {
        return s + (Number(p.precio) || 0) * (Number(p.cantidad) || 0);
      }, 0);

      html +=
        '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex flex-wrap justify-between gap-3">' +
        '<div class="flex-1 min-w-[200px]">' +
        '<div class="font-semibold">' + (v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString('es-GT') : '') + '</div>' +
        '<div class="text-sm text-gray-600">Cajero: ' + (v.cajero || '-') + '</div>' +
        '<div class="text-xs text-gray-500 mt-1 line-clamp-2">' + (items || 'Sin productos') + '</div>' +
        '<div class="text-sm font-bold mt-1">Q' + sub.toFixed(2) + '</div>' +
        '</div>' +
        '<div class="flex flex-col gap-2">' +
        '<button onclick="cargarPendiente(\'' + doc.id + '\')" class="bg-green-600 text-white px-3 py-2 rounded-xl text-sm">Abrir en carrito</button>' +
        '<button onclick="eliminarPendiente(\'' + doc.id + '\')" class="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-sm">Eliminar</button>' +
        '</div></div></div>';
    });
    document.getElementById('pend').innerHTML = html ||
      '<p class="text-gray-400 py-12 text-center">No hay ventas pendientes</p>';
  });
};

window.eliminarPendiente = async function (id) {
  if (!confirm('¿Eliminar esta venta pendiente?')) return;
  try {
    await db.collection('ventas_pendientes').doc(id).delete();
  } catch (e) {
    alert(e.message);
  }
};

/* ========== ESCÁNER ========== */
window.buscarPorCodigo = async function (codigo) {
  codigo = (codigo || '').trim();
  if (!codigo) return;
  try {
    // Buscar por campo codigo / barcode / id documento
    var snap = await db.collection('productos').limit(100).get();
    var encontrado = null;
    snap.forEach(function (doc) {
      if (encontrado) return;
      var p = doc.data();
      var cod = String(p.codigo || p.barcode || p.sku || '').trim();
      if (cod && cod === codigo) encontrado = { id: doc.id, ...p };
      if (doc.id === codigo) encontrado = { id: doc.id, ...p };
    });
    // fallback: nombre parcial
    if (!encontrado) {
      var t = codigo.toLowerCase();
      snap.forEach(function (doc) {
        if (encontrado) return;
        var p = doc.data();
        if ((p.nombre || '').toLowerCase().includes(t)) encontrado = { id: doc.id, ...p };
      });
    }
    if (!encontrado) {
      alert('Producto no encontrado: ' + codigo);
      return;
    }
    if (typeof add === 'function') {
      add(encontrado.id, encontrado.nombre, encontrado.precio || 0, encontrado.stock || 0);
    }
    var input = document.getElementById('scanCodigo');
    if (input) { input.value = ''; input.focus(); }
  } catch (e) {
    alert('Error al escanear: ' + e.message);
  }
};

window.activarEscannerUI = function () {
  if (document.getElementById('scan-box')) return;
  var results = document.getElementById('results');
  if (!results) return;
  var box = document.createElement('div');
  box.id = 'scan-box';
  box.className = 'mb-4 p-3 bg-slate-50 border rounded-2xl';
  box.innerHTML =
    '<label class="text-xs font-semibold text-gray-600">📱 Escáner / código de producto</label>' +
    '<div class="flex gap-2 mt-1">' +
    '<input id="scanCodigo" type="text" placeholder="Escanea o escribe código y Enter" ' +
    'class="flex-1 p-3 border rounded-xl text-sm" autocomplete="off">' +
    '<button type="button" onclick="buscarPorCodigo(document.getElementById(\'scanCodigo\').value)" ' +
    'class="bg-green-600 text-white px-4 rounded-xl text-sm">Agregar</button></div>' +
    '<p class="text-[10px] text-gray-400 mt-1">Usa lector USB o escribe el código del producto</p>';
  results.parentNode.insertBefore(box, results);
  var input = document.getElementById('scanCodigo');
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarPorCodigo(input.value);
    }
  });
};

/* ========== DASHBOARD CAJA ========== */
window.cargarDashboardCaja = async function () {
  var app = document.getElementById('app');
  app.innerHTML =
    '<h1 class="text-2xl font-bold mb-4">Dashboard de caja</h1>' +
    '<div id="dash-caja" class="space-y-4">Cargando...</div>';

  var rango = obtenerRangoJornada();
  try {
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(200).get();
    var total = 0, count = 0, efectivo = 0, tarjeta = 0, otros = 0;
    var movimientos = [];

    snap.forEach(function (doc) {
      var v = doc.data();
      if ((v.cajero || '') !== (window.cajeroActual || '')) return;
      var f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (!f || f < rango.inicio || f >= rango.fin) return;
      var t = Number(v.total) || 0;
      total += t; count++;
      if (v.metodoPago === 'Efectivo') efectivo += t;
      else if (v.metodoPago === 'Tarjeta') tarjeta += t;
      else otros += t;
      movimientos.push({
        id: doc.id,
        hora: f.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        cliente: v.cliente || 'CF',
        metodo: v.metodoPago || '',
        total: t,
        folio: v.folio || ''
      });
    });

    var fondo = (window.turnoActual && window.turnoActual.montoInicial) || 0;
    var esperado = Number(fondo) + efectivo;

    var movHtml = movimientos.map(function (m) {
      return '<div class="flex justify-between text-sm py-2 border-b">' +
        '<span>' + m.hora + ' · ' + m.cliente + ' <span class="text-gray-400">' + m.folio + '</span></span>' +
        '<span class="font-medium">' + m.metodo + ' Q' + m.total.toFixed(2) + '</span></div>';
    }).join('');

    document.getElementById('dash-caja').innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3">' +
      card('Ventas', count, 'text-green-700') +
      card('Total', 'Q' + total.toFixed(2), 'text-green-800') +
      card('Efectivo', 'Q' + efectivo.toFixed(2), 'text-emerald-700') +
      card('En caja (est.)', 'Q' + esperado.toFixed(2), 'text-indigo-700') +
      '</div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      '<div class="bg-white rounded-2xl p-4 shadow">' +
      '<h3 class="font-bold mb-2">Por método</h3>' +
      '<p class="text-sm">Efectivo: <b>Q' + efectivo.toFixed(2) + '</b></p>' +
      '<p class="text-sm">Tarjeta: <b>Q' + tarjeta.toFixed(2) + '</b></p>' +
      '<p class="text-sm">Otros: <b>Q' + otros.toFixed(2) + '</b></p>' +
      '<p class="text-xs text-gray-400 mt-2">Fondo de turno: Q' + Number(fondo).toFixed(2) + '</p></div>' +
      '<div class="bg-white rounded-2xl p-4 shadow">' +
      '<h3 class="font-bold mb-2">Movimientos de la jornada</h3>' +
      '<div class="max-h-64 overflow-auto">' + (movHtml || '<p class="text-gray-400 text-sm">Sin movimientos</p>') +
      '</div></div></div>' +
      '<button onclick="imprimirCorteDia()" class="bg-indigo-600 text-white px-5 py-3 rounded-xl font-medium">' +
      '<i class="fas fa-print"></i> Imprimir documento del día</button>';
  } catch (e) {
    document.getElementById('dash-caja').innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }

  function card(label, val, cls) {
    return '<div class="bg-white rounded-2xl p-4 shadow"><p class="text-xs text-gray-500">' + label +
      '</p><p class="text-xl font-bold ' + cls + '">' + val + '</p></div>';
  }
};

/* ========== PRÓXIMOS A VENCER ========== */
window.cargarProximosVencer = async function () {
  var app = document.getElementById('app');
  app.innerHTML =
    '<h1 class="text-2xl font-bold mb-2">Productos próximos a vencer</h1>' +
    '<p class="text-sm text-gray-500 mb-4">Se muestran productos con fecha de vencimiento en los próximos 60 días (campo <code>fechaVencimiento</code>).</p>' +
    '<div id="venc-list">Cargando...</div>';

  try {
    var snap = await db.collection('productos').limit(200).get();
    var hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    var limite = new Date(hoy);
    limite.setDate(limite.getDate() + 60);
    var list = [];

    snap.forEach(function (doc) {
      var p = doc.data();
      var fv = p.fechaVencimiento || p.vencimiento || p.expiry;
      if (!fv) return;
      var d = fv.toDate ? fv.toDate() : new Date(fv);
      if (isNaN(d.getTime())) return;
      if (d >= hoy && d <= limite) {
        list.push({
          id: doc.id,
          nombre: p.nombre,
          stock: p.stock || 0,
          venc: d,
          dias: Math.ceil((d - hoy) / 86400000)
        });
      } else if (d < hoy) {
        list.push({
          id: doc.id,
          nombre: p.nombre,
          stock: p.stock || 0,
          venc: d,
          dias: Math.ceil((d - hoy) / 86400000),
          vencido: true
        });
      }
    });

    list.sort(function (a, b) { return a.dias - b.dias; });

    if (!list.length) {
      document.getElementById('venc-list').innerHTML =
        '<div class="bg-white p-8 rounded-2xl text-center text-gray-500">' +
        'No hay productos con fecha de vencimiento cargada.<br>' +
        '<span class="text-xs">En admin, agrega el campo <b>fechaVencimiento</b> (YYYY-MM-DD) a cada producto.</span></div>';
      return;
    }

    document.getElementById('venc-list').innerHTML = list.map(function (p) {
      var cls = p.vencido ? 'border-red-300 bg-red-50' : (p.dias <= 15 ? 'border-orange-300 bg-orange-50' : 'border-yellow-200 bg-yellow-50');
      return '<div class="p-4 rounded-xl border mb-2 ' + cls + ' flex justify-between gap-3">' +
        '<div><div class="font-semibold">' + p.nombre + '</div>' +
        '<div class="text-xs text-gray-600">Stock: ' + p.stock + '</div></div>' +
        '<div class="text-right text-sm">' +
        '<div class="font-bold">' + (p.vencido ? 'VENCIDO' : p.dias + ' días') + '</div>' +
        '<div class="text-xs">' + p.venc.toLocaleDateString('es-GT') + '</div></div></div>';
    }).join('');
  } catch (e) {
    document.getElementById('venc-list').innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
};

/* Hook view */
(function () {
  function install() {
    if (typeof view !== 'function' || view.__modulos) return;
    var _v = view;
    window.view = function (v) {
      if (v === 'pendientes') {
        if (!window.cajeroActual) { alert('Ingresa cajero primero'); return; }
        return cargarPendientesMejoradas();
      }
      if (v === 'historial') {
        if (!window.cajeroActual) { alert('Ingresa cajero primero'); return; }
        return cargarHistorialCajero();
      }
      if (v === 'dashboard-caja') {
        if (!window.cajeroActual) { alert('Ingresa cajero primero'); return; }
        return cargarDashboardCaja();
      }
      if (v === 'vencer') {
        if (!window.cajeroActual) { alert('Ingresa cajero primero'); return; }
        return cargarProximosVencer();
      }
      _v(v);
      if (v === 'venta') {
        setTimeout(function () {
          if (typeof activarEscannerUI === 'function') activarEscannerUI();
        }, 80);
      }
    };
    // preservar extras hook si existía
    window.view.__modulos = true;
    if (_v.__extras) window.view.__extras = true;
  }
  setTimeout(install, 50);
  setTimeout(install, 400);
})();
