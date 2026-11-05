// js/catalogo.js — Catálogo público (conectado a config/empresa)

let whatsappNumber = '50242664744';
let allProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoAGROMAXGTM')) || [];
let checkoutMetodo = 'stripe';
let categoriaActual = 'all';
let ordenActual = 'relevancia';
let productoDetalleIdx = -1;

function cfg() {
  return (typeof getAgroConfig === 'function') ? getAgroConfig() : {
    nombreComercial: 'AGROMAXGTM',
    catalogoWhatsApp: whatsappNumber,
    whatsapp: whatsappNumber,
    catalogoMensaje: 'Hola AGROMAXGTM, quiero más información',
    catalogoEnvio: 'Entrega a coordinar',
    telefono: '',
    direccion: '',
    webUrl: 'https://agromax-web.vercel.app'
  };
}

function waNum() {
  var c = cfg();
  var n = (c.catalogoWhatsApp || c.whatsapp || whatsappNumber || '').replace(/\D/g, '');
  return n || '50242664744';
}

function brandName() {
  return cfg().nombreComercial || 'AGROMAXGTM';
}

function aplicarConfigCatalogoUI() {
  var c = cfg();
  whatsappNumber = waNum();
  document.querySelectorAll('[data-cfg-brand]').forEach(function (el) {
    el.textContent = brandName();
  });
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (fab) {
    fab.href = 'https://wa.me/' + whatsappNumber;
  });
  // Footer contacto si existen nodos genéricos
  var telEl = document.querySelector('[data-cfg-tel]');
  if (telEl && c.telefono) telEl.textContent = c.telefono;
  var dirEl = document.querySelector('[data-cfg-dir]');
  if (dirEl && c.direccion) dirEl.textContent = c.direccion;
}

function generarTrackingCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'AGM-' + s;
}

function fechaEstimadaDefault() {
  var d = new Date();
  d.setDate(d.getDate() + 5);
  return d;
}

function toastCat(msg, tipo) {
  var t = document.getElementById('cat-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'cat-toast';
    t.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:200;padding:12px 18px;border-radius:14px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:90vw;text-align:center;';
    document.body.appendChild(t);
  }
  t.style.background = tipo === 'error' ? '#dc2626' : '#059669';
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._catToastT);
  window._catToastT = setTimeout(function () { t.style.display = 'none'; }, 2200);
}

function actualizarContador() {
  var count = carrito.reduce(function (sum, item) { return sum + item.cantidad; }, 0);
  document.querySelectorAll('#cart-count, #fab-cart-count').forEach(function (el) {
    if (!el) return;
    el.textContent = count;
    if (count > 0) el.classList.remove('hidden');
    else if (el.id === 'fab-cart-count') el.classList.add('hidden');
  });
}

function agregarAlCarrito(index, qty) {
  qty = qty || 1;
  var producto = allProductos[index];
  if (!producto) return;
  if ((producto.stock || 0) <= 0) return toastCat('Producto agotado', 'error');
  var existente = carrito.find(function (item) { return item.nombre === producto.nombre; });
  if (existente) existente.cantidad += qty;
  else carrito.push(Object.assign({}, producto, { cantidad: qty }));
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  actualizarContador();
  toastCat(producto.nombre + ' agregado');
}

function toggleCart() {
  var m = document.getElementById('cart-modal');
  m.classList.toggle('hidden');
  if (!m.classList.contains('hidden')) mostrarCarrito();
}

function mostrarCarrito() {
  var container = document.getElementById('cart-items');
  var html = '';
  var total = 0;
  carrito.forEach(function (item, index) {
    var subtotal = item.precio * item.cantidad;
    total += subtotal;
    html +=
      '<div class="flex gap-3 border-b border-slate-100 pb-4">' +
      '<img src="' + (item.imageUrl || 'https://picsum.photos/id/201/600/400') + '" class="w-16 h-16 object-cover rounded-xl shrink-0 bg-slate-100" alt="">' +
      '<div class="flex-1 min-w-0">' +
      '<h4 class="font-semibold text-sm truncate">' + item.nombre + '</h4>' +
      '<p class="text-green-700 text-sm font-medium">Q' + Number(item.precio).toFixed(2) + '</p>' +
      '<div class="flex items-center gap-2 mt-2">' +
      '<button type="button" onclick="cambiarCantidad(' + index + ', -1)" class="w-8 h-8 rounded-lg border border-slate-200 font-bold text-slate-600">−</button>' +
      '<span class="text-sm font-semibold w-6 text-center">' + item.cantidad + '</span>' +
      '<button type="button" onclick="cambiarCantidad(' + index + ', 1)" class="w-8 h-8 rounded-lg border border-slate-200 font-bold text-slate-600">+</button>' +
      '</div></div>' +
      '<div class="text-right shrink-0">' +
      '<p class="font-bold text-sm">Q' + subtotal.toFixed(2) + '</p>' +
      '<button type="button" onclick="cambiarCantidad(' + index + ', -999)" class="text-xs text-red-500 mt-2">Quitar</button></div></div>';
  });
  container.innerHTML = html ||
    '<div class="text-center py-16 text-slate-400"><div class="text-4xl mb-2 opacity-40">🛒</div><p>Tu carrito está vacío</p></div>';
  document.getElementById('cart-total').textContent = 'Q' + total.toFixed(2);
}

function cambiarCantidad(index, delta) {
  if (delta === -999) carrito.splice(index, 1);
  else {
    carrito[index].cantidad += delta;
    if (carrito[index].cantidad < 1) carrito.splice(
