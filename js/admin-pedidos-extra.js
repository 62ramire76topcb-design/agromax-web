// js/admin-pedidos-extra.js
// Notas, impresión y datos de contacto/envío en pedidos

window.guardarNotaPedido = async function (id) {
  const input = document.getElementById('nota-' + id);
  if (!input) return;
  const nota = input.value.trim();
  try {
    await db.collection('pedidos').doc(id).update({ nota: nota, actualizado: new Date() });
    if (typeof toastAdmin === 'function') toastAdmin('Guardado', 'Nota actualizada', 'ok');
  } catch (e) {
    if (typeof toastAdmin === 'function') toastAdmin('Error', e.message, 'error');
    else alert(e.message);
  }
};

(function () {
  const original = window.renderListaPedidos;
  if (typeof original !== 'function') return;

  window.renderListaPedidos = function () {
    original();

    const lista = document.getElementById('lista-pedidos');
    if (!lista || !window.pedidosData) return;

    let filtrados = pedidosData;
    if (typeof filtroPedidos !== 'undefined' && filtroPedidos !== 'todos') {
      filtrados = pedidosData.filter(p => (p.estado || 'Pendiente') === filtroPedidos);
    }

    if (!document.getElementById('pedidos-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'pedidos-toolbar';
      toolbar.className = 'flex flex-wrap gap-2 mb-4';
      toolbar.innerHTML = `
        <button onclick="exportarPedidosCSV()" class="px-3 py-2 border rounded-xl text-sm bg-white hover:bg-gray-50">
          <i class="fas fa-file-csv mr-1"></i> Exportar CSV
        </button>`;
      const parent = lista.parentElement;
      if (parent) parent.insertBefore(toolbar, lista);
    }

    const cards = lista.querySelectorAll(':scope > div');
    cards.forEach((card, idx) => {
      if (card.querySelector('.pedido-extra')) return;
      const p = filtrados[idx];
      if (!p) return;

      const extra = document.createElement('div');
      extra.className = 'pedido-extra mt-3 pt-3 border-t space-y-2 text-sm';

      const contacto = [];
      if (p.telefono) contacto.push(`<p><i class="fas fa-phone text-gray-400 w-5"></i> ${p.telefono}</p>`);
      if (p.nit) contacto.push(`<p><i class="fas fa-id-card text-gray-400 w-5"></i> NIT: ${p.nit}</p>`);
      if (p.email) contacto.push(`<p><i class="fas fa-envelope text-gray-400 w-5"></i> ${p.email}</p>`);
      if (p.direccion) contacto.push(`<p><i class="fas fa-map-marker-alt text-gray-400 w-5"></i> ${p.direccion}</p>`);
      if (p.referencia) contacto.push(`<p><i class="fas fa-info-circle text-gray-400 w-5"></i> ${p.referencia}</p>`);

      extra.innerHTML = `
        ${contacto.length ? `<div class="bg-gray-50 rounded-xl p-3 space-y-1 text-gray-700">${contacto.join('')}</div>` : ''}
        <label class="text-xs text-gray-500">Nota interna</label>
        <div class="flex gap-2">
          <input id="nota-${p.id}" value="${(p.nota || '').replace(/"/g, '"')}" placeholder="Ej: Entregar en la tarde"
                 class="flex-1 p-2 border rounded-xl text-sm">
          <button onclick="guardarNotaPedido('${p.id}')" class="px-3 py-2 bg-gray-100 rounded-xl text-sm">Guardar</button>
          <button onclick="imprimirPedido('${p.id}')" class="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm">
            <i class="fas fa-print"></i>
          </button>
        </div>
      `;
      card.appendChild(extra);
    });
  };
})();
