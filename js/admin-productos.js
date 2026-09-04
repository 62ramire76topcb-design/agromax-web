// js/admin-productos.js
// (2) Búsqueda y filtros de productos

let _productosCache = [];
let _filtroCat = 'all';
let _filtroStock = 'all';
let _busquedaProd = '';

window.mostrarTablaProductos = function () {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl md:text-3xl font-bold">Productos</h1>
      <button onclick="mostrarSeccion('agregar')" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
        <i class="fas fa-plus mr-1"></i> Nuevo
      </button>
    </div>

    <div class="bg-white rounded-2xl shadow p-4 mb-4 space-y-3">
      <input id="buscar-producto" type="text" placeholder="Buscar por nombre..."
             class="w-full p-3 border rounded-xl text-sm" oninput="filtrarProductosAdmin()">
      <div class="flex flex-wrap gap-2">
        <select id="filtro-cat" onchange="filtrarProductosAdmin()" class="p-2 border rounded-xl text-sm">
          <option value="all">Todas las categorías</option>
          <option value="Fertilizantes">Fertilizantes</option>
          <option value="Foliares">Foliares</option>
          <option value="Protección">Protección</option>
          <option value="Herramientas">Herramientas</option>
          <option value="Accesorios">Accesorios</option>
        </select>
        <select id="filtro-stock" onchange="filtrarProductosAdmin()" class="p-2 border rounded-xl text-sm">
          <option value="all">Todo el stock</option>
          <option value="bajo">Stock bajo (<10)</option>
          <option value="agotado">Agotados (0)</option>
          <option value="ok">Stock OK (≥10)</option>
        </select>
        <button onclick="exportarProductosCSV()" class="p-2 border rounded-xl text-sm hover:bg-gray-50">
          <i class="fas fa-file-csv mr-1"></i> Exportar CSV
        </button>
      </div>
    </div>

    <div id="tabla-productos" class="bg-white rounded-2xl shadow overflow-x-auto"></div>
  `;

  db.collection('productos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    _productosCache = [];
    snapshot.forEach(doc => _productosCache.push({ id: doc.id, ...doc.data() }));
    renderTablaProductosAdmin();
  });
};

window.filtrarProductosAdmin = function () {
  const b = document.getElementById('buscar-producto');
  const c = document.getElementById('filtro-cat');
  const s = document.getElementById('filtro-stock');
  _busquedaProd = b ? b.value.toLowerCase().trim() : '';
  _filtroCat = c ? c.value : 'all';
  _filtroStock = s ? s.value : 'all';
  renderTablaProductosAdmin();
};

function renderTablaProductosAdmin() {
  let lista = _productosCache.slice();
  if (_busquedaProd) lista = lista.filter(p => (p.nombre || '').toLowerCase().includes(_busquedaProd));
  if (_filtroCat !== 'all') lista = lista.filter(p => p.categoria === _filtroCat);
  if (_filtroStock === 'bajo') lista = lista.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10);
  if (_filtroStock === 'agotado') lista = lista.filter(p => (p.stock || 0) <= 0);
  if (_filtroStock === 'ok') lista = lista.filter(p => (p.stock || 0) >= 10);

  const box = document.getElementById('tabla-productos');
  if (!box) return;

  if (lista.length === 0) {
    box.innerHTML = '<p class="text-center text-gray-400 py-12">No se encontraron productos</p>';
    return;
  }

  let html = `<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left">
    <th class="p-3">Producto</th>
    <th class="p-3 hidden sm:table-cell">Categoría</th>
    <th class="p-3 text-center">Stock</th>
    <th class="p-3 text-right">Precio</th>
    <th class="p-3">Acciones</th>
  </tr></thead><tbody>`;

  lista.forEach(p => {
    const stock = p.stock || 0;
    const stockClass = stock <= 0 ? 'text-red-600 font-bold' : stock < 10 ? 'text-orange-600 font-bold' : '';
    html += `<tr class="border-t hover:bg-gray-50">
      <td class="p-3 font-medium">${p.nombre || ''}</td>
      <td class="p-3 hidden sm:table-cell text-gray-500">${p.categoria || ''}</td>
      <td class="p-3 text-center ${stockClass}">${stock}</td>
      <td class="p-3 text-right font-bold">Q${Number(p.precio || 0).toFixed(2)}</td>
      <td class="p-3 whitespace-nowrap">
        <button onclick="editarProducto('${p.id}')" class="text-blue-600 mr-2 text-xs sm:text-sm">Editar</button>
        <button onclick="eliminarProducto('${p.id}')" class="text-red-600 text-xs sm:text-sm">Eliminar</button>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  box.innerHTML = html;
}

window.exportarProductosCSV = function () {
  let lista = _productosCache.slice();
  if (_busquedaProd) lista = lista.filter(p => (p.nombre || '').toLowerCase().includes(_busquedaProd));
  if (_filtroCat !== 'all') lista = lista.filter(p => p.categoria === _filtroCat);

  let csv = 'Nombre,Precio,Stock,Unidad,Categoria\n';
  lista.forEach(p => {
    csv += `"${(p.nombre || '').replace(/"/g, '""')}",${p.precio || 0},${p.stock || 0},"${p.unidad || ''}","${p.categoria || ''}"\n`;
  });
  descargarCSV('productos-agromax.csv', csv);
};
