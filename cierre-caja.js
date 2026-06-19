async function abrirCierreCaja(){

  const hoy = new Date();
  hoy.setHours(0,0,0,0);

  const snap = await db.collection("ventas")
    .where("fecha", ">=", hoy)
    .get();

  let totalGeneral = 0;
  let efectivo = 0;
  let tarjeta = 0;
  let transferencia = 0;

  snap.forEach(doc => {
    const v = doc.data();

    totalGeneral += v.total || 0;

    if(v.metodoPago === "Efectivo"){
      efectivo += v.montoRecibido || 0;
    }

    if(v.metodoPago === "Tarjeta"){
      tarjeta += v.total || 0;
    }

    if(v.metodoPago === "Transferencia"){
      transferencia += v.total || 0;
    }
  });

  const ventana = window.open("", "_blank");

  ventana.document.write(`
    <html>
    <head>
      <title>Cierre de Caja</title>
      <style>
        body { font-family: monospace; padding: 20px; }
        h2 { text-align:center; }
        .line { border-top: 1px dashed #000; margin: 10px 0; }
      </style>
    </head>

    <body>

      <h2>📊 CIERRE DE CAJA</h2>
      <p>Fecha: ${new Date().toLocaleString()}</p>

      <div class="line"></div>

      <p>Total Ventas: Q${totalGeneral.toFixed(2)}</p>

      <p>Efectivo recibido: Q${efectivo.toFixed(2)}</p>
      <p>Tarjeta: Q${tarjeta.toFixed(2)}</p>
      <p>Transferencia: Q${transferencia.toFixed(2)}</p>

      <div class="line"></div>

      <p><b>Diferencia (arqueo):</b></p>

      <p>
        ${efectivo >= totalGeneral
          ? "✔ Caja equilibrada"
          : "⚠ Posible faltante: Q" + (totalGeneral - efectivo).toFixed(2)
        }
      </p>

      <div class="line"></div>

      <p style="text-align:center;">Fin del reporte</p>

      <script>window.print();</script>

    </body>
    </html>
  `);
}
