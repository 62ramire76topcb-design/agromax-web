// js/admin.js - Lógica del Panel de Administración

let productoEditandoId = null;
let productosCSV = [];
let pedidosData = [];
let filtroPedidos = 'todos';
let unsubscribePedidos = null;

function mostrarLogin() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full">
        <div class="flex justify-center mb-6">
          <div class="w-20 h-20 bg-green-700 rounded-3xl flex items-center justify-center text-white text-6xl">🌱</div>
        </div>
        <h1 class="text-3xl font-bold text-center mb-2">AGROMAXGTM</h1>
        <p class="text-center text-green-600 mb-8">Panel de Administración</p>
        <input id="email" type="email" value="62ramire76topcb@gmail.com" class="w-full p-4 border rounded-2xl mb-4">
        <input id="password" type="password" value="Maycol123@" class="w-full p-4 border rounded-2xl mb-6">
        <button onclick="login()" class="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold text-lg">
          Ingresar al Panel
        </button>
      </div>
    </div>`;
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try {
    await auth.signInWithEmailAndPassword(email, password);
    mostrarPanelPrincipal();
  } catch (e) {
    alert("Error: " + e.message);
  }
}

function mostrarPanelPrincipal() {
  document.getElementById('app').innerHTML = `
    <div class="flex h-screen">
      <div class="w-72 bg-white border-r shadow-xl">
        <div class="p-6 border-b bg-green-700 text-white">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-green-700 text-3xl">🌱</div>
            <div>
              <h1 class="text-2xl font-bold">AGROMAXGTM</h1>
              <p class="text-xs">Administración</p>
            </div>
          </div>
        </div>
        <nav class="p-4 space-y-1">
          <a onclick="mostrarSeccion('dashboard')" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-home"></i> Dashboard</a>
          <a onclick="mostrarSeccion('agregar')" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-plus"></i> Agregar Producto</a>
          <a onclick="mostrarSeccion('masiva')" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-file-csv"></i> Subida Masiva</a>
          <a href="compras.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-truck"></i> Compras</a>
          <a href="inventario.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-warehouse"></i> Inventario</a>
          <a href="ventas.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-cash-register"></i> Ventas</a>
          <a href="bonificaciones.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-gift"></i> Bonificaciones</a>
          <a href="alquileres.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-key"></i> Alquileres</a>
          <a href="caja.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-money-bill-wave"></i> Caja</a>
          <a onclick="mostrarSeccion('pedidos')" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-receipt"></i> Pedidos</a>
          <a href="scan.html" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-barcode"></i> Scan de Productos</a>
          <a onclick="mostrarSeccion('productos')" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-list"></i> Productos</a>
          <a onclick="logout()" class="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50 text-red-600 mt-12"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
        </nav>
      </div>
      <div class="flex-1 overflow-auto p-8" id="main-content"></div>
    </div>`;
  mostrarSeccion('dashboard');
}

function mostrarSeccion(seccion) {
  if (unsubscribePedidos) {
    unsubscribePedidos();
    unsubscribePedidos = null;
  }
  if (seccion === 'dashboard') mostrarDashboard();
  else if (seccion === 'agregar') mostrarFormularioAgregar();
  else if (seccion === 'masiva') mostrarSubidaMasiva();
  else if (seccion === 'pedidos') mostrarPedidos();
  else if (seccion === 'productos') mostrarTablaProductos();
}

async function mostrarDashboard() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <h1 class="text-4xl font-bold text-green-700 mb-8">Dashboard - AGROMAXGTM</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10" id="stats-cards"></div>
    <div class="bg-white rounded-3xl shadow p-6 mb-8">
      <h3 class="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
        <i class="fas fa-exclamation-triangle"></i> Productos con Stock Bajo
      </h3>
      <div id="bajo-stock" class="space-y-3"></div>
    </div>`;

  const snapshot = await db.collection('productos').get();
  let productos = [];
  snapshot.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));

  const total = productos.length;
  const valorTotal = productos.reduce((sum, p) => sum + (p.precio * (p.stock || 1)), 0);

  document.getElementById('stats-cards').innerHTML = `
    <div class="bg-white p-6 rounded-3xl shadow text-center">
      <p class="text-gray-500">Total Productos</p>
      <p class="text-5xl font-bold text-green-600">${total}</p>
    </div>
    <div class="bg-white p-6 rounded-3xl shadow text-center">
      <p class="text-gray-500">Valor Inventario</p>
      <p class="text-5xl font-bold text-blue-600">Q${valorTotal.toLocaleString('es-GT')}</p>
    </div>`;

  const bajos = productos.filter(p => (p.stock || 0) < 10);
  let bajoHTML = '';
  bajos.forEach(p => {
    bajoHTML += `<div class="flex justify-between bg-orange-50 p-4 rounded-2xl"><span>${p.nombre}</span><span class="font-bold text-orange-600">Stock: ${p.stock || 0}</span></div>`;
  });
  document.getElementById('bajo-stock').innerHTML = bajoHTML || '<p class="text-green-600">No hay productos con stock bajo ✅</p>';
}

