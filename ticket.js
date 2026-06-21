// ticket.js - Versión Final Recomendada
function abrirTicket(carrito, total, metodoPago, montoRecibido = 0, cambio = 0) {
  const win = window.open("", "Ticket AGROMAXGTM", "width=380,height=650,scrollbars=yes");

  let productosHTML = "";
  carrito.forEach(p => {
    const subtotal = (p.precio * p.cantidad).toFixed(2);
    productosHTML += `
      <div style="display:flex;justify-content:space-between;margin:8px 0;">
        <div style="flex:1;">
          <strong>${p.nombre}</strong><br>
          <small>${p.cantidad} × Q${Number(p.precio).toFixed(2)}</small>
        </div>
        <div style="text-align:right;font-weight:bold;">Q${subtotal}</div>
      </div>
    `;
  });

  const fecha = new Date().toLocaleString('es-GT', { 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit' 
  });

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
          padding: 20px 15px; 
          font-size: 15px;
          line-height: 1.4;
        }
        h1 { 
          text-align:center; 
          margin:10px 0 5px; 
          font-size:20px; 
        }
        .center { text-align:center; }
        hr { border:1px dashed #333; margin:12px 0; }
        .total { 
          font-size:18px; 
          font-weight:bold; 
          margin:15px 0; 
        }
        .footer { margin-top:25px; font-size:13px; }
      </style>
    </head>
    <body>
      <h1>🌱 AGROMAXGTM</h1>
      <p class="center">Caja Mostrador</p>
      <p class="center">${fecha}</p>
      
      <hr>
      ${productosHTML}
      <hr>
      
      <div class="total">
        TOTAL: Q${total.toFixed(2)}
      </div>
      
      <p><strong>Método:</strong> ${metodoPago}</p>
      ${metodoPago === "Efectivo" ? `
        <p>Recibido: Q${montoRecibido.toFixed(2)}</p>
        <p><strong>Cambio: Q${cambio.toFixed(2)}</strong></p>
      ` : ''}
      
      <div class="footer center">
        <p>¡Gracias por su compra!</p>
        <p>AGROMAXGTM • Guatemala</p>
      </div>

      <script>window.print();</script>
    </body>
    </html>
  `);

  win.document.close();
  win.focus();
}
