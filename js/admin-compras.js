// js/admin-compras.js
// Módulo de Compras profesional dentro del admin

var _ocProductos = [];
var _ocProdsCache = [];
var _ocFiltro = 'Todas';
var _ocCache = [];
var _ocTab = 'ordenes';

function fmtQ(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.mostrarCompras = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML =
    '<div class="flex flex-wrap items-start justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold text-slate-900">Compras</h1>' +
    '<p class="text-sm text-slate-500">Órdenes, proveedores, recepción de stock y alertas</p></div>' +
    '<button type="button" onclick="comprasTab(\'nueva\')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">' +
    '<i class="fas fa-plus mr-1"></i> Nueva orden</button></div>' +

    '<div id="compras-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>' +

    '<div class="flex flex-wrap gap-1.5 mb-4" id="compras-tabs">' +
    ocTabBtn('ordenes', 'Órdenes', true) +
    ocTabBtn('nueva', 'Nueva OC') +
    ocTabBtn('proveedores', 'Proveedores') +
    ocTabBtn('sugerencias', 'Stock bajo') +
    ocTabBtn('historial', 'Historial recepción') +
    '</div>' +

    '<div id="compras-body"></div>';

  comprasTab('ordenes');
  cargarKpisCompras();
};

function ocTabBtn(id, label, active) {
  return '<button type="button" data-otab="' + id + '" onclick="comprasTab(\'' + id + '\')" class="otab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
    (active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200') + '">' + label + '</button>';
}

window.comprasTab = function (id) {
  _ocTab = id;
  document.querySelectorAll('.otab').forEach(function (b) {
    var on = b.getAttribute('data-otab') === id;
    b.className = 'otab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  if (id === 'ordenes') renderOcLista();
  else if (id === 'nueva') renderOcNueva();
  else if (id === 'proveedores') renderOcProveedores();
  else if (id === 'sugerencias') renderOcSugerencias();
  else if (id === 'historial') renderOcHistorial();
};

async function cargarKpisCompras() {
  var box = document.getElementById('compras-kpis');
  if (!box) return;
  try {
    var snap = await db.collection('ordenes_compra').orderBy('fecha', 'desc').limit(100).get();
    var pend = 0, recibidas = 0, montoPend = 0, montoMes = 0;
    var inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
    snap.forEach(function (d) {
      var o = d.data();
      var est = o.estado || 'Pendiente';
      var tot = Number(o.total) || 0;
      if (est === 'Pendiente' || est === 'Enviada' || est === 'Parcial') { pend++; montoPend += tot; }
      if (est === 'Recibida') recibidas++;
      var f = o.fecha && o.fecha.toDate ? o.fecha.toDate() : null;
      if (f && f >= inicioMes) montoMes += tot;
    });
    box.innerHTML =
      kpiC('Órdenes pendientes', String(pend), 'text-amber-600') +
      kpiC('Monto pendiente', fmtQ(montoPend), 'text-slate-800') +
      kpiC('Recibidas (muestra)', String(recibidas), 'text-green-600') +
      kpiC('Compras del mes', fmtQ(montoMes), 'text-blue-600');
  } catch (e) {
    box.innerHTML = '';
  }
}

function kpiC(l, v, c) {
  return '<div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">' +
    '<p class="text-[10px] uppercase text-slate-400 font-semibold">' + l + '</p>' +
    '<p class="text-lg font-bold ' + (c || '') + '">' + v + '</p></div>';
}

/* ===== LISTA OC ===== */
function renderOcLista() {
  var body = document.getElementById('compras-body');
  body.innerHTML =
    '<div class="flex flex-wrap gap-2 mb-4 text-sm" id="filtros-oc">' +
    ['Todas', 'Pendiente', 'Enviada', 'Parcial', 'Recibida', 'Cancelada'].map(function (e) {
      return '<button type="button" onclick="filtrarOC(\'' + e + '\')" class="oc-filtro px-3 py-1.5 rounded-full border text-xs font-semibold ' +
        (_ocFiltro === e ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200') + '">' + e + '</button>';
    }).join('') + '</div><div id="lista-ordenes" class="space-y-3"><p class="text-slate-400 text-center py-8"><i class="fas fa-spinner fa-spin"></i></p></div>';

  if (window._unsubOC) try { window._unsubOC(); } catch (e) {}
  window._unsubOC = db.collection('ordenes_compra').orderBy('fecha', 'desc').limit(80).onSnapshot(function (snap) {
    _ocCache = [];
    snap.forEach(function (d) { _ocCache.push(Object.assign({ id: d.id }, d.data())); });
    paintOCs();
    cargarKpisCompras();
  });
}

window.filtrarOC = function (e) {
  _ocFiltro = e;
  document.querySelectorAll('.oc-filtro').forEach(function (b) {
    var on = b.textContent === e;
    b.className = 'oc-filtro px-3 py-1.5 rounded-full border text-xs font-semibold ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  paintOCs();
};

function estadoPillOC(est) {
  var map = {
    Pendiente: 'bg-amber-100 text-amber-800',
    Enviada: 'bg-blue-100 text-blue-800',
    Parcial: 'bg-indigo-100 text-indigo-800',
    Recibida: 'bg-green-100 text-green-800',
    Cancelada: 'bg-red-100 text-red-700'
  };
  return '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ' + (map[est] || 'bg-slate-100') + '">' + (est || '') + '</span>';
}

function paintOCs() {
  var box = document.getElementById('lista-ordenes');
  if (!box) return;
  var list = _ocCache.filter(function (o) {
    return _ocFiltro === 'Todas' || o.estado === _ocFiltro;
  });
  if (!list.length) {
    box.innerHTML = '<div class="text-center text-slate-400 py-14"><div class="text-4xl mb-2 opacity-40">📦</div><p>Sin órdenes</p>' +
      '<button type="button" onclick="comprasTab(\'nueva\')" class="mt-3 text-green-700 font-semibold text-sm">Crear primera orden</button></div>';
    return;
  }
  box.innerHTML = list.map(function (o) {
    var items = (o.productos || []).map(function (p) {
      return p.nombre + ' ×' + p.cantidad;
    }).join(' · ');
    var f = o.fecha && o.fecha.toDate ? o.fecha.toDate().toLocaleString('es-GT') : '';
    var abierta = o.estado !== 'Recibida' && o.estado !== 'Cancelada';
    return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">' +
      '<div class="flex flex-wrap justify-between gap-2">' +
      '<div class="min-w-0">' +
      '<div class="font-bold text-slate-900">' + (o.folio || o.id.slice(-6)) + ' · ' + (o.proveedor || 'Sin proveedor') + '</div>' +
      '<div class="text-xs text-slate-400 mt-0.5">' + f +
      (o.condicion ? ' · ' + o.condicion : '') +
      (o.fechaEsperada ? ' · Esperada ' + o.fechaEsperada : '') + '</div>' +
      '<div class="text-xs text-slate-600 mt-2 line-clamp-2">' + items + '</div></div>' +
      '<div class="text-right shrink-0">' + estadoPillOC(o.estado) +
      '<div class="font-bold text-lg mt-1 text-slate-900">' + fmtQ(o.total) + '</div></div></div>' +
      '<div class="flex flex-wrap gap-2 mt-3">' +
      (abierta
        ? '<button type="button" onclick="recibirOrden(\'' + o.id + '\')" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">Recibir e ingresar stock</button>' +
          '<button type="button" onclick="cambiarEstadoOC(\'' + o.id + '\',\'Enviada\')" class="px-3 py-2 rounded-xl border text-xs font-semibold">Marcar enviada</button>' +
          '<button type="button" onclick="cambiarEstadoOC(\'' + o.id + '\',\'Cancelada\')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">Cancelar</button>'
        : '') +
      '<button type="button" onclick="imprimirOC(\'' + o.id + '\')" class="px-3 py-2 rounded-xl border text-xs font-semibold"><i class="fas fa-print"></i> Imprimir</button>' +
      (o.telefonoProveedor || ''
        ? '<a href="https://wa.me/502' + String(o.telefonoProveedor).replace(/\D/g, '') + '" target="_blank" class="px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold"><i class="fab fa-whatsapp"></i></a>'
        : '') +
      '</div></div>';
  }).join('');
}

window.cambiarEstadoOC = async function (id, estado) {
  try {
    await db.collection('ordenes_compra').doc(id).update({ estado: estado, actualizado: new Date() });
    if (typeof adminToast === 'function') adminToast('Estado: ' + estado, 'ok');
  } catch (e) {
    alert(e.message);
  }
};

window.recibirOrden = async function (id) {
  if (!confirm('¿Confirmar recepción? Se sumará stock, se actualizará costo y se registrará en kardex.')) return;
  try {
    var doc = await db.collection('ordenes_compra').doc(id).get();
    if (!doc.exists) return alert('Orden no encontrada');
    var o = doc.data();
    if (o.estado === 'Recibida') return alert('Ya fue recibida');

    await db.runTransaction(async function (tx) {
      for (var i = 0; i < (o.productos || []).length; i++) {
        var item = o.productos[i];
        if (!item.id) continue;
        var pref = db.collection('productos').doc(item.id);
        var ps = await tx.get(pref);
        if (!ps.exists) continue;
        var stock = Number(ps.data().stock || 0) + Number(item.cantidad || 0);
        var upd = { stock: stock };
        if (item.costo != null && !isNaN(Number(item.costo))) upd.costo = Number(item.costo);
        tx.update(pref, upd);
      }
      tx.update(db.collection('ordenes_compra').doc(id), {
        estado: 'Recibida',
        recibidoEn: new Date(),
        recibidoPor: (window.usuarioActual && window.usuarioActual.nombre) || (auth.currentUser && auth.currentUser.email) || ''
      });
    });

    for (var j = 0; j < (o.productos || []).length; j++) {
      var it = o.productos[j];
      if (!it.id) continue;
      await db.collection('kardex').add({
        tipo: 'ENTRADA',
        origen: 'COMPRA',
        ordenId: id,
        folio: o.folio || '',
        productoId: it.id,
        producto: it.nombre,
        cantidad: Number(it.cantidad) || 0,
        costo: Number(it.costo) || 0,
        proveedor: o.proveedor || '',
        fecha: new Date()
      });
    }

    // Asiento contable opcional
    try {
      var total = Number(o.total) || 0;
      if (total > 0) {
        await db.collection('asientos_contables').add({
          fecha: new Date(),
          concepto: 'Compra ' + (o.folio || '') + ' · ' + (o.proveedor || ''),
          ref: 'compra:' + id,
          origen: 'Compra',
          periodo: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
          lineas: o.condicion && String(o.condicion).indexOf('Crédito') >= 0
            ? [
                { cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 },
                { cuenta: '2101', cuentaNombre: 'Proveedores', debe: 0, haber: total }
              ]
            : [
                { cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 },
                { cuenta: '1101', cuentaNombre: 'Caja', debe: 0, haber: total }
              ],
          total: total,
          creado: new Date()
        });
      }
    } catch (e2) { console.warn('Asiento compra:', e2); }

    if (typeof adminToast === 'function') adminToast('Stock actualizado · OC recibida', 'ok');
    else alert('Stock actualizado');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.imprimirOC = function (id) {
  var o = _ocCache.find(function (x) { return x.id === id; });
  if (!o) return;
  var items = (o.productos || []).map(function (p) {
    return '<tr><td>' + p.nombre + '</td><td style="text-align:center">' + p.cantidad + '</td>' +
      '<td style="text-align:right">Q' + Number(p.costo).toFixed(2) + '</td>' +
      '<td style="text-align:right">Q' + (p.cantidad * p.costo).toFixed(2) + '</td></tr>';
  }).join('');
  var w = window.open('', 'OC', 'width=700,height=800');
  w.document.write('<html><head><title>' + (o.folio || 'OC') + '</title>' +
    '<style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}</style></head><body>' +
    '<h2>AGROMAXGTM · Orden de compra</h2>' +
    '<p><b>' + (o.folio || '') + '</b> · ' + (o.proveedor || '') + '</p>' +
    '<p>Condición: ' + (o.condicion || '') + ' · Estado: ' + (o.estado || '') + '</p>' +
    '<table><thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead><tbody>' + items +
    '</tbody></table><p style="text-align:right;font-size:18px;margin-top:16px"><b>Total ' + fmtQ(o.total) + '</b></p>' +
    (o.notas ? '<p>Notas: ' + o.notas + '</p>' : '') +
    '<script>window.print()</script></body></html>');
  w.document.close();
};

/* ===== NUEVA OC ===== */
function renderOcNueva() {
  _ocProductos = [];
  var body = document.getElementById('compras-body');
  body.innerHTML =
    '<div class="max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-8 space-y-4">' +
    '<h2 class="text-lg font-bold text-slate-900">Nueva orden de compra</h2>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Proveedor</label>' +
    '<select id="proveedor-select" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl bg-white"></select></div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Fecha esperada</label>' +
    '<input id="fecha-oc" type="date" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl"></div>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Condición de pago</label>' +
    '<select id="condicion" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl bg-white">' +
    '<option>Contado</option><option>Crédito 15 días</option><option>Crédito 30 días</option><option>Crédito 45 días</option></select></div></div>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Notas</label>' +
    '<textarea id="notas-oc" rows="2" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl" placeholder="Condiciones, transporte, etc."></textarea></div>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Agregar productos</label>' +
    '<input id="buscar-oc" placeholder="Escribe al menos 2 letras..." class="w-full mt-1 p-3 border border-slate-200 rounded-2xl" onkeyup="filtrarProductosOC()">' +
    '<div id="resultados-oc" class="max-h-48 overflow-auto border border-slate-100 rounded-2xl mt-2 bg-slate-50"></div></div>' +
    '<div id="lista-orden-oc" class="space-y-2"></div>' +
    '<div class="flex justify-between items-center pt-2 border-t">' +
    '<span class="text-sm text-slate-500">Total estimado</span>' +
    '<span id="total-oc" class="text-2xl font-bold text-green-700">Q0.00</span></div>' +
    '<button type="button" onclick="guardarOrdenCompra()" class="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-bold">Guardar orden de compra</button></div>';

  document.getElementById('fecha-oc').valueAsDate = new Date();
  cargarProveedoresSelect();
  cargarProdsCacheOC();
}

async function cargarProdsCacheOC() {
  var snap = await db.collection('productos').limit(400).get();
  _ocProdsCache = [];
  snap.forEach(function (d) {
    var p = d.data();
    _ocProdsCache.push({
      id: d.id,
      nombre: p.nombre,
      stock: p.stock || 0,
      costoCompra: Number(p.costo || p.costoCompra || p.precioCompra || 0)
    });
  });
}

async function cargarProveedoresSelect() {
  var select = document.getElementById('proveedor-select');
  if (!select) return;
  var snap = await db.collection('proveedores').get();
  select.innerHTML = '<option value="">Seleccionar proveedor</option>';
  snap.forEach(function (doc) {
    var p = doc.data();
    var opt = document.createElement('option');
    opt.value = doc.id;
    opt.textContent = p.empresa || p.nombre || doc.id;
    opt.dataset.nombre = p.empresa || p.nombre || '';
    opt.dataset.telefono = p.telefono || '';
    select.appendChild(opt);
  });
}

window.filtrarProductosOC = function () {
  var term = (document.getElementById('buscar-oc').value || '').toLowerCase().trim();
  var box = document.getElementById('resultados-oc');
  if (term.length < 2) { box.innerHTML = ''; return; }
  var html = '';
  _ocProdsCache.forEach(function (p) {
    if (!(p.nombre || '').toLowerCase().includes(term)) return;
    html += '<button type="button" onclick="agregarProductoOC(\'' + p.id + '\',\"' +
      String(p.nombre).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\\\