// js/admin-finanzas-extra.js — CxC, CxP, Gastos

function fmtF(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===== CUENTAS POR COBRAR ===== */
window.mostrarCxC = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Cuentas por cobrar</h1><p class="text-sm text-slate-500">Créditos a clientes y abonos</p></div>' +
    '<button type="button" onclick="formCxC()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Crédito</button></div>' +
    '<div id="cxc-kpis" class="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4"></div>' +
    '<div id="cxc-lista" class="space-y-2"><p class="text-center text-slate-400 py-8"><i class="fas fa-spinner fa-spin"></i></p></div>' +
    '<div id="cxc-form" class="hidden mt-4"></div>';
  cargarCxC();
};

async function cargarCxC() {
  var lista = document.getElementById('cxc-lista');
  try {
    var snap = await db.collection('cxc').orderBy('fecha', 'desc').limit(80).get();
    var totalPend = 0, n = 0;
    var html = '';
    snap.forEach(function (d) {
      var x = Object.assign({ id: d.id }, d.data());
      var saldo = Number(x.saldo != null ? x.saldo : x.monto) || 0;
      if (x.estado !== 'Pagado') { totalPend += saldo; n++; }
      html += '<div class="bg-white rounded-2xl border p-4 flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-bold">' + (x.cliente || '') + '</div>' +
        '<div class="text-xs text-slate-400">' + (x.concepto || '') + ' · ' + (x.fecha && x.fecha.toDate ? x.fecha.toDate().toLocaleDateString('es-GT') : '') + '</div></div>' +
        '<div class="text-right"><div class="font-bold text-amber-600">' + fmtF(saldo) + '</div>' +
        '<span class="text-[10px] px-2 py-0.5 rounded-full ' + (x.estado === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800') + '">' + (x.estado || 'Pendiente') + '</span></div>' +
        (x.estado !== 'Pagado' ? '<button type="button" onclick="abonarCxC(\'' + x.id + '\',' + saldo + ')" class="px-3 py-1.5 rounded-xl border text-xs font-semibold">Abonar</button>' : '') +
        '</div>';
    });
    document.getElementById('cxc-kpis').innerHTML =
      '<div class="bg-white rounded-2xl border p-3"><p class="text-[10px] text-slate-400 uppercase font-semibold">Pendientes</p><p class="text-xl font-bold text-amber-600">' + fmtF(totalPend) + '</p></div>' +
      '<div class="bg-white rounded-2xl border p-3"><p class="text-[10px] text-slate-400 uppercase font-semibold">Documentos</p><p class="text-xl font-bold">' + n + '</p></div>';
    lista.innerHTML = html || '<p class="text-slate-400 text-center py-12">Sin cuentas por cobrar</p>';
  } catch (e) {
    lista.innerHTML = '<p class="text-red-600 p-4">' + e.message + '</p>';
  }
}

window.formCxC = function () {
  var f = document.getElementById('cxc-form');
  f.classList.remove('hidden');
  f.innerHTML = '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2">' +
    '<input id="cxc-cliente" placeholder="Cliente" class="w-full p-3 border rounded-xl">' +
    '<input id="cxc-monto" type="number" step="0.01" placeholder="Monto Q" class="w-full p-3 border rounded-xl">' +
    '<input id="cxc-concepto" placeholder="Concepto" class="w-full p-3 border rounded-xl">' +
    '<input id="cxc-vence" type="date" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarCxC()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Registrar</button></div>';
};

window.guardarCxC = async function () {
  var monto = parseFloat(document.getElementById('cxc-monto').value);
  var cliente = (document.getElementById('cxc-cliente').value || '').trim();
  if (!cliente || !(monto > 0)) return alert('Cliente y monto requeridos');
  try {
    await db.collection('cxc').add({
      cliente: cliente,
      monto: monto,
      saldo: monto,
      concepto: (document.getElementById('cxc-concepto').value || '').trim(),
      vence: document.getElementById('cxc-vence').value || null,
      estado: 'Pendiente',
      fecha: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('cxc_crear', cliente + ' ' + monto);
    mostrarCxC();
  } catch (e) { alert(e.message); }
};

window.abonarCxC = async function (id, saldo) {
  var abono = parseFloat(prompt('Monto del abono Q:', String(saldo)));
  if (!(abono > 0)) return;
  try {
    var nuevo = Math.max(0, saldo - abono);
    await db.collection('cxc').doc(id).update({
      saldo: nuevo,
      estado: nuevo <= 0.01 ? 'Pagado' : 'Pendiente',
      ultimoAbono: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('cxc_abono', id + ' ' + abono);
    mostrarCxC();
  } catch (e) { alert(e.message); }
};

/* ===== CUENTAS POR PAGAR ===== */
window.mostrarCxP = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Cuentas por pagar</h1><p class="text-sm text-slate-500">Deudas con proveedores</p></div>' +
    '<button type="button" onclick="formCxP()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Obligación</button></div>' +
    '<div id="cxp-lista" class="space-y-2"><p class="text-center text-slate-400 py-8"><i class="fas fa-spinner fa-spin"></i></p></div>' +
    '<div id="cxp-form" class="hidden mt-4"></div>';
  cargarCxP();
};

async function cargarCxP() {
  var lista = document.getElementById('cxp-lista');
  try {
    var snap = await db.collection('cxp').orderBy('fecha', 'desc').limit(80).get();
    var html = '';
    snap.forEach(function (d) {
      var x = Object.assign({ id: d.id }, d.data());
      var saldo = Number(x.saldo != null ? x.saldo : x.monto) || 0;
      html += '<div class="bg-white rounded-2xl border p-4 flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-bold">' + (x.proveedor || '') + '</div>' +
        '<div class="text-xs text-slate-400">' + (x.concepto || '') + '</div></div>' +
        '<div class="text-right"><div class="font-bold text-red-600">' + fmtF(saldo) + '</div>' +
        '<span class="text-[10px]">' + (x.estado || 'Pendiente') + '</span></div>' +
        (x.estado !== 'Pagado' ? '<button type="button" onclick="pagarCxP(\'' + x.id + '\')" class="px-3 py-1.5 rounded-xl border text-xs font-semibold">Marcar pagado</button>' : '') +
        '</div>';
    });
    lista.innerHTML = html || '<p class="text-slate-400 text-center py-12">Sin cuentas por pagar</p>';
  } catch (e) {
    lista.innerHTML = '<p class="text-red-600 p-4">' + e.message + '</p>';
  }
}

window.formCxP = function () {
  var f = document.getElementById('cxp-form');
  f.classList.remove('hidden');
  f.innerHTML = '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2">' +
    '<input id="cxp-prov" placeholder="Proveedor" class="w-full p-3 border rounded-xl">' +
    '<input id="cxp-monto" type="number" step="0.01" placeholder="Monto Q" class="w-full p-3 border rounded-xl">' +
    '<input id="cxp-concepto" placeholder="Concepto / factura" class="w-full p-3 border rounded-xl">' +
    '<input id="cxp-vence" type="date" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarCxP()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Registrar</button></div>';
};

window.guardarCxP = async function () {
  var monto = parseFloat(document.getElementById('cxp-monto').value);
  var proveedor = (document.getElementById('cxp-prov').value || '').trim();
  if (!proveedor || !(monto > 0)) return alert('Datos incompletos');
  try {
    await db.collection('cxp').add({
      proveedor: proveedor,
      monto: monto,
      saldo: monto,
      concepto: (document.getElementById('cxp-concepto').value || '').trim(),
      vence: document.getElementById('cxp-vence').value || null,
      estado: 'Pendiente',
      fecha: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('cxp_crear', proveedor);
    mostrarCxP();
  } catch (e) { alert(e.message); }
};

window.pagarCxP = async function (id) {
  if (!confirm('Marcar como pagado?')) return;
  try {
    await db.collection('cxp').doc(id).update({ estado: 'Pagado', saldo: 0, pagadoEn: new Date() });
    if (typeof logAuditoria === 'function') logAuditoria('cxp_pagar', id);
    mostrarCxP();
  } catch (e) { alert(e.message); }
};

/* ===== GASTOS ===== */
window.mostrarGastos = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Gastos operativos</h1><p class="text-sm text-slate-500">Renta, luz, sueldos, etc.</p></div>' +
    '<button type="button" onclick="formGasto()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Gasto</button></div>' +
    '<div id="gas-kpi" class="mb-4"></div>' +
    '<div id="gas-lista" class="space-y-2"></div>' +
    '<div id="gas-form" class="hidden mt-4"></div>';
  cargarGastos();
};

async function cargarGastos() {
  var lista = document.getElementById('gas-lista');
  try {
    var snap = await db.collection('gastos').orderBy('fecha', 'desc').limit(60).get();
    var mes = 0;
    var ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    var html = '';
    snap.forEach(function (d) {
      var g = Object.assign({ id: d.id }, d.data());
      var m = Number(g.monto) || 0;
      var f = g.fecha && g.fecha.toDate ? g.fecha.toDate() : null;
      if (f && f >= ini) mes += m;
      html += '<div class="bg-white rounded-2xl border p-4 flex justify-between">' +
        '<div><div class="font-semibold">' + (g.categoria || 'General') + ' · ' + (g.descripcion || '') + '</div>' +
        '<div class="text-xs text-slate-400">' + (f ? f.toLocaleDateString('es-GT') : '') + '</div></div>' +
        '<div class="font-bold text-red-600">' + fmtF(m) + '</div></div>';
    });
    document.getElementById('gas-kpi').innerHTML =
      '<div class="bg-white rounded-2xl border p-4 inline-block"><span class="text-xs text-slate-400">Gastos del mes</span><div class="text-2xl font-bold text-red-600">' + fmtF(mes) + '</div></div>';
    lista.innerHTML = html || '<p class="text-slate-400 text-center py-12">Sin gastos</p>';
  } catch (e) {
    lista.innerHTML = '<p class="text-red-600 p-4">' + e.message + '</p>';
  }
}

window.formGasto = function () {
  var f = document.getElementById('gas-form');
  f.classList.remove('hidden');
  f.innerHTML = '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2">' +
    '<select id="gas-cat" class="w-full p-3 border rounded-xl bg-white">' +
    '<option>Renta</option><option>Energía</option><option>Agua</option><option>Sueldos</option><option>Combustible</option><option>Mantenimiento</option><option>Marketing</option><option>Otros</option></select>' +
    '<input id="gas-desc" placeholder="Descripción" class="w-full p-3 border rounded-xl">' +
    '<input id="gas-monto" type="number" step="0.01" placeholder="Monto Q" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarGasto()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Guardar gasto</button></div>';
};

window.guardarGasto = async function () {
  var monto = parseFloat(document.getElementById('gas-monto').value);
  if (!(monto > 0)) return alert('Monto inválido');
  try {
    var cat = document.getElementById('gas-cat').value;
    var desc = (document.getElementById('gas-desc').value || '').trim();
    await db.collection('gastos').add({
      categoria: cat,
      descripcion: desc,
      monto: monto,
      fecha: new Date()
    });
    // Asiento contable opcional
    try {
      await db.collection('asientos_contables').add({
        fecha: new Date(),
        concepto: 'Gasto ' + cat + ' · ' + desc,
        ref: 'gasto:' + Date.now(),
        origen: 'Gasto',
        lineas: [
          { cuenta: '5201', cuentaNombre: 'Gastos operativos', debe: monto, haber: 0 },
          { cuenta: '1101', cuentaNombre: 'Caja', debe: 0, haber: monto }
        ],
        total: monto,
        creado: new Date()
      });
    } catch (e2) {}
    if (typeof logAuditoria === 'function') logAuditoria('gasto_crear', cat + ' ' + monto);
    mostrarGastos();
  } catch (e) { alert(e.message); }
};

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (s) {
    if (s === 'cxc') return mostrarCxC();
    if (s === 'cxp') return mostrarCxP();
    if (s === 'gastos') return mostrarGastos();
    if (typeof prev === 'function') return prev(s);
  };
})();
