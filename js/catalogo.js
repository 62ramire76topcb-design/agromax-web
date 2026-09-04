// js/catalogo.js
// Lógica del catálogo público (index.html)

const whatsappNumber = "50242664744";
let allProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoAGROMAXGTM')) || [];
let checkoutMetodo = 'stripe'; // 'stripe' | 'whatsapp'

function actualizarContador() {
  const count = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const el = document.getElementById('cart-count');
  if (el) el.textContent = count;
}

function agregarAlCarrito(index) {
  const producto = allProductos[index];
  const existente = carrito.find(item => item.nombre === producto.nombre);
  if (existente) existente.cantidad++;
  else carrito.push({ ...producto, cantidad: 1 });

  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  actualizarContador();
  alert(`✅ ${producto.nombre} agregado al carrito`);
}

function toggleCart() {
  document.getElementById('cart-modal').classList.toggle('hidden');
  if (!document.getElementById('cart-modal').classList.contains('hidden')) mostrarCarrito();
}

function mostrarCarrito() {
  const container = document.getElementById('cart-items');
  let html = '';
  let total = 0;

  carrito.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;
    html += `
      <div class="flex gap-3 sm:gap-4 border-b pb-4 sm:pb-6">
        <img src="${item.imageUrl || 'https://picsum.photos/id/201/600/400'}" class="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl sm:rounded-2xl shrink-0">
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-sm sm:text-base truncate">${item.nombre}</h4>
          <p class="text-green-600 text-sm">Q${item.precio} × ${item.cantidad}</p>
          <div class="flex gap-2 mt-2 sm:hidden">
            <button onclick="cambiarCantidad(${index}, -1)" class="px-3 py-1 border rounded-lg text-sm">-</button>
            <span class="text-sm">${item.cantidad}</span>
            <button onclick="cambiarCantidad(${index}, 1)" class="px-3 py-1 border rounded-lg text-sm">+</button>
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="font-bold text-sm sm:text-base">Q${subtotal}</p>
          <div class="hidden sm:flex gap-3 mt-4">
            <button onclick="cambiarCantidad(${index}, -1)" class="px-4 py-1 border rounded-lg">-</button>
            <span>${item.cantidad}</span>
            <button onclick="cambiarCantidad(${index}, 1)" class="px-4 py-1 border rounded-lg">+</button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html || `<p class="text-center py-12 sm:py-16 text-gray-400">Tu carrito está vacío</p>`;
  document.getElementById('cart-total').textContent = `Q${total.toFixed(2)}`;
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad < 1) carrito.splice(index, 1);
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  mostrarCarrito();
  actualizarContador();
}

function abrirFormularioCheckout(metodo) {
  if (carrito.length === 0) return alert('El carrito está vacío');
  checkoutMetodo = metodo;

  // Prefill si hay datos guardados
  const saved = JSON.parse(localStorage.getItem('datosClienteCatalogo') || '{}');
  document.getElementById('ck-nombre').value = saved.nombre || '';
  document.getElementById('ck-telefono').value = saved.telefono || '';
  document.getElementById('ck-nit').value = saved.nit || '';
  document.getElementById('ck-email').value = saved.email || '';
  document.getElementById('ck-direccion').value = saved.direccion || '';
  document.getElementById('ck-referencia').value = saved.referencia || '';
  document.getElementById('ck-error').classList.add('hidden');

  const btn = document.getElementById('ck-continuar');
  if (metodo === 'stripe') {
    btn.className = 'w-full py-3.5 rounded-2xl text-white font-bold bg-blue-600 hover:bg-blue-700';
    btn.innerHTML = '<i class="fas fa-credit-card mr-2"></i> Continuar al pago';
  } else {
    btn.className = 'w-full py-3.5 rounded-2xl text-white font-bold bg-green-600 hover:bg-green-700';
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
  const datos = obtenerDatosCheckout();
  const err = validarDatosCheckout(datos);
  const errEl = document.getElementById('ck-error');

  if (err) {
    errEl.textContent = err;
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');

  localStorage.setItem('datosClienteCatalogo', JSON.stringify(datos));

  if (checkoutMetodo === 'stripe') {
    await pagarConStripe(datos);
  } else {
    await enviarPedidoWhatsApp(datos);
  }
}

async function pagarConStripe(datos) {
  if (carrito.length === 0) return alert('El carrito está vacío');

  const btn = document.getElementById('ck-continuar');
  const textoOriginal = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: carrito.map(item => ({
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad
        })),
        cliente: datos.nombre,
        telefono: datos.telefono,
        nit: datos.nit,
        email: datos.email,
        direccion: datos.direccion,
        referencia: datos.referencia
      })
    });

    const data = await response.json();

    if (data.url) {
      localStorage.setItem('carritoPendienteStripe', JSON.stringify(carrito));
      localStorage.setItem('datosPendienteStripe', JSON.stringify(datos));
      window.location.href = data.url;
    } else {
      throw new Error(data.error || 'No se pudo crear la sesión de pago');
    }
  } catch (error) {
    console.error(error);
    alert('❌ Error al iniciar el pago: ' + error.message);
    btn.disabled = false;
    btn.innerHTML = textoOriginal;
  }
}

async function enviarPedidoWhatsApp(datos) {
  if (carrito.length === 0) return alert('El carrito está vacío');

  let mensaje = `Hola AGROMAXGTM, este es mi pedido:\n\n`;
  mensaje += `*Cliente:* ${datos.nombre}\n`;
  mensaje += `*Teléfono:* ${datos.telefono}\n`;
  mensaje += `*NIT:* ${datos.nit}\n`;
  if (datos.email) mensaje += `*Correo:* ${datos.email}\n`;
  mensaje += `*Dirección:* ${datos.direccion}\n`;
  if (datos.referencia) mensaje += `*Referencia:* ${datos.referencia}\n`;
  mensaje += `\n*Productos:*\n`;

  let total = 0;
  const productosPedido = [];

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `• ${item.nombre} × ${item.cantidad} = Q${subtotal}\n`;
    total += subtotal;
    productosPedido.push({ nombre: item.nombre, cantidad: item.cantidad, precio: item.precio });
  });

  mensaje += `\n*Total: Q${total.toFixed(2)}*`;

  try {
    await db.collection('pedidos').add({
      cliente: datos.nombre,
      telefono: datos.telefono,
      nit: datos.nit,
      email: datos.email || '',
      direccion: datos.direccion,
      referencia: datos.referencia || '',
      productos: productosPedido,
      total: total,
      fecha: new Date(),
      estado: 'Pendiente',
      metodo: 'WhatsApp'
    });
  } catch (e) {
    console.error('Error guardando pedido:', e);
  }

  window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

  carrito = [];
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  actualizarContador();
  cerrarFormularioCheckout();
  const cartModal = document.getElementById('cart-modal');
  if (cartModal) cartModal.classList.add('hidden');
}

function contactarWhatsApp(nombre = '') {
  const msg = nombre ? `Hola, quiero información sobre: ${nombre}` : 'Hola AGROMAXGTM, quiero más información';
  window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

function filtrarCategoria(cat) {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  renderProductos(cat);
}

function filtrarProductos() {
  renderProductos('all', document.getElementById('buscador').value.toLowerCase().trim());
}

function renderProductos(categoria = 'all', busqueda = '') {
  const grid = document.getElementById('lista-productos');
  grid.innerHTML = '';

  let filtered = allProductos;
  if (categoria !== 'all') filtered = filtered.filter(p => p.categoria === categoria);
  if (busqueda) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(busqueda));

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center py-12 sm:py-20 text-gray-500 text-sm sm:text-base">No se encontraron productos</p>`;
    return;
  }

  filtered.forEach((p) => {
    const globalIndex = allProductos.findIndex(prod => prod.nombre === p.nombre);
    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow hover:shadow-xl transition-all';
    card.innerHTML = `
      <img src="${p.imageUrl || 'https://picsum.photos/id/201/600/400'}" class="w-full h-32 sm:h-44 md:h-52 object-cover">
      <div class="p-3 sm:p-5 md:p-6">
        <span class="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">${p.categoria}</span>
        <h3 class="font-bold text-sm sm:text-lg md:text-xl mt-2 sm:mt-3 mb-0.5 sm:mb-1 line-clamp-2">${p.nombre}</h3>
        <p class="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4 truncate">${p.unidad || ''}</p>
        <p class="text-lg sm:text-2xl md:text-3xl font-extrabold text-green-600">Q${Number(p.precio).toLocaleString('es-GT')}</p>
        <div class="mt-3 sm:mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button onclick="agregarAlCarrito(${globalIndex})" class="flex-1 bg-green-600 text-white py-2.5 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm md:text-base">Agregar</button>
          <button onclick="contactarWhatsApp('${p.nombre.replace(/'/g, "\\'")}')" class="flex-1 border border-green-600 text-green-600 py-2.5 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl font-medium text-xs sm:text-sm md:text-base">Consultar</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

window.onload = () => {
  db.collection('productos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    allProductos = [];
    snapshot.forEach(doc => allProductos.push(doc.data()));
    renderProductos('all');
  });
  actualizarContador();
};
