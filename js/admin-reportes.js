// js/admin-reportes.js
// (9)(11)(12) Reportes por fecha, cajero y gráfica simple

window.mostrarReportes = async function () {
  const content = document.getElementById('main-content');
  const hoy = new Date();
  const hace7 = new Date(hoy);
  hace7.setDate(hace7.getDate() - 7);

  const toInput = (d) => d.toISOString().slice(0, 10);

  content.innerHTML = `
    <h1 class="text-2xl md:text-3xl font-bold mb-4">Reportes</h1>

    <div class="bg-white rounded-2xl shadow p-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label class="text-xs text-gray-500">Desde</label>
        <input type="date" id="rep-desde" value="${toInput(hace7)}" class="block p-2 border rounded-xl text-sm">
      </div>
      <div>
        <label class="text-xs text-gray-500">Hasta</label>
        <input type="date" id="rep-hasta" value="${toInput(hoy)}" class="block p-2 border rounded-xl text-sm">
      </div>
      <button onclick="generarReporte()" class="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
        Generar
      </button>
      <button onclick="exportarVentasCSV()" class="border px-4 py-2 rounded-xl text-sm">Exportar ventas</button>
      <button onclick="exportarPedidosCSV()" class="border px-4 py-2 rounded-xl text-sm">Exportar pedidos</button>
    </div>

    <div id="rep-stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"></div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl shadow p-4">
        <h3 class="font-bold mb-3">Por cajero (POS)</h3>
        <div id="rep-cajeros" class="text-sm space-y-2"></div>
      </div>
      <div class="bg-white rounded-2xl shadow p-4">
        <h3 class="font-bold mb-3">Canal de ingreso</h3>
        <div id="rep-canales" class="text-sm space-y-2"></div>
        <div id="rep-barras" class="mt-4 space-y-2"></div>
      </div>
    </div>
  `;

  generarReporte();
};

window.generarReporte = async function () {
  const desdeStr = document.getElementById('rep-desde').value;
  const hastaStr = document.getElementById('rep-hasta').value;
  const desde = new Date(desdeStr + 'T00:00:00');
  const hasta = new Date(hastaStr + 'T23:59:59');

  const [snapV, snapP] = await Promise.all([
    db.collection('ventas').orderBy('fecha', 'desc').limit(300).get(),
    db.collection('pedidos').orderBy('fecha', 'desc').limit(300).get()
  ]);

  const ventas = [];
  snapV.forEach(d => {
    const v = d.data();
    const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
    if (f && f >= desde && f <= hasta) ventas.push(v);
  });

  const pedidos = [];
  snapP.forEach(d => {
    const p = d.data();
    const f = p.fecha && p.fecha.toDate ? p.fecha.toDate() : null;
    if (f && f >= desde && f <= hasta) pedidos.push(p);
  });

  const totalCaja = ventas.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalStripe = pedidos.filter(p => p.metodo === 'Stripe' || p.estado === 'Pagado')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalWA = pedidos.filter(p => p.metodo !== 'Stripe' && p.estado !== 'Pagado')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalGeneral = totalCaja + totalStripe;

  document.getElementById('rep-stats').innerHTML = `
    <div class="bg-white p-4 rounded-2xl shadow"><p class="text-xs text-gray-500">Total caja POS</p><p class="text-xl font-bold text-green-600">Q${totalCaja.toFixed(2)}</p><p class="text-xs text-gray-400">${ventas.length} ventas</p></div>
    <div class="bg-white p-4 rounded-2xl shadow"><p class="text-xs text-gray-500">Stripe</p><p class="text-xl font-bold text-blue-600">Q${totalStripe.toFixed(2)}</p></div>
    <div class="bg-white p-4 rounded-2xl shadow"><p class="text-xs text-gray-500">WhatsApp (monto)</p><p class="text-xl font-bold text-yellow-600">Q${totalWA.toFixed(2)}</p></div>
    <div class="bg-white p-4 rounded-2xl shadow"><p class="text-xs text-gray-500">Total cobrado*</p><p class="text-xl font-bold">Q${totalGeneral.toFixed(2)}</p><p class="text-xs text-gray-400">*Caja + Stripe</p></div>
  `;

  // Por cajero
  const porCajero = {};
  ventas.forEach(v => {
    const c = v.cajero || 'Sin nombre';
    if (!porCajero[c]) porCajero[c] = { total: 0, n: 0 };
    porCajero[c].total += Number(v.total) || 0;
    porCajero[c].n += 1;
  });
  const cajHtml = Object.keys(porCajero).length === 0
    ? '<p class="text-gray-400">Sin datos en el rango</p>'
    : Object.entries(porCajero).sort((a, b) => b[1].total - a[1].total).map(([nombre, d]) =>
      `<div class="flex justify-between border-b pb-2"><span>${nombre} <span class="text-gray-400">(${d.n})</span></span><b>Q${d.total.toFixed(2)}</b></div>`
    ).join('');
  document.getElementById('rep-cajeros').innerHTML = cajHtml;

  // Canales
  const canales = [
    { nombre: 'Caja POS', total: totalCaja, color: 'bg-green-500' },
    { nombre: 'Stripe', total: totalStripe, color: 'bg-blue-500' },
    { nombre: 'WhatsApp', total: totalWA, color: 'bg-yellow-500' }
  ];
  const max = Math.max(...canales.map(c => c.total), 1);
  document.getElementById('rep-canales').innerHTML = canales.map(c =>
    `<div class="flex justify-between"><span>${c.nombre}</span><b>Q${c.total.toFixed(2)}</b></div>`
  ).join('');
  document.getElementById('rep-barras').innerHTML = canales.map(c => `
    <div>
      <div class="flex justify-between text-xs mb-1"><span>${c.nombre}</span><span>${Math.round(c.total / max * 100)}%</span></div>
      <div class="h-3 bg-gray-100 rounded-full overflow-hidden"><div class="h-full ${c.color}" style="width:${(c.total / max * 100)}%"></div></div>
    </div>
  `).join('');
};

// Integrar en mostrarSeccion
(function () {
  const original = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'reportes') return mostrarReportes();
    if (seccion === 'clientes') return mostrarClientes();
    if (typeof original === 'function') return original(seccion);
  };
})();
