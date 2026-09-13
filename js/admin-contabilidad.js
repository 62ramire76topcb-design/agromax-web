// js/admin-contabilidad.js
// Contabilidad AGROMAX: plan de cuentas, diario, mayor, resultados, balance, cierre, inventario valorizado

var PLAN_CUENTAS_DEFAULT = [
  { codigo: '1101', nombre: 'Caja', tipo: 'activo', naturaleza: 'deudora' },
  { codigo: '1102', nombre: 'Bancos', tipo: 'activo', naturaleza: 'deudora' },
  { codigo: '1201', nombre: 'Inventario de mercaderías', tipo: 'activo', naturaleza: 'deudora' },
  { codigo: '1301', nombre: 'Cuentas por cobrar', tipo: 'activo', naturaleza: 'deudora' },
  { codigo: '2101', nombre: 'Proveedores', tipo: 'pasivo', naturaleza: 'acreedora' },
  { codigo: '2201', nombre: 'Préstamos por pagar', tipo: 'pasivo', naturaleza: 'acreedora' },
  { codigo: '3101', nombre: 'Capital', tipo: 'patrimonio', naturaleza: 'acreedora' },
  { codigo: '3201', nombre: 'Utilidades retenidas', tipo: 'patrimonio', naturaleza: 'acreedora' },
  { codigo: '3301', nombre: 'Utilidad del ejercicio', tipo: 'patrimonio', naturaleza: 'acreedora' },
  { codigo: '4101', nombre: 'Ventas', tipo: 'ingreso', naturaleza: 'acreedora' },
  { codigo: '5101', nombre: 'Costo de ventas', tipo: 'gasto', naturaleza: 'deudora' },
  { codigo: '5201', nombre: 'Gastos operativos', tipo: 'gasto', naturaleza: 'deudora' },
  { codigo: '5301', nombre: 'Descuentos sobre ventas', tipo: 'gasto', naturaleza: 'deudora' }
];

function fmtQ(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodoActualKey() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

window.mostrarContabilidad = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML =
    '<div class="mb-4">' +
    '<h1 class="text-2xl md:text-3xl font-bold text-slate-900">Contabilidad</h1>' +
    '<p class="text-sm text-slate-500">Activo, pasivo, resultados, balance e inventario valorizado</p></div>' +

    '<div class="flex flex-wrap gap-1.5 mb-4" id="contab-tabs">' +
    tabBtn('resumen', 'Resumen', true) +
    tabBtn('inventario', 'Inventario') +
    tabBtn('cuentas', 'Plan de cuentas') +
    tabBtn('diario', 'Libro diario') +
    tabBtn('mayor', 'Mayor') +
    tabBtn('resultados', 'Estado de resultados') +
    tabBtn('balance', 'Balance general') +
    tabBtn('cierre', 'Cierre') +
    '</div>' +

    '<div id="contab-body" class="min-h-[320px]">' +
    '<p class="text-slate-400 py-12 text-center"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>';

  contabTab('resumen');
};

