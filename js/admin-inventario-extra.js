// js/admin-inventario-extra.js — Bodegas + Lotes/caducidad

window.mostrarBodegas = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Bodegas / ubicaciones</h1>' +
    '<p class="text-sm text-slate-500">Tienda, bodega central, transferencias</p></div>' +
    '<button type="button" onclick="formBodega()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Bodega</button></div>' +
    '<div id="bod-lista" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6"></div>' +
    '<div class="bg-white rounded-2xl border p-5 max-w-lg">' +
    '<h3 class="font-bold mb-3">Transferencia de stock</h3>' +
    '<input id="tr-producto" placeholder="ID o nombre producto" class="w-full p-3 border rounded-xl mb-2">' +
    '<div class="grid grid-cols-2 gap-2 mb-2">' +
    '<input id="tr-desde" placeholder="Desde (bodega)" class="p-3 border rounded-xl">' +
    '<input id="tr-hacia" placeholder="Hacia (bodega)" class="p-3 border rounded-xl"></div>' +
    '<input id="tr-cant" type="number" placeholder="Cantidad" class="w-full p-3 border rounded-xl mb-2">' +
    '<button type="button" onclick="transferirStock()" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Transferir</button>' +
    '<p class="text-xs text-slate-400 mt-2">Registra el movimiento en kardex. El stock global del producto no cambia; es control por ubicación.</p></div>';
  cargarBodegas();
};

