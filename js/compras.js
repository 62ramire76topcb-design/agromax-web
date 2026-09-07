// js/compras.js
let productosOrden = [];
let _prodsCache = [];

auth.onAuthStateChanged(function (user) {
  if (!user) window.location.href = 'admin.html';
  else mostrarSeccion('ordenes');
});

window.mostrarSeccion = function (seccion) {
  var c = document.getElementById('main-content');
  if (seccion === 'nueva-orden') formNuevaOrden(c);
  else if (seccion === 'ordenes') formListaOrdenes(c);
  else if (seccion === 'proveedores') formProveedores(c);
  else if (seccion === 'sugerencias') formSugerencias(c);
};

function formNuevaOrden(c) {
  productosOrden = [];
  c.innerHTML =
    '<h1 class="text-2xl md:text-3xl font-bold mb-6">Nueva orden de compra</h1>' +
    '<div class="max-w-4xl bg-white p-6 md:p-8 rounded-3xl shadow space-y-4">' +
    '<label class="text-sm font-medium">Proveedor</label>' +
    '<select id="proveedor-select" class="w-full p-3 border rounded-2xl"></select>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
    '<div><label class="text-sm">Fecha esperada</label><input id="fecha" type="date" class="w-full p-3 border rounded-2xl"></div>' +
    '<div><label class="text-sm">Condición de pago</label>' +
    '<select id="condicion" class="w-full p-3 border rounded-2xl">' +
    '<option>Contado</option><option>Crédito 15 días</option><option>Crédito 30 días</option></select></div></div>' +
    '<textarea id="notas" placeholder="Notas / condiciones" class="w-full p-3 border rounded-2xl h-24"></textarea>' +
    '<div><label class="text-sm font-medium">Agregar productos</label>' +
    '<input id="buscar" placeholder="Buscar producto..." class="w-full p-3 border rounded-2xl mt-1" onkeyup="filtrarProductos()">' +
    '<div id="resultados" class="max-h-48 overflow-auto border rounded-2xl mt-2 bg-gray-50"></div></div>' +
    '<div id="lista-orden" class="space-y-2"></div>' +
    '<div class="text-right font-bold text-lg">Total estimado: <span id="total-oc">Q0.00</span></div>' +
    '<button onclick="guardarOrdenCompra()" class="w-full bg-green-700 text-white py-4 rounded-2xl font-bold">Guardar orden</button></div>';
  cargarProveedoresSelect();
  cargarProdsCache();
  document.getElementById('fecha').valueAsDate = new Date();
}

async function cargarProdsCache() {
  var snap = await db.collection('productos').limit(300).get();
  _prodsCache = [];
  snap.forEach(function (d) {
    var p = d.data();
    _prodsCache.push({ id: d.id, nombre: p.nombre, precio: p.precio || 0, stock: p.stock || 0, costoCompra: p.costo || p.precioCompra || p.precio || 0 });
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
    select.appendChild(opt);
  });
}

