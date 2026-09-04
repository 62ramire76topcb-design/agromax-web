// js/admin-pedidos-extra.js
// (3)(10) Notas en pedidos + botón imprimir

window.guardarNotaPedido = async function (id) {
  const input = document.getElementById('nota-' + id);
  if (!input) return;
  const nota = input.value.trim();
  try {
    await db.collection('pedidos').doc(id).update({ nota: nota, actualizado: new Date() });
    toastAdmin('Guardado', 'Nota actualizada', 'ok');
  } catch (e) {
    toastAdmin('Error', e.message, 'error');
  }
};

// Extiende renderListaPedidos para mostrar nota e imprimir
(function () {
  const original = window.renderListaPedidos;
  if (typeof original !== 'function') return;

  window.renderListaPedidos = function () {
    original();
    // Inyectar bloque de nota / imprimir en cada tarjeta si hay lista
    const lista = document.getElementById('lista-pedidos');
    if (!lista || !window.pedidosData) return;

    // Re-render enriquecido
    let filtrados = pedidosData;
    if (typeof filtroPedidos !== 'undefined' && filtroPedidos !== 'todos') {
      filtrados = pedidosData.filter(p => (p.estado || 'Pendiente') === filtroPedidos);
    }
    if (!filtrados.length) return;

    // Añadir botones de nota al final de cada tarjeta buscando por estructura es complejo;
    // en su lugar, agregamos barra de herramientas arriba
    if (!document.getElementById('pedidos-toolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'pedidos-toolbar';
      toolbar.className = 'flex flex-wrap gap-2 mb-4';
      toolbar.innerHTML = `
        <button onclick="exportarPedidosCSV()" class="px-3 py-2 border rounded-xl text-sm bg-white hover:bg-gray-50">
          <i class="fas fa-file-csv mr-1"></i> Exportar CSV
        </button>
      `;
      const parent = lista.parentElement;
      if (parent) parent.insertBefore(toolbar, lista);
    }

    // Agregar nota + imprimir a cada card existente
    const cards = lista.querySelectorAll(':scope > div');
    cards.forEach((card, idx) => {
      if (card.querySelector('.pedido-extra')) return;
      const p = filtrados[idx];
      if (!p) return;
      const extra = document.createElement('div');
      extra.className = 'pedido-extra mt-3 pt-3 border-t space-y-2';
      extra.innerHTML = `
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
