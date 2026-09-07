// ticket.js
function abrirTicket(carrito, total, metodoPago, montoRecibido = 0, cambio = 0, cliente = "Consumidor Final", nit = "", extras = {}) {
  const webUrl = "https://agromax-web.vercel.app";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(webUrl)}`;

  const folio = extras.folio || ("T-" + Date.now().toString().slice(-8));
  const cajero = extras.cajero || "";
  const nota = extras.nota || "";
  const descuento = Number(extras.descuento || 0);
  const subtotal = Number(extras.subtotal != null ? extras.subtotal : (Number(total) + descuento));
  const promoNombre = extras.promoNombre || "";

  // Guardar para WhatsApp desde POS
  window._ultimaVentaTicket = {
    productos: carrito,
    total: total,
    metodoPago: metodoPago,
    cliente: cliente,
    nit: nit,
    folio: folio,
    cajero: cajero,
    descuento: descuento,
    subtotal: subtotal
  };

  let productosTxt = "";
  let productosHTML = "";
  carrito.forEach(p => {
    const line = (p.precio * p.cantidad).toFixed(2);
    productosTxt += `- ${p.nombre} x${p.cantidad} Q${line}\n`;
    productosHTML += `
      <div style="display:flex;justify-content:space-between;margin:8px 0;">
        <div style="flex:1;">
          <strong>${p.nombre}</strong><br>
          <small>${p.cantidad} × Q${Number(p.precio).toFixed(2)}</small>
        </div>
        <div style="text-align:right;font-weight:bold;">Q${line}</div>
      </div>`;
  });

  const fecha = new Date().toLocaleString('es-GT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  const waMsg = encodeURIComponent(
    'AGROMAXGTM - Ticket\n' +
    'Folio: ' + folio + '\n' +
    'Fecha: ' + fecha + '\n' +
    'Cliente: ' + cliente + (nit ? ' NIT ' + nit : '') + '\n' +
    productosTxt +
    (descuento > 0 ? 'Descuento: -Q' + descuento.toFixed(2) + '\n' : '') +
    'TOTAL: Q' + Number(total).toFixed(2) + '\n' +
    'Método: ' + metodoPago + '\n' +
    '¡Gracias por su compra!\n' + webUrl
  );

  const win = window.open("", "Ticket AGROMAXGTM", "width=380,height=820,scrollbars=yes");

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ticket ${folio}</title>
      <style>
        body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 20px 15px; font-size: 14px; line-height: 1.4; }
        h1 { text-align:center; margin:10px 0 5px; font-size:20px; }
        .center { text-align:center; }
        hr { border:1px dashed #333; margin:12px 0; }
        .total { font-size:18px; font-weight:bold; margin:15px 0; }
        .footer { margin-top:20px; font-size:13px; }
        img.qr { display:block; margin:15px auto; border:1px solid #ddd; }
        .muted { color:#555; font-size:12px; }
        .wa { display:block; text-align:center; margin:12px 0; padding:10px; background:#25D366; color:#fff; text-decoration:none; border-radius:8px; font-family:Arial; font-weight:bold; }
        @media print { .wa, .noprint { display:none !important; } }
      </style>
    </head>
    <body>
      <h1>🌱 AGROMAXGTM</h1>
      <p class="center">Caja Mostrador</p>
      <p class="center muted">Guatemala</p>
      <p class="center">${fecha}</p>
      <p class="center muted">Folio: <strong>${folio}</strong></p>
      ${cajero ? `<p class="center muted">Cajero: ${cajero}</p>` : ''}
      <hr>
      <p><strong>Nombre:</strong> ${cliente}</p>
      ${nit ? `<p><strong>NIT:</strong> ${nit}</p>` : ''}
      <hr>
      ${productosHTML}
      <hr>
      <p>Subtotal: Q${Number(subtotal).toFixed(2)}</p>
      ${descuento > 0 ? `<p>Descuento${promoNombre ? ' (' + promoNombre + ')' : ''}: -Q${descuento.toFixed(2)}</p>` : ''}
      <div class="total">TOTAL: Q${Number(total).toFixed(2)}</div>
      <p><strong>Método:</strong> ${metodoPago}</p>
      ${metodoPago === "Efectivo" ? `
        <p>Recibido: Q${Number(montoRecibido).toFixed(2)}</p>
        <p><strong>Cambio: Q${Number(cambio).toFixed(2)}</strong></p>
      ` : ''}
      ${nota ? `<hr><p class="muted"><strong>Nota:</strong> ${nota}</p>` : ''}
      <div class="center">
        <img src="${qrUrl}" class="qr" width="160" alt="QR">
        <p style="font-size:12px;margin-top:5px;">Escanea para ver nuestro catálogo</p>
      </div>
      <a class="wa noprint" href="https://wa.me/?text=${waMsg}" target="_blank">Enviar por WhatsApp</a>
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

function reimprimirTicketVenta(v) {
  const carrito = (v.productos || []).map(p => ({
    nombre: p.nombre,
    precio: p.precio,
    cantidad: p.cantidad
  }));
  const descuento = Number(v.descuento || 0);
  const total = Number(v.total) || 0;
  abrirTicket(
    carrito,
    total,
    v.metodoPago || '',
    Number(v.montoRecibido) || 0,
    Number(v.cambio) || 0,
    v.cliente || 'Consumidor Final',
    v.nit || '',
    {
      folio: v.folio || '',
      cajero: v.cajero || '',
      nota: v.nota || '',
      descuento: descuento,
      subtotal: Number(v.subtotal != null ? v.subtotal : total + descuento),
      promoNombre: v.promoNombre || v.codigoPromo || ''
    }
  );
}