function mostrarFormularioAgregar(producto = null) {
  productoEditandoId = producto ? producto.id : null;
  const titulo = producto ? "Editar Producto" : "Agregar Nuevo Producto";

  document.getElementById('main-content').innerHTML = `
    <h1 class="text-3xl font-bold mb-8">${titulo}</h1>
    <div class="max-w-2xl bg-white p-8 rounded-3xl shadow">
      <input id="nombre" value="${producto?.nombre || ''}" placeholder="Nombre del producto" class="w-full p-4 border rounded-2xl mb-4">
      <div class="grid grid-cols-2 gap-4">
        <input id="precio" type="number" value="${producto?.precio || ''}" placeholder="Precio" class="w-full p-4 border rounded-2xl">
        <input id="stock" type="number" value="${producto?.stock || 50}" placeholder="Stock" class="w-full p-4 border rounded-2xl">
      </div>
      <input id="unidad" value="${producto?.unidad || ''}" placeholder="Unidad" class="w-full p-4 border rounded-2xl my-4">
      <select id="categoria" class="w-full p-4 border rounded-2xl mb-6">
        <option value="Fertilizantes" ${producto?.categoria === 'Fertilizantes' ? 'selected' : ''}>Fertilizantes</option>
        <option value="Foliares" ${producto?.categoria === 'Foliares' ? 'selected' : ''}>Foliares</option>
        <option value="Protección" ${producto?.categoria === 'Protección' ? 'selected' : ''}>Protección</option>
        <option value="Herramientas" ${producto?.categoria === 'Herramientas' ? 'selected' : ''}>Herramientas</option>
        <option value="Accesorios" ${producto?.categoria === 'Accesorios' ? 'selected' : ''}>Accesorios</option>
      </select>
      <input id="imagen" type="file" accept="image/*" class="w-full p-4 border rounded-2xl mb-6">
      <button onclick="guardarProducto()" class="w-full bg-green-600 text-white py-4 rounded-2xl font-bold">${producto ? 'Actualizar' : 'Guardar'} Producto</button>
    </div>`;
}

async function guardarProducto() {
  const nombre = document.getElementById('nombre').value.trim();
  const precio = parseFloat(document.getElementById('precio').value);
  const stock = parseInt(document.getElementById('stock').value) || 0;

  if (!nombre || !precio) return alert("❌ Nombre y precio son obligatorios");

  try {
    let imageUrl = "https://picsum.photos/id/201/600/400";
    const file = document.getElementById('imagen').files[0];
    if (file && storage) {
      const ref = storage.ref('productos/' + Date.now() + file.name);
      await ref.put(file);
      imageUrl = await ref.getDownloadURL();
    }

    const data = {
      nombre,
      precio,
      stock,
      unidad: document.getElementById('unidad').value,
      categoria: document.getElementById('categoria').value,
      imageUrl,
      fecha: new Date()
    };

    if (productoEditandoId) {
      await db.collection('productos').doc(productoEditandoId).update(data);
      alert("✅ Producto actualizado");
    } else {
      await db.collection('productos').add(data);
      alert("✅ Producto guardado");
    }
    mostrarSeccion('productos');
  } catch (e) {
    alert("Error: " + e.message);
  }
}

