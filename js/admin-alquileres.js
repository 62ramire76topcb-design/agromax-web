// js/admin-alquileres.js

function fmtQA(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.mostrarAlquileres = function () {
  var c = document.getElementById('main-content');
  if (!c) return;
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold text-slate-900">Alquileres</h1>' +
    '<p class="text-sm text-slate-500">Contratos de equipos y maquinaria</p></div>' +
    '<button type="button" onclick="alqTab(\'nuevo\')" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><i class="fas fa-plus mr-1"></i> Nuevo</button></div>' +
    '<div id="alq-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>' +
    '<div class="flex flex-wrap gap-1.5 mb-4">' +
    aTab('activos', 'Activos') + aTab('nuevo', 'Nuevo') + aTab('historial', 'Historial') +
    '</div><div id="alq-body"></div>';
  alqTab('activos');
  cargarKpisAlq();
};

function aTab(id, label) {
  return '<button type="button" data-atab="' + id + '" onclick="alqTab(\'' + id + '\')" class="atab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-white text-slate-600 border-slate-200">' + label + '</button>';
}

window.alqTab = function (id) {
  document.querySelectorAll('.atab').forEach(function (b) {
    var on = b.getAttribute('data-atab') === id;
    b.className = 'atab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  if (id === 'activos') renderAlqLista('Activo');
  else if (id === 'nuevo') renderAlqNuevo();
  else if (id === 'historial') renderAlqLista(null);
};

async function cargarKpisAlq() {
  var box = document.getElementById('alq-kpis');
  if (!box) return;
  try {
    var snap = await db.collection('alquileres').limit(100).get();
    var activos = 0, ingresos = 0, porVencer = 0;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);
    snap.forEach(function (d) {
      var a = d.data();
      if (a.estado === 'Activo') {
        activos++;
        ingresos += Number(a.monto) || 0;
        if (a.fechaFin) {
          var f = new Date(a.fechaFin);
          if (f >= hoy && f <= en7) porVencer++;
        }
      }
    });
    box.innerHTML =
      kpiA('Activos', String(activos), 'text-green-600') +
      kpiA('Ingreso mensual est.', fmtQA(ingresos), 'text-slate-800') +
      kpiA('Por vencer (7 días)', String(porVencer), 'text-amber-600') +
      kpiA('Total registros', String(snap.size), 'text-slate-500');
  } catch (e) { box.innerHTML = ''; }
}

function kpiA(l, v, c) {
  return '<div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">' +
    '<p class="text-[10px] uppercase text-slate-400 font-semibold">' + l + '</p>' +
    '<p class="text-lg font-bold ' + (c || '') + '">' + v + '</p></div>';
}

function renderAlqLista(soloEstado) {
  var body = document.getElementById('alq-body');
  body.innerHTML = '<p class="text-slate-400 text-center py-8"><i class="fas fa-spinner fa-spin"></i></p>';
  if (window._unsubAlq) try { window._unsubAlq(); } catch (e) {}

  var q = db.collection('alquileres').orderBy('fechaRegistro', 'desc').limit(60);
  window._unsubAlq = q.onSnapshot(function (snap) {
    var rows = [];
    snap.forEach(function (d) {
      var a = Object.assign({ id: d.id }, d.data());
      if (soloEstado && a.estado !== soloEstado) return;
      rows.push(a);
    });
    if (!rows.length) {
      body.innerHTML = '<div class="text-center text-slate-400 py-14"><p>Sin alquileres' + (soloEstado ? ' activos' : '') + '</p></div>';
      return;
    }
    body.innerHTML = rows.map(function (a) {
      var vencido = false;
      if (a.fechaFin && a.estado === 'Activo') {
        vencido = new Date(a.fechaFin) < new Date();
      }
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-3">' +
        '<div class="flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-bold text-slate-900">' + (a.cliente || '') + '</div>' +
        '<div class="text-sm text-slate-600">' + (a.equipo || '') + '</div>' +
        '<div class="text-xs text-slate-400 mt-1">' + (a.fechaInicio || '') + ' → ' + (a.fechaFin || '') + '</div></div>' +
        '<div class="text-right">' +
        '<span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ' +
        (a.estado === 'Activo' ? (vencido ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800') : 'bg-slate-100 text-slate-600') + '">' +
        (vencido ? 'Vencido' : (a.estado || '')) + '</span>' +
        '<div class="font-bold text-lg mt-1 text-green-700">' + fmtQA(a.monto) + '<span class="text-xs font-normal text-slate-400"> /mes</span></div></div></div>' +
        (a.notas ? '<p class="text-xs text-slate-500 mt-2">' + a.notas + '</p>' : '') +
        (a.estado === 'Activo'
          ? '<button type="button" onclick="cerrarAlquiler(\'' + a.id + '\')" class="mt-3 px-3 py-2 rounded-xl border text-xs font-semibold">Marcar finalizado</button>'
          : '') +
        '</div>';
    }).join('');
    cargarKpisAlq();
  }, function (err) {
    body.innerHTML = '<p class="text-red-600 p-4">' + err.message + '<br><span class="text-sm">Si pide índice, créalo desde el enlace del error en Firebase.</span></p>';
  });
}

function renderAlqNuevo() {
  var body = document.getElementById('alq-body');
  body.innerHTML =
    '<div class="max-w-lg bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">' +
    '<h2 class="font-bold text-lg">Nuevo contrato</h2>' +
    '<input id="alq-cliente" placeholder="Nombre del cliente *" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="alq-equipo" placeholder="Equipo / maquinaria" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<div class="grid grid-cols-2 gap-3">' +
    '<div><label class="text-[10px] uppercase text-slate-400">Inicio</label><input id="alq-inicio" type="date" class="w-full p-3 border border-slate-200 rounded-2xl"></div>' +
    '<div><label class="text-[10px] uppercase text-slate-400">Fin</label><input id="alq-fin" type="date" class="w-full p-3 border border-slate-200 rounded-2xl"></div></div>' +
    '<input id="alq-monto" type="number" step="0.01" placeholder="Monto mensual Q" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="alq-tel" placeholder="Teléfono cliente" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<textarea id="alq-notas" rows="2" placeholder="Condiciones / notas" class="w-full p-3 border border-slate-200 rounded-2xl"></textarea>' +
    '<button type="button" onclick="guardarAlquiler()" class="w-full bg-green-600 text-white py-3.5 rounded-2xl font-bold">Registrar alquiler</button></div>';
  var hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('alq-inicio').value = hoy;
}

window.guardarAlquiler = async function () {
  var cliente = (document.getElementById('alq-cliente').value || '').trim();
  if (!cliente) return alert('Cliente obligatorio');
  try {
    await db.collection('alquileres').add({
      cliente: cliente,
      equipo: (document.getElementById('alq-equipo').value || '').trim(),
      fechaInicio: document.getElementById('alq-inicio').value,
      fechaFin: document.getElementById('alq-fin').value,
      monto: parseFloat(document.getElementById('alq-monto').value) || 0,
      telefono: (document.getElementById('alq-tel').value || '').trim(),
      notas: (document.getElementById('alq-notas').value || '').trim(),
      estado: 'Activo',
      fechaRegistro: new Date()
    });
    if (typeof adminToast === 'function') adminToast('Alquiler registrado', 'ok');
    else alert('Alquiler registrado');
    alqTab('activos');
  } catch (e) { alert(e.message); }
};

window.cerrarAlquiler = async function (id) {
  if (!confirm('Marcar este alquiler como finalizado?')) return;
  try {
    await db.collection('alquileres').doc(id).update({ estado: 'Finalizado', cerradoEn: new Date() });
  } catch (e) { alert(e.message); }
};

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'alquileres') return mostrarAlquileres();
    if (typeof prev === 'function') return prev(seccion);
  };
})();
