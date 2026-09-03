// js/catalogo.js
// Lógica del catálogo público (index.html)

const whatsappNumber = "50242664744";
let allProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoAGROMAXGTM')) || [];

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
      <div class="flex gap-4 border-b pb-6">
        <img src="${item.imageUrl || 'https://picsum.photos/id/201/600/400'}" class="w-24 h-24 object-cover rounded-2xl">
        <div class="flex-1">
          <h4 class="font-bold">${item.nombre}</h4>
          <p class="text-green-600">Q${item.precio} × ${item.cantidad}</p>
        </div>
        <div class="text-right">
          <p class="font-bold">Q${subtotal}</p>
          <div class="flex gap-3 mt-4">
            <button onclick="cambiarCantidad(${index}, -1)" class="px-4 py-1 border rounded-lg">-</button>
            <span>${item.cantidad}</span>
            <button onclick="cambiarCantidad(${index}, 1)" class="px-4 py-1 border rounded-lg">+</button>
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html || `<p class="text-center py-16 text-gray-400">Tu carrito está vacío</p>`;
  document.getElementById('cart-total').textContent = `Q${total.toFixed(2)}`;
}

function cambiarCantidad(index, delta) {
  carrito[index].cantidad += delta;
  if (carrito[index].cantidad < 1) carrito.splice(index, 1);
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  mostrarCarrito();
  actualizarContador();
}

async function pagarConStripe() {
  if (carrito.length === 0) return alert("El carrito está vacío");

  const btn = document.getElementById('btn-stripe');
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
        cliente: 'Cliente Web'
      })
    });

    const data = await response.json();

    if (data.url) {
      localStorage.setItem('carritoPendienteStripe', JSON.stringify(carrito));
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

async function enviarPedidoWhatsApp() {
  if (carrito.length === 0) return alert("El carrito está vacío");

  let mensaje = "Hola AGROMAXGTM, este es mi pedido:\n\n";
  let total = 0;
  const productosPedido = [];

  carrito.forEach(item => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `• ${item.nombre} × ${item.cantidad} = Q${subtotal}\n`;
    total += subtotal;
    productosPedido.push({ nombre: item.nombre, cantidad: item.cantidad, precio: item.precio });
  });

  mensaje += `\nTotal: Q${total.toFixed(2)}`;

  try {
    await db.collection('pedidos').add({
      cliente: "Cliente WhatsApp",
      productos: productosPedido,
      total: total,
      fecha: new Date(),
      estado: "Pendiente",
      metodo: "WhatsApp"
    });
  } catch (e) {
    console.error("Error guardando pedido:", e);
  }

  window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensaje)}`;

  carrito = [];
  localStorage.setItem('carritoAGROMAXGTM', JSON.stringify(carrito));
  actualizarContador();
  toggleCart();
}

function contactarWhatsApp(nombre = '') {
  const msg = nombre ? `Hola, quiero información sobre: ${nombre}` : 'Hola AGROMAXGTM, quiero más información';
  window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

function filtrarCategoria(cat) {
  document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  }
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
    grid.innerHTML = `<p class="col-span-full text-center py-20 text-gray-500">No se encontraron productos</p>`;
    return;
  }

  filtered.forEach((p) => {
    const globalIndex = allProductos.findIndex(prod => prod.nombre === p.nombre);
    const card = document.createElement('div');
    card.className = "bg-white rounded-3xl overflow-hidden shadow hover:shadow-2xl transition-all";
    card.innerHTML = `
      <img src="${p.imageUrl || 'https://picsum.photos/id/201/600/400'}" class="w-full h-52 object-cover">
      <div class="p-6">
        <span class="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">${p.categoria}</span>
        <h3 class="font-bold text-xl mt-3 mb-1">${p.nombre}</h3>
        <p class="text-sm text-gray-500 mb-4">${p.unidad || ''}</p>
        <p class="text-3xl font-extrabold text-green-600">Q${Number(p.precio).toLocaleString('es-GT')}</p>
        
        <div class="mt-6 flex gap-3">
          <button onclick="agregarAlCarrito(${globalIndex})" class="flex-1 bg-green-600 text-white py-4 rounded-2xl font-medium">
            Agregar al Carrito
          </button>
          <button onclick="contactarWhatsApp('${p.nombre}')" class="flex-1 border border-green-600 text-green-600 py-4 rounded-2xl font-medium">
            Consultar
          </button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

// Inicialización
window.onload = () => {
  db.collection('productos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    allProductos = [];
    snapshot.forEach(doc => allProductos.push(doc.data()));
    renderProductos('all');
  });
  actualizarContador();
};
