// js/pos-turno.js
window.turnoActual = null;

window.obtenerInicioHoy = function () {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

window.irAVentaSeguro = function () {
  if (window._navegandoVenta) return;
  window._navegandoVenta = true;
  try {
    if (typeof view === 'function') view('venta');
  } catch (e) {
    console.error('irAVentaSeguro:', e);
  } finally {
    setTimeout(function () { window._navegandoVenta = false; }, 400);
  }
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
      var data = doc.data() || {};
      window.turnoActual = {
        id: doc.id,
        cajero: data.cajero,
        montoInicial: data.montoInicial,
        estado: data.estado,
        abiertoEn: data.abiertoEn
      };
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
  if (typeof mostrarUICaja === 'function') mostrarUICaja(true);

  app.innerHTML =
    '<div class="min-h-[70vh] flex items-center justify-center p-4">' +
    '<div class="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">' +
    '<div class="text-center mb-6">' +
    '<div class="w-16 h-16 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">💰</div>' +
    '<h2 class="text-2xl font-bold">Abrir turno de caja</h2>' +
    '<p class="text-sm text-gray-500 mt-1">Cajero: <b>' + (cajero || window.cajeroActual || '') + '</b></p></div>' +
    '<label class="block text-sm font-medium text-gray-700 mb-1">Efectivo inicial (fondo de caja)</label>' +
    '<input id="montoInicialTurno" type="number" min="0" step="0.01" value="0" ' +
    'class="w-full p-4 border rounded-2xl text-lg mb-4" placeholder="Ej: 200.00">' +
    '<button type="button" id="btnAbrirTurno" class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold">' +
    'Abrir turno y vender</button>' +
    '<p class="text-xs text-gray-400 text-center mt-4">Al cerrar harás arqueo (efectivo contado)</p>' +
    '</div></div>';

  var btn = document.getElementById('btnAbrirTurno');
  if (btn) btn.onclick = function () { abrirTurnoCaja(); };
};

window.abrirTurnoCaja = async function () {
  var input = document.getElementById('montoInicialTurno');
  var monto = input ? (parseFloat(input.value) || 0) : 0;
  if (!window.cajeroActual) return alert('No hay cajero');

  var btn = document.getElementById('btnAbrirTurno');
  if (btn) { btn.disabled = true; btn.textContent = 'Abriendo...'; }

  try {
    var payload = {
      cajero: String(window.cajeroActual),
      montoInicial: Number(monto) || 0,
      estado: 'abierto',
      abiertoEn: new Date(),
      totalVentas: 0,
      cantidadVentas: 0,
      userId: (auth.currentUser && auth.currentUser.uid) || null
    };
    var ref = await db.collection('turnos_caja').add(payload);
    window.turnoActual = {
      id: ref.id,
      cajero: payload.cajero,
      montoInicial: payload.montoInicial,
      estado: 'abierto',
      abiertoEn: new Date()
    };
    localStorage.setItem('turnoCajaId', ref.id);
    if (typeof actualizarBarraEstadoCaja === 'function') actualizarBarraEstadoCaja();
    setTimeout(function () { irAVentaSeguro(); }, 50);
  } catch (e) {
    console.error(e);
    alert('Error al abrir turno: ' + (e.message || e));
    if (btn) { btn.disabled = false; btn.textContent = 'Abrir turno y vender'; }
  }
};

/** Calcula resumen del turno actual */
window.calcularResumenTurno = async function () {
  var desde = window.turnoActual && window.turnoActual.abiertoEn;
  if (desde && desde.toDate) desde = desde.toDate();
  if (!(desde instanceof Date)) desde = new Date(desde || Date.now());

  var snap = await db.collection('ventas').where('cajero', '==', window.cajeroActual).get();
  var total = 0, cantidad = 0, porMetodo = {}, efectivo = 0;

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
  return { total: total, cantidad: cantidad, porMetodo: porMetodo, efectivo: efectivo, esperado: esperado, desde: desde };
};

window.cerrarTurnoCaja = async function () {
  if (typeof esRolSinTurno === 'function' && esRolSinTurno()) {
    alert('Admin/Supervisor no requieren cierre de turno. Las ventas ya quedan a tu nombre.');
    return;
  }

  if (!window.turnoActual || !window.turnoActual.id) {
    if (typeof mostrarAperturaTurno === 'function') {
      mostrarAperturaTurno(window.cajeroActual);
    } else {
      alert('No hay turno abierto');
    }
    return;
  }

  try {
    var r = await calcularResumenTurno();
    var app = document.getElementById('app');
    if (!app) return;

    var metodosHtml = Object.keys(r.porMetodo).map(function (m) {
      return '<div class="flex justify-between text-sm"><span>' + m + '</span><b>Q' + r.porMetodo[m].toFixed(2) + '</b></div>';
    }).join('') || '<p class="text-sm text-gray-400">Sin ventas en este turno</p>';

    app.innerHTML =
      '<div class="min-h-[70vh] flex items-center justify-center p-4">' +
      '<div class="bg-white p-6 md:p-8 rounded-3xl shadow-xl max-w-md w-full">' +
      '<h2 class="text-2xl font-bold mb-1">Arqueo de caja</h2>' +
      '<p class="text-sm text-gray-500 mb-4">Cajero: <b>' + (window.cajeroActual || '') + '</b></p>' +
      '<div class="bg-gray-50 rounded-2xl p-4 space-y-2 mb-4">' +
      '<div class="flex justify-between text-sm"><span>Ventas</span><b>' + r.cantidad + '</b></div>' +
      '<div class="flex justify-between text-sm"><span>Total vendido</span><b>Q' + r.total.toFixed(2) + '</b></div>' +
      '<div class="flex justify-between text-sm"><span>Fondo inicial</span><b>Q' + Number(window.turnoActual.montoInicial || 0).toFixed(2) + '</b></div>' +
      '<div class="flex justify-between text-sm"><span>Efectivo ventas</span><b>Q' + r.efectivo.toFixed(2) + '</b></div>' +
      '<div class="flex justify-between text-base font-bold text-green-800 border-t pt-2"><span>Efectivo esperado</span><span>Q' + r.esperado.toFixed(2) + '</span></div>' +
      '</div>' +
      '<div class="mb-4 space-y-1">' + metodosHtml + '</div>' +
      '<label class="block text-sm font-medium mb-1">Efectivo contado en caja</label>' +
      '<input id="efectivoContado" type="number" step="0.01" min="0" value="' + r.esperado.toFixed(2) + '" ' +
      'class="w-full p-4 border rounded-2xl text-lg mb-2" oninput="actualizarDiferenciaArqueo(' + r.esperado + ')">' +
      '<p id="diffArqueo" class="text-sm mb-3 text-gray-600">Diferencia: Q0.00</p>' +
      '<label class="block text-sm font-medium mb-1">Nota (opcional)</label>' +
      '<input id="notaArqueo" class="w-full p-3 border rounded-xl mb-4" placeholder="Ej. faltante por cambio">' +
      '<button type="button" onclick="confirmarCierreTurno()" class="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold">Confirmar cierre</button>' +
      '<button type="button" onclick="irAVentaSeguro()" class="w-full mt-2 border py-3 rounded-2xl text-sm">Volver a vender</button>' +
      '</div></div>';

    window._resumenTurnoPendiente = r;
  } catch (e) {
    alert('Error al preparar arqueo: ' + e.message);
  }
};

window.actualizarDiferenciaArqueo = function (esperado) {
  var contado = parseFloat((document.getElementById('efectivoContado') || {}).value) || 0;
  var diff = contado - Number(esperado || 0);
  var el = document.getElementById('diffArqueo');
  if (!el) return;
  var txt = 'Diferencia: Q' + diff.toFixed(2);
  if (Math.abs(diff) < 0.01) {
    el.className = 'text-sm mb-3 text-green-700 font-medium';
    el.textContent = txt + ' (cuadrado)';
  } else if (diff < 0) {
    el.className = 'text-sm mb-3 text-red-600 font-medium';
    el.textContent = txt + ' (faltante)';
  } else {
    el.className = 'text-sm mb-3 text-amber-700 font-medium';
    el.textContent = txt + ' (sobrante)';
  }
};

window.confirmarCierreTurno = async function () {
  if (!window.turnoActual || !window.turnoActual.id || !window._resumenTurnoPendiente) return;
  var r = window._resumenTurnoPendiente;
  var contado = parseFloat((document.getElementById('efectivoContado') || {}).value) || 0;
  var nota = ((document.getElementById('notaArqueo') || {}).value || '').trim();
  var diferencia = contado - r.esperado;

  if (!confirm('Cerrar turno con diferencia Q' + diferencia.toFixed(2) + '?')) return;

  try {
    await db.collection('turnos_caja').doc(window.turnoActual.id).update({
      estado: 'cerrado',
      cerradoEn: new Date(),
      totalVentas: r.total,
      cantidadVentas: r.cantidad,
      porMetodo: r.porMetodo,
      efectivoVentas: r.efectivo,
      efectivoEsperado: r.esperado,
      efectivoContado: contado,
      diferencia: diferencia,
      notaArqueo: nota
    });

    alert(
      'Turno cerrado\n\n' +
      'Ventas: ' + r.cantidad + '\n' +
      'Total: Q' + r.total.toFixed(2) + '\n' +
      'Esperado: Q' + r.esperado.toFixed(2) + '\n' +
      'Contado: Q' + contado.toFixed(2) + '\n' +
      'Diferencia: Q' + diferencia.toFixed(2)
    );

    window.turnoActual = null;
    window._resumenTurnoPendiente = null;
    localStorage.removeItem('turnoCajaId');
    if (typeof actualizarBarraEstadoCaja === 'function') actualizarBarraEstadoCaja();
    if (typeof mostrarAperturaTurno === 'function') {
      mostrarAperturaTurno(window.cajeroActual);
    }
  } catch (e) {
    alert('Error al cerrar: ' + e.message);
  }
};

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
        '<div class="font-bold text-lg">Total: Q' + (v.total || 0) + '</div>' +
        '<div class="text-sm">Cliente: ' + (v.cliente || 'Consumidor Final') + '</div>' +
        '<div class="text-xs text-gray-500 mt-2">' +
        (fecha ? fecha.toLocaleString('es-GT') : '') + ' · ' + (v.metodoPago || '') +
        '</div></div>';
    });

    var hist = document.getElementById('hist');
    if (!hist) return;
    hist.innerHTML =
      '<div class="bg-green-50 rounded-2xl p-4 mb-4 flex gap-6">' +
      '<div><p class="text-xs text-green-700">Ventas hoy</p><p class="text-2xl font-bold">' + count + '</p></div>' +
      '<div><p class="text-xs text-green-700">Total</p><p class="text-2xl font-bold">Q' + totalDia.toFixed(2) + '</p></div></div>' +
      (html || '<p class="text-gray-400 py-12 text-center">Sin ventas</p>');
  });
};
