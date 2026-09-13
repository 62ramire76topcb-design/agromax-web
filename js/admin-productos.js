// js/admin-productos.js
// Productos profesionales: costo, margen, filtros, vista lista/grid

let _productosCache = [];
let _filtroCat = 'all';
let _filtroStock = 'all';
let _filtroCosto = 'all';
let _busquedaProd = '';
let _vistaProductos = 'lista'; // lista | grid
let _ordenProd = 'fecha';

function _costoDe(p) {
  return Number(p.costo != null ? p.costo : (p.costoCompra || 0)) || 0;
}

function _margenPct(p) {
  const precio = Number(p.precio) || 0;
  const costo = _costoDe(p);
  if (!precio || !costo) return null;
  return ((precio - costo) / precio) * 100;
}

function _margenQ(p) {
  const precio = Number(p.precio) || 0;
  const costo = _costoDe(p);
  if (!costo) return null;
  return precio - costo;
}

window.mostrarTablaProductos = function () {
  const puedeEditar = typeof puedeEditarProductos === 'function'
    ? puedeEditarProductos()
    : (typeof tienePermiso === 'function' ? (tienePermiso('agregar') || tienePermiso('*')) : true);

  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">Productos</h1>
        <p class="text-sm text-slate-500" id="prod-resumen">Cargando...</p>
        ${!puedeEditar ? '<p class="text-xs text-amber-600 mt-1">Solo consulta · no puedes editar ni eliminar</p>' : ''}
      </div>
      <div class="flex flex-wrap gap-2">
        ${puedeEditar ? `
        <button type="button" onclick="mostrarSeccion('agregar')" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">
          <i class="fas fa-plus mr-1"></i> Nuevo producto
        </button>
        <button type="button" onclick="mostrarSeccion('masiva')" class="border border-slate-200 bg-white px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700">
          <i class="fas fa-file-csv mr-1"></i> CSV
        </button>` : ''}
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" id="prod-kpis"></div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-4 space-y-3">
      <div class="relative">
        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
        <input id="buscar-producto" type="text" placeholder="Buscar por nombre o categoría..."
               class="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
               oninput="filtrarProductosAdmin()">
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <select id="filtro-cat" onchange="filtrarProductosAdmin()" class="p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="all">Todas las categorías</option>
          <option value="Fertilizantes">Fertilizantes</option>
          <option value="Foliares">Foliares</option>
          <option value="Protección">Protección</option>
          <option value="Herramientas">Herramientas</option>
          <option value="Accesorios">Accesorios</option>
        </select>
        <select id="filtro-stock" onchange="filtrarProductosAdmin()" class="p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="all">Todo el stock</option>
          <option value="bajo">Stock bajo (<10)</option>
          <option value="agotado">Agotados</option>
          <option value="ok">Stock OK (≥10)</option>
        </select>
        <select id="filtro-costo" onchange="filtrarProductosAdmin()" class="p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="all">Costo: todos</option>
          <option value="con">Con costo</option>
          <option value="sin">Sin costo</option>
          <option value="margen-bajo">Margen < 20%</option>
        </select>
        <select id="orden-prod" onchange="filtrarProductosAdmin()" class="p-2.5 border border-slate-200 rounded-xl text-sm bg-white">
          <option value="fecha">Orden: recientes</option>
          <option value="nombre">Nombre A–Z</option>
          <option value="precio">Precio ↑</option>
          <option value="stock">Stock ↑</option>
          <option value="margen">Mejor margen</option>
        </select>
        <div class="flex rounded-xl border border-slate-200 overflow-hidden ml-auto">
          <button type="button" id="btn-vista-lista" onclick="setVistaProductos('lista')" class="px-3 py-2 text-sm bg-slate-100 font-semibold"><i class="fas fa-list"></i></button>
          <button type="button" id="btn-vista-grid" onclick="setVistaProductos('grid')" class="px-3 py-2 text-sm text-slate-500"><i class="fas fa-th-large"></i></button>
        </div>
        ${puedeEditar ? `
        <button type="button" onclick="exportarProductosCSV()" class="p-2.5 border border-slate-200 rounded-xl text-sm hover:bg-slate-50 font-medium">
          <i class="fas fa-download mr-1"></i> CSV
        </button>` : ''}
      </div>
    </div>

    <div id="tabla-productos" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto"></div>
  `;

  window._productosSoloLectura = !puedeEditar;

  if (window._unsubProductosAdmin) {
    try { window._unsubProductosAdmin(); } catch (e) {}
  }
  window._unsubProductosAdmin = db.collection('productos').orderBy('fecha', 'desc').onSnapshot(snapshot => {
    _productosCache = [];
    snapshot.forEach(doc => _productosCache.push({ id: doc.id, ...doc.data() }));
    renderTablaProductosAdmin();
  }, err => {
    const box = document.getElementById('tabla-productos');
    if (box) box.innerHTML = '<p class="p-6 text-red-600">Error: ' + err.message + '</p>';
  });
};

window.setVistaProductos = function (v) {
  _vistaProductos = v;
  const lista = document.getElementById('btn-vista-lista');
  const grid = document.getElementById('btn-vista-grid');
  if (lista && grid) {
    if (v === 'lista') {
      lista.className = 'px-3 py-2 text-sm bg-slate-100 font-semibold';
      grid.className = 'px-3 py-2 text-sm text-slate-500';
    } else {
      grid.className = 'px-3 py-2 text-sm bg-slate-100 font-semibold';
      lista.className = 'px-3 py-2 text-sm text-slate-500';
    }
  }
  renderTablaProductosAdmin();
};

window.filtrarProductosAdmin = function () {
  const b = document.getElementById('buscar-producto');
  const c = document.getElementById('filtro-cat');
  const s = document.getElementById('filtro-stock');
  const co = document.getElementById('filtro-costo');
  const o = document.getElementById('orden-prod');
  _busquedaProd = b ? b.value.toLowerCase().trim() : '';
  _filtroCat = c ? c.value : 'all';
  _filtroStock = s ? s.value : 'all';
  _filtroCosto = co ? co.value : 'all';
  _ordenProd = o ? o.value : 'fecha';
  renderTablaProductosAdmin();
};

function _listaFiltrada() {
  let lista = _productosCache.slice();
  if (_busquedaProd) {
    lista = lista.filter(p =>
      (p.nombre || '').toLowerCase().includes(_busquedaProd) ||
      (p.categoria || '').toLowerCase().includes(_busquedaProd)
    );
  }
  if (_filtroCat !== 'all') lista = lista.filter(p => p.categoria === _filtroCat);
  if (_filtroStock === 'bajo') lista = lista.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10);
  if (_filtroStock === 'agotado') lista = lista.filter(p => (p.stock || 0) <= 0);
  if (_filtroStock === 'ok') lista = lista.filter(p => (p.stock || 0) >= 10);
  if (_filtroCosto === 'con') lista = lista.filter(p => _costoDe(p) > 0);
  if (_filtroCosto === 'sin') lista = lista.filter(p => _costoDe(p) <= 0);
  if (_filtroCosto === 'margen-bajo') {
    lista = lista.filter(p => {
      const m = _margenPct(p);
      return m != null && m < 20;
    });
  }

  if (_ordenProd === 'nombre') lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  else if (_ordenProd === 'precio') lista.sort((a, b) => (a.precio || 0) - (b.precio || 0));
  else if (_ordenProd === 'stock') lista.sort((a, b) => (a.stock || 0) - (b.stock || 0));
  else if (_ordenProd === 'margen') {
    lista.sort((a, b) => {
      const ma = _margenPct(a); const mb = _margenPct(b);
      if (ma == null && mb == null) return 0;
      if (ma == null) return 1;
      if (mb == null) return -1;
      return mb - ma;
    });
  }
  return lista;
}

function renderTablaProductosAdmin() {
  const lista = _listaFiltrada();
  const box = document.getElementById('tabla-productos');
  if (!box) return;

  // KPIs
  const kpis = document.getElementById('prod-kpis');
  const resumen = document.getElementById('prod-resumen');
  if (kpis) {
    const total = _productosCache.length;
    const sinCosto = _productosCache.filter(p => _costoDe(p) <= 0).length;
    const bajo = _productosCache.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length;
    const agot = _productosCache.filter(p => (p.stock || 0) <= 0).length;
    const valInv = _productosCache.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0);
    const valCosto = _productosCache.reduce((s, p) => s + _costoDe(p) * (Number(p.stock) || 0), 0);
    kpis.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p class="text-[10px] uppercase text-slate-400 font-semibold">Productos</p>
        <p class="text-xl font-bold text-slate-900">${total}</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p class="text-[10px] uppercase text-slate-400 font-semibold">Sin costo</p>
        <p class="text-xl font-bold ${sinCosto ? 'text-amber-600' : 'text-green-600'}">${sinCosto}</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p class="text-[10px] uppercase text-slate-400 font-semibold">Stock bajo / agotado</p>
        <p class="text-xl font-bold text-orange-600">${bajo} / ${agot}</p>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm">
        <p class="text-[10px] uppercase text-slate-400 font-semibold">Inventario (venta)</p>
        <p class="text-lg font-bold text-green-700">Q${valInv.toLocaleString('es-GT', { maximumFractionDigits: 0 })}</p>
        <p class="text-[10px] text-slate-400">Costo: ${valCosto ? 'Q' + valCosto.toLocaleString('es-GT', { maximumFractionDigits: 0 }) : '—'}</p>
      </div>`;
    if (resumen) resumen.textContent = lista.length + ' mostrados · de ' + total + ' totales';
  }

  if (lista.length === 0) {
    box.innerHTML = '<div class="text-center text-slate-400 py-16"><div class="text-4xl mb-2 opacity-40">📦</div><p>No se encontraron productos</p></div>';
    return;
  }

  const soloLectura = !!window._productosSoloLectura;

  if (_vistaProductos === 'grid') {
    box.className = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3';
    box.innerHTML = lista.map(p => {
      const stock = Number(p.stock) || 0;
      const costo = _costoDe(p);
      const mPct = _margenPct(p);
      const mQ = _margenQ(p);
      const stockColor = stock <= 0 ? 'bg-red-500' : stock < 10 ? 'bg-amber-500' : 'bg-green-500';
      const stockW = Math.min(100, stock <= 0 ? 0 : Math.max(8, stock * 5));
      return `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
          <div class="aspect-[4/3] bg-slate-100 relative">
            <img src="${p.imageUrl || 'https://picsum.photos/id/201/400/300'}" class="w-full h-full object-cover" alt="" loading="lazy">
            <span class="absolute top-2 left-2 text-[10px] bg-white/90 px-2 py-0.5 rounded-full font-semibold text-slate-600">${p.categoria || ''}</span>
            ${!costo ? '<span class="absolute top-2 right-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">Sin costo</span>' : ''}
          </div>
          <div class="p-3 flex-1 flex flex-col">
            <h3 class="font-bold text-sm text-slate-900 line-clamp-2">${p.nombre || ''}</h3>
            <p class="text-[10px] text-slate-400">${p.unidad || ''}</p>
            <div class="mt-2 space-y-1 text-xs">
              <div class="flex justify-between"><span class="text-slate-500">Precio</span><b class="text-green-700">Q${Number(p.precio || 0).toFixed(2)}</b></div>
              <div class="flex justify-between"><span class="text-slate-500">Costo</span><span>${costo ? 'Q' + costo.toFixed(2) : '<span class="text-amber-600">—</span>'}</span></div>
              <div class="flex justify-between"><span class="text-slate-500">Margen</span><span class="font-semibold ${mPct != null && mPct < 20 ? 'text-red-600' : 'text-emerald-600'}">${mQ != null ? 'Q' + mQ.toFixed(2) + ' (' + mPct.toFixed(0) + '%)' : '—'}</span></div>
            </div>
            <div class="mt-2">
              <div class="flex justify-between text-[10px] mb-0.5"><span>Stock</span><span class="font-bold">${stock}</span></div>
              <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full ${stockColor} rounded-full" style="width:${stockW}%"></div></div>
            </div>
            ${soloLectura ? '' : `
            <div class="mt-3 flex gap-2">
              <button type="button" onclick="editarProducto('${p.id}')" class="flex-1 py-2 rounded-xl bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100">Editar</button>
              <button type="button" onclick="eliminarProducto('${p.id}')" class="px-3 py-2 rounded-xl text-red-600 text-xs hover:bg-red-50"><i class="fas fa-trash"></i></button>
            </div>`}
          </div>
        </div>`;
    }).join('');
    return;
  }

  // Lista / tabla
  box.className = 'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto';
  let html = `<table class="w-full text-sm"><thead class="sticky top-0 z-10"><tr class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
    <th class="p-3 font-semibold">Producto</th>
    <th class="p-3 font-semibold hidden md:table-cell">Categoría</th>
    <th class="p-3 font-semibold text-center">Stock</th>
    <th class="p-3 font-semibold text-right">Costo</th>
    <th class="p-3 font-semibold text-right">Precio</th>
    <th class="p-3 font-semibold text-right hidden sm:table-cell">Margen</th>
    ${soloLectura ? '' : '<th class="p-3 font-semibold">Acciones</th>'}
  </tr></thead><tbody>`;

  lista.forEach(p => {
    const stock = Number(p.stock) || 0;
    const costo = _costoDe(p);
    const mPct = _margenPct(p);
    const mQ = _margenQ(p);
    const stockClass = stock <= 0 ? 'text-red-600 font-bold' : stock < 10 ? 'text-amber-600 font-bold' : 'text-slate-700';
    const margenClass = mPct == null ? 'text-slate-400' : mPct < 20 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold';

    html += `<tr class="border-t border-slate-50 hover:bg-slate-50/80">
      <td class="p-3">
        <div class="flex items-center gap-3 min-w-0">
          <img src="${p.imageUrl || 'https://picsum.photos/id/201/80/80'}" class="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" alt="" loading="lazy">
          <div class="min-w-0">
            <div class="font-semibold text-slate-900 truncate">${p.nombre || ''}</div>
            <div class="text-[10px] text-slate-400">${p.unidad || ''}${!costo ? ' · <span class="text-amber-600 font-semibold">Sin costo</span>' : ''}</div>
          </div>
        </div>
      </td>
      <td class="p-3 hidden md:table-cell text-slate-500">${p.categoria || ''}</td>
      <td class="p-3 text-center ${stockClass}">${stock}</td>
      <td class="p-3 text-right ${costo ? 'text-slate-700' : 'text-amber-600'}">${costo ? 'Q' + costo.toFixed(2) : '—'}</td>
      <td class="p-3 text-right font-bold text-green-700">Q${Number(p.precio || 0).toFixed(2)}</td>
      <td class="p-3 text-right hidden sm:table-cell ${margenClass}">${mQ != null ? 'Q' + mQ.toFixed(2) + ' <span class="text-[10px]">(' + mPct.toFixed(0) + '%)</span>' : '—'}</td>
      ${soloLectura ? '' : `
      <td class="p-3 whitespace-nowrap">
        <button type="button" onclick="editarProducto('${p.id}')" class="text-blue-600 hover:underline mr-2 text-xs font-semibold">Editar</button>
        <button type="button" onclick="eliminarProducto('${p.id}')" class="text-red-500 hover:underline text-xs">Eliminar</button>
      </td>`}
    </tr>`;
  });

  html += '</tbody></table>';
  box.innerHTML = html;
}

window.exportarProductosCSV = function () {
  const lista = _listaFiltrada();
  let csv = 'Nombre,Costo,Precio,Margen,MargenPct,Stock,Unidad,Categoria\n';
  lista.forEach(p => {
    const costo = _costoDe(p);
    const mQ = _margenQ(p);
    const mPct = _margenPct(p);
    csv += `"${(p.nombre || '').replace(/"/g, '""')}",${costo || ''},${p.precio || 0},${mQ != null ? mQ.toFixed(2) : ''},${mPct != null ? mPct.toFixed(1) : ''},${p.stock || 0},"${p.unidad || ''}","${p.categoria || ''}"\n`;
  });
  if (typeof descargarCSV === 'function') descargarCSV('productos-agromax.csv', csv);
  else {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'productos-agromax.csv';
    a.click();
  }
};
