// js/admin-reportes.js
// Reportes financieros: ingresos, margen, comparación mensual

window.mostrarReportes = async function () {
  const content = document.getElementById('main-content');
  const hoy = new Date();
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const toInput = (d) => d.toISOString().slice(0, 10);

  content.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">Números del negocio</h1>
        <p class="text-sm text-slate-500">Ingresos, margen estimado y comparación de periodos</p>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-end">
      <div>
        <label class="text-[10px] uppercase text-slate-400 font-semibold">Desde</label>
        <input type="date" id="rep-desde" value="${toInput(inicioMes)}" class="block p-2.5 border border-slate-200 rounded-xl text-sm">
      </div>
      <div>
        <label class="text-[10px] uppercase text-slate-400 font-semibold">Hasta</label>
        <input type="date" id="rep-hasta" value="${toInput(hoy)}" class="block p-2.5 border border-slate-200 rounded-xl text-sm">
      </div>
      <button type="button" onclick="generarReporte()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
        Generar
      </button>
      <button type="button" onclick="setRangoRapido('mes')" class="border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600">Este mes</button>
      <button type="button" onclick="setRangoRapido('mes-ant')" class="border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600">Mes anterior</button>
      <button type="button" onclick="setRangoRapido('7d')" class="border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600">7 días</button>
      <button type="button" onclick="exportarReporteCSV()" class="ml-auto border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-semibold">Exportar CSV</button>
    </div>

    <div id="rep-stats" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5"></div>

    <div id="rep-comparacion" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5"></div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 class="font-bold text-slate-800 mb-3">Por cajero (POS)</h3>
        <div id="rep-cajeros" class="text-sm space-y-2"></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 class="font-bold text-slate-800 mb-3">Canal de ingreso</h3>
        <div id="rep-canales" class="text-sm space-y-2 mb-3"></div>
        <div id="rep-barras" class="space-y-2"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 class="font-bold text-slate-800 mb-1">Top productos vendidos</h3>
        <p class="text-xs text-slate-400 mb-3">Por ingreso en el periodo (caja + web)</p>
        <div id="rep-top" class="text-sm space-y-2"></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 class="font-bold text-slate-800 mb-1">Inventario y margen</h3>
        <p class="text-xs text-slate-400 mb-3">Usa el campo <b>costo</b> en productos para margen real</p>
        <div id="rep-inventario" class="text-sm space-y-3"></div>
      </div>
    </div>

    <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-900">
      <b>Cómo leer estos números</b>
      <ul class="mt-2 space-y-1 list-disc list-inside text-amber-800/90 text-xs sm:text-sm">
        <li><b>Cobrado</b> = Caja POS + Stripe (dinero que ya entró).</li>
        <li><b>WhatsApp</b> es monto pedido; puede no estar cobrado aún.</li>
        <li><b>Margen estimado</b> = ventas − (cantidad × costo del producto). Si no hay costo, se muestra solo ingreso.</li>
        <li>Completa el <b>costo de compra</b> en cada producto para ver si ganas o no.</li>
      </ul>
    </div>
  `;

  generarReporte();
};

window.setRangoRapido = function (tipo) {
  const hoy = new Date();
  let desde, hasta;
  if (tipo === '7d') {
    hasta = hoy;
    desde = new Date(hoy); desde.setDate(desde.getDate() - 6);
  } else if (tipo === 'mes-ant') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  } else {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    hasta = hoy;
  }
  const toInput = (d) => d.toISOString().slice(0, 10);
  document.getElementById('rep-desde').value = toInput(desde);
  document.getElementById('rep-hasta').value = toInput(hasta);
  generarReporte();
};

function fmtQ(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctChange(actual, anterior) {
  if (!anterior) return actual ? 100 : 0;
  return ((actual - anterior) / anterior) * 100;
}

window._ultimoReporte = null;

window.generarReporte = async function () {
  const desdeStr = document.getElementById('rep-desde').value;
  const hastaStr = document.getElementById('rep-hasta').value;
  const desde = new Date(desdeStr + 'T00:00:00');
  const hasta = new Date(hastaStr + 'T23:59:59');
  const dias = Math.max(1, Math.round((hasta - desde) / 86400000) + 1);
  // periodo anterior igual de largo
  const desdeAnt = new Date(desde); desdeAnt.setDate(desdeAnt.getDate() - dias);
  const hastaAnt = new Date(desde); hastaAnt.setDate(hastaAnt.getDate() - 1);
  hastaAnt.setHours(23, 59, 59, 999);

  const [snapV, snapP, snapProd] = await Promise.all([
    db.collection('ventas').orderBy('fecha', 'desc').limit(500).get(),
    db.collection('pedidos').orderBy('fecha', 'desc').limit(500).get(),
    db.collection('productos').get()
  ]);

  const productosMap = {};
  snapProd.forEach(d => {
    const p = d.data();
    productosMap[p.nombre] = p;
    productosMap[d.id] = p;
  });

  function enRango(f, a, b) {
    return f && f >= a && f <= b;
  }

  const ventas = [];
  const ventasAnt = [];
  snapV.forEach(d => {
    const v = { id: d.id, ...d.data() };
    const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
    if (enRango(f, desde, hasta)) ventas.push(v);
    if (enRango(f, desdeAnt, hastaAnt)) ventasAnt.push(v);
  });

  const pedidos = [];
  const pedidosAnt = [];
  snapP.forEach(d => {
    const p = { id: d.id, ...d.data() };
    const f = p.fecha && p.fecha.toDate ? p.fecha.toDate() : null;
    if (enRango(f, desde, hasta)) pedidos.push(p);
    if (enRango(f, desdeAnt, hastaAnt)) pedidosAnt.push(p);
  });

  const totalCaja = ventas.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const totalCajaAnt = ventasAnt.reduce((s, v) => s + (Number(v.total) || 0), 0);

  const pedidosPagados = pedidos.filter(p =>
    p.metodo === 'Stripe' || p.estado === 'Pagado' || p.estado === 'Enviado' || p.estado === 'Enviado' || p.estado === 'Entregado'
  );
  // Stripe cobrado: metodo Stripe y no cancelado/esperando
  const totalStripe = pedidos
    .filter(p => p.metodo === 'Stripe' && p.estado !== 'Cancelado' && p.estado !== 'Esperando pago')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);
  const totalStripeAnt = pedidosAnt
    .filter(p => p.metodo === 'Stripe' && p.estado !== 'Cancelado' && p.estado !== 'Esperando pago')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);

  const totalWA = pedidos
    .filter(p => p.metodo !== 'Stripe')
    .reduce((s, p) => s + (Number(p.total) || 0), 0);

  const totalCobrado = totalCaja + totalStripe;
  const totalCobradoAnt = totalCajaAnt + totalStripeAnt;
  const ticketProm = ventas.length ? totalCaja / ventas.length : 0;

  // Margen estimado sobre líneas de venta con costo conocido
  function calcMargen(listaVentas, listaPedidos) {
    let ingresoConCosto = 0;
    let costoTotal = 0;
    let ingresoSinCosto = 0;

    function procesarItems(items) {
      (items || []).forEach(it => {
        const nombre = it.nombre;
        const cant = Number(it.cantidad) || 0;
        const precio = Number(it.precio) || 0;
        const line = cant * precio;
        const prod = productosMap[nombre];
        const costoU = prod ? Number(prod.costo || prod.costoCompra || 0) : 0;
        if (costoU > 0) {
          ingresoConCosto += line;
          costoTotal += cant * costoU;
        } else {
          ingresoSinCosto += line;
        }
      });
    }

    listaVentas.forEach(v => procesarItems(v.productos));
    listaPedidos.forEach(p => {
      if (p.estado === 'Cancelado') return;
      procesarItems(p.productos);
    });

    return {
      margen: ingresoConCosto - costoTotal,
      ingresoConCosto,
      costoTotal,
      ingresoSinCosto,
      pct: ingresoConCosto > 0 ? ((ingresoConCosto - costoTotal) / ingresoConCosto) * 100 : null
    };
  }

  const margen = calcMargen(ventas, pedidos.filter(p => p.estado !== 'Cancelado' && p.estado !== 'Esperando pago'));

  // Top productos
  const topMap = {};
  function addTop(items) {
    (items || []).forEach(it => {
      const n = it.nombre || 'Sin nombre';
      if (!topMap[n]) topMap[n] = { nombre: n, cant: 0, ingreso: 0, costo: 0 };
      const cant = Number(it.cantidad) || 0;
      const precio = Number(it.precio) || 0;
      topMap[n].cant += cant;
      topMap[n].ingreso += cant * precio;
      const prod = productosMap[n];
      const c = prod ? Number(prod.costo || prod.costoCompra || 0) : 0;
      if (c > 0) topMap[n].costo += cant * c;
    });
  }
  ventas.forEach(v => addTop(v.productos));
  pedidos.filter(p => p.estado !== 'Cancelado').forEach(p => addTop(p.productos));
  const topList = Object.values(topMap).sort((a, b) => b.ingreso - a.ingreso).slice(0, 10);

  // Inventario
  let valVenta = 0, valCosto = 0, conCosto = 0, sinCosto = 0;
  snapProd.forEach(d => {
    const p = d.data();
    const st = Number(p.stock) || 0;
    const pr = Number(p.precio) || 0;
    const co = Number(p.costo || p.costoCompra || 0);
    valVenta += st * pr;
    if (co > 0) { valCosto += st * co; conCosto++; }
    else sinCosto++;
  });

  window._ultimoReporte = {
    desde: desdeStr, hasta: hastaStr,
    totalCaja, totalStripe, totalWA, totalCobrado,
    ventas: ventas.length, ticketProm, margen, topList
  };

  // KPIs
  document.getElementById('rep-stats').innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <p class="text-[10px] uppercase text-slate-400 font-semibold">Cobrado (caja + Stripe)</p>
      <p class="text-2xl font-bold text-green-600">${fmtQ(totalCobrado)}</p>
      <p class="text-xs text-slate-400 mt-1">${ventas.length} tickets POS · Stripe ${fmtQ(totalStripe)}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <p class="text-[10px] uppercase text-slate-400 font-semibold">Caja POS</p>
      <p class="text-2xl font-bold text-slate-800">${fmtQ(totalCaja)}</p>
      <p class="text-xs text-slate-400 mt-1">Ticket prom. ${fmtQ(ticketProm)}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <p class="text-[10px] uppercase text-slate-400 font-semibold">Margen estimado</p>
      <p class="text-2xl font-bold ${margen.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}">${margen.ingresoConCosto ? fmtQ(margen.margen) : '—'}</p>
      <p class="text-xs text-slate-400 mt-1">${margen.pct != null ? margen.pct.toFixed(1) + '% sobre ventas con costo' : 'Completa costos de productos'}</p>
    </div>
    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <p class="text-[10px] uppercase text-slate-400 font-semibold">Pedidos WhatsApp</p>
      <p class="text-2xl font-bold text-amber-600">${fmtQ(totalWA)}</p>
      <p class="text-xs text-slate-400 mt-1">Monto pedido (puede faltar cobro)</p>
    </div>
  `;

  // Comparación periodo anterior
  function deltaHtml(label, actual, anterior) {
    const d = pctChange(actual, anterior);
    const up = d >= 0;
    return `<div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <p class="text-[10px] uppercase text-slate-400 font-semibold">${label}</p>
      <p class="text-lg font-bold text-slate-800">${fmtQ(actual)}</p>
      <p class="text-xs mt-1 ${up ? 'text-green-600' : 'text-red-600'}">
        <i class="fas fa-arrow-${up ? 'up' : 'down'}"></i> ${Math.abs(d).toFixed(0)}% vs periodo anterior (${fmtQ(anterior)})
      </p></div>`;
  }
  document.getElementById('rep-comparacion').innerHTML =
    deltaHtml('Cobrado vs anterior', totalCobrado, totalCobradoAnt) +
    deltaHtml('Caja POS vs anterior', totalCaja, totalCajaAnt) +
    deltaHtml('Stripe vs anterior', totalStripe, totalStripeAnt);

  // Cajeros
  const porCajero = {};
  ventas.forEach(v => {
    const c = v.cajero || 'Sin nombre';
    if (!porCajero[c]) porCajero[c] = { total: 0, n: 0 };
    porCajero[c].total += Number(v.total) || 0;
    porCajero[c].n += 1;
  });
  document.getElementById('rep-cajeros').innerHTML = Object.keys(porCajero).length === 0
    ? '<p class="text-slate-400">Sin ventas POS en el rango</p>'
    : Object.entries(porCajero).sort((a, b) => b[1].total - a[1].total).map(([nombre, d]) =>
      `<div class="flex justify-between border-b border-slate-50 pb-2"><span>${nombre} <span class="text-slate-400">(${d.n})</span></span><b>${fmtQ(d.total)}</b></div>`
    ).join('');

  // Canales
  const canales = [
    { nombre: 'Caja POS', total: totalCaja, color: 'bg-green-500' },
    { nombre: 'Stripe', total: totalStripe, color: 'bg-blue-500' },
    { nombre: 'WhatsApp', total: totalWA, color: 'bg-amber-500' }
  ];
  const max = Math.max(...canales.map(c => c.total), 1);
  document.getElementById('rep-canales').innerHTML = canales.map(c =>
    `<div class="flex justify-between"><span>${c.nombre}</span><b>${fmtQ(c.total)}</b></div>`
  ).join('');
  document.getElementById('rep-barras').innerHTML = canales.map(c => `
    <div>
      <div class="flex justify-between text-xs mb-1"><span>${c.nombre}</span><span>${Math.round(c.total / max * 100)}%</span></div>
      <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${c.color} rounded-full" style="width:${(c.total / max * 100)}%"></div></div>
    </div>`).join('');

  // Top
  document.getElementById('rep-top').innerHTML = topList.length === 0
    ? '<p class="text-slate-400">Sin movimientos</p>'
    : topList.map((t, i) => {
      const m = t.costo > 0 ? t.ingreso - t.costo : null;
      return `<div class="flex justify-between gap-2 border-b border-slate-50 pb-2">
        <div class="min-w-0"><span class="text-slate-400 mr-1">${i + 1}.</span><span class="font-medium">${t.nombre}</span>
        <div class="text-[10px] text-slate-400">${t.cant} uds${m != null ? ' · margen ' + fmtQ(m) : ''}</div></div>
        <b class="shrink-0">${fmtQ(t.ingreso)}</b></div>`;
    }).join('');

  // Inventario
  document.getElementById('rep-inventario').innerHTML = `
    <div class="flex justify-between"><span>Valor a precio de venta</span><b>${fmtQ(valVenta)}</b></div>
    <div class="flex justify-between"><span>Valor a costo</span><b>${valCosto > 0 ? fmtQ(valCosto) : '—'}</b></div>
    <div class="flex justify-between"><span>Margen potencial stock</span><b class="text-emerald-600">${valCosto > 0 ? fmtQ(valVenta - valCosto) : '—'}</b></div>
    <div class="text-xs text-slate-400 pt-2 border-t border-slate-50">
      ${conCosto} productos con costo · ${sinCosto} sin costo cargado
    </div>
    <a href="javascript:navegarAdmin('productos')" class="inline-block mt-2 text-green-700 text-xs font-semibold hover:underline">Completar costos en Productos →</a>
  `;
};

