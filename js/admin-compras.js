// js/admin-compras.js
// Modulo de Compras profesional dentro del admin

var _ocProductos = [];
var _ocProdsCache = [];
var _ocFiltro = 'Todas';
var _ocCache = [];

function fmtQC(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.mostrarCompras = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML =
    '<div class="flex flex-wrap items-start justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold text-slate-900">Compras</h1>' +
    '<p class="text-sm text-slate-500">Ordenes, proveedores, recepcion de stock y alertas</p></div>' +
    '<button type="button" onclick="comprasTab(\'nueva\')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold">' +
    '<i class="fas fa-plus mr-1"></i> Nueva orden</button></div>' +
    '<div id="compras-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>' +
    '<div class="flex flex-wrap gap-1.5 mb-4">' +
    ocTabBtn('ordenes', 'Ordenes') +
    ocTabBtn('nueva', 'Nueva OC') +
    ocTabBtn('proveedores', 'Proveedores') +
    ocTabBtn('sugerencias', 'Stock bajo') +
    ocTabBtn('historial', 'Historial') +
    '</div><div id="compras-body"></div>';

  comprasTab('ordenes');
  cargarKpisCompras();
};

function ocTabBtn(id, label) {
  return '<button type="button" data-otab="' + id + '" onclick="comprasTab(\'' + id + '\')" class="otab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-white text-slate-600 border-slate-200">' + label + '</button>';
}

window.comprasTab = function (id) {
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
      kpiC('Ordenes pendientes', String(pend), 'text-amber-600') +
      kpiC('Monto pendiente', fmtQC(montoPend), 'text-slate-800') +
      kpiC('Recibidas', String(recibidas), 'text-green-600') +
      kpiC('Compras del mes', fmtQC(montoMes), 'text-blue-600');
  } catch (e) { box.innerHTML = ''; }
}

function kpiC(l, v, c) {
  return '<div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">' +
    '<p class="text-[10px] uppercase text-slate-400 font-semibold">' + l + '</p>' +
    '<p class="text-lg font-bold ' + (c || '') + '">' + v + '</p></div>';
}

function renderOcLista() {
  var body = document.getElementById('compras-body');
  body.innerHTML =
    '<div class="flex flex-wrap gap-2 mb-4">' +
    ['Todas', 'Pendiente', 'Enviada', 'Parcial', 'Recibida', 'Cancelada'].map(function (e) {
      return '<button type="button" onclick="filtrarOC(\'' + e + '\')" class="oc-filtro px-3 py-1.5 rounded-full border text-xs font-semibold ' +
        (_ocFiltro === e ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200') + '">' + e + '</button>';
    }).join('') +
    '</div><div id="lista-ordenes" class="space-y-3"><p class="text-center text-slate-400 py-8"><i class="fas fa-spinner fa-spin"></i></p></div>';

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
    var on = b.textContent.trim() === e;
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
    box.innerHTML = '<div class="text-center text-slate-400 py-14"><p>Sin ordenes</p>' +
      '<button type="button" onclick="comprasTab(\'nueva\')" class="mt-3 text-green-700 font-semibold text-sm">Crear primera orden</button></div>';
    return;
  }
  box.innerHTML = list.map(function (o) {
    var items = (o.productos || []).map(function (p) { return p.nombre + ' x' + p.cantidad; }).join(' · ');
    var f = o.fecha && o.fecha.toDate ? o.fecha.toDate().toLocaleString('es-GT') : '';
    var abierta = o.estado !== 'Recibida' && o.estado !== 'Cancelada';
    var tel = String(o.telefonoProveedor || '').replace(/\D/g, '');
    return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">' +
      '<div class="flex flex-wrap justify-between gap-2">' +
      '<div class="min-w-0"><div class="font-bold">' + (o.folio || o.id.slice(-6)) + ' · ' + (o.proveedor || '') + '</div>' +
      '<div class="text-xs text-slate-400">' + f + (o.condicion ? ' · ' + o.condicion : '') +
      (o.fechaEsperada ? ' · Esperada ' + o.fechaEsperada : '') + '</div>' +
      '<div class="text-xs text-slate-600 mt-2 line-clamp-2">' + items + '</div></div>' +
      '<div class="text-right">' + estadoPillOC(o.estado) +
      '<div class="font-bold text-lg mt-1">' + fmtQC(o.total) + '</div></div></div>' +
      '<div class="flex flex-wrap gap-2 mt-3">' +
      (abierta
        ? '<button type="button" onclick="recibirOrden(\'' + o.id + '\')" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold">Recibir e ingresar stock</button>' +
          '<button type="button" onclick="cambiarEstadoOC(\'' + o.id + '\',\'Enviada\')" class="px-3 py-2 rounded-xl border text-xs font-semibold">Marcar enviada</button>' +
          '<button type="button" onclick="cambiarEstadoOC(\'' + o.id + '\',\'Cancelada\')" class="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">Cancelar</button>'
        : '') +
      '<button type="button" onclick="imprimirOC(\'' + o.id + '\')" class="px-3 py-2 rounded-xl border text-xs font-semibold"><i class="fas fa-print"></i> Imprimir</button>' +
      (tel ? '<a href="https://wa.me/502' + tel + '" target="_blank" class="px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold"><i class="fab fa-whatsapp"></i></a>' : '') +
      '</div></div>';
  }).join('');
}

