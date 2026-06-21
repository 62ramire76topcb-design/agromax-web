// ticket.js
function abrirTicket(carrito, total, metodoPago, montoRecibido = 0, cambio = 0) {
  const win = window.open("", "Ticket AGROMAXGTM", "width=380,height=650,scrollbars=yes");

  let productosHTML = "";
  carrito.forEach(p => {
    const subtotal = (p.precio * p.cantidad).toFixed(2);
    productosHTML += `
      <div style="display:flex;justify-content:space-between;margin:6px 0;padding:4px 0;border-bottom:1px dotted #ccc;">
        <div>
          <strong>${p.nombre}</strong><br>
          <small>${p.cantidad} × Q${p.precio}</small>
        </div>
        <div style="text-align:right;font-weight:bold;">Q${subtotal}</div>
      </div>
    `;
  });

  const fecha = new Date().toLocaleString('es-GT');

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ticket AGROMAXGTM</title>
      <style>
        body { 
          font-family: 'Courier New', monospace; 
          width: 300px; 
          margin: 0 auto; 
          padding: 15px; 
          font-size: 14px;
        }
        h1 { text-align:center; margin:8px 0; }
        .center { text-align:center; }
        hr { border:1px dashed #000; margin:10px 0; }
        .total { font-size:16px; font-weight:bold; margin:12px 0; }
        button { display:none; }
        @media print { button { display:none; } }
      </style>
    </head>
    <body>
      <h1>🌱 AGROMAXGTM</h1>
      <p class="center">Caja Mostrador</p>
      <p class="center">${fecha}</p>
      <hr>
      ${productosHTML}
      <hr>
      <div class="total">TOTAL: Q${total.toFixed(2)}</div>
      <p><strong>Método:</strong> ${metodoPago}</p>
      ${metodoPago === "Efectivo" ? `
        <p>Recibido: Q${montoRecibido.toFixed(2)}</p>
        <p><strong>Cambio: Q${cambio.toFixed(2)}</strong></p>
      ` : ''}
      <br>
      <p class="center">¡Gracias por su compra!</p>
      <script>window.print();</script>
    </body>
    </html>
  `);

  win.document.close();
  win.focus();
}