function mostrarTablaProductos() {
  const content = document.getElementById('main-content');
  content.innerHTML = `<h1 class="text-3xl font-bold mb-6">Productos Registrados</h1><div id="tabla-productos" class="bg-white rounded-3xl shadow overflow-hidden"></div>`;

  db.collection('productos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    let html = `<table class="w-full"><thead><tr class="bg-gray-100"><th class="p-4 text-left">Producto</th><th class="p-4">Categoría</th><th class="p-4 text-center">Stock</th><th class="p-4 text-right">Precio</th><th class="p-4">Acciones</th></tr></thead><tbody>`;

    snapshot.forEach(doc => {
      const p = doc.data();
      html += `<tr class="border-t hover:bg-gray-50">
        <td class="p-4">${p.nombre}</td>
        <td class="p-4">${p.categoria || ''}</td>
        <td class="p-4 text-center ${ (p.stock || 0) < 10 ? 'text-red-600 font-bold' : '' }">${p.stock || 0}</td>
        <td class="p-4 text-right font-bold">Q${p.precio}</td>
        <td class="p-4">
          <button onclick="editarProducto('${doc.id}')" class="text-blue-600 mx-2">Editar</button>
          <button onclick="eliminarProducto('${doc.id}')" class="text-red-600">Eliminar</button>
        </td>
      </tr>`;
    });
    html += `</tbody></table>`;
    document.getElementById('tabla-productos').innerHTML = html;
  });
}

async function editarProducto(id) {
  const doc = await db.collection('productos').doc(id).get();
  const producto = doc.data();
  producto.id = id;
  mostrarFormularioAgregar(producto);
}

async function eliminarProducto(id) {
  if (confirm("¿Eliminar este producto?")) {
    await db.collection('productos').doc(id).delete();
  }
}

function mostrarSubidaMasiva() {
  document.getElementById('main-content').innerHTML = `
    <h1 class="text-3xl font-bold mb-8">Subida Masiva de Productos</h1>
    <div class="max-w-2xl bg-white p-8 rounded-3xl shadow">
      <div class="border-2 border-dashed border-green-400 rounded-2xl p-12 text-center">
        <i class="fas fa-file-csv text-6xl text-green-600 mb-4"></i>
        <p class="font-medium">Selecciona tu archivo CSV</p>
        <input id="csvFile" type="file" accept=".csv" class="hidden" onchange="previsualizarCSV()">
        <button onclick="document.getElementById('csvFile').click()" class="mt-4 bg-green-600 text-white px-8 py-3 rounded-2xl">Elegir Archivo</button>
      </div>
      <div id="preview-csv" class="mt-6"></div>
      <button id="btn-subir-masivo" onclick="subirProductosMasivos()" class="hidden w-full mt-6 bg-green-600 text-white py-4 rounded-2xl font-bold">Subir Todos los Productos</button>
    </div>`;
}

function previsualizarCSV() {
  const file = document.getElementById('csvFile').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n');
    productosCSV = [];
    let html = `<h3 class="font-bold mb-3">Vista previa</h3><table class="w-full"><thead><tr class="bg-gray-100"><th>Nombre</th><th>Precio</th><th>Unidad</th><th>Categoría</th></tr></thead><tbody>`;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const [nombre, precio, unidad, categoria] = lines[i].split(',').map(x => x.trim());
      if (nombre && precio) {
        productosCSV.push({ nombre, precio: parseFloat(precio), unidad: unidad || "1 unidad", categoria: categoria || "General" });
        html += `<tr><td>${nombre}</td><td>Q${precio}</td><td>${unidad||''}</td><td>${categoria||''}</td></tr>`;
      }
    }
    html += `</tbody></table>`;
    document.getElementById('preview-csv').innerHTML = html;
    document.getElementById('btn-subir-masivo').classList.remove('hidden');
  };
  reader.readAsText(file);
}

async function subirProductosMasivos() {
  if (confirm(`¿Subir ${productosCSV.length} productos?`)) {
    let exitosos = 0;
    for (let p of productosCSV) {
      try {
        await db.collection('productos').add({
          nombre: p.nombre,
          precio: p.precio,
          stock: 50,
          unidad: p.unidad,
          categoria: p.categoria,
          imageUrl: "https://picsum.photos/id/201/600/400",
          fecha: new Date()
        });
        exitosos++;
      } catch (e) {}
    }
    alert(`✅ ${exitosos} productos subidos correctamente`);
    mostrarSeccion('productos');
  }
}