window.cambiarEstadoOC = async function (id, estado) {
  try {
    await db.collection('ordenes_compra').doc(id).update({ estado: estado, actualizado: new Date() });
    if (typeof adminToast === 'function') adminToast('Estado: ' + estado, 'ok');
  } catch (e) { alert(e.message); }
};

window.recibirOrden = async function (id) {
  if (!confirm('Confirmar recepcion? Se sumara stock, se actualizara costo y kardex.')) return;
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

    try {
      var total = Number(o.total) || 0;
      if (total > 0) {
        var esCredito = o.condicion && String(o.condicion).indexOf('Credito') >= 0 || String(o.condicion || '').indexOf('Crédito') >= 0;
        await db.collection('asientos_contables').add({
          fecha: new Date(),
          concepto: 'Compra ' + (o.folio || '') + ' · ' + (o.proveedor || ''),
          ref: 'compra:' + id,
          origen: 'Compra',
          periodo: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
          lineas: esCredito
            ? [{ cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 }, { cuenta: '2101', cuentaNombre: 'Proveedores', debe: 0, haber: total }]
            : [{ cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 }, { cuenta: '1101', cuentaNombre: 'Caja', debe: 0, haber: total }],
          total: total,
          creado: new Date()
        });
      }
    } catch (e2) { console.warn(e2); }

    if (typeof adminToast === 'function') adminToast('Stock actualizado · OC recibida', 'ok');
    else alert('Stock actualizado');
  } catch (e) { alert('Error: ' + e.message); }
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
    '<h2>AGROMAXGTM - Orden de compra</h2>' +
    '<p><b>' + (o.folio || '') + '</b> · ' + (o.proveedor || '') + '</p>' +
    '<p>Condicion: ' + (o.condicion || '') + ' · Estado: ' + (o.estado || '') + '</p>' +
    '<table><thead><tr><th>Producto</th><th>Cant.</th><th>Costo</th><th>Subtotal</th></tr></thead><tbody>' + items +
    '</tbody></table><p style="text-align:right;font-size:18px;margin-top:16px"><b>Total ' + fmtQC(o.total) + '</b></p>' +
    (o.notas ? '<p>Notas: ' + o.notas + '</p>' : '') +
    '<script>window.print()</script></body></html>');
  w.document.close();
};