window.filtrarProductos = function () {
  var term = (document.getElementById('buscar').value || '').toLowerCase().trim();
  var box = document.getElementById('resultados');
  if (term.length < 2) { box.innerHTML = ''; return; }
  var html = '';
  _prodsCache.forEach(function (p) {
    if (!(p.nombre || '').toLowerCase().includes(term)) return;
    html += '<div onclick="agregarProducto(\'' + p.id + '\',\'' + String(p.nombre).replace(/'/g, "\\'") + '\',' +
      Number(p.costoCompra) + ',' + Number(p.stock) + ')" class="p-3 hover:bg-white cursor-pointer flex justify-between border-b text-sm">' +
      '<span>' + p.nombre + ' <span class="text-gray-400">(stock ' + p.stock + ')</span></span>' +
      '<span class="font-medium">Costo Q' + Number(p.costoCompra).toFixed(2) + '</span></div>';
  });
  box.innerHTML = html || '<p class="p-3 text-gray-500 text-sm">Sin resultados</p>';
};

window.agregarProducto = function (id, nombre, costo, stock) {
  var cant = parseFloat(prompt('Cantidad de ' + nombre + ':', '10')) || 0;
  if (cant <= 0) return;
  var costoIn = parseFloat(prompt('Costo unitario Q:', String(costo || 0)));
  if (isNaN(costoIn)) costoIn = costo || 0;
  var exist = productosOrden.find(function (x) { return x.id === id; });
  if (exist) { exist.cantidad += cant; exist.costo = costoIn; }
  else productosOrden.push({ id: id, nombre: nombre, cantidad: cant, costo: costoIn, stockActual: stock });
  renderOrden();
};

function renderOrden() {
  var box = document.getElementById('lista-orden');
  var total = 0;
  box.innerHTML = productosOrden.map(function (p, i) {
    var sub = p.cantidad * p.costo;
    total += sub;
    return '<div class="flex flex-wrap justify-between items-center gap-2 bg-gray-50 p-3 rounded-xl text-sm">' +
      '<span class="font-medium">' + p.nombre + '</span>' +
      '<span>' + p.cantidad + ' × Q' + Number(p.costo).toFixed(2) + ' = <b>Q' + sub.toFixed(2) + '</b></span>' +
      '<button onclick="eliminarProducto(' + i + ')" class="text-red-600 text-xs">Quitar</button></div>';
  }).join('') || '<p class="text-gray-400 text-sm">Sin productos</p>';
  document.getElementById('total-oc').textContent = 'Q' + total.toFixed(2);
}

window.eliminarProducto = function (i) {
  productosOrden.splice(i, 1);
  renderOrden();
};

window.guardarOrdenCompra = async function () {
  var sel = document.getElementById('proveedor-select');
  var proveedorId = sel.value;
  var proveedorNombre = sel.options[sel.selectedIndex] ? (sel.options[sel.selectedIndex].dataset.nombre || sel.options[sel.selectedIndex].text) : '';
  if (!proveedorId || !productosOrden.length) return alert('Selecciona proveedor y productos');
  var total = productosOrden.reduce(function (s, p) { return s + p.cantidad * p.costo; }, 0);
  var folio = 'OC-' + (Math.floor(Math.random() * 900000) + 100000);
  await db.collection('ordenes_compra').add({
    folio: folio,
    proveedorId: proveedorId,
    proveedor: proveedorNombre,
    fecha: new Date(),
    fechaEsperada: document.getElementById('fecha').value || null,
    condicion: document.getElementById('condicion').value,
    notas: document.getElementById('notas').value.trim(),
    productos: productosOrden,
    total: total,
    estado: 'Pendiente',
    creadoPor: (auth.currentUser && auth.currentUser.email) || ''
  });
  alert('✅ Orden ' + folio + ' guardada');
  mostrarSeccion('ordenes');
};

function formListaOrdenes(c) {
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-6">' +
    '<h1 class="text-2xl md:text-3xl font-bold">Órdenes de compra</h1>' +
    '<button onclick="mostrarSeccion(\'nueva-orden\')" class="bg-green-600 text-white px-4 py-2 rounded-xl text-sm">+ Nueva</button></div>' +
    '<div class="flex flex-wrap gap-2 mb-4 text-sm" id="filtros-oc">' +
    ['Todas','Pendiente','Enviada','Parcial','Recibida','Cancelada'].map(function (e) {
      return '<button onclick="filtrarOC(\'' + e + '\')" class="px-3 py-1.5 rounded-full border bg-white hover:bg-green-50">' + e + '</button>';
    }).join('') + '</div><div id="lista-ordenes" class="space-y-4">Cargando...</div>';
  window._filtroOC = 'Todas';
  db.collection('ordenes_compra').orderBy('fecha', 'desc').limit(80).onSnapshot(function (snap) {
    window._ocs = [];
    snap.forEach(function (d) { window._ocs.push({ id: d.id, ...d.data() }); });
    renderOCs();
  });
}

window.filtrarOC = function (e) {
  window._filtroOC = e;
  renderOCs();
};

function renderOCs() {
  var box = document.getElementById('lista-ordenes');
  if (!box) return;
  var list = (window._ocs || []).filter(function (o) {
    return window._filtroOC === 'Todas' || o.estado === window._filtroOC;
  });
  box.innerHTML = list.map(function (o) {
    var color = o.estado === 'Recibida' ? 'bg-green-100 text-green-800' :
      o.estado === 'Cancelada' ? 'bg-red-100 text-red-700' :
      o.estado === 'Parcial' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
    var items = (o.productos || []).map(function (p) {
      return p.nombre + ' ×' + p.cantidad;
    }).join(', ');
    return '<div class="bg-white rounded-2xl shadow p-5">' +
      '<div class="flex flex-wrap justify-between gap-2">' +
      '<div><div class="font-bold">' + (o.folio || o.id.slice(-6)) + ' · ' + (o.proveedor || '') + '</div>' +
      '<div class="text-xs text-gray-500">' + (o.fecha && o.fecha.toDate ? o.fecha.toDate().toLocaleString('es-GT') : '') + '</div>' +
      '<div class="text-xs mt-1 text-gray-600 line-clamp-2">' + items + '</div></div>' +
      '<div class="text-right">' +
      '<span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + color + '">' + (o.estado || '') + '</span>' +
      '<div class="font-bold mt-1">Q' + Number(o.total || 0).toFixed(2) + '</div></div></div>' +
      '<div class="flex flex-wrap gap-2 mt-3 text-sm">' +
      (o.estado !== 'Recibida' && o.estado !== 'Cancelada'
        ? '<button onclick="recibirOrden(\'' + o.id + '\')" class="bg-green-600 text-white px-3 py-1.5 rounded-lg">Recibir / subir stock</button>' +
          '<button onclick="cambiarEstadoOC(\'' + o.id + '\',\'Enviada\')" class="border px-3 py-1.5 rounded-lg">Marcar enviada</button>' +
          '<button onclick="cambiarEstadoOC(\'' + o.id + '\',\'Cancelada\')" class="text-red-600 border border-red-200 px-3 py-1.5 rounded-lg">Cancelar</button>'
        : '') +
      '</div></div>';
  }).join('') || '<p class="text-gray-400 text-center py-12">Sin órdenes</p>';
}

window.cambiarEstadoOC = async function (id, estado) {
  await db.collection('ordenes_compra').doc(id).update({ estado: estado, actualizado: new Date() });
};

window.recibirOrden = async function (id) {
  if (!confirm('¿Confirmar recepción? Se sumará stock y se registrará en kardex.')) return;
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
        if (item.costo != null) upd.costo = item.costo;
        tx.update(pref, upd);
      }
      tx.update(db.collection('ordenes_compra').doc(id), {
        estado: 'Recibida',
        recibidoEn: new Date(),
        recibidoPor: (auth.currentUser && auth.currentUser.email) || ''
      });
    });

    // Kardex entradas
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

    alert('✅ Stock actualizado y orden marcada como Recibida');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

