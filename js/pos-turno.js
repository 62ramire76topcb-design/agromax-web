// js/pos-turno.js
// Turno de caja + historial solo del cajero actual

window.turnoActual = null;

window.obtenerInicioHoy = function () {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

window.cargarTurnoAbierto = async function (cajero) {
  try {
    var snap = await db.collection('turnos_caja')
      .where('cajero', '==', cajero)
      .where('estado', '==', 'abierto')
      .limit(1)
      .get();
    if (!snap.empty) {
      var doc = snap.docs[0];
      window.turnoActual = { id: doc.id, ...doc.data() };
      localStorage.setItem('turnoCajaId', doc.id);
      return window.turnoActual;
    }
  } catch (e) {
    console.warn('turno:', e);
  }
  window.turnoActual = null;
  localStorage.removeItem('turnoCajaId');
  return null;
};

window.mostrarAperturaTurno = function (cajero) {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="min-h-[70vh] flex items-center justify-center">' +
    '<div class="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">' +
    '<div class="text-center mb-6">' +
    '<div class="w-16 h-16 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">💰</div>' +
    '<h2 class="text-2xl font-bold">Abrir turno de caja</h2>' +
    '<p class="text-sm text-gray-500 mt-1">Cajero: <b>' + cajero + '</b></p></div>' +
    '<label class="block text-sm font-medium text-gray-700 mb-1">Efectivo inicial (fondo de caja)</label>' +
    '<input id="montoInicialTurno" type="number" min="0" step="0.01" value="0" ' +
    'class="w-full p-4 border rounded-2xl text-lg mb-4" placeholder="Ej: 200.00">' +
    '<button onclick="abrirTurnoCaja()" class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold">' +
    'Abrir turno y vender</button>' +
    '<p class="text-xs text-gray-400 text-center mt-4">Al cerrar el turno verás el resumen de ventas del día</p>' +
    '</div></div>';
};

window.abrirTurnoCaja = async function () {
  var monto = parseFloat(document.getElementById('montoInicialTurno').value) || 0;
  if (!window.cajeroActual) return alert('No hay cajero seleccionado');

  try {
    var ref = await db.collection('turnos_caja').add({
      cajero: window.cajeroActual,
      montoInicial: monto,
      estado: 'abierto',
      abiertoEn: new Date(),
      totalVentas: 0,
      cantidadVentas: 0,
      porMetodo: {}
    });
    window.turnoActual = {
      id: ref.id,
      cajero: window.cajeroActual,
      montoInicial: monto,
      estado: 'abierto',
      abiertoEn: new Date()
    };
    localStorage.setItem('turnoCajaId', ref.id);
    if (typeof view === 'function') view('venta');
  } catch (e) {
    alert('Error al abrir turno: ' + e.message);
  }
};

window.cerrarTurnoCaja = async function () {
  if (!window.turnoActual || !window.turnoActual.id) {
    return alert('No hay turno abierto');
  }
  if (!confirm('¿Cerrar turno de ' + window.cajeroActual + '?')) return;

  try {
    var desde = window.turnoActual.abiertoEn;
    if (desde && desde.toDate) desde = desde.toDate();
    if (!(desde instanceof Date)) desde = new Date(desde || Date.now());

    var snap = await db.collection('ventas')
      .where('cajero', '==', window.cajeroActual)
      .get();

    var total = 0;
    var cantidad = 0;
    var porMetodo = {};
    var efectivo = 0;

    snap.forEach(function (doc) {
      var v = doc.data();
      var f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (!f || f < desde) return;
      var t = Number(v.total) || 0;
      total += t;
      cantidad++;
      var m = v.metodoPago || 'Otro';
      porMetodo[m] = (porMetodo[m] || 0) + t;
      if (m === 'Efectivo') efectivo += t;
    });

    var esperado = (Number(window.turnoActual.montoInicial) || 0) + efectivo;

    await db.collection('turnos_caja').doc(window.turnoActual.id).update({
      estado: 'cerrado',
      cerradoEn: new Date(),
      totalVentas: total,
      cantidadVentas: cantidad,
      porMetodo: porMetodo,
      efectivoVentas: efectivo,
      efectivoEsperado: esperado
    });

    var detalleMetodos = Object.keys(porMetodo).map(function (m) {
      return m + ': Q' + porMetodo[m].toFixed(2);
    }).join('\n');

    alert(
      '✅ Turno cerrado\n\n' +
      'Ventas: ' + cantidad + '\n' +
      'Total: Q' + total.toFixed(2) + '\n' +
      (detalleMetodos ? detalleMetodos + '\n' : '') +
      'Efectivo en caja (estimado): Q' + esperado.toFixed(2)
    );

    window.turnoActual = null;
    localStorage.removeItem('turnoCajaId');
    localStorage.removeItem('ultimoCajero');
    window.cajeroActual = '';
    if (typeof mostrarSeleccionCajero === 'function') mostrarSeleccionCajero();
  } catch (e) {
    alert('Error al cerrar turno: ' + e.message);
  }
};

/** Historial filtrado solo del cajero actual (y preferible del día) */
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
    var inicio = obtenerInicioHoy();

    snap.forEach(function (doc) {
      var v = doc.data();
      if ((v.cajero || '') !== (window.cajeroActual || '')) return;

      var fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (fecha && fecha >= inicio) {
        totalDia += Number(v.total) || 0;
        count++;
      }

      html +=
        '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex justify-between items-start">' +
        '<div>' +
        '<div class="font-bold text-lg">Total: Q' + (v.total || 0) + '</div>' +
        '<div class="text-sm">Cliente: ' + (v.cliente || 'Consumidor Final') + '</div>' +
        (v.nit ? '<div class="text-sm text-gray-600">NIT: ' + v.nit + '</div>' : '') +
        '</div>' +
        '<div class="text-right">' +
        '<div class="text-sm">' + (v.metodoPago || 'N/A') + '</div>' +
        (v.metodoPago === 'Efectivo'
          ? '<div class="text-xs text-gray-600">Recibido: Q' + (v.montoRecibido || 0) +
            ' | Cambio: Q' + (v.cambio || 0) + '</div>'
          : '') +
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