/* ==================== GESTIÓN DE PEDIDOS ==================== */

function estadoBadge(estado) {
  const estilos = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Pagado': 'bg-green-100 text-green-800',
    'En proceso': 'bg-blue-100 text-blue-800',
    'Entregado': 'bg-gray-100 text-gray-700',
    'Cancelado': 'bg-red-100 text-red-700'
  };
  const cls = estilos[estado] || 'bg-gray-100 text-gray-600';
  return `<span class="px-3 py-1 ${cls} rounded-full text-sm font-medium">${estado || 'Pendiente'}</span>`;
}

function renderListaPedidos() {
  const lista = document.getElementById('lista-pedidos');
  if (!lista) return;

  let filtrados = pedidosData;
  if (filtroPedidos !== 'todos') {
    filtrados = pedidosData.filter(p => (p.estado || 'Pendiente') === filtroPedidos);
  }

  if (filtrados.length === 0) {
    lista.innerHTML = `<p class="text-center py-16 text-gray-400">No hay pedidos con este filtro</p>`;
    return;
  }

  let html = '';
  filtrados.forEach(p => {
    const esStripe = p.metodo === 'Stripe' || p.estado === 'Pagado';
    const metodoIcon = esStripe
      ? '<i class="fas fa-credit-card mr-1"></i> Stripe'
      : '<i class="fab fa-whatsapp mr-1"></i> WhatsApp';
    const estado = p.estado || 'Pendiente';

    html += `
      <div class="bg-white rounded-3xl shadow p-6 ${esStripe ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-400'}">
        <div class="flex flex-wrap justify-between items-start gap-3">
          <div>
            <p class="text-sm text-gray-500">${p.fechaTexto || ''}</p>
            <p class="font-bold text-lg">${p.cliente || 'Cliente'}</p>
            <p class="text-sm text-gray-600 mt-1">${metodoIcon}</p>
          </div>
          <div class="text-right">
            ${estadoBadge(estado)}
          </div>
        </div>

        <div class="mt-4 space-y-1 text-sm">
          ${(p.productos || []).map(item => `
            <div class="flex justify-between">
              <span>${item.nombre} × ${item.cantidad}</span>
              <span>Q${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
          `).join('')}
        </div>

        <div class="mt-4 pt-4 border-t flex flex-wrap justify-between items-center gap-3">
          <div class="text-xs text-gray-400">
            ${p.sessionId ? 'Session: ' + p.sessionId.substring(0, 16) + '...' : 'ID: ' + p.id.substring(0, 8)}
          </div>
          <div class="font-bold text-lg">
            Total: <span class="text-green-600">Q${Number(p.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <!-- Acciones de estado -->
        <div class="mt-4 flex flex-wrap gap-2">
          ${estado !== 'En proceso' ? `<button onclick="cambiarEstadoPedido('${p.id}', 'En proceso')" class="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-sm font-medium"><i class="fas fa-truck mr-1"></i> En proceso</button>` : ''}
          ${estado !== 'Entregado' ? `<button onclick="cambiarEstadoPedido('${p.id}', 'Entregado')" class="px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium"><i class="fas fa-check mr-1"></i> Entregado</button>` : ''}
          ${estado !== 'Pendiente' && estado !== 'Pagado' ? `<button onclick="cambiarEstadoPedido('${p.id}', '${esStripe ? 'Pagado' : 'Pendiente'}')" class="px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium"><i class="fas fa-undo mr-1"></i> Reabrir</button>` : ''}
          ${estado !== 'Cancelado' ? `<button onclick="cambiarEstadoPedido('${p.id}', 'Cancelado')" class="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium"><i class="fas fa-times mr-1"></i> Cancelar</button>` : ''}
          <button onclick="eliminarPedido('${p.id}')" class="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm font-medium ml-auto"><i class="fas fa-trash mr-1"></i> Eliminar</button>
        </div>
      </div>`;
  });

  lista.innerHTML = html;
}

function setFiltroPedidos(filtro) {
  filtroPedidos = filtro;
  document.querySelectorAll('.filtro-pedido').forEach(btn => {
    btn.classList.remove('bg-green-600', 'text-white');
    btn.classList.add('bg-white', 'text-gray-700');
  });
  const activo = document.getElementById('filtro-' + filtro);
  if (activo) {
    activo.classList.remove('bg-white', 'text-gray-700');
    activo.classList.add('bg-green-600', 'text-white');
  }
  renderListaPedidos();
}

async function cambiarEstadoPedido(id, nuevoEstado) {
  try {
    await db.collection('pedidos').doc(id).update({
      estado: nuevoEstado,
      actualizado: new Date()
    });
  } catch (e) {
    alert('Error al actualizar: ' + e.message);
  }
}

async function eliminarPedido(id) {
  if (!confirm('¿Eliminar este pedido de forma permanente?')) return;
  try {
    await db.collection('pedidos').doc(id).delete();
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
}

function mostrarPedidos() {
  const content = document.getElementById('main-content');
  filtroPedidos = 'todos';

  content.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold mb-4">📋 Gestión de Pedidos</h1>
      <p class="text-gray-500 text-sm mb-4">Administra pedidos del catálogo (WhatsApp y Stripe)</p>

      <div class="flex flex-wrap gap-2" id="filtros-pedidos">
        <button id="filtro-todos" onclick="setFiltroPedidos('todos')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-green-600 text-white">Todos</button>
        <button id="filtro-Pendiente" onclick="setFiltroPedidos('Pendiente')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border">Pendiente</button>
        <button id="filtro-Pagado" onclick="setFiltroPedidos('Pagado')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border">Pagado</button>
        <button id="filtro-En proceso" onclick="setFiltroPedidos('En proceso')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border">En proceso</button>
        <button id="filtro-Entregado" onclick="setFiltroPedidos('Entregado')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border">Entregado</button>
        <button id="filtro-Cancelado" onclick="setFiltroPedidos('Cancelado')" class="filtro-pedido px-4 py-2 rounded-xl text-sm font-medium bg-white text-gray-700 border">Cancelado</button>
      </div>
    </div>

    <div id="resumen-pedidos" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"></div>
    <div id="lista-pedidos" class="space-y-4"></div>`;

  unsubscribePedidos = db.collection('pedidos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    pedidosData = [];
    snapshot.forEach(doc => {
      const p = doc.data();
      pedidosData.push({
        id: doc.id,
        ...p,
        fechaTexto: p.fecha?.toDate ? p.fecha.toDate().toLocaleString('es-GT') : ''
      });
    });

    // Resumen rápido
    const resumen = document.getElementById('resumen-pedidos');
    if (resumen) {
      const contar = (est) => pedidosData.filter(p => (p.estado || 'Pendiente') === est).length;
      resumen.innerHTML = `
        <div class="bg-white p-4 rounded-2xl shadow text-center">
          <p class="text-2xl font-bold text-gray-800">${pedidosData.length}</p>
          <p class="text-xs text-gray-500">Total</p>
        </div>
        <div class="bg-yellow-50 p-4 rounded-2xl shadow text-center">
          <p class="text-2xl font-bold text-yellow-700">${contar('Pendiente')}</p>
          <p class="text-xs text-gray-500">Pendientes</p>
        </div>
        <div class="bg-green-50 p-4 rounded-2xl shadow text-center">
          <p class="text-2xl font-bold text-green-700">${contar('Pagado')}</p>
          <p class="text-xs text-gray-500">Pagados</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-2xl shadow text-center">
          <p class="text-2xl font-bold text-blue-700">${contar('En proceso')}</p>
          <p class="text-xs text-gray-500">En proceso</p>
        </div>`;
    }

    renderListaPedidos();
  });
}

function logout() {
  if (confirm("¿Cerrar sesión?")) {
    auth.signOut().then(() => mostrarLogin());
  }
}

window.onload = () => {
  auth.onAuthStateChanged(user => {
    if (user) mostrarPanelPrincipal();
    else mostrarLogin();
  });
};