function formProveedores(c) {
  c.innerHTML =
    '<h1 class="text-2xl md:text-3xl font-bold mb-6">Proveedores</h1>' +
    '<div class="max-w-xl bg-white p-6 rounded-3xl shadow mb-6 space-y-3">' +
    '<input id="empresa" placeholder="Empresa *" class="w-full p-3 border rounded-2xl">' +
    '<input id="nombre-contacto" placeholder="Contacto" class="w-full p-3 border rounded-2xl">' +
    '<input id="telefono" placeholder="Teléfono WhatsApp" class="w-full p-3 border rounded-2xl">' +
    '<input id="correo" type="email" placeholder="Correo" class="w-full p-3 border rounded-2xl">' +
    '<input id="nit-prov" placeholder="NIT" class="w-full p-3 border rounded-2xl">' +
    '<input id="direccion" placeholder="Dirección" class="w-full p-3 border rounded-2xl">' +
    '<button onclick="agregarProveedor()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">Guardar proveedor</button></div>' +
    '<div id="lista-proveedores" class="grid md:grid-cols-2 gap-4"></div>';
  cargarListaProveedores();
}

window.agregarProveedor = async function () {
  var empresa = document.getElementById('empresa').value.trim();
  if (!empresa) return alert('Empresa obligatoria');
  await db.collection('proveedores').add({
    empresa: empresa,
    nombreContacto: document.getElementById('nombre-contacto').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    correo: document.getElementById('correo').value.trim(),
    nit: document.getElementById('nit-prov').value.trim(),
    direccion: document.getElementById('direccion').value.trim(),
    fecha: new Date()
  });
  alert('✅ Proveedor guardado');
  formProveedores(document.getElementById('main-content'));
};

async function cargarListaProveedores() {
  var box = document.getElementById('lista-proveedores');
  var snap = await db.collection('proveedores').get();
  var html = '';
  snap.forEach(function (doc) {
    var p = doc.data();
    html += '<div class="bg-white p-5 rounded-2xl shadow">' +
      '<div class="font-bold text-lg">' + (p.empresa || '') + '</div>' +
      '<div class="text-sm">' + (p.nombreContacto || '') + '</div>' +
      (p.nit ? '<div class="text-xs text-gray-500">NIT: ' + p.nit + '</div>' : '') +
      (p.telefono ? '<a class="text-green-600 text-sm" href="https://wa.me/502' + p.telefono + '" target="_blank">📱 ' + p.telefono + '</a>' : '') +
      '<div class="text-xs text-gray-500">' + (p.correo || '') + '</div>' +
      '<div class="text-xs text-gray-400">' + (p.direccion || '') + '</div></div>';
  });
  box.innerHTML = html || '<p class="text-gray-400 col-span-2 text-center py-8">Sin proveedores</p>';
}

async function formSugerencias(c) {
  c.innerHTML = '<h1 class="text-2xl font-bold mb-4">Sugerencias de compra (stock bajo)</h1><div id="sug">Cargando...</div>';
  var snap = await db.collection('productos').limit(200).get();
  var list = [];
  snap.forEach(function (d) {
    var p = d.data();
    var min = Number(p.stockMinimo != null ? p.stockMinimo : 10);
    if ((p.stock || 0) <= min) list.push({ id: d.id, nombre: p.nombre, stock: p.stock || 0, min: min });
  });
  list.sort(function (a, b) { return a.stock - b.stock; });
  document.getElementById('sug').innerHTML = list.map(function (p) {
    return '<div class="bg-white p-4 rounded-xl shadow mb-2 flex justify-between">' +
      '<div><b>' + p.nombre + '</b><div class="text-xs text-gray-500">Stock ' + p.stock + ' / mín ' + p.min + '</div></div>' +
      '<span class="text-orange-600 text-sm font-medium">Reponer</span></div>';
  }).join('') || '<p class="text-gray-400">Todo el stock está por encima del mínimo</p>';
}
