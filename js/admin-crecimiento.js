// js/admin-crecimiento.js — Cotizaciones, lista precios, comisiones, metas

function fmtG(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===== COTIZACIONES ===== */
window.mostrarCotizaciones = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Cotizaciones</h1><p class="text-sm text-slate-500">Presupuestos para clientes</p></div>' +
    '<button type="button" onclick="formCotizacion()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Cotización</button></div>' +
    '<div id="cot-lista" class="space-y-2"></div>' +
    '<div id="cot-form" class="hidden mt-4"></div>';
  cargarCotizaciones();
};

async function cargarCotizaciones() {
  var box = document.getElementById('cot-lista');
  try {
    var snap = await db.collection('cotizaciones').orderBy('fecha', 'desc').limit(40).get();
    var html = '';
    snap.forEach(function (d) {
      var x = Object.assign({ id: d.id }, d.data());
      html += '<div class="bg-white rounded-2xl border p-4 flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-bold">' + (x.folio || d.id.slice(-6)) + ' · ' + (x.cliente || '') + '</div>' +
        '<div class="text-xs text-slate-400">' + (x.items || []).length + ' ítems</div></div>' +
        '<div class="text-right"><div class="font-bold text-green-700">' + fmtG(x.total) + '</div>' +
        '<span class="text-[10px]">' + (x.estado || 'Borrador') + '</span></div>' +
        '<button type="button" onclick="imprimirCotizacion(\'' + d.id + '\')" class="px-3 py-1.5 border rounded-xl text-xs font-semibold">Imprimir</button></div>';
    });
    box.innerHTML = html || '<p class="text-slate-400 text-center py-12">Sin cotizaciones</p>';
    window._cotCache = [];
    snap.forEach(function (d) { window._cotCache.push(Object.assign({ id: d.id }, d.data())); });
  } catch (e) {
    box.innerHTML = '<p class="text-red-600 p-4">' + e.message + '</p>';
  }
}

window.formCotizacion = function () {
  window._cotItems = [];
  var f = document.getElementById('cot-form');
  f.classList.remove('hidden');
  f.innerHTML =
    '<div class="bg-white rounded-2xl border p-5 max-w-lg space-y-2">' +
    '<input id="cot-cliente" placeholder="Cliente" class="w-full p-3 border rounded-xl">' +
    '<input id="cot-item" placeholder="Producto / descripción" class="w-full p-3 border rounded-xl">' +
    '<div class="grid grid-cols-2 gap-2">' +
    '<input id="cot-cant" type="number" value="1" class="p-3 border rounded-xl">' +
    '<input id="cot-precio" type="number" step="0.01" placeholder="Precio" class="p-3 border rounded-xl"></div>' +
    '<button type="button" onclick="addCotItem()" class="w-full border py-2 rounded-xl text-sm font-semibold">Agregar ítem</button>' +
    '<div id="cot-items" class="text-sm"></div>' +
    '<button type="button" onclick="guardarCotizacion()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Guardar cotización</button></div>';
};

window.addCotItem = function () {
  var nombre = (document.getElementById('cot-item').value || '').trim();
  var cant = parseFloat(document.getElementById('cot-cant').value) || 1;
  var precio = parseFloat(document.getElementById('cot-precio').value) || 0;
  if (!nombre) return;
  window._cotItems.push({ nombre: nombre, cantidad: cant, precio: precio });
  document.getElementById('cot-items').innerHTML = window._cotItems.map(function (i) {
    return '<div class="flex justify-between py-1 border-b">' + i.nombre + ' x' + i.cantidad + '<b>' + fmtG(i.cantidad * i.precio) + '</b></div>';
  }).join('');
  document.getElementById('cot-item').value = '';
};

