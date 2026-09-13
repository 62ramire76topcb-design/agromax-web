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
  var fab = document.querySelector('a[href*="wa.me"]');
  if (fab && fab.classList.contains('w-14')) {
    fab.href = 'https://wa.me/' + whatsappNumber;
  }
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
    if (carrito[index].cantidad < 1) carrito.splice(index, 1);
  }
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  mostrarCarrito();
  actualizarContador();
}

function abrirDetalle(index) {
  productoDetalleIdx = index;
  var p = allProductos[index];
  if (!p) return;
  var stock = Number(p.stock) || 0;
  var agotado = stock <= 0;
  var bajo = stock > 0 && stock < 10;
  document.getElementById('det-img').src = p.imageUrl || 'https://picsum.photos/id/201/600/400';
  document.getElementById('det-cat').textContent = p.categoria || 'Producto';
  document.getElementById('det-nombre').textContent = p.nombre || '';
  document.getElementById('det-desc').textContent = p.descripcion || p.detalle || 'Insumo agrícola de calidad.';
  document.getElementById('det-unidad').textContent = p.unidad || '';
  document.getElementById('det-precio').textContent = 'Q' + Number(p.precio || 0).toLocaleString('es-GT', { minimumFractionDigits: 2 });
  var st = document.getElementById('det-stock');
  st.textContent = agotado ? 'Agotado' : (bajo ? 'Últimas unidades (' + stock + ')' : 'Disponible');
  st.className = 'text-xs font-semibold ' + (agotado ? 'text-red-600' : bajo ? 'text-amber-600' : 'text-green-600');
  document.getElementById('det-qty').value = 1;
  var btn = document.getElementById('det-add');
  btn.disabled = agotado;
  btn.className = agotado
    ? 'flex-1 py-3 rounded-xl bg-slate-200 text-slate-500 font-bold cursor-not-allowed'
    : 'flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold';
  document.getElementById('product-modal').classList.remove('hidden');
}

function cerrarDetalle() {
  document.getElementById('product-modal').classList.add('hidden');
}

function detAdd() {
  var q = parseInt(document.getElementById('det-qty').value, 10) || 1;
  if (productoDetalleIdx < 0) return;
  agregarAlCarrito(productoDetalleIdx, Math.max(1, q));
  cerrarDetalle();
}

function detQty(d) {
  var inp = document.getElementById('det-qty');
  var v = parseInt(inp.value, 10) || 1;
  inp.value = Math.max(1, v + d);
}

function abrirFormularioCheckout(metodo) {
  if (carrito.length === 0) return toastCat('El carrito está vacío', 'error');
  checkoutMetodo = metodo;
  var saved = JSON.parse(localStorage.getItem('datosClienteCatalogo') || '{}');
  document.getElementById('ck-nombre').value = saved.nombre || '';
  document.getElementById('ck-telefono').value = saved.telefono || '';
  document.getElementById('ck-nit').value = saved.nit || '';
  document.getElementById('ck-email').value = saved.email || '';
  document.getElementById('ck-direccion').value = saved.direccion || '';
  document.getElementById('ck-referencia').value = saved.referencia || '';
  document.getElementById('ck-error').classList.add('hidden');
  document.getElementById('ck-step-label').textContent =
    metodo === 'stripe' ? 'Paso 2 de 2 · Pago con tarjeta' : 'Paso 2 de 2 · Pedido WhatsApp';
  var btn = document.getElementById('ck-continuar');
  if (metodo === 'stripe') {
    btn.className = 'w-full py-3.5 rounded-2xl text-white font-bold bg-blue-600 hover:bg-blue-700 transition';
    btn.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Continuar al pago seguro';
  } else {
    btn.className = 'w-full py-3.5 rounded-2xl text-white font-bold bg-green-600 hover:bg-green-700 transition';
    btn.innerHTML = '<i class="fab fa-whatsapp mr-2"></i> Enviar pedido';
  }
  document.getElementById('checkout-modal').classList.remove('hidden');
}

function cerrarFormularioCheckout() {
  document.getElementById('checkout-modal').classList.add('hidden');
}