function tabBtn(id, label, active) {
  return '<button type="button" data-ctab="' + id + '" onclick="contabTab(\'' + id + '\')" ' +
    'class="ctab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
    (active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200') + '">' +
    label + '</button>';
}

window.contabTab = function (id) {
  document.querySelectorAll('.ctab').forEach(function (b) {
    var on = b.getAttribute('data-ctab') === id;
    b.className = 'ctab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  var body = document.getElementById('contab-body');
  if (!body) return;
  body.innerHTML = '<p class="text-slate-400 py-12 text-center"><i class="fas fa-spinner fa-spin"></i></p>';

  if (id === 'resumen') renderContabResumen();
  else if (id === 'inventario') renderContabInventario();
  else if (id === 'cuentas') renderContabCuentas();
  else if (id === 'diario') renderContabDiario();
  else if (id === 'mayor') renderContabMayor();
  else if (id === 'resultados') renderContabResultados();
  else if (id === 'balance') renderContabBalance();
  else if (id === 'cierre') renderContabCierre();
};

/* ---------- Plan de cuentas ---------- */
async function asegurarPlanCuentas() {
  var snap = await db.collection('cuentas_contables').limit(1).get();
  if (!snap.empty) return;
  var batch = db.batch();
  PLAN_CUENTAS_DEFAULT.forEach(function (c) {
    var ref = db.collection('cuentas_contables').doc(c.codigo);
    batch.set(ref, Object.assign({}, c, { activo: true, creado: new Date() }));
  });
  await batch.commit();
}

async function cargarCuentas() {
  await asegurarPlanCuentas();
  var snap = await db.collection('cuentas_contables').get();
  var list = [];
  snap.forEach(function (d) { list.push(Object.assign({ id: d.id }, d.data())); });
  list.sort(function (a, b) { return String(a.codigo).localeCompare(String(b.codigo)); });
  return list;
}

async function cargarAsientos(desde, hasta) {
  var snap = await db.collection('asientos_contables').orderBy('fecha', 'desc').limit(400).get();
  var list = [];
  snap.forEach(function (d) {
    var a = Object.assign({ id: d.id }, d.data());
    var f = a.fecha && a.fecha.toDate ? a.fecha.toDate() : (a.fecha instanceof Date ? a.fecha : null);
    if (desde && hasta && f) {
      if (f < desde || f > hasta) return;
    }
    list.push(a);
  });
  return list;
}

function saldosDesdeAsientos(asientos, cuentas) {
  var map = {};
  cuentas.forEach(function (c) {
    map[c.codigo] = { codigo: c.codigo, nombre: c.nombre, tipo: c.tipo, naturaleza: c.naturaleza, debe: 0, haber: 0 };
  });
  asientos.forEach(function (a) {
    if (a.anulado) return;
    (a.lineas || []).forEach(function (l) {
      if (!map[l.cuenta]) {
        map[l.cuenta] = { codigo: l.cuenta, nombre: l.cuentaNombre || l.cuenta, tipo: 'otro', naturaleza: 'deudora', debe: 0, haber: 0 };
      }
      map[l.cuenta].debe += Number(l.debe) || 0;
      map[l.cuenta].haber += Number(l.haber) || 0;
    });
  });
  Object.keys(map).forEach(function (k) {
    var s = map[k];
    s.saldo = s.naturaleza === 'acreedora' ? (s.haber - s.debe) : (s.debe - s.haber);
  });
  return map;
}

/* ---------- Resumen ---------- */
async function renderContabResumen() {
  var body = document.getElementById('contab-body');
  try {
    var cuentas = await cargarCuentas();
    var asientos = await cargarAsientos();
    var saldos = saldosDesdeAsientos(asientos, cuentas);

    var ventas = (saldos['4101'] && saldos['4101'].haber) || 0;
    var costo = (saldos['5101'] && saldos['5101'].debe) || 0;
    var gastos = (saldos['5201'] && saldos['5201'].debe) || 0;
    var utilidad = ventas - costo - gastos;

    var invVal = await valorInventario();

    body.innerHTML =
      '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">' +
      kpi('Ventas registradas', fmtQ(ventas), 'text-green-600') +
      kpi('Costo de ventas', fmtQ(costo), 'text-slate-800') +
      kpi('Utilidad estimada', fmtQ(utilidad), utilidad >= 0 ? 'text-emerald-600' : 'text-red-600') +
      kpi('Inventario a costo', fmtQ(invVal.costo), 'text-purple-600') +
      '</div>' +

      '<div class="grid md:grid-cols-2 gap-4 mb-5">' +
      '<div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">' +
      '<h3 class="font-bold mb-2">Acciones rápidas</h3>' +
      '<div class="flex flex-wrap gap-2">' +
      '<button type="button" onclick="generarAsientosDesdeVentas()" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">Generar asientos desde ventas</button>' +
      '<button type="button" onclick="contabTab(\'diario\')" class="px-3 py-2 rounded-xl border text-xs font-semibold">Ver diario</button>' +
      '<button type="button" onclick="contabTab(\'cierre\')" class="px-3 py-2 rounded-xl border text-xs font-semibold">Cierre de periodo</button>' +
      '</div>' +
      '<p class="text-xs text-slate-400 mt-3">Los asientos se crean a partir de ventas POS y pedidos Stripe ya cobrados. No duplica si ya existe referencia.</p></div>' +

      '<div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">' +
      '<h3 class="font-bold mb-2">Ecuación contable</h3>' +
      '<p class="text-sm text-slate-600">Activo = Pasivo + Patrimonio</p>' +
      '<p class="text-xs text-slate-400 mt-2">Periodo actual: <b>' + periodoActualKey() + '</b></p>' +
      '<p class="text-xs text-slate-400">Asientos en sistema: <b>' + asientos.length + '</b></p></div></div>' +

      '<div class="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-900">' +
      '<b>Guía rápida</b>: 1) Completa costos en Productos · 2) Genera asientos desde ventas · 3) Revisa Estado de resultados y Balance · 4) Ejecuta cierre mensual.</div>';
  } catch (e) {
    body.innerHTML = '<p class="text-red-600 p-4">Error: ' + e.message + '<br><span class="text-sm">Si menciona permisos, agrega reglas Firestore para <b>cuentas_contables</b> y <b>asientos_contables</b>.</span></p>';
  }
}

function kpi(label, value, color) {
  return '<div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">' +
    '<p class="text-[10px] uppercase text-slate-400 font-semibold">' + label + '</p>' +
    '<p class="text-xl font-bold ' + (color || '') + '">' + value + '</p></div>';
}

async function valorInventario() {
  var snap = await db.collection('productos').get();
  var costo = 0, venta = 0, n = 0;
  snap.forEach(function (d) {
    var p = d.data();
    var st = Number(p.stock) || 0;
    var pr = Number(p.precio) || 0;
    var co = Number(p.costo || p.costoCompra || 0);
    costo += st * co;
    venta += st * pr;
    n++;
  });
  return { costo: costo, venta: venta, n: n };
}

/* ---------- Inventario valorizado ---------- */
async function renderContabInventario() {
  var body = document.getElementById('contab-body');
  var snap = await db.collection('productos').get();
  var rows = [];
  var totC = 0, totV = 0;
  snap.forEach(function (d) {
    var p = Object.assign({ id: d.id }, d.data());
    var st = Number(p.stock) || 0;
    var pr = Number(p.precio) || 0;
    var co = Number(p.costo || p.costoCompra || 0);
    var vc = st * co, vv = st * pr;
    totC += vc; totV += vv;
    rows.push({ p: p, st: st, co: co, pr: pr, vc: vc, vv: vv });
  });
  rows.sort(function (a, b) { return (a.p.nombre || '').localeCompare(b.p.nombre || ''); });

  body.innerHTML =
    '<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">' +
    kpi('SKUs', String(rows.length), 'text-slate-800') +
    kpi('Valor a costo', fmtQ(totC), 'text-purple-600') +
    kpi('Valor a venta', fmtQ(totV), 'text-green-600') +
    kpi('Margen potencial', fmtQ(totV - totC), 'text-emerald-600') +
    '</div>' +
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">' +
    '<table class="w-full text-sm"><thead><tr class="bg-slate-50 text-left text-xs uppercase text-slate-500">' +
    '<th class="p-3">Producto</th><th class="p-3 text-center">Stock</th><th class="p-3 text-right">Costo u.</th>' +
    '<th class="p-3 text-right">Precio</th><th class="p-3 text-right">Val. costo</th><th class="p-3 text-right">Val. venta</th></tr></thead><tbody>' +
    rows.map(function (r) {
      return '<tr class="border-t border-slate-50"><td class="p-3 font-medium">' + (r.p.nombre || '') +
        (!r.co ? ' <span class="text-[10px] text-amber-600">sin costo</span>' : '') + '</td>' +
        '<td class="p-3 text-center">' + r.st + '</td>' +
        '<td class="p-3 text-right">' + (r.co ? fmtQ(r.co) : '—') + '</td>' +
        '<td class="p-3 text-right">' + fmtQ(r.pr) + '</td>' +
        '<td class="p-3 text-right">' + (r.co ? fmtQ(r.vc) : '—') + '</td>' +
        '<td class="p-3 text-right font-semibold text-green-700">' + fmtQ(r.vv) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    '<button type="button" onclick="exportarInventarioValorizadoCSV()" class="mt-3 px-4 py-2 border rounded-xl text-sm font-semibold">Exportar CSV</button>';

  window._invValRows = rows;
}

window.exportarInventarioValorizadoCSV = function () {
  var rows = window._invValRows || [];
  var csv = 'Producto,Stock,Costo,Precio,ValorCosto,ValorVenta\n';
  rows.forEach(function (r) {
    csv += '"' + (r.p.nombre || '').replace(/"/g, '""') + '",' + r.st + ',' + r.co + ',' + r.pr + ',' + r.vc + ',' + r.vv + '\n';
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventario-valorizado.csv';
  a.click();
};

/* ---------- Cuentas ---------- */
async function renderContabCuentas() {
  var body = document.getElementById('contab-body');
  var cuentas = await cargarCuentas();
  var grupos = { activo: [], pasivo: [], patrimonio: [], ingreso: [], gasto: [] };
  cuentas.forEach(function (c) {
    if (grupos[c.tipo]) grupos[c.tipo].push(c);
    else grupos.activo.push(c);
  });

  function bloque(titulo, arr, color) {
    return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-3">' +
      '<h3 class="font-bold text-sm ' + color + ' mb-2">' + titulo + '</h3>' +
      arr.map(function (c) {
        return '<div class="flex justify-between py-1.5 border-b border-slate-50 text-sm">' +
          '<span><span class="font-mono text-xs text-slate-400 mr-2">' + c.codigo + '</span>' + c.nombre + '</span>' +
          '<span class="text-[10px] text-slate-400">' + (c.naturaleza || '') + '</span></div>';
      }).join('') + '</div>';
  }

  body.innerHTML =
    '<p class="text-xs text-slate-500 mb-3">Plan de cuentas básico de comercio. Se crea automáticamente la primera vez.</p>' +
    '<div class="grid md:grid-cols-2 gap-3">' +
    bloque('Activo', grupos.activo, 'text-blue-700') +
    bloque('Pasivo', grupos.pasivo, 'text-red-700') +
    bloque('Patrimonio', grupos.patrimonio, 'text-purple-700') +
    bloque('Ingresos', grupos.ingreso, 'text-green-700') +
    bloque('Gastos', grupos.gasto, 'text-amber-700') +
    '</div>';
}

/* ---------- Diario ---------- */
async function renderContabDiario() {
  var body = document.getElementById('contab-body');
  var asientos = await cargarAsientos();

  body.innerHTML =
    '<div class="flex flex-wrap gap-2 mb-4">' +
    '<button type="button" onclick="generarAsientosDesdeVentas()" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">Generar desde ventas</button>' +
    '<button type="button" onclick="mostrarFormAsientoManual()" class="px-3 py-2 rounded-xl border text-xs font-semibold">Asiento manual</button></div>' +
    '<div id="diario-lista" class="space-y-3"></div>';

  var lista = document.getElementById('diario-lista');
  if (!asientos.length) {
    lista.innerHTML = '<p class="text-slate-400 text-center py-12">Sin asientos. Usa “Generar desde ventas”.</p>';
    return;
  }

  lista.innerHTML = asientos.map(function (a) {
    var f = a.fecha && a.fecha.toDate ? a.fecha.toDate().toLocaleString('es-GT') : '';
    var lineas = (a.lineas || []).map(function (l) {
      return '<div class="grid grid-cols-12 gap-1 text-xs py-0.5">' +
        '<div class="col-span-6">' + (l.cuenta || '') + ' ' + (l.cuentaNombre || '') + '</div>' +
        '<div class="col-span-3 text-right">' + (l.debe ? fmtQ(l.debe) : '') + '</div>' +
        '<div class="col-span-3 text-right">' + (l.haber ? fmtQ(l.haber) : '') + '</div></div>';
    }).join('');
    return '<div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm ' + (a.anulado ? 'opacity-50' : '') + '">' +
      '<div class="flex justify-between text-sm mb-2"><b>' + (a.concepto || 'Asiento') + '</b><span class="text-slate-400 text-xs">' + f + '</span></div>' +
      '<div class="grid grid-cols-12 gap-1 text-[10px] uppercase text-slate-400 border-b pb-1 mb-1">' +
      '<div class="col-span-6">Cuenta</div><div class="col-span-3 text-right">Debe</div><div class="col-span-3 text-right">Haber</div></div>' +
      lineas +
      (a.ref ? '<p class="text-[10px] text-slate-400 mt-2">Ref: ' + a.ref + '</p>' : '') +
      '</div>';
  }).join('');
}

window.generarAsientosDesdeVentas = async function () {
  if (!confirm('¿Generar asientos contables desde ventas POS y pedidos Stripe que aún no estén contabilizados?')) return;
  try {
    await asegurarPlanCuentas();
    var existentes = {};
    var snapA = await db.collection('asientos_contables').limit(500).get();
    snapA.forEach(function (d) {
      var a = d.data();
      if (a.ref) existentes[a.ref] = true;
    });

    var productos = {};
    var snapP = await db.collection('productos').get();
    snapP.forEach(function (d) {
      var p = d.data();
      productos[p.nombre] = p;
    });

    var creados = 0;

    // Ventas POS
    var snapV = await db.collection('ventas').orderBy('fecha', 'desc').limit(150).get();
    for (var i = 0; i < snapV.docs.length; i++) {
      var doc = snapV.docs[i];
      var v = doc.data();
      var ref = 'venta:' + doc.id;
      if (existentes[ref]) continue;
      var total = Number(v.total) || 0;
      if (total <= 0) continue;
      var costo = 0;
      (v.productos || []).forEach(function (it) {
        var prod = productos[it.nombre];
        var c = prod ? Number(prod.costo || prod.costoCompra || 0) : 0;
        costo += c * (Number(it.cantidad) || 0);
      });
      var lineas = [
        { cuenta: '1101', cuentaNombre: 'Caja', debe: total, haber: 0 },
        { cuenta: '4101', cuentaNombre: 'Ventas', debe: 0, haber: total }
      ];
      if (costo > 0) {
        lineas.push({ cuenta: '5101', cuentaNombre: 'Costo de ventas', debe: costo, haber: 0 });
        lineas.push({ cuenta: '1201', cuentaNombre: 'Inventario de mercaderías', debe: 0, haber: costo });
      }
      await db.collection('asientos_contables').add({
        fecha: v.fecha || new Date(),
        concepto: 'Venta POS ' + (v.cliente || '') + ' · ' + (v.metodoPago || ''),
        ref: ref,
        origen: 'POS',
        periodo: periodoActualKey(),
        lineas: lineas,
        total: total,
        creado: new Date()
      });
      creados++;
    }

    // Pedidos Stripe cobrados
    var snapPed = await db.collection('pedidos').orderBy('fecha', 'desc').limit(100).get();
    for (var j = 0; j < snapPed.docs.length; j++) {
      var pd = snapPed.docs[j];
      var p = pd.data();
      if (p.metodo !== 'Stripe') continue;
      if (p.estado === 'Cancelado' || p.estado === 'Esperando pago') continue;
      var ref2 = 'pedido:' + pd.id;
      if (existentes[ref2]) continue;
      var tot = Number(p.total) || 0;
      if (tot <= 0) continue;
      var costo2 = 0;
      (p.productos || []).forEach(function (it) {
        var prod = productos[it.nombre];
        var c = prod ? Number(prod.costo || prod.costoCompra || 0) : 0;
        costo2 += c * (Number(it.cantidad) || 0);
      });
      var lineas2 = [
        { cuenta: '1102', cuentaNombre: 'Bancos', debe: tot, haber: 0 },
        { cuenta: '4101', cuentaNombre: 'Ventas', debe: 0, haber: tot }
      ];
      if (costo2 > 0) {
        lineas2.push({ cuenta: '5101', cuentaNombre: 'Costo de ventas', debe: costo2, haber: 0 });
        lineas2.push({ cuenta: '1201', cuentaNombre: 'Inventario de mercaderías', debe: 0, haber: costo2 });
      }
      await db.collection('asientos_contables').add({
        fecha: p.fecha || new Date(),
        concepto: 'Venta web Stripe · ' + (p.cliente || ''),
        ref: ref2,
        origen: 'Stripe',
        periodo: periodoActualKey(),
        lineas: lineas2,
        total: tot,
        creado: new Date()
      });
      creados++;
    }

    if (typeof adminToast === 'function') adminToast(creados + ' asiento(s) creado(s)', 'ok');
    else alert(creados + ' asiento(s) creado(s)');
    contabTab('diario');
  } catch (e) {
    console.error(e);
    alert('Error: ' + e.message + '\n\nAgrega reglas Firestore para cuentas_contables y asientos_contables (read/write si auth).');
  }
};

window.mostrarFormAsientoManual = function () {
  var body = document.getElementById('contab-body');
  body.innerHTML =
    '<div class="bg-white rounded-2xl border p-5 max-w-lg shadow-sm">' +
    '<h3 class="font-bold mb-3">Asiento manual</h3>' +
    '<label class="text-xs text-slate-500">Concepto</label>' +
    '<input id="as-concepto" class="w-full p-3 border rounded-xl mb-3" placeholder="Ej: Pago renta">' +
    '<label class="text-xs text-slate-500">Cuenta debe (código)</label>' +
    '<input id="as-debe-cta" class="w-full p-3 border rounded-xl mb-2" placeholder="5201" value="5201">' +
    '<label class="text-xs text-slate-500">Cuenta haber (código)</label>' +
    '<input id="as-haber-cta" class="w-full p-3 border rounded-xl mb-2" placeholder="1101" value="1101">' +
    '<label class="text-xs text-slate-500">Monto Q</label>' +
    '<input id="as-monto" type="number" step="0.01" class="w-full p-3 border rounded-xl mb-4" placeholder="0.00">' +
    '<div class="flex gap-2">' +
    '<button type="button" onclick="guardarAsientoManual()" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold">Guardar</button>' +
    '<button type="button" onclick="contabTab(\'diario\')" class="px-4 py-3 border rounded-xl">Cancelar</button></div></div>';
};

window.guardarAsientoManual = async function () {
  var concepto = (document.getElementById('as-concepto').value || '').trim();
  var cDebe = (document.getElementById('as-debe-cta').value || '').trim();
  var cHaber = (document.getElementById('as-haber-cta').value || '').trim();
  var monto = parseFloat(document.getElementById('as-monto').value);
  if (!concepto || !cDebe || !cHaber || !(monto > 0)) return alert('Completa todos los campos');
  try {
    await db.collection('asientos_contables').add({
      fecha: new Date(),
      concepto: concepto,
      ref: 'manual:' + Date.now(),
      origen: 'Manual',
      periodo: periodoActualKey(),
      lineas: [
        { cuenta: cDebe, cuentaNombre: cDebe, debe: monto, haber: 0 },
        { cuenta: cHaber, cuentaNombre: cHaber, debe: 0, haber: monto }
      ],
      total: monto,
      creado: new Date()
    });
    if (typeof adminToast === 'function') adminToast('Asiento guardado', 'ok');
    contabTab('diario');
  } catch (e) {
    alert(e.message);
  }
};

/* ---------- Mayor ---------- */
async function renderContabMayor() {
  var body = document.getElementById('contab-body');
  var cuentas = await cargarCuentas();
  var asientos = await cargarAsientos();
  var saldos = saldosDesdeAsientos(asientos, cuentas);

  body.innerHTML =
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">' +
    '<table class="w-full text-sm"><thead><tr class="bg-slate-50 text-xs uppercase text-slate-500 text-left">' +
    '<th class="p-3">Cuenta</th><th class="p-3 text-right">Debe</th><th class="p-3 text-right">Haber</th><th class="p-3 text-right">Saldo</th></tr></thead><tbody>' +
    Object.keys(saldos).sort().map(function (k) {
      var s = saldos[k];
      if (!s.debe && !s.haber) return '';
      return '<tr class="border-t border-slate-50"><td class="p-3"><span class="font-mono text-xs text-slate-400">' + s.codigo + '</span> ' + s.nombre + '</td>' +
        '<td class="p-3 text-right">' + fmtQ(s.debe) + '</td>' +
        '<td class="p-3 text-right">' + fmtQ(s.haber) + '</td>' +
        '<td class="p-3 text-right font-semibold">' + fmtQ(s.saldo) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

/* ---------- Estado de resultados ---------- */
async function renderContabResultados() {
  var body = document.getElementById('contab-body');
  var cuentas = await cargarCuentas();
  var asientos = await cargarAsientos();
  var saldos = saldosDesdeAsientos(asientos, cuentas);

  var ventas = Math.max(0, (saldos['4101'] && saldos['4101'].haber) || 0);
  var costo = Math.max(0, (saldos['5101'] && saldos['5101'].debe) || 0);
  var gastos = Math.max(0, (saldos['5201'] && saldos['5201'].debe) || 0);
  var desc = Math.max(0, (saldos['5301'] && saldos['5301'].debe) || 0);
  var utilidadBruta = ventas - costo;
  var utilidadNeta = utilidadBruta - gastos - desc;

  body.innerHTML =
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-xl">' +
    '<h3 class="font-bold text-lg mb-1">Estado de resultados</h3>' +
    '<p class="text-xs text-slate-400 mb-4">Según asientos contabilizados</p>' +
    filaER('(+) Ventas', ventas, 'font-semibold') +
    filaER('(-) Costo de ventas', costo, '') +
    filaER('(=) Utilidad bruta', utilidadBruta, 'font-bold border-t pt-2') +
    filaER('(-) Gastos operativos', gastos, '') +
    filaER('(-) Descuentos', desc, '') +
    filaER('(=) Utilidad neta', utilidadNeta, 'font-bold text-lg border-t pt-2 ' + (utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600')) +
    '</div>';
}

function filaER(label, val, cls) {
  return '<div class="flex justify-between py-1.5 text-sm ' + (cls || '') + '"><span>' + label + '</span><span>' + fmtQ(val) + '</span></div>';
}

/* ---------- Balance general ---------- */
async function renderContabBalance() {
  var body = document.getElementById('contab-body');
  var cuentas = await cargarCuentas();
  var asientos = await cargarAsientos();
  var saldos = saldosDesdeAsientos(asientos, cuentas);
  var inv = await valorInventario();

  // Inventario: preferir valorización real de productos si no hay movimiento en 1201
  var invLibro = (saldos['1201'] && saldos['1201'].saldo) || 0;
  var invMostrar = inv.costo > 0 ? inv.costo : invLibro;

  var caja = (saldos['1101'] && saldos['1101'].saldo) || 0;
  var bancos = (saldos['1102'] && saldos['1102'].saldo) || 0;
  var cxc = (saldos['1301'] && saldos['1301'].saldo) || 0;
  var activo = caja + bancos + invMostrar + cxc;

  var prov = (saldos['2101'] && saldos['2101'].saldo) || 0;
  var prest = (saldos['2201'] && saldos['2201'].saldo) || 0;
  var pasivo = prov + prest;

  var capital = (saldos['3101'] && saldos['3101'].saldo) || 0;
  var utilRet = (saldos['3201'] && saldos['3201'].saldo) || 0;

  var ventas = Math.max(0, (saldos['4101'] && saldos['4101'].haber) || 0);
  var costo = Math.max(0, (saldos['5101'] && saldos['5101'].debe) || 0);
  var gastos = Math.max(0, (saldos['5201'] && saldos['5201'].debe) || 0);
  var utilidad = ventas - costo - gastos;

  var patrimonio = capital + utilRet + utilidad;
  var totalPasPat = pasivo + patrimonio;

  body.innerHTML =
    '<div class="grid md:grid-cols-2 gap-4">' +
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
    '<h3 class="font-bold text-blue-800 mb-3">Activo</h3>' +
    filaER('Caja', caja, '') +
    filaER('Bancos', bancos, '') +
    filaER('Inventario (a costo)', invMostrar, '') +
    filaER('Cuentas por cobrar', cxc, '') +
    filaER('Total activo', activo, 'font-bold border-t pt-2 text-blue-800') +
    '</div>' +
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">' +
    '<h3 class="font-bold text-red-800 mb-3">Pasivo</h3>' +
    filaER('Proveedores', prov, '') +
    filaER('Préstamos', prest, '') +
    filaER('Total pasivo', pasivo, 'font-bold border-t pt-2') +
    '<h3 class="font-bold text-purple-800 mt-4 mb-3">Patrimonio</h3>' +
    filaER('Capital', capital, '') +
    filaER('Utilidades retenidas', utilRet, '') +
    filaER('Utilidad del ejercicio', utilidad, '') +
    filaER('Total patrimonio', patrimonio, 'font-bold border-t pt-2') +
    filaER('Pasivo + Patrimonio', totalPasPat, 'font-bold border-t pt-2 text-purple-800') +
    '</div></div>' +
    '<p class="text-xs mt-4 ' + (Math.abs(activo - totalPasPat) < 0.05 ? 'text-green-600' : 'text-amber-600') + '">' +
    (Math.abs(activo - totalPasPat) < 0.05
      ? '✓ El balance cuadra (Activo ≈ Pasivo + Patrimonio).'
      : '⚠ Diferencia de ' + fmtQ(activo - totalPasPat) + '. Genera asientos y/o registra capital inicial con asiento manual.') +
    '</p>';
}

/* ---------- Cierre ---------- */
async function renderContabCierre() {
  var body = document.getElementById('contab-body');
  var periodo = periodoActualKey();

  var cierres = [];
  try {
    var snap = await db.collection('cierres_contables').orderBy('periodo', 'desc').limit(12).get();
    snap.forEach(function (d) { cierres.push(Object.assign({ id: d.id }, d.data())); });
  } catch (e) {}

  body.innerHTML =
    '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 max-w-lg">' +
    '<h3 class="font-bold text-lg mb-2">Cierre contable</h3>' +
    '<p class="text-sm text-slate-500 mb-4">Periodo actual: <b>' + periodo + '</b></p>' +
    '<ol class="text-sm text-slate-600 space-y-2 list-decimal list-inside mb-4">' +
    '<li>Genera asientos desde ventas</li>' +
    '<li>Revisa estado de resultados y balance</li>' +
    '<li>Ejecuta el cierre: la utilidad pasa a utilidades retenidas</li>' +
    '</ol>' +
    '<button type="button" onclick="ejecutarCierreContable()" class="w-full py-3.5 rounded-2xl bg-slate-900 text-white font-bold">Ejecutar cierre de ' + periodo + '</button>' +
    '</div>' +
    '<div class="mt-4"><h4 class="font-semibold text-sm mb-2">Cierres anteriores</h4>' +
    (cierres.length ? cierres.map(function (c) {
      return '<div class="bg-white border rounded-xl p-3 mb-2 text-sm flex justify-between">' +
        '<span>' + c.periodo + '</span><b class="' + (c.utilidad >= 0 ? 'text-green-600' : 'text-red-600') + '">' + fmtQ(c.utilidad) + '</b></div>';
    }).join('') : '<p class="text-slate-400 text-sm">Ninguno aún</p>') +
    '</div>';
}

window.ejecutarCierreContable = async function () {
  var periodo = periodoActualKey();
  if (!confirm('¿Cerrar el periodo ' + periodo + '? Se registrará la utilidad en Utilidades retenidas.')) return;
  try {
    var cuentas = await cargarCuentas();
    var asientos = await cargarAsientos();
    var saldos = saldosDesdeAsientos(asientos, cuentas);
    var ventas = Math.max(0, (saldos['4101'] && saldos['4101'].haber) || 0);
    var costo = Math.max(0, (saldos['5101'] && saldos['5101'].debe) || 0);
    var gastos = Math.max(0, (saldos['5201'] && saldos['5201'].debe) || 0);
    var utilidad = ventas - costo - gastos;

    // Asiento de cierre: cierra resultados hacia utilidades retenidas (simplificado)
    if (utilidad !== 0) {
      var lineas;
      if (utilidad > 0) {
        lineas = [
          { cuenta: '4101', cuentaNombre: 'Ventas', debe: ventas, haber: 0 },
          { cuenta: '5101', cuentaNombre: 'Costo de ventas', debe: 0, haber: costo },
          { cuenta: '5201', cuentaNombre: 'Gastos operativos', debe: 0, haber: gastos },
          { cuenta: '3201', cuentaNombre: 'Utilidades retenidas', debe: 0, haber: utilidad }
        ];
      } else {
        lineas = [
          { cuenta: '3201', cuentaNombre: 'Utilidades retenidas', debe: Math.abs(utilidad), haber: 0 },
          { cuenta: '4101', cuentaNombre: 'Ventas', debe: ventas, haber: 0 },
          { cuenta: '5101', cuentaNombre: 'Costo de ventas', debe: 0, haber: costo },
          { cuenta: '5201', cuentaNombre: 'Gastos operativos', debe: 0, haber: gastos }
        ];
      }
      // Simplificación: un asiento resumen de utilidad
      await db.collection('asientos_contables').add({
        fecha: new Date(),
        concepto: 'Cierre contable ' + periodo,
        ref: 'cierre:' + periodo,
        origen: 'Cierre',
        periodo: periodo,
        lineas: utilidad > 0
          ? [
              { cuenta: '3301', cuentaNombre: 'Utilidad del ejercicio', debe: utilidad, haber: 0 },
              { cuenta: '3201', cuentaNombre: 'Utilidades retenidas', debe: 0, haber: utilidad }
            ]
          : [
              { cuenta: '3201', cuentaNombre: 'Utilidades retenidas', debe: Math.abs(utilidad), haber: 0 },
              { cuenta: '3301', cuentaNombre: 'Utilidad del ejercicio', debe: 0, haber: Math.abs(utilidad) }
            ],
        total: Math.abs(utilidad),
        creado: new Date()
      });
    }

    await db.collection('cierres_contables').doc(periodo).set({
      periodo: periodo,
      utilidad: utilidad,
      ventas: ventas,
      costo: costo,
      gastos: gastos,
      cerradoEn: new Date(),
      usuario: (window.usuarioActual && window.usuarioActual.nombre) || ''
    });

    if (typeof adminToast === 'function') adminToast('Cierre ' + periodo + ' registrado', 'ok');
    else alert('Cierre registrado. Utilidad: ' + fmtQ(utilidad));
    contabTab('cierre');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

/* Hook sección */
(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'contabilidad') return mostrarContabilidad();
    if (typeof prev === 'function') return prev(seccion);
  };
})();
