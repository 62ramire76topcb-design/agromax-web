// js/admin-utils.js
// (4)(5) Utilidades: toast, export CSV, impresión

window.descargarCSV = function (filename, csvContent) {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

window.toastAdmin = function (titulo, mensaje, tipo) {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'fixed top-4 right-4 z-[200] space-y-3 max-w-sm w-full pointer-events-none';
    document.body.appendChild(c);
  }
  const border = tipo === 'error' ? 'border-red-500' : tipo === 'ok' ? 'border-green-500' : 'border-blue-500';
  const t = document.createElement('div');
  t.className = 'pointer-events-auto bg-white border-l-4 ' + border + ' shadow-xl rounded-2xl p-4';
  t.innerHTML = '<p class="font-bold text-sm">' + titulo + '</p><p class="text-sm text-gray-600">' + (mensaje || '') + '</p>';
  c.appendChild(t);
  setTimeout(function () { t.remove(); }, 4000);
};

window.exportarPedidosCSV = async function () {
  try {
    const snap = await db.collection('pedidos').orderBy('fecha', 'desc').limit(200).get();
    let csv = 'Fecha,Cliente,Metodo,Estado,Total,SessionId\n';
    snap.forEach(doc => {
      const p = doc.data();
      const fecha = p.fecha && p.fecha.toDate ? p.fecha.toDate().toLocaleString('es-GT') : '';
      csv += `"${fecha}","${(p.cliente || '').replace(/"/g, '""')}","${p.metodo || ''}","${p.estado || ''}",${Number(p.total || 0)},"${p.sessionId || ''}"\n`;
    });
    descargarCSV('pedidos-agromax.csv', csv);
    toastAdmin('Exportado', 'Pedidos descargados en CSV', 'ok');
  } catch (e) {
    toastAdmin('Error', e.message, 'error');
  }
};

window.exportarVentasCSV = async function () {
  try {
    const snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(200).get();
    let csv = 'Fecha,Cajero,Cliente,NIT,Metodo,Total\n';
    snap.forEach(doc => {
      const v = doc.data();
      const fecha = v.fecha && v.fecha.toDate ? v.fecha.toDate().toLocaleString('es-GT') : '';
      csv += `"${fecha}","${(v.cajero || '').replace(/"/g, '""')}","${(v.cliente || '').replace(/"/g, '""')}","${v.nit || ''}","${v.metodoPago || ''}",${Number(v.total || 0)}\n`;
    });
    descargarCSV('ventas-caja-agromax.csv', csv);
    toastAdmin('Exportado', 'Ventas de caja descargadas', 'ok');
  } catch (e) {
    toastAdmin('Error', e.message, 'error');
  }
};

window.imprimirPedido = function (id) {
  const p = (window.pedidosData || []).find(x => x.id === id);
  if (!p) return toastAdmin('Error', 'Pedido no encontrado', 'error');

  const win = window.open('', 'Pedido', 'width=420,height=640');
  const items = (p.productos || []).map(i =>
    `<div style="display:flex;justify-content:space-between;margin:4px 0"><span>${i.nombre} x${i.cantidad}</span><b>Q${(i.precio * i.cantidad).toFixed(2)}</b></div>`
  ).join('');

  win.document.write(`<!DOCTYPE html><html><head><title>Pedido</title>
    <style>body{font-family:Arial;padding:20px;max-width:360px;margin:auto}h2{text-align:center}hr{border:1px dashed #999}</style>
    </head><body>
    <h2>AGROMAXGTM</h2>
    <p style="text-align:center;font-size:13px">${p.fechaTexto || ''}</p>
    <hr>
    <p><b>Cliente:</b> ${p.cliente || ''}</p>
    <p><b>Método:</b> ${p.metodo || ''}</p>
    <p><b>Estado:</b> ${p.estado || 'Pendiente'}</p>
    <hr>${items}<hr>
    <p style="font-size:18px"><b>Total: Q${Number(p.total || 0).toFixed(2)}</b></p>
    ${p.nota ? '<p><b>Nota:</b> ' + p.nota + '</p>' : ''}
    <script>window.print()<\/script>
    </body></html>`);
  win.document.close();
};
