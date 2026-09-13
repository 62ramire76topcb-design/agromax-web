// js/admin-dashboard.js
// Dashboard profesional AGROMAX

async function mostrarDashboard() {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-900">Dashboard</h1>
        <p class="text-sm text-slate-500">Resumen en vivo de AGROMAXGTM</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" onclick="navegarAdmin('caja')" class="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold"><i class="fas fa-cash-register mr-1"></i> Caja</button>
        <button type="button" onclick="navegarAdmin('pedidos')" class="px-3 py-2 rounded-xl bg-white border text-xs font-semibold text-slate-700">Pedidos</button>
        <button type="button" onclick="navegarAdmin('agregar')" class="px-3 py-2 rounded-xl bg-white border text-xs font-semibold text-slate-700">+ Producto</button>
        <button type="button" onclick="navegarAdmin('ordenes')" class="px-3 py-2 rounded-xl bg-white border text-xs font-semibold text-slate-700">Órdenes</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6" id="stats-cards">
      <div class="col-span-2 lg:col-span-4 bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-100">
        <i class="fas fa-spinner fa-spin mr-2"></i> Cargando métricas...
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-800"><i class="fas fa-chart-bar text-green-600 mr-2"></i>Ventas caja (7 días)</h3>
          <span class="text-xs text-slate-400" id="chart-total">—</span>
        </div>
        <div id="chart-bars" class="flex items-end gap-1.5 h-36"></div>
        <div id="chart-labels" class="flex gap-1.5 mt-1 text-[9px] text-slate-400"></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-bolt text-amber-500 mr-2"></i>Requieren atención</h3>
        <div id="atencion-list" class="space-y-2 text-sm"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-cash-register text-green-600 mr-2"></i>Ventas caja recientes</h3>
        <div id="ventas-recientes" class="space-y-2 max-h-72 overflow-auto text-sm"></div>
      </div>
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 class="font-bold text-slate-800 mb-3"><i class="fas fa-shopping-bag text-blue-600 mr-2"></i>Pedidos web recientes</h3>
        <div id="pedidos-recientes" class="space-y-2 max-h-72 overflow-auto text-sm"></div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 class="font-bold text-slate-800 mb-3 text-orange-700"><i class="fas fa-exclamation-triangle mr-2"></i>Stock bajo</h3>
      <div id="bajo-stock" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2"></div>
    </div>
  `;

  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const hace7 = new Date(inicioHoy); hace7.setDate(hace7.getDate() - 6);

    const [snapProd, snapVentas, snapPedidos] = await Promise.all([
      db.collection('productos').get(),
      db.collection('ventas').orderBy('fecha', 'desc').limit(80).get(),
      db.collection('pedidos').orderBy('fecha', 'desc').limit(50).get()
    ]);

    const productos = [];
    snapProd.forEach(doc => productos.push({ id: doc.id, ...doc.data() }));
    const ventas = [];
    snapVentas.forEach(doc => ventas.push({ id: doc.id, ...doc.data() }));
    const pedidos = [];
    snapPedidos.forEach(doc => pedidos.push({ id: doc.id, ...doc.data() }));

    const totalProductos = productos.length;
    const valorInventario = productos.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0);
    const stockBajo = productos.filter(p => (p.stock || 0) < 10);

    const ventasHoy = ventas.filter(v => {
      const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      return f && f >= inicioHoy;
    });
    const totalCajaHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const ticketProm = ventasHoy.length ? totalCajaHoy / ventasHoy.length : 0;

    const pedidosHoy = pedidos.filter(p => {
      const f = p.fecha && p.fecha.toDate ? p.fecha.toDate() : null;
      return f && f >= inicioHoy;
    });
    const ingresosStripeHoy = pedidosHoy
      .filter(p => p.metodo === 'Stripe' || p.estado === 'Pagado')
      .reduce((s, p) => s + (Number(p.total) || 0), 0);

    const pendientes = pedidos.filter(p => {
      const e = p.estado || 'Pendiente';
      return e === 'Pendiente' || e === 'Pagado' || e === 'Enviado' || e === 'En proceso' || e === 'Preparando';
    });

    // KPIs
    const kpi = typeof kpiCard === 'function' ? kpiCard : function (l, v, s, c) {
      return '<div class="bg-white rounded-2xl border p-4"><p class="text-xs text-slate-400">' + l + '</p><p class="text-2xl font-bold ' + (c || '') + '">' + v + '</p><p class="text-xs text-slate-400">' + (s || '') + '</p></div>';
    };

    document.getElementById('stats-cards').innerHTML =
      kpi('Ventas caja hoy', 'Q' + totalCajaHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 }), ventasHoy.length + ' tickets · prom. Q' + ticketProm.toFixed(0), 'text-green-600') +
      kpi('Stripe / web hoy', 'Q' + ingresosStripeHoy.toLocaleString('es-GT', { minimumFractionDigits: 2 }), pedidosHoy.length + ' pedidos hoy', 'text-blue-600') +
      kpi('Pedidos activos', String(pendientes.length), 'Pendiente / Pagado / Envío', 'text-amber-600') +
      kpi('Inventario', 'Q' + valorInventario.toLocaleString('es-GT', { minimumFractionDigits: 0 }), totalProductos + ' productos · ' + stockBajo.length + ' stock bajo', 'text-purple-600');

    // Chart 7 días
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hace7); d.setDate(hace7.getDate() + i);
      dias.push({ key: d.toDateString(), label: d.toLocaleDateString('es-GT', { weekday: 'short', day: 'numeric' }), total: 0 });
    }
    ventas.forEach(v => {
      const f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (!f || f < hace7) return;
      const k = f.toDateString();
      const slot = dias.find(x => x.key === k);
      if (slot) slot.total += Number(v.total) || 0;
    });
    const maxBar = Math.max.apply(null, dias.map(d => d.total).concat([1]));
    const sum7 = dias.reduce((s, d) => s + d.total, 0);
    document.getElementById('chart-total').textContent = 'Q' + sum7.toFixed(0) + ' total';
    document.getElementById('chart-bars').innerHTML = dias.map(d => {
      const h = Math.max(4, Math.round((d.total / maxBar) * 100));
      return '<div class="flex-1 flex flex-col justify-end items-center h-full">' +
        '<div class="w-full rounded-t-lg bg-green-500/90 hover:bg-green-600 transition" style="height:' + h + '%" title="Q' + d.total.toFixed(2) + '"></div></div>';
    }).join('');
    document.getElementById('chart-labels').innerHTML = dias.map(d =>
      '<div class="flex-1 text-center truncate">' + d.label + '</div>'
    ).join('');

    // Atención
    const atencion = [];
    if (stockBajo.length) atencion.push({ icon: '📦', text: stockBajo.length + ' productos con stock bajo', action: "navegarAdmin('productos')", color: 'border-orange-200 bg-orange-50' });
    if (pendientes.length) atencion.push({ icon: '🧾', text: pendientes.length + ' pedidos por gestionar', action: "navegarAdmin('pedidos')", color: 'border-amber-200 bg-amber-50' });
    const nuevosHoy = pedidosHoy.filter(p => (p.estado || '') === 'Pendiente' || (p.estado || '') === 'Pagado');
    if (nuevosHoy.length) atencion.push({ icon: '🆕', text: nuevosHoy.length + ' pedidos nuevos hoy', action: "navegarAdmin('pedidos')", color: 'border-blue-200 bg-blue-50' });
    if (!atencion.length) {
      document.getElementById('atencion-list').innerHTML = '<p class="text-green-600 text-sm py-4">Todo en orden ✅</p>';
    } else {
      document.getElementById('atencion-list').innerHTML = atencion.map(a =>
        '<button type="button" onclick="' + a.action + '" class="w-full text-left px-3 py-2.5 rounded-xl border ' + a.color + ' hover:shadow-sm transition">' +
        '<span class="mr-2">' + a.icon + '</span>' + a.text + '</button>'
      ).join('');
      // notificaciones
      if (typeof pushAdminNotif === 'function') {
        atencion.slice(0, 2).forEach(a => {
          if (!window._dashNotifSent) pushAdminNotif({ title: 'Atención', body: a.text, type: 'warn' });
        });
        window._dashNotifSent = true;
      }
    }

    // Ventas recientes
    const boxVentas = document.getElementById('ventas-recientes');
    if (!ventas.length) {
      boxVentas.innerHTML = typeof emptyState === 'function'
        ? emptyState('🛒', 'Sin ventas aún', 'Las ventas de caja aparecerán aquí', 'Ir a Caja', "navegarAdmin('caja')")
        : '<p class="text-slate-400 py-6 text-center">Sin ventas</p>';
    } else {
      boxVentas.innerHTML = ventas.slice(0, 10).map(v => {
        const fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString('es-GT') : '';
        return '<div class="flex justify-between items-start gap-2 py-2 border-b border-slate-50">' +
          '<div><p class="font-semibold text-slate-800">Q' + Number(v.total || 0).toFixed(2) +
          ' <span class="text-slate-400 font-normal text-xs">' + (v.metodoPago || '') + '</span></p>' +
          '<p class="text-xs text-slate-500">' + (v.cajero || '') + ' · ' + (v.cliente || 'CF') + '</p></div>' +
          '<p class="text-[10px] text-slate-400 whitespace-nowrap">' + fecha + '</p></div>';
      }).join('');
    }

    // Pedidos
    const boxPedidos = document.getElementById('pedidos-recientes');
    if (!pedidos.length) {
      boxPedidos.innerHTML = '<p class="text-slate-400 py-6 text-center">Sin pedidos web</p>';
    } else {
      boxPedidos.innerHTML = pedidos.slice(0, 10).map(p => {
        const fecha = p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleString('es-GT') : '';
        const est = p.estado || 'Pendiente';
        const pill = typeof estadoPill === 'function' ? estadoPill(est) : est;
        return '<div class="flex justify-between items-start gap-2 py-2 border-b border-slate-50">' +
          '<div><p class="font-semibold text-slate-800">Q' + Number(p.total || 0).toFixed(2) + ' ' + pill + '</p>' +
          '<p class="text-xs text-slate-500">' + (p.cliente || 'Cliente') + ' · ' + (p.metodo || 'Web') + '</p></div>' +
          '<p class="text-[10px] text-slate-400 whitespace-nowrap">' + fecha + '</p></div>';
      }).join('');
    }

    // Stock bajo
    const boxStock = document.getElementById('bajo-stock');
    if (!stockBajo.length) {
      boxStock.innerHTML = '<p class="text-green-600 col-span-full">No hay productos con stock bajo ✅</p>';
    } else {
      boxStock.innerHTML = stockBajo
        .sort((a, b) => (a.stock || 0) - (b.stock || 0))
        .slice(0, 12)
        .map(p => {
          const st = Number(p.stock) || 0;
          const pct = Math.min(100, st * 10);
          return '<div class="p-3 rounded-xl border border-orange-100 bg-orange-50/50">' +
            '<div class="flex justify-between text-sm mb-1"><span class="font-medium truncate">' + (p.nombre || '') + '</span>' +
            '<span class="font-bold text-orange-700">' + st + '</span></div>' +
            '<div class="h-1.5 rounded-full bg-orange-100 overflow-hidden"><div class="h-full bg-orange-500 rounded-full" style="width:' + pct + '%"></div></div></div>';
        }).join('');
    }
  } catch (e) {
    console.error(e);
    document.getElementById('stats-cards').innerHTML =
      '<div class="col-span-full bg-red-50 text-red-700 p-4 rounded-2xl">Error: ' + e.message + '</div>';
  }
}
