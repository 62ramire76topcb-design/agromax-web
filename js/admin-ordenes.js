// js/admin-ordenes.js
// Órdenes de trabajo + seguimiento sincronizado con el cliente

window.mostrarOrdenesTrabajo = function () {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div class="mb-6">
      <h1 class="text-2xl md:text-3xl font-bold mb-1">📋 Órdenes de trabajo</h1>
      <p class="text-sm text-gray-500">Pedidos web con datos de contacto, envío y seguimiento</p>
    </div>
    <div class="flex flex-wrap gap-2 mb-4" id="filtros-ot">
      <button onclick="filtrarOT('todos')" class="ot-filtro px-3 py-1.5 rounded-xl text-sm bg-green-600 text-white" data-f="todos">Todos</button>
      <button onclick="filtrarOT('Pagado')" class="ot-filtro px-3 py-1.5 rounded-xl text-sm bg-white border" data-f="Pagado">Pagado</button>
      <button onclick="filtrarOT('En proceso')" class="ot-filtro px-3 py-1.5 rounded-xl text-sm bg-white border" data-f="En proceso">En proceso</button>
      <button onclick="filtrarOT('En camino')" class="ot-filtro px-3 py-1.5 rounded-xl text-sm bg-white border" data-f="En camino">En camino</button>
      <button onclick="filtrarOT('Entregado')" class="ot-filtro px-3 py-1.5 rounded-xl text-sm bg-white border" data-f="Entregado">Entregado</button>
    </div>
    <div id="lista-ot" class="space-y-4">
      <p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>
    </div>
  `;

  window._otFiltro = 'todos';

  if (window._unsubOT) window._unsubOT();
  window._unsubOT = db.collection('pedidos').orderBy('fecha', 'desc').limit(80).onSnapshot(snap => {
    window._otData = [];
    snap.forEach(doc => {
      const p = doc.data();
      // Solo pedidos con tracking o del catálogo web
      if (p.trackingCode || p.metodo === 'Stripe' || p.metodo === 'WhatsApp') {
        window._otData.push({
          id: doc.id,
          ...p,
          fechaTexto: p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleString('es-GT') : ''
        });
      }
    });
    renderOrdenesTrabajo();
  }, err => {
    document.getElementById('lista-ot').innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
  });
};

window.filtrarOT = function (f) {
  window._otFiltro = f;
  document.querySelectorAll('.ot-filtro').forEach(b => {
    const active = b.getAttribute('data-f') === f;
    b.className = 'ot-filtro px-3 py-1.5 rounded-xl text-sm ' + (active ? 'bg-green-600 text-white' : 'bg-white border');
  });
  renderOrdenesTrabajo();
};

function renderOrdenesTrabajo() {
  const lista = document.getElementById('lista-ot');
  if (!lista) return;

  let data = window._otData || [];
  if (window._otFiltro && window._otFiltro !== 'todos') {
    data = data.filter(p => (p.estado || 'Pendiente') === window._otFiltro);
  }

  if (!data.length) {
    lista.innerHTML = '<p class="text-center text-gray-400 py-12">No hay órdenes con este filtro</p>';
    return;
  }

  lista.innerHTML = data.map(p => {
    const fechaEst = p.fechaEstimada && p.fechaEstimada.toDate
      ? p.fechaEstimada.toDate().toISOString().slice(0, 10)
      : '';
    const fechaEstTexto = p.fechaEstimada && p.fechaEstimada.toDate
      ? p.fechaEstimada.toDate().toLocaleDateString('es-GT')
      : 'Sin definir';

    const productos = (p.productos || []).map(i =>
      `<div class="flex justify-between text-sm"><span>${i.nombre} × ${i.cantidad}</span><span>Q${(i.precio * i.cantidad).toFixed(2)}</span></div>`
    ).join('');

    return `
      <div class="bg-white rounded-3xl shadow p-5 border-l-4 ${p.metodo === 'Stripe' ? 'border-green-500' : 'border-yellow-400'}">
        <div class="flex flex-wrap justify-between gap-3 mb-3">
          <div>
            <p class="text-xs text-gray-400">${p.fechaTexto || ''}</p>
            <p class="font-bold text-lg">${p.cliente || 'Cliente'}</p>
            <p class="text-sm text-green-700 font-mono font-semibold">${p.trackingCode || 'Sin código'}</p>
          </div>
          <div class="text-right">
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100">${p.estado || 'Pendiente'}</span>
            <p class="text-xs text-gray-500 mt-1">${p.metodo || ''}</p>
          </div>
        </div>

        <div class="bg-gray-50 rounded-2xl p-3 text-sm space-y-1 mb-3">
          ${p.telefono ? `<p><i class="fas fa-phone text-gray-400 w-5"></i> ${p.telefono}</p>` : ''}
          ${p.nit ? `<p><i class="fas fa-id-card text-gray-400 w-5"></i> NIT: ${p.nit}</p>` : ''}
          ${p.email ? `<p><i class="fas fa-envelope text-gray-400 w-5"></i> ${p.email}</p>` : ''}
          ${p.direccion ? `<p><i class="fas fa-map-marker-alt text-gray-400 w-5"></i> ${p.direccion}</p>` : ''}
          ${p.referencia ? `<p><i class="fas fa-info-circle text-gray-400 w-5"></i> ${p.referencia}</p>` : ''}
        </div>

        <div class="space-y-1 mb-3">${productos}</div>
        <p class="font-bold text-green-700 mb-4">Total: Q${Number(p.total || 0).toFixed(2)}</p>

        <div class="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-gray-500">Estado (se sincroniza con el cliente)</label>
            <select id="ot-estado-${p.id}" class="w-full p-2 border rounded-xl text-sm">
              ${['Pendiente','Pagado','En proceso','En camino','Entregado','Cancelado'].map(e =>
                `<option value="${e}" ${(p.estado || '') === e ? 'selected' : ''}>${e}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="text-xs text-gray-500">Fecha estimada de llegada</label>
            <input type="date" id="ot-fecha-${p.id}" value="${fechaEst}" class="w-full p-2 border rounded-xl text-sm">
            <p class="text-xs text-gray-400 mt-1">Actual: ${fechaEstTexto}</p>
          </div>
        </div>

        <div class="mb-3">
          <label class="text-xs text-gray-500">Nota / actualización para historial</label>
          <input id="ot-nota-${p.id}" type="text" placeholder="Ej. Salió de bodega" class="w-full p-2 border rounded-xl text-sm">
        </div>

        <div class="flex flex-wrap gap-2">
          <button onclick="guardarOrdenTrabajo('${p.id}')" class="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium">
            <i class="fas fa-sync mr-1"></i> Actualizar y sincronizar
          </button>
          ${p.trackingCode ? `<a href="/seguimiento.html?codigo=${encodeURIComponent(p.trackingCode)}" target="_blank" class="px-4 py-2 border rounded-xl text-sm">Ver como cliente</a>` : ''}
          ${p.telefono ? `<a href="https://wa.me/502${String(p.telefono).replace(/\D/g,'').slice(-8)}?text=${encodeURIComponent('Hola ' + (p.cliente||'') + ', tu pedido ' + (p.trackingCode||'') + ' está en estado: ' + (p.estado||''))}" target="_blank" class="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm"><i class="fab fa-whatsapp"></i> Avisar cliente</a>` : ''}
        </div>
      </div>`;
  }).join('');
}

