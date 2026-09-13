// ticket.js — usa config/empresa cuando está disponible
function abrirTicket(carrito, total, metodoPago, montoRecibido = 0, cambio = 0, cliente = "Consumidor Final", nit = "", extras = {}) {
  var cfg = (typeof getAgroConfig === 'function') ? getAgroConfig() : {
    nombreComercial: 'AGROMAXGTM',
    pieTicket: 'Caja Mostrador',
    mensajeTicket: '¡Gracias por su compra!',
    moneda: 'Q',
    webUrl: 'https://agromax-web.vercel.app',
    direccion: '',
    telefono: '',
    nit: ''
  };

  // Refrescar config en background para la próxima impresión
  if (typeof cargarConfigPublica === 'function') cargarConfigPublica().catch(function () {});

  var webUrl = cfg.webUrl || 'https://agromax-web.vercel.app';
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(webUrl);
  var brand = cfg.nombreComercial || 'AGROMAXGTM';
  var pie = cfg.pieTicket || 'Caja Mostrador';
  var gracias = cfg.mensajeTicket || '¡Gracias por su compra!';
  var mon = cfg.moneda || 'Q';

  var folio = extras.folio || ('T-' + Date.now().toString().slice(-8));
  var cajero = extras.cajero || '';
  var nota = extras.nota || '';
  var descuento = Number(extras.descuento || 0);
  var subtotal = Number(extras.subtotal != null ? extras.subtotal : (Number(total) + descuento));
  var promoNombre = extras.promoNombre || '';

  window._ultimaVentaTicket = {
    productos: carrito,
    total: total,
    metodoPago: metodoPago,
    cliente: cliente,
    nit: nit,
    folio: folio,
    cajero: cajero,
    descuento: descuento,
    subtotal: subtotal,
    montoRecibido: montoRecibido,
    cambio: cambio
  };

  var productosTxt = '';
  var productosHTML = '';
  carrito.forEach(function (p) {
    var line = (p.precio * p.cantidad).toFixed(2);
    productosTxt += '- ' + p.nombre + ' x' + p.cantidad + ' ' + mon + line + '\n';
    productosHTML +=
      '<div class="row">' +
      '<div class="left"><div class="name">' + p.nombre + '</div>' +
      '<div class="muted">' + p.cantidad + ' × ' + mon + Number(p.precio).toFixed(2) + '</div></div>' +
      '<div class="right">' + mon + line + '</div></div>';
  });

  var fecha = new Date().toLocaleString('es-GT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

  var dirLine = cfg.direccion ? '<div class="sub">' + cfg.direccion + '</div>' : '';
  var telLine = cfg.telefono ? '<div class="sub">Tel. ' + cfg.telefono + '</div>' : '';
  var nitEmp = cfg.nit ? '<div class="sub">NIT ' + cfg.nit + '</div>' : '';

  var waMsg = encodeURIComponent(
    brand + ' - Ticket\n' +
    'Folio: ' + folio + '\n' +
    'Fecha: ' + fecha + '\n' +
    'Cliente: ' + cliente + (nit ? ' NIT ' + nit : '') + '\n' +
    productosTxt +
    (descuento > 0 ? 'Descuento: -' + mon + descuento.toFixed(2) + '\n' : '') +
    'TOTAL: ' + mon + Number(total).toFixed(2) + '\n' +
    'Método: ' + metodoPago + '\n' +
    gracias + '\n' + webUrl
  );

  var win = window.open('', 'Ticket ' + brand, 'width=380,height=820,scrollbars=yes');

  win.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ticket ' + folio + '</title>' +
    '<style>' +
    '*{box-sizing:border-box}body{font-family:\'Courier New\',Courier,monospace;width:300px;margin:0 auto;padding:18px 14px;font-size:13px;color:#111}' +
    '.brand{text-align:center;border-bottom:2px solid #166534;padding-bottom:10px;margin-bottom:10px}' +
    '.brand h1{margin:0;font-size:20px;letter-spacing:1px;color:#166534}.brand .sub{font-size:11px;color:#555;margin-top:2px}' +
    '.center{text-align:center}.muted{color:#555;font-size:11px}.meta{margin:8px 0;font-size:12px}' +
    'hr{border:none;border-top:1px dashed #999;margin:10px 0}' +
    '.row{display:flex;justify-content:space-between;gap:8px;margin:6px 0}' +
    '.left{flex:1}.name{font-weight:bold}.right{font-weight:bold;white-space:nowrap}' +
    '.totals{margin-top:8px}.grand{font-size:17px;font-weight:bold;border-top:2px solid #111;padding-top:8px;margin-top:8px}' +
    'img.qr{display:block;margin:12px auto 4px}' +
    '.wa{display:block;text-align:center;margin:12px 0;padding:10px;background:#25D366;color:#fff;text-decoration:none;border-radius:8px;font-family:Arial,sans-serif;font-weight:bold;font-size:13px}' +
    '.footer{text-align:center;margin-top:14px;font-size:12px}' +
    '@media print{.wa,.noprint{display:none!important}body{padding:0}}' +
    '</style></head><body>' +
    '<div class="brand">' +
    '<h1>🌱 ' + brand + '</h1>' +
    '<div class="sub">Insumos agrícolas · Guatemala</div>' +
    '<div class="sub">' + pie + '</div>' +
    dirLine + telLine + nitEmp +
    '</div>' +
    '<div class="center muted">' + fecha + '</div>' +
    '<div class="center meta"><strong>Folio ' + folio + '</strong></div>' +
    (cajero ? '<div class="center muted">Atendió: ' + cajero + '</div>' : '') +
    '<hr>' +
    '<div class="meta"><strong>Cliente:</strong> ' + cliente + '</div>' +
    (nit ? '<div class="meta"><strong>NIT:</strong> ' + nit + '</div>' : '') +
    '<hr>' + productosHTML + '<hr>' +
    '<div class="totals">' +
    '<div class="row"><span>Subtotal</span><span>' + mon + Number(subtotal).toFixed(2) + '</span></div>' +
    (descuento > 0 ? '<div class="row"><span>Descuento' + (promoNombre ? ' (' + promoNombre + ')' : '') + '</span><span>-' + mon + descuento.toFixed(2) + '</span></div>' : '') +
    '<div class="row grand"><span>TOTAL</span><span>' + mon + Number(total).toFixed(2) + '</span></div></div>' +
    '<div class="meta" style="margin-top:10px"><strong>Pago:</strong> ' + metodoPago + '</div>' +
    (metodoPago === 'Efectivo'
      ? '<div class="meta">Recibido: ' + mon + Number(montoRecibido).toFixed(2) + '</div>' +
        '<div class="meta"><strong>Cambio: ' + mon + Number(cambio).toFixed(2) + '</strong></div>'
      : '') +
    (nota ? '<hr><div class="muted"><strong>Nota:</strong> ' + nota + '</div>' : '') +
    '<div class="center"><img src="' + qrUrl + '" class="qr" width="140" height="140" alt="QR">' +
    '<div class="muted">Catálogo en línea</div></div>' +
    '<a class="wa noprint" href="https://wa.me/?text=' + waMsg + '" target="_blank">Enviar por WhatsApp</a>' +
    '<div class="footer"><div>' + gracias + '</div>' +
    '<div class="muted">' + brand + ' · Guatemala</div></div>' +
    '<script>window.print();</script></body></html>');

  win.document.close();
  win.focus();
}

function reimprimirTicketVenta(v) {
  var carrito = (v.productos || []).map(function (p) {
    return { nombre: p.nombre, precio: p.precio, cantidad: p.cantidad };
  });
  var descuento = Number(v.descuento || 0);
  var total = Number(v.total) || 0;
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
