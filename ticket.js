// ticket.js

function abrirTicket(carrito, total, metodoPago, montoRecibido = 0, cambio = 0){

  const win = window.open("", "TICKET", "width=400,height=600");

  let productosHTML = "";

  carrito.forEach(p => {
    productosHTML += `
      <div style="display:flex;justify-content:space-between;margin:5px 0;">
        <span>${p.nombre} x${p.cantidad}</span>
        <b>Q${(p.precio * p.cantidad).toFixed(2)}</b>
      </div>
    `;
  });

  win.document.write(`
    <html>
    <head>
      <title>Ticket de Venta</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h2 { text-align:center; }
        .total { font-size:18px; font-weight:bold; margin-top:10px; }
      </style>
    </head>
    <body>

      <h2>🧾 AGROMAXGTM</h2>
      <hr>

      ${productosHTML}

      <hr>

      <p class="total">Total: Q${total.toFixed(2)}</p>

      <p>Método: ${metodoPago}</p>

      ${metodoPago === "Efectivo" ? `
        <p>Recibido: Q${montoRecibido}</p>
        <p>Cambio: Q${cambio.toFixed(2)}</p>
      ` : ""}

      <br>
      <button onclick="window.print()">Imprimir</button>

    </body>
    </html>
  `);

  win.document.close();
}