window.guardarOrdenTrabajo = async function (id) {
  const estado = document.getElementById('ot-estado-' + id).value;
  const fechaStr = document.getElementById('ot-fecha-' + id).value;
  const nota = (document.getElementById('ot-nota-' + id).value || '').trim();

  const update = {
    estado: estado,
    actualizado: new Date()
  };

  if (fechaStr) {
    update.fechaEstimada = new Date(fechaStr + 'T12:00:00');
  }

  // Historial
  const entry = { estado: estado, fecha: new Date(), nota: nota || 'Actualización desde Admin' };

  try {
    const ref = db.collection('pedidos').doc(id);
    const doc = await ref.get();
    const historial = (doc.data().historial || []).concat([entry]);
    update.historial = historial;

    await ref.update(update);

    // Sincronizar colección ordenes_trabajo si existe
    const otSnap = await db.collection('ordenes_trabajo').where('pedidoId', '==', id).limit(1).get();
    if (!otSnap.empty) {
      await otSnap.docs[0].ref.update({
        estado: estado,
        fechaEstimada: update.fechaEstimada || null,
        actualizado: new Date()
      });
    }

    if (typeof toastAdmin === 'function') {
      toastAdmin('Sincronizado', 'El cliente verá el nuevo estado en su seguimiento', 'ok');
    } else {
      alert('✅ Actualizado y sincronizado con el cliente');
    }
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

// Integrar en navegación
(function () {
  const original = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'ordenes') return mostrarOrdenesTrabajo();
    if (typeof original === 'function') return original(seccion);
  };
})();