window.guardarCotizacion = async function () {
  var cliente = (document.getElementById('cot-cliente').value || '').trim();
  if (!cliente || !(window._cotItems || []).length) return alert('Cliente e ítems requeridos');
  var total = window._cotItems.reduce(function (s, i) { return s + i.cantidad * i.precio; }, 0);
  try {
    await db.collection('cotizaciones').add({
      folio: 'COT-' + (Math.floor(Math.random() * 90000) + 10000),
      cliente: cliente,
      items: window._cotItems,
      total: total,
      estado: 'Borrador',
      fecha: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('cotizacion_crear', cliente);
    mostrarCotizaciones();
  } catch (e) { alert(e.message); }
};

window.imprimirCotizacion = function (id) {
  var x = (window._cotCache || []).find(function (c) { return c.id === id; });
  if (!x) return;
  var rows = (x.items || []).map(function (i) {
    return '<tr><td>' + i.nombre + '</td><td>' + i.cantidad + '</td><td>Q' + Number(i.precio).toFixed(2) + '</td><td>Q' + (i.cantidad * i.precio).toFixed(2) + '</td></tr>';
  }).join('');
  var w = window.open('', 'COT', 'width=700,height=800');
  w.document.write('<html><head><title>' + (x.folio || '') + '</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px}</style></head><body>' +
    '<h2>AGROMAXGTM — Cotización</h2><p><b>' + (x.folio || '') + '</b> · ' + (x.cliente || '') + '</p>' +
    '<table><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>' + rows +
    '</tbody></table><p style="text-align:right;font-size:18px"><b>Total ' + fmtG(x.total) + '</b></p><script>print()</script></body></html>');
  w.document.close();
};

/* ===== LISTA DE PRECIOS ===== */
window.mostrarPrecios = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<h1 class="text-2xl font-bold mb-2">Lista de precios</h1>' +
    '<p class="text-sm text-slate-500 mb-4">Menudeo · Mayoreo · VIP (sobre precio base del producto)</p>' +
    '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-3 mb-6">' +
    '<label class="text-xs font-semibold text-slate-500">Descuento mayoreo %</label>' +
    '<input id="pct-mayoreo" type="number" value="10" class="w-full p-3 border rounded-xl">' +
    '<label class="text-xs font-semibold text-slate-500">Descuento VIP %</label>' +
    '<input id="pct-vip" type="number" value="15" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarConfigPrecios()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Guardar configuración</button></div>' +
    '<div id="precio-preview" class="overflow-x-auto"></div>';
  cargarConfigPrecios();
  previewPrecios();
};

async function cargarConfigPrecios() {
  try {
    var doc = await db.collection('config').doc('precios').get();
    if (doc.exists) {
      var d = doc.data();
      document.getElementById('pct-mayoreo').value = d.mayoreoPct != null ? d.mayoreoPct : 10;
      document.getElementById('pct-vip').value = d.vipPct != null ? d.vipPct : 15;
    }
  } catch (e) {}
}

window.guardarConfigPrecios = async function () {
  try {
    await db.collection('config').doc('precios').set({
      mayoreoPct: parseFloat(document.getElementById('pct-mayoreo').value) || 10,
      vipPct: parseFloat(document.getElementById('pct-vip').value) || 15,
      actualizado: new Date()
    }, { merge: true });
    if (typeof logAuditoria === 'function') logAuditoria('precios_config', 'update');
    if (typeof adminToast === 'function') adminToast('Precios guardados', 'ok');
    previewPrecios();
  } catch (e) { alert(e.message); }
};

async function previewPrecios() {
  var box = document.getElementById('precio-preview');
  if (!box) return;
  var m = parseFloat(document.getElementById('pct-mayoreo').value) || 10;
  var v = parseFloat(document.getElementById('pct-vip').value) || 15;
  try {
    var snap = await db.collection('productos').limit(20).get();
    var html = '<table class="w-full text-sm bg-white rounded-2xl border"><thead><tr class="bg-slate-50 text-left text-xs uppercase text-slate-500">' +
      '<th class="p-3">Producto</th><th class="p-3 text-right">Menudeo</th><th class="p-3 text-right">Mayoreo</th><th class="p-3 text-right">VIP</th></tr></thead><tbody>';
    snap.forEach(function (d) {
      var p = d.data();
      var base = Number(p.precio) || 0;
      html += '<tr class="border-t"><td class="p-3">' + (p.nombre || '') + '</td>' +
        '<td class="p-3 text-right font-semibold">' + fmtG(base) + '</td>' +
        '<td class="p-3 text-right">' + fmtG(base * (1 - m / 100)) + '</td>' +
        '<td class="p-3 text-right text-green-700 font-semibold">' + fmtG(base * (1 - v / 100)) + '</td></tr>';
    });
    html += '</tbody></table>';
    box.innerHTML = html;
  } catch (e) { box.innerHTML = ''; }
}

/* ===== COMISIONES ===== */
window.mostrarComisiones = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<h1 class="text-2xl font-bold mb-2">Comisiones</h1>' +
    '<p class="text-sm text-slate-500 mb-4">% por vendedor / cajero sobre ventas</p>' +
    '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2 mb-6">' +
    '<input id="com-user" placeholder="Nombre usuario / cajero" class="w-full p-3 border rounded-xl">' +
    '<input id="com-pct" type="number" step="0.1" placeholder="% comisión" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarComision()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Guardar</button></div>' +
    '<div id="com-lista"></div>';
  cargarComisiones();
};

