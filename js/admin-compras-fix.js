// js/admin-compras-fix.js
// Corrige recibirOrden: en transacciones Firestore todas las lecturas van antes de las escrituras

window.recibirOrden = async function (id) {
  if (!confirm('Confirmar recepcion? Se sumara stock, se actualizara costo y kardex.')) return;

  try {
    var doc = await db.collection('ordenes_compra').doc(id).get();
    if (!doc.exists) return alert('Orden no encontrada');
    var o = doc.data();
    if (o.estado === 'Recibida') return alert('Ya fue recibida');

    var productos = (o.productos || []).filter(function (item) { return item && item.id; });

    await db.runTransaction(async function (tx) {
      // 1) TODAS las lecturas primero
      var lecturas = [];
      for (var i = 0; i < productos.length; i++) {
        var pref = db.collection('productos').doc(productos[i].id);
        var ps = await tx.get(pref);
        lecturas.push({ item: productos[i], ref: pref, snap: ps });
      }

      // 2) TODAS las escrituras despues
      for (var j = 0; j < lecturas.length; j++) {
        var L = lecturas[j];
        if (!L.snap.exists) continue;
        var stock = Number(L.snap.data().stock || 0) + Number(L.item.cantidad || 0);
        var upd = { stock: stock };
        if (L.item.costo != null && !isNaN(Number(L.item.costo))) {
          upd.costo = Number(L.item.costo);
        }
        tx.update(L.ref, upd);
      }

      tx.update(db.collection('ordenes_compra').doc(id), {
        estado: 'Recibida',
        recibidoEn: new Date(),
        recibidoPor: (window.usuarioActual && window.usuarioActual.nombre) ||
          (auth.currentUser && auth.currentUser.email) || ''
      });
    });

    // Kardex fuera de la transaccion
    for (var k = 0; k < productos.length; k++) {
      var it = productos[k];
      await db.collection('kardex').add({
        tipo: 'ENTRADA',
        origen: 'COMPRA',
        ordenId: id,
        folio: o.folio || '',
        productoId: it.id,
        producto: it.nombre,
        cantidad: Number(it.cantidad) || 0,
        costo: Number(it.costo) || 0,
        proveedor: o.proveedor || '',
        fecha: new Date()
      });
    }

    // Asiento contable (opcional)
    try {
      var total = Number(o.total) || 0;
      if (total > 0) {
        var cond = String(o.condicion || '');
        var esCredito = cond.indexOf('Credito') >= 0 || cond.indexOf('Crédito') >= 0;
        await db.collection('asientos_contables').add({
          fecha: new Date(),
          concepto: 'Compra ' + (o.folio || '') + ' · ' + (o.proveedor || ''),
          ref: 'compra:' + id,
          origen: 'Compra',
          periodo: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'),
          lineas: esCredito
            ? [
                { cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 },
                { cuenta: '2101', cuentaNombre: 'Proveedores', debe: 0, haber: total }
              ]
            : [
                { cuenta: '1201', cuentaNombre: 'Inventario', debe: total, haber: 0 },
                { cuenta: '1101', cuentaNombre: 'Caja', debe: 0, haber: total }
              ],
          total: total,
          creado: new Date()
        });
      }
    } catch (e2) {
      console.warn('Asiento compra:', e2);
    }

    if (typeof adminToast === 'function') adminToast('Stock actualizado · OC recibida', 'ok');
    else alert('Stock actualizado');
  } catch (e) {
    console.error(e);
    alert('Error: ' + e.message);
  }
};
