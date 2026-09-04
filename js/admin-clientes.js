// js/admin-clientes.js
// (13) Clientes frecuentes desde historial de ventas

window.mostrarClientes = async function () {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <h1 class="text-2xl md:text-3xl font-bold mb-2">Clientes</h1>
    <p class="text-sm text-gray-500 mb-4">Consolidados desde ventas del POS</p>
    <input id="buscar-cliente" type="text" placeholder="Buscar nombre o NIT..." class="w-full md:w-80 p-3 border rounded-xl text-sm mb-4" oninput="filtrarClientesUI()">
    <div id="lista-clientes" class="bg-white rounded-2xl shadow overflow-x-auto">
      <p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>
    </div>
  `;

  try {
    const snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(400).get();
    const map = {};

    snap.forEach(doc => {
      const v = doc.data();
      const nombre = (v.cliente || '').trim();
      const nit = (v.nit || '').trim();
      if (!nombre && !nit) return;
      if (nombre === 'Consumidor Final' && !nit) return;

      const key = (nit || nombre).toLowerCase();
      if (!map[key]) {
        map[key] = { nombre: nombre || 'Sin nombre', nit: nit || '', total: 0, compras: 0, ultima: null };
      }
      map[key].total += Number(v.total) || 0;
      map[key].compras += 1;
      const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (f && (!map[key].ultima || f > map[key].ultima)) map[key].ultima = f;
      if (nombre && map[key].nombre === 'Sin nombre') map[key].nombre = nombre;
      if (nit) map[key].nit = nit;
    });

    window._clientesCache = Object.values(map).sort((a, b) => b.total - a.total);
    filtrarClientesUI();
  } catch (e) {
    document.getElementById('lista-clientes').innerHTML =
      `<p class="text-red-600 p-4">Error: ${e.message}</p>`;
  }
};

window.filtrarClientesUI = function () {
  const q = (document.getElementById('buscar-cliente')?.value || '').toLowerCase().trim();
  let lista = window._clientesCache || [];
  if (q) {
    lista = lista.filter(c =>
      c.nombre.toLowerCase().includes(q) || c.nit.toLowerCase().includes(q)
    );
  }

  const box = document.getElementById('lista-clientes');
  if (!lista.length) {
    box.innerHTML = '<p class="text-center text-gray-400 py-10">No hay clientes</p>';
    return;
  }

  let html = `<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left">
    <th class="p-3">Cliente</th><th class="p-3">NIT</th><th class="p-3 text-center">Compras</th>
    <th class="p-3 text-right">Total</th><th class="p-3 hidden sm:table-cell">Última</th>
  </tr></thead><tbody>`;

  lista.forEach(c => {
    html += `<tr class="border-t">
      <td class="p-3 font-medium">${c.nombre}</td>
      <td class="p-3 text-gray-500">${c.nit || '—'}</td>
      <td class="p-3 text-center">${c.compras}</td>
      <td class="p-3 text-right font-bold text-green-600">Q${c.total.toFixed(2)}</td>
      <td class="p-3 hidden sm:table-cell text-xs text-gray-400">${c.ultima ? c.ultima.toLocaleDateString('es-GT') : ''}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  box.innerHTML = html;
};