async function cargarComisiones() {
  var box = document.getElementById('com-lista');
  try {
    var snap = await db.collection('comisiones_config').get();
    var html = '';
    snap.forEach(function (d) {
      var x = d.data();
      html += '<div class="bg-white rounded-xl border p-3 mb-2 flex justify-between text-sm">' +
        '<span>' + (x.usuario || '') + '</span><b>' + (x.porcentaje || 0) + '%</b></div>';
    });
    box.innerHTML = html || '<p class="text-slate-400">Sin reglas aún</p>';
  } catch (e) {
    box.innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
}

window.guardarComision = async function () {
  var usuario = (document.getElementById('com-user').value || '').trim();
  var pct = parseFloat(document.getElementById('com-pct').value);
  if (!usuario || isNaN(pct)) return alert('Completa usuario y %');
  try {
    await db.collection('comisiones_config').add({ usuario: usuario, porcentaje: pct, creado: new Date() });
    if (typeof logAuditoria === 'function') logAuditoria('comision_config', usuario);
    cargarComisiones();
  } catch (e) { alert(e.message); }
};

/* ===== METAS ===== */
window.mostrarMetas = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<h1 class="text-2xl font-bold mb-2">Metas y ranking</h1>' +
    '<p class="text-sm text-slate-500 mb-4">Meta mensual y avance por cajero</p>' +
    '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2 mb-6">' +
    '<input id="meta-monto" type="number" placeholder="Meta del mes Q" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarMeta()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Definir meta global</button></div>' +
    '<div id="meta-ranking"></div>';
  cargarMetasRanking();
};

window.guardarMeta = async function () {
  var monto = parseFloat(document.getElementById('meta-monto').value);
  if (!(monto > 0)) return alert('Monto inválido');
  var periodo = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
  try {
    await db.collection('metas').doc(periodo).set({ monto: monto, periodo: periodo, actualizado: new Date() }, { merge: true });
    if (typeof logAuditoria === 'function') logAuditoria('meta_definir', String(monto));
    cargarMetasRanking();
  } catch (e) { alert(e.message); }
};

async function cargarMetasRanking() {
  var box = document.getElementById('meta-ranking');
  try {
    var periodo = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    var metaDoc = await db.collection('metas').doc(periodo).get();
    var meta = metaDoc.exists ? Number(metaDoc.data().monto) || 0 : 0;

    var ini = new Date(); ini.setDate(1); ini.setHours(0, 0, 0, 0);
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(300).get();
    var byUser = {};
    var total = 0;
    snap.forEach(function (d) {
      var v = d.data();
      var f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (!f || f < ini) return;
      var u = v.cajero || v.usuario || v.vendedor || 'Sin asignar';
      byUser[u] = (byUser[u] || 0) + (Number(v.total) || 0);
      total += Number(v.total) || 0;
    });

    var pct = meta ? Math.min(100, (total / meta) * 100) : 0;
    var html = '<div class="bg-white rounded-2xl border p-5 mb-4">' +
      '<div class="flex justify-between text-sm mb-1"><span>Avance del mes</span><b>' + fmtG(total) + ' / ' + fmtG(meta) + '</b></div>' +
      '<div class="h-3 rounded-full bg-slate-100 overflow-hidden"><div class="h-full bg-green-500 rounded-full" style="width:' + pct + '%"></div></div>' +
      '<p class="text-xs text-slate-400 mt-1">' + pct.toFixed(0) + '% de la meta</p></div>';

    var rank = Object.keys(byUser).map(function (k) { return { u: k, t: byUser[k] }; }).sort(function (a, b) { return b.t - a.t; });
    html += '<h3 class="font-semibold mb-2">Ranking del mes</h3>';
    rank.forEach(function (r, i) {
      html += '<div class="bg-white rounded-xl border p-3 mb-2 flex justify-between text-sm">' +
        '<span><b>#' + (i + 1) + '</b> ' + r.u + '</span><b class="text-green-700">' + fmtG(r.t) + '</b></div>';
    });
    box.innerHTML = html || '<p class="text-slate-400">Sin ventas del mes</p>';
  } catch (e) {
    box.innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
}

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (s) {
    if (s === 'cotizaciones') return mostrarCotizaciones();
    if (s === 'precios') return mostrarPrecios();
    if (s === 'comisiones') return mostrarComisiones();
    if (s === 'metas') return mostrarMetas();
    if (typeof prev === 'function') return prev(s);
  };
})();