function obtenerDatosCheckout() {
  return {
    nombre: document.getElementById('ck-nombre').value.trim(),
    telefono: document.getElementById('ck-telefono').value.trim(),
    nit: document.getElementById('ck-nit').value.trim() || 'CF',
    email: document.getElementById('ck-email').value.trim(),
    direccion: document.getElementById('ck-direccion').value.trim(),
    referencia: document.getElementById('ck-referencia').value.trim()
  };
}

function validarDatosCheckout(d) {
  if (!d.nombre) return 'Ingresa tu nombre completo';
  if (!d.telefono || d.telefono.length < 8) return 'Ingresa un teléfono válido';
  if (!d.direccion) return 'Ingresa la dirección de envío';
  return null;
}

async function continuarCheckout() {
  var datos = obtenerDatosCheckout();
  var err = validarDatosCheckout(datos);
  var errEl = document.getElementById('ck-error');
  if (err) {
    errEl.textContent = err;
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  localStorage.setItem('datosClienteCatalogo', JSON.stringify(datos));
  if (checkoutMetodo === 'stripe') await pagarConStripe(datos);
  else await enviarPedidoWhatsApp(datos);
}

async function pagarConStripe(datos) {
  if (carrito.length === 0) return toastCat('El carrito está vacío', 'error');
  var btn = document.getElementById('ck-continuar');
  var textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando pedido...';
  try {
    var trackingCode = generarTrackingCode();
    var fechaEstimada = fechaEstimadaDefault();
    var ahora = new Date();
    var total = 0;
    var productos = carrito.map(function (item) {
      total += item.precio * item.cantidad;
      return { nombre: item.nombre, cantidad: item.cantidad, precio: item.precio };
    });
    var ref = await db.collection('pedidos').add({
      cliente: datos.nombre,
      telefono: datos.telefono,
      nit: datos.nit,
      email: datos.email || '',
      direccion: datos.direccion,
      referencia: datos.referencia || '',
      productos: productos,
      total: total,
      fecha: ahora,
      estado: 'Esperando pago',
      metodo: 'Stripe',
      trackingCode: trackingCode,
      fechaEstimada: fechaEstimada,
      historial: [{ estado: 'Esperando pago', fecha: ahora, nota: 'Pedido creado, redirigiendo a Stripe' }]
    });
    localStorage.setItem('pedidoPendienteStripe', JSON.stringify({
      pedidoId: ref.id, trackingCode: trackingCode, total: total, productos: productos,
      fechaEstimadaISO: fechaEstimada.toISOString(), datos: datos
    }));
    localStorage.setItem('carritoPendienteStripe', JSON.stringify(carrito));
    localStorage.setItem('datosPendienteStripe', JSON.stringify(datos));
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abriendo pago...';
    var response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: carrito.map(function (item) {
          return { nombre: item.nombre, precio: item.precio, cantidad: item.cantidad };
        }),
        cliente: datos.nombre, telefono: datos.telefono, nit: datos.nit, email: datos.email,
        direccion: datos.direccion, referencia: datos.referencia,
        trackingCode: trackingCode, pedidoId: ref.id
      })
    });
    var data = await response.json();
    if (data.url) window.location.href = data.url;
    else throw new Error(data.error || 'No se pudo crear la sesión de pago');
  } catch (error) {
    console.error(error);
    toastCat('Error: ' + error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

async function enviarPedidoWhatsApp(datos) {
  if (carrito.length === 0) return toastCat('El carrito está vacío', 'error');
  var trackingCode = generarTrackingCode();
  var fechaEstimada = fechaEstimadaDefault();
  var fechaEstTexto = fechaEstimada.toLocaleDateString('es-GT');
  var total = 0;
  var productosPedido = [];
  var nombre = brandName();
  var web = cfg().webUrl || 'https://agromax-web.vercel.app';
  var mensaje = 'Hola ' + nombre + ', este es mi pedido:\n\n';
  mensaje += '*Cliente:* ' + datos.nombre + '\n*Teléfono:* ' + datos.telefono + '\n*NIT:* ' + datos.nit + '\n';
  if (datos.email) mensaje += '*Correo:* ' + datos.email + '\n';
  mensaje += '*Dirección:* ' + datos.direccion + '\n';
  if (datos.referencia) mensaje += '*Referencia:* ' + datos.referencia + '\n';
  if (cfg().catalogoEnvio) mensaje += '*Envío:* ' + cfg().catalogoEnvio + '\n';
  mensaje += '\n*Productos:*\n';
  carrito.forEach(function (item) {
    var subtotal = item.precio * item.cantidad;
    mensaje += '• ' + item.nombre + ' × ' + item.cantidad + ' = Q' + subtotal + '\n';
    total += subtotal;
    productosPedido.push({ nombre: item.nombre, cantidad: item.cantidad, precio: item.precio });
  });
  mensaje += '\n*Total: Q' + total.toFixed(2) + '*';
  mensaje += '\n\n*Código de seguimiento:* ' + trackingCode;
  mensaje += '\n*Seguimiento:* ' + web + '/seguimiento.html?codigo=' + trackingCode;
  mensaje += '\n*Llegada estimada:* ' + fechaEstTexto;
  var ahora = new Date();
  try {
    await db.collection('pedidos').add({
      cliente: datos.nombre, telefono: datos.telefono, nit: datos.nit,
      email: datos.email || '', direccion: datos.direccion, referencia: datos.referencia || '',
      productos: productosPedido, total: total, fecha: ahora, estado: 'Pendiente', metodo: 'WhatsApp',
      trackingCode: trackingCode, fechaEstimada: fechaEstimada,
      historial: [{ estado: 'Pendiente', fecha: ahora, nota: 'Pedido enviado por WhatsApp' }]
    });
  } catch (e) { console.error(e); }
  window.location.href = 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(mensaje);
  carrito = [];
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  actualizarContador();
  cerrarFormularioCheckout();
  document.getElementById('cart-modal').classList.add('hidden');
}

function contactarWhatsApp(nombre) {
  var c = cfg();
  var base = c.catalogoMensaje || ('Hola ' + brandName() + ', quiero más información');
  var msg = nombre ? ('Hola, quiero información sobre: ' + nombre) : base;
  window.location.href = 'https://wa.me/' + waNum() + '?text=' + encodeURIComponent(msg);
}

function filtrarCategoria(cat, btn) {
  categoriaActual = cat;
  document.querySelectorAll('.cat-tab').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderProductos();
}

function filtrarProductos() { renderProductos(); }

function cambiarOrden() {
  var sel = document.getElementById('orden-productos');
  ordenActual = sel ? sel.value : 'relevancia';
  renderProductos();
}

function ordenarLista(list) {
  var arr = list.slice();
  if (ordenActual === 'precio-asc') arr.sort(function (a, b) { return (a.precio || 0) - (b.precio || 0); });
  else if (ordenActual === 'precio-desc') arr.sort(function (a, b) { return (b.precio || 0) - (a.precio || 0); });
  else if (ordenActual === 'nombre') arr.sort(function (a, b) { return (a.nombre || '').localeCompare(b.nombre || ''); });
  return arr;
}

function badgeHTML(p) {
  var stock = Number(p.stock) || 0;
  if (stock <= 0) return '<span class="badge badge-out">Agotado</span>';
  if (stock < 10) return '<span class="badge badge-low">Poco stock</span>';
  if (p.oferta || p.promo) return '<span class="badge badge-sale">Oferta</span>';
  if (p.nuevo) return '<span class="badge badge-new">Nuevo</span>';
  return '';
}

function renderProductos() {
  var busqueda = ((document.getElementById('buscador') || {}).value || '').toLowerCase().trim();
  var grid = document.getElementById('lista-productos');
  if (!grid) return;
  var filtered = allProductos;
  if (categoriaActual !== 'all') filtered = filtered.filter(function (p) { return p.categoria === categoriaActual; });
  if (busqueda) filtered = filtered.filter(function (p) {
    return (p.nombre || '').toLowerCase().includes(busqueda) || (p.categoria || '').toLowerCase().includes(busqueda);
  });
  filtered = ordenarLista(filtered);
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="col-span-full text-center py-16 text-slate-400"><p>No se encontraron productos</p></div>';
    return;
  }
  grid.innerHTML = '';
  filtered.forEach(function (p) {
    var globalIndex = allProductos.findIndex(function (prod) {
      return prod.nombre === p.nombre && prod.precio === p.precio;
    });
    var stock = Number(p.stock) || 0;
    var agotado = stock <= 0;
    var card = document.createElement('div');
    card.className = 'product-card group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col';
    card.innerHTML =
      '<div class="relative cursor-pointer" onclick="abrirDetalle(' + globalIndex + ')">' +
      '<div class="aspect-[4/3] bg-slate-100 overflow-hidden">' +
      '<img src="' + (p.imageUrl || 'https://picsum.photos/id/201/600/400') + '" alt="" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy"></div>' +
      '<div class="absolute top-2 left-2">' + badgeHTML(p) + '</div>' +
      '<span class="absolute top-2 right-2 text-[10px] bg-white/90 px-2 py-0.5 rounded-full text-slate-600 font-medium">' + (p.categoria || '') + '</span></div>' +
      '<div class="p-3 sm:p-4 flex flex-col flex-1">' +
      '<h3 class="font-bold text-sm sm:text-base text-slate-900 line-clamp-2 cursor-pointer" onclick="abrirDetalle(' + globalIndex + ')">' + p.nombre + '</h3>' +
      '<p class="text-[11px] text-slate-400 mt-0.5 truncate">' + (p.unidad || '') + '</p>' +
      '<div class="mt-auto pt-3 flex items-end justify-between gap-2">' +
      '<p class="text-lg sm:text-xl font-extrabold text-green-700">Q' + Number(p.precio).toLocaleString('es-GT') + '</p>' +
      '<button type="button" ' + (agotado ? 'disabled' : '') + ' onclick="event.stopPropagation();agregarAlCarrito(' + globalIndex + ')" ' +
      'class="shrink-0 ' + (agotado ? 'bg-slate-200 text-slate-400' : 'bg-green-600 hover:bg-green-700 text-white') + ' w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition">' +
      '<i class="fas ' + (agotado ? 'fa-ban' : 'fa-plus') + '"></i></button></div></div>';
    grid.appendChild(card);
  });
  renderDestacados();
}

function renderDestacados() {
  var box = document.getElementById('destacados-grid');
  if (!box || !allProductos.length) return;
  var top = allProductos.filter(function (p) { return (p.stock || 0) > 0; }).slice(0, 4);
  if (!top.length) { box.innerHTML = ''; return; }
  box.innerHTML = top.map(function (p) {
    var idx = allProductos.findIndex(function (x) { return x.nombre === p.nombre && x.precio === p.precio; });
    return '<button type="button" onclick="abrirDetalle(' + idx + ')" class="flex gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:shadow-md transition text-left w-full">' +
      '<img src="' + (p.imageUrl || 'https://picsum.photos/id/201/600/400') + '" class="w-16 h-16 rounded-xl object-cover bg-slate-100" alt="">' +
      '<div class="min-w-0 flex-1"><p class="font-semibold text-sm truncate">' + p.nombre + '</p>' +
      '<p class="text-green-700 font-bold">Q' + Number(p.precio).toLocaleString('es-GT') + '</p></div></button>';
  }).join('');
}

window.onload = function () {
  actualizarContador();

  var cargar = function () {
    db.collection('productos').onSnapshot(function (snapshot) {
      allProductos = [];
      snapshot.forEach(function (doc) {
        allProductos.push(Object.assign({ id: doc.id }, doc.data()));
      });
      renderProductos();
    });
  };

  if (typeof cargarConfigPublica === 'function') {
    cargarConfigPublica().then(function () {
      aplicarConfigCatalogoUI();
      cargar();
    }).catch(cargar);
  } else {
    cargar();
  }
};