async function cargarBodegas() {
  var box = document.getElementById('bod-lista');
  try {
    var snap = await db.collection('bodegas').get();
    if (snap.empty) {
      // seed default
      await db.collection('bodegas').add({ nombre: 'Tienda principal', tipo: 'venta', activo: true });
      await db.collection('bodegas').add({ nombre: 'Bodega central', tipo: 'almacen', activo: true });
      return cargarBodegas();
    }
    var html = '';
    snap.forEach(function (d) {
      var b = d.data();
      html += '<div class="bg-white rounded-2xl border p-4 shadow-sm">' +
        '<div class="font-bold">' + (b.nombre || '') + '</div>' +
        '<div class="text-xs text-slate-400">' + (b.tipo || '') + '</div></div>';
    });
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
}

window.formBodega = async function () {
  var nombre = prompt('Nombre de la bodega:');
  if (!nombre) return;
  try {
    await db.collection('bodegas').add({ nombre: nombre.trim(), tipo: 'almacen', activo: true, creado: new Date() });
    if (typeof logAuditoria === 'function') logAuditoria('bodega_crear', nombre);
    cargarBodegas();
  } catch (e) { alert(e.message); }
};

window.transferirStock = async function () {
  var prod = (document.getElementById('tr-producto').value || '').trim();
  var desde = (document.getElementById('tr-desde').value || '').trim();
  var hacia = (document.getElementById('tr-hacia').value || '').trim();
  var cant = parseFloat(document.getElementById('tr-cant').value);
  if (!prod || !desde || !hacia || !(cant > 0)) return alert('Completa todos los campos');
  try {
    await db.collection('transferencias').add({
      producto: prod,
      desde: desde,
      hacia: hacia,
      cantidad: cant,
      fecha: new Date(),
      usuario: (window.usuarioActual && window.usuarioActual.nombre) || ''
    });
    await db.collection('kardex').add({
      tipo: 'TRANSFERENCIA',
      origen: 'BODEGA',
      producto: prod,
      cantidad: cant,
      desde: desde,
      hacia: hacia,
      fecha: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('transferencia', prod + ' ' + cant);
    if (typeof adminToast === 'function') adminToast('Transferencia registrada', 'ok');
    else alert('Transferencia registrada');
  } catch (e) { alert(e.message); }
};

/* ===== LOTES / VENCIMIENTO ===== */
window.mostrarLotes = function () {
  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl font-bold">Lotes y caducidad</h1>' +
    '<p class="text-sm text-slate-500">Control de vencimiento (agroquímicos)</p></div>' +
    '<button type="button" onclick="formLote()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">+ Lote</button></div>' +
    '<div id="lote-alertas" class="mb-4"></div>' +
    '<div id="lote-lista" class="space-y-2"></div>' +
    '<div id="lote-form" class="hidden mt-4"></div>';
  cargarLotes();
};

async function cargarLotes() {
  var lista = document.getElementById('lote-lista');
  var alertas = document.getElementById('lote-alertas');
  try {
    var snap = await db.collection('lotes').orderBy('vence', 'asc').limit(100).get();
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
    var vencidos = 0, porVencer = 0;
    var html = '';
    snap.forEach(function (d) {
      var l = Object.assign({ id: d.id }, d.data());
      var v = l.vence ? new Date(l.vence) : null;
      var estado = 'ok';
      if (v && v < hoy) { estado = 'vencido'; vencidos++; }
      else if (v && v <= en30) { estado = 'proximo'; porVencer++; }
      var color = estado === 'vencido' ? 'border-red-300 bg-red-50' : estado === 'proximo' ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-white';
      html += '<div class="rounded-2xl border p-4 ' + color + ' flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-bold">' + (l.producto || '') + '</div>' +
        '<div class="text-xs text-slate-500">Lote ' + (l.codigo || '—') + ' · Cant. ' + (l.cantidad || 0) + '</div></div>' +
        '<div class="text-right"><div class="font-semibold">Vence ' + (l.vence || '—') + '</div>' +
        '<span class="text-[10px] font-bold uppercase">' + estado + '</span></div></div>';
    });
    alertas.innerHTML =
      '<div class="grid grid-cols-2 gap-3">' +
      '<div class="bg-red-50 border border-red-100 rounded-2xl p-3"><p class="text-xs text-red-600">Vencidos</p><p class="text-2xl font-bold text-red-700">' + vencidos + '</p></div>' +
      '<div class="bg-amber-50 border border-amber-100 rounded-2xl p-3"><p class="text-xs text-amber-700">Por vencer (30d)</p><p class="text-2xl font-bold text-amber-800">' + porVencer + '</p></div></div>';
    lista.innerHTML = html || '<p class="text-slate-400 text-center py-12">Sin lotes registrados</p>';
  } catch (e) {
    lista.innerHTML = '<p class="text-red-600 p-4">' + e.message + '<br>Si falta índice por vence, créalo en Firebase.</p>';
  }
}

window.formLote = function () {
  var f = document.getElementById('lote-form');
  f.classList.remove('hidden');
  f.innerHTML = '<div class="bg-white rounded-2xl border p-5 max-w-md space-y-2">' +
    '<input id="lote-prod" placeholder="Producto" class="w-full p-3 border rounded-xl">' +
    '<input id="lote-cod" placeholder="Código de lote" class="w-full p-3 border rounded-xl">' +
    '<input id="lote-cant" type="number" placeholder="Cantidad" class="w-full p-3 border rounded-xl">' +
    '<input id="lote-vence" type="date" class="w-full p-3 border rounded-xl">' +
    '<button type="button" onclick="guardarLote()" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Guardar lote</button></div>';
};

window.guardarLote = async function () {
  var producto = (document.getElementById('lote-prod').value || '').trim();
  var vence = document.getElementById('lote-vence').value;
  if (!producto || !vence) return alert('Producto y fecha de vencimiento obligatorios');
  try {
    await db.collection('lotes').add({
      producto: producto,
      codigo: (document.getElementById('lote-cod').value || '').trim(),
      cantidad: parseFloat(document.getElementById('lote-cant').value) || 0,
      vence: vence,
      creado: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('lote_crear', producto);
    mostrarLotes();
  } catch (e) { alert(e.message); }
};

(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (s) {
    if (s === 'bodegas') return mostrarBodegas();
    if (s === 'lotes') return mostrarLotes();
    if (typeof prev === 'function') return prev(s);
  };
})();