window.exportarReporteCSV = function () {
  const r = window._ultimoReporte;
  if (!r) return;
  let csv = 'Concepto,Valor\n';
  csv += `Desde,${r.desde}\nHasta,${r.hasta}\n`;
  csv += `Caja POS,${r.totalCaja}\nStripe,${r.totalStripe}\nWhatsApp,${r.totalWA}\nCobrado,${r.totalCobrado}\n`;
  csv += `Tickets,${r.ventas}\nTicket promedio,${r.ticketProm}\n`;
  if (r.margen) csv += `Margen estimado,${r.margen.margen}\n`;
  csv += '\nProducto,Cantidad,Ingreso,Costo,Margen\n';
  (r.topList || []).forEach(t => {
    const m = t.costo > 0 ? (t.ingreso - t.costo) : '';
    csv += `"${t.nombre}",${t.cant},${t.ingreso},${t.costo || ''},${m}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agromax-reporte-' + (r.desde || 'periodo') + '.csv';
  a.click();
};

// Mantener exports previos si existen en otras partes
window.exportarVentasCSV = window.exportarVentasCSV || function () { exportarReporteCSV(); };
window.exportarPedidosCSV = window.exportarPedidosCSV || function () { exportarReporteCSV(); };

(function () {
  const original = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'reportes') return mostrarReportes();
    if (seccion === 'clientes' && typeof mostrarClientes === 'function') return mostrarClientes();
    if (typeof original === 'function') return original(seccion);
  };
})();