function renderOcNueva() {
  _ocProductos = [];
  var body = document.getElementById('compras-body');
  body.innerHTML =
    '<div class="max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-8 space-y-4">' +
    '<h2 class="text-lg font-bold">Nueva orden de compra</h2>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Proveedor</label>' +
    '<select id="proveedor-select" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl bg-white"></select></div>' +
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Fecha esperada</label>' +
    '<input id="fecha-oc" type="date" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl"></div>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Condicion de pago</label>' +
    '<select id="condicion" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl bg-white">' +
    '<option>Contado</option><option>Credito 15 dias</option><option>Credito 30 dias</option><option>Credito 45 dias</option></select></div></div>' +
    '<div><label class="text-xs font-semibold text-slate-500 uppercase">Notas</label>' +
    '<textarea id="notas-oc" rows="2" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl" placeholder="Condiciones, transporte..."></textarea></div>' +
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
  if (!box) return;
  if (term.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '';
  var n = 0;
  _ocProdsCache.forEach(function (p) {
    if (!(p.nombre || '').toLowerCase().includes(term)) return;
    n++;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-full text-left p-3 hover:bg-white border-b border-slate-100 text-sm flex justify-between';
    btn.innerHTML = '<span>' + p.nombre + ' <span class="text-slate-400">(stock ' + p.stock + ')</span></span>' +
      '<span class="font-semibold">Costo ' + fmtQC(p.costoCompra) + '</span>';
    btn.onclick = function () { agregarProductoOC(p.id, p.nombre, p.costoCompra, p.stock); };
    box.appendChild(btn);
  });
  if (!n) box.innerHTML = '<p class="p-3 text-slate-400 text-sm">Sin resultados</p>';
};

window.agregarProductoOC = function (id, nombre, costo, stock) {
  var cant = parseFloat(prompt('Cantidad de ' + nombre + ':', '10')) || 0;
  if (cant <= 0) return;
  var costoIn = parseFloat(prompt('Costo unitario Q:', String(costo || 0)));
  if (isNaN(costoIn)) costoIn = costo || 0;
  var exist = _ocProductos.find(function (x) { return x.id === id; });
  if (exist) { exist.cantidad += cant; exist.costo = costoIn; }
  else _ocProductos.push({ id: id, nombre: nombre, cantidad: cant, costo: costoIn, stockActual: stock });
  renderOrdenOC();
  var res = document.getElementById('resultados-oc');
  if (res) res.innerHTML = '';
  var buscar = document.getElementById('buscar-oc');
  if (buscar) buscar.value = '';
};

function renderOrdenOC() {
  var box = document.getElementById('lista-orden-oc');
  if (!box) return;
  var total = 0;
  box.innerHTML = _ocProductos.map(function (p, i) {
    var sub = p.cantidad * p.costo;
    total += sub;
    return '<div class="flex flex-wrap justify-between items-center gap-2 bg-slate-50 p-3 rounded-xl text-sm border border-slate-100">' +
      '<span class="font-medium">' + p.nombre + '</span>' +
      '<span>' + p.cantidad + ' x ' + fmtQC(p.costo) + ' = <b>' + fmtQC(sub) + '</b></span>' +
      '<button type="button" onclick="eliminarProductoOC(' + i + ')" class="text-red-600 text-xs font-semibold">Quitar</button></div>';
  }).join('') || '<p class="text-slate-400 text-sm">Sin productos aun</p>';
  var t = document.getElementById('total-oc');
  if (t) t.textContent = fmtQC(total);
}

window.eliminarProductoOC = function (i) {
  _ocProductos.splice(i, 1);
  renderOrdenOC();
};

window.guardarOrdenCompra = async function () {
  var sel = document.getElementById('proveedor-select');
  var proveedorId = sel.value;
  var opt = sel.options[sel.selectedIndex];
  var proveedorNombre = opt ? (opt.dataset.nombre || opt.text) : '';
  var telefono = opt ? (opt.dataset.telefono || '') : '';
  if (!proveedorId || !_ocProductos.length) return alert('Selecciona proveedor y productos');
  var total = _ocProductos.reduce(function (s, p) { return s + p.cantidad * p.costo; }, 0);
  var folio = 'OC-' + (Math.floor(Math.random() * 900000) + 100000);
  try {
    await db.collection('ordenes_compra').add({
      folio: folio,
      proveedorId: proveedorId,
      proveedor: proveedorNombre,
      telefonoProveedor: telefono,
      fecha: new Date(),
      fechaEsperada: document.getElementById('fecha-oc').value || null,
      condicion: document.getElementById('condicion').value,
      notas: (document.getElementById('notas-oc').value || '').trim(),
      productos: _ocProductos,
      total: total,
      estado: 'Pendiente',
      creadoPor: (window.usuarioActual && window.usuarioActual.nombre) || (auth.currentUser && auth.currentUser.email) || ''
    });
    if (typeof adminToast === 'function') adminToast('Orden ' + folio + ' guardada', 'ok');
    else alert('Orden ' + folio + ' guardada');
    comprasTab('ordenes');
  } catch (e) { alert(e.message); }
};

function renderOcProveedores() {
  var body = document.getElementById('compras-body');
  body.innerHTML =
    '<div class="grid lg:grid-cols-5 gap-4">' +
    '<div class="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">' +
    '<h3 class="font-bold">Nuevo proveedor</h3>' +
    '<input id="empresa" placeholder="Empresa *" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="nombre-contacto" placeholder="Contacto" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="telefono" placeholder="Telefono WhatsApp" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="correo" type="email" placeholder="Correo" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="nit-prov" placeholder="NIT" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<input id="direccion" placeholder="Direccion" class="w-full p-3 border border-slate-200 rounded-2xl">' +
    '<button type="button" onclick="agregarProveedor()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">Guardar</button></div>' +
    '<div class="lg:col-span-3" id="lista-proveedores"><p class="text-slate-400">Cargando...</p></div></div>';
  cargarListaProveedores();
}

window.agregarProveedor = async function () {
  var empresa = (document.getElementById('empresa').value || '').trim();
  if (!empresa) return alert('Empresa obligatoria');
  try {
    await db.collection('proveedores').add({
      empresa: empresa,
      nombreContacto: (document.getElementById('nombre-contacto').value || '').trim(),
      telefono: (document.getElementById('telefono').value || '').trim(),
      correo: (document.getElementById('correo').value || '').trim(),
      nit: (document.getElementById('nit-prov').value || '').trim(),
      direccion: (document.getElementById('direccion').value || '').trim(),
      fecha: new Date()
    });
    if (typeof adminToast === 'function') adminToast('Proveedor guardado', 'ok');
    renderOcProveedores();
  } catch (e) { alert(e.message); }
};

async function cargarListaProveedores() {
  var box = document.getElementById('lista-proveedores');
  if (!box) return;
  var snap = await db.collection('proveedores').get();
  if (snap.empty) {
    box.innerHTML = '<p class="text-slate-400 text-center py-12">Sin proveedores</p>';
    return;
  }
  var html = '<div class="grid sm:grid-cols-2 gap-3">';
  snap.forEach(function (doc) {
    var p = doc.data();
    var tel = (p.telefono || '').replace(/\D/g, '');
    html += '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">' +
      '<div class="font-bold">' + (p.empresa || '') + '</div>' +
      '<div class="text-sm text-slate-600">' + (p.nombreContacto || '') + '</div>' +
      (p.nit ? '<div class="text-xs text-slate-400">NIT ' + p.nit + '</div>' : '') +
      (tel ? '<a class="inline-block mt-2 text-sm text-green-700 font-semibold" href="https://wa.me/502' + tel + '" target="_blank"><i class="fab fa-whatsapp"></i> ' + p.telefono + '</a>' : '') +
      '<div class="text-xs text-slate-400 mt-1">' + (p.correo || '') + '</div>' +
      '<div class="text-xs text-slate-400">' + (p.direccion || '') + '</div></div>';
  });
  html += '</div>';
  box.innerHTML = html;
}

async function renderOcSugerencias() {
  var body = document.getElementById('compras-body');
  body.innerHTML = '<p class="text-slate-400"><i class="fas fa-spinner fa-spin"></i></p>';
  var snap = await db.collection('productos').limit(300).get();
  var list = [];
  snap.forEach(function (d) {
    var p = d.data();
    var min = Number(p.stockMinimo != null ? p.stockMinimo : 10);
    if ((p.stock || 0) <= min) {
      list.push({
        id: d.id,
        nombre: p.nombre,
        stock: p.stock || 0,
        min: min,
        costo: Number(p.costo || p.costoCompra || 0),
        sugerido: Math.max(min * 2 - (p.stock || 0), min)
      });
    }
  });
  list.sort(function (a, b) { return a.stock - b.stock; });
  body.innerHTML =
    '<div class="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 text-sm text-amber-900">Productos en o bajo el minimo. Cantidad sugerida orientativa.</div>' +
    (list.length ? list.map(function (p) {
      return '<div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-2 flex flex-wrap justify-between gap-2 items-center">' +
        '<div><div class="font-semibold">' + p.nombre + '</div>' +
        '<div class="text-xs text-slate-500">Stock ' + p.stock + ' · Min ' + p.min + ' · Sugerido ' + p.sugerido + '</div></div>' +
        '<div class="text-right"><div class="text-xs text-slate-400">Costo ref.</div><div class="font-bold">' + (p.costo ? fmtQC(p.costo) : '—') + '</div></div></div>';
    }).join('') : '<p class="text-green-600 text-center py-12">Todo el stock esta por encima del minimo</p>');
}

async function renderOcHistorial() {
  var body = document.getElementById('compras-body');
  body.innerHTML = '<p class="text-slate-400"><i class="fas fa-spinner fa-spin"></i></p>';
  try {
    var snap = await db.collection('kardex').where('origen', '==', 'COMPRA').orderBy('fecha', 'desc').limit(50).get();
    if (snap.empty) {
      body.innerHTML = '<p class="text-slate-400 text-center py-12">Aun no hay recepciones registradas</p>';
      return;
    }
    var html = '<div class="bg-white rounded-2xl border overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-slate-50 text-xs uppercase text-slate-500">' +
      '<th class="p-3 text-left">Fecha</th><th class="p-3 text-left">Producto</th><th class="p-3 text-center">Cant.</th><th class="p-3 text-right">Costo</th><th class="p-3 text-left">Proveedor</th><th class="p-3">Folio</th></tr></thead><tbody>';
    snap.forEach(function (d) {
      var k = d.data();
      var f = k.fecha && k.fecha.toDate ? k.fecha.toDate().toLocaleString('es-GT') : '';
      html += '<tr class="border-t"><td class="p-3 text-xs">' + f + '</td><td class="p-3 font-medium">' + (k.producto || '') + '</td>' +
        '<td class="p-3 text-center text-green-700 font-bold">+' + (k.cantidad || 0) + '</td>' +
        '<td class="p-3 text-right">' + fmtQC(k.costo) + '</td><td class="p-3 text-sm">' + (k.proveedor || '') + '</td>' +
        '<td class="p-3 text-xs text-slate-400">' + (k.folio || '') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = '<p class="text-amber-700 text-sm p-4">No se pudo cargar kardex (puede faltar indice). ' + e.message + '</p>';
  }
}

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'compras') return mostrarCompras();
    if (typeof prev === 'function') return prev(seccion);
  };
})();
