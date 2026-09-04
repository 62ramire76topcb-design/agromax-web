// js/admin-dashboard.js
// Métricas avanzadas del Dashboard (sobrescribe mostrarDashboard)

async function mostrarDashboard() {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <h1 class="text-3xl md:text-4xl font-bold text-green-700 mb-2">Dashboard</h1>
    <p class="text-gray-500 text-sm mb-6">Resumen en tiempo real de AGROMAXGTM</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" id="stats-cards">
      <div class="bg-white p-5 rounded-3xl shadow col-span-2 lg:col-span-4 text-center text-gray-400">
        <i class="fas fa-spinner fa-spin mr-2"></i> Cargando métricas...
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-3xl shadow p-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
          <i class="fas fa-chart-line text-green-600"></i> Ventas recientes (Caja POS)
        </h3>
        <div id="ventas-recientes" class="space-y-3 max-h-72 overflow-auto text-sm"></div>
      </div>
      <div class="bg-white rounded-3xl shadow p-6">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
          <i class="fas fa-shopping-bag text-blue-600"></i> Pedidos web recientes
        </h3>
        <div id="pedidos-recientes" class="space-y-3 max-h-72 overflow-auto text-sm"></div>
      </div>
    </div>

    <div class="bg-white rounded-3xl shadow p-6">
      <h3 class="text-lg font-bold mb-4 flex items-center gap-2 text-orange-600">
        <i class="fas fa-exclamation-triangle"></i> Productos con stock bajo
      </h3>
      <div id="bajo-stock" class="space-y-3"></div>
    </div>
  `;

  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

    // Cargar datos en paralelo
    const [snapProd, snapVentas, snapPedidos] = await Promise.all([
      db.collection('productos').get(),
      db.collection('ventas').orderBy('fecha', 'desc').limit(50).get(),
      db.collection('pedidos').orderBy('fecha', 'desc').limit(50).get()
    ]);

    const productos = [];
    snapProd.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));

    const ventas = [];
    snapVentas.forEach(doc => ventas.push({ id: doc.id, ...doc.data() }));

    const pedidos = [];
    snapPedidos.forEach(doc => pedidos.push({ id: doc.id, ...doc.data() }));

    // ---- Métricas ----
    const totalProductos = productos.length;
    const valorInventario = productos.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0);
    const stockBajo = productos.filter(p => (p.stock || 0) < 10);

    const ventasHoy = ventas.filter(v => {
      const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      return f && f >= inicioHoy;
    });
    const totalCajaHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);

    const pedidosHoy = pedidos.filter(p => {
      const f = p.fecha && p.fecha.toDate ? p.fecha.toDate() : null;
      return f && f >= inicioHoy;
    });

    const ingresosStripe = pedidos
      .filter(p => p.metodo === 'Stripe' || p.estado === 'Pagado')
      .reduce((s, p) => s + (Number(p.total) || 0), 0);

    const ingresosStripeHoy = pedidosHoy
      .filter(p => p.metodo === 'Stripe' || p.estado === 'Pagado')
      .reduce((s, p) => s + (Number(p.total) || 0), 0);

    const pendientes = pedidos.filter(p => {
      const e = p.estado || 'Pendiente';
      return e === 'Pendiente' || e === 'Pagado' || e === 'En proceso';
    }).length;

    const totalCajaGeneral = ventas.reduce((s, v) => s + (Number(v.total) || 0), 0);

    // ---- Cards ----
    document.getElementById('stats-cards').innerHTML = `
      <div class="bg-white p-5 rounded-3xl shadow">
        <p class="text-xs text-gray-500 mb-1">Ventas caja hoy</p>
        <p class="text-2xl md:text-3xl font-bold text-green-600">Q${totalCajaHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
        <p class="text-xs text-gray-400 mt-1">${ventasHoy.length} ticket(s)</p>
      </div>
      <div class="bg-white p-5 rounded-3xl shadow">
        <p class="text-xs text-gray-500 mb-1">Stripe hoy</p>
        <p class="text-2xl md:text-3xl font-bold text-blue-600">Q${ingresosStripeHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
        <p class="text-xs text-gray-400 mt-1">Total Stripe: Q${ingresosStripe.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</p>
      </div>
      <div class="bg-white p-5 rounded-3xl shadow">
        <p class="text-xs text-gray-500 mb-1">Pedidos activos</p>
        <p class="text-2xl md:text-3xl font-bold text-yellow-600">${pendientes}</p>
        <p class="text-xs text-gray-400 mt-1">Pendiente / Pagado / En proceso</p>
      </div>
      <div class="bg-white p-5 rounded-3xl shadow">
        <p class="text-xs text-gray-500 mb-1">Valor inventario</p>
        <p class="text-2xl md:text-3xl font-bold text-purple-600">Q${valorInventario.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</p>
        <p class="text-xs text-gray-400 mt-1">${totalProductos} productos</p>
      </div>
      <div class="bg-green-50 p-5 rounded-3xl shadow col-span-2">
        <p class="text-xs text-green-700 mb-1">Ingresos caja (muestra reciente)</p>
        <p class="text-xl font-bold text-green-800">Q${totalCajaGeneral.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</p>
        <p class="text-xs text-green-600 mt-1">Últimas ${ventas.length} ventas registradas</p>
      </div>
      <div class="bg-orange-50 p-5 rounded-3xl shadow col-span-2">
        <p class="text-xs text-orange-700 mb-1">Stock bajo</p>
        <p class="text-xl font-bold text-orange-800">${stockBajo.length} productos</p>
        <p class="text-xs text-orange-600 mt-1">Menos de 10 unidades</p>
      </div>
    `;

    // ---- Ventas recientes ----
    const boxVentas = document.getElementById('ventas-recientes');
    if (ventas.length === 0) {
      boxVentas.innerHTML = '<p class="text-gray-400 py-6 text-center">Sin ventas aún</p>';
    } else {
      boxVentas.innerHTML = ventas.slice(0, 8).map(v => {
        const fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString('es-GT') : '';
        return `<div class="flex justify-between items-start border-b pb-2">
          <div>
            <p class="font-medium">Q${Number(v.total || 0).toFixed(2)} <span class="text-gray-400 font-normal">· ${v.metodoPago || ''}</span></p>
            <p class="text-xs text-gray-500">${v.cajero || 'Cajero'} · ${v.cliente || 'Consumidor Final'}</p>
          </div>
          <p class="text-xs text-gray-400 whitespace-nowrap ml-2">${fecha}</p>
        </div>`;
      }).join('');
    }

    // ---- Pedidos recientes ----
    const boxPedidos = document.getElementById('pedidos-recientes');
    if (pedidos.length === 0) {
      boxPedidos.innerHTML = '<p class="text-gray-400 py-6 text-center">Sin pedidos aún</p>';
    } else {
      boxPedidos.innerHTML = pedidos.slice(0, 8).map(p => {
        const fecha = p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleString('es-GT') : '';
        const est = p.estado || 'Pendiente';
        const color = est === 'Pagado' ? 'text-green-600' : est === 'En proceso' ? 'text-blue-600' : est === 'Cancelado' ? 'text-red-600' : 'text-yellow-600';
        return `<div class="flex justify-between items-start border-b pb-2">
          <div>
            <p class="font-medium">Q${Number(p.total || 0).toFixed(2)} <span class="${color} font-normal">· ${est}</span></p>
            <p class="text-xs text-gray-500">${p.cliente || 'Cliente'} · ${p.metodo || 'Web'}</p>
          </div>
          <p class="text-xs text-gray-400 whitespace-nowrap ml-2">${fecha}</p>
        </div>`;
      }).join('');
    }

    // ---- Stock bajo ----
    const boxStock = document.getElementById('bajo-stock');
    if (stockBajo.length === 0) {
      boxStock.innerHTML = '<p class="text-green-600">No hay productos con stock bajo ✅</p>';
    } else {
      boxStock.innerHTML = stockBajo
        .sort((a, b) => (a.stock || 0) - (b.stock || 0))
        .slice(0, 15)
        .map(p => `
          <div class="flex justify-between bg-orange-50 p-3 rounded-2xl">
            <span>${p.nombre}</span>
            <span class="font-bold text-orange-600">Stock: ${p.stock || 0}</span>
          </div>
        `).join('');
    }
  } catch (e) {
    console.error(e);
    document.getElementById('stats-cards').innerHTML =
      `<div class="col-span-full bg-red-50 text-red-700 p-4 rounded-2xl">Error al cargar métricas: ${e.message}</div>`;
  }
}
