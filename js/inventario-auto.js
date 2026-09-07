// js/inventario-auto.js
// Gestión automática de inventario + kardex

/**
 * Descuenta stock de una lista de productos.
 * items: [{ id?, nombre, cantidad }]
 * origen: 'POS' | 'Stripe' | 'WhatsApp' | 'Admin'
 * refId: id del pedido/venta
 */
window.descontarInventario = async function (items, origen, refId) {
  if (!items || !items.length) return { ok: true, movimientos: [] };

  const movimientos = [];

  await db.runTransaction(async (tx) => {
    for (const item of items) {
      let prodRef = null;
      let snap = null;

      if (item.id) {
        prodRef = db.collection('productos').doc(item.id);
        snap = await tx.get(prodRef);
      }

      // Buscar por nombre si no hay id o no existe
      if (!snap || !snap.exists) {
        // Las queries no se pueden hacer dentro de transaction de forma flexible;
        // resolvemos fuera y actualizamos por id
        throw { needLookup: true, item: item };
      }

      const data = snap.data();
      const stockActual = Number(data.stock) || 0;
      const cant = Number(item.cantidad) || 0;
      const nuevo = Math.max(0, stockActual - cant);

      tx.update(prodRef, { stock: nuevo });
      movimientos.push({
        productoId: prodRef.id,
        nombre: data.nombre || item.nombre,
        cantidad: cant,
        stockAntes: stockActual,
        stockDespues: nuevo
      });
    }
  }).catch(async (err) => {
    // Fallback: descuento secuencial con búsqueda por nombre
    if (err && err.needLookup) {
      return descontarInventarioSecuencial(items, origen, refId);
    }
    // Si la transacción falló por otro motivo, intentar secuencial igual
    return descontarInventarioSecuencial(items, origen, refId);
  });

  // Si la transacción terminó bien, registrar kardex
  if (movimientos.length) {
    await registrarKardex(movimientos, origen, refId, 'salida');
  }

  return { ok: true, movimientos: movimientos };
};

async function descontarInventarioSecuencial(items, origen, refId) {
  const movimientos = [];

  for (const item of items) {
    let docSnap = null;

    if (item.id) {
      docSnap = await db.collection('productos').doc(item.id).get();
    }

    if (!docSnap || !docSnap.exists) {
      // Buscar por nombre (exacto primero, luego contiene)
      const nombre = (item.nombre || '').trim();
      if (!nombre) continue;

      let q = await db.collection('productos').where('nombre', '==', nombre).limit(1).get();
      if (q.empty) {
        // Fallback: escanear limitados
        const all = await db.collection('productos').limit(200).get();
        const found = all.docs.find(d => {
          const n = (d.data().nombre || '').toLowerCase();
          return n === nombre.toLowerCase() || n.includes(nombre.toLowerCase());
        });
        if (found) docSnap = found;
      } else {
        docSnap = q.docs[0];
      }
    }

    if (!docSnap || !docSnap.exists) {
      console.warn('Producto no encontrado para descontar:', item.nombre);
      continue;
    }

    const data = docSnap.data();
    const stockActual = Number(data.stock) || 0;
    const cant = Number(item.cantidad) || 0;
    const nuevo = Math.max(0, stockActual - cant);

    await docSnap.ref.update({ stock: nuevo });

    movimientos.push({
      productoId: docSnap.id,
      nombre: data.nombre || item.nombre,
      cantidad: cant,
      stockAntes: stockActual,
      stockDespues: nuevo
    });
  }

  await registrarKardex(movimientos, origen, refId, 'salida');
  return { ok: true, movimientos: movimientos };
}

/**
 * Devuelve stock (si se canceló un pedido que ya descontó)
 */
window.devolverInventario = async function (items, origen, refId) {
  if (!items || !items.length) return { ok: true };

  const movimientos = [];

  for (const item of items) {
    let docSnap = null;
    if (item.id) docSnap = await db.collection('productos').doc(item.id).get();

    if (!docSnap || !docSnap.exists) {
      const nombre = (item.nombre || '').trim();
      if (!nombre) continue;
      let q = await db.collection('productos').where('nombre', '==', nombre).limit(1).get();
      if (!q.empty) docSnap = q.docs[0];
      else {
        const all = await db.collection('productos').limit(200).get();
        const found = all.docs.find(d => (d.data().nombre || '').toLowerCase() === nombre.toLowerCase());
        if (found) docSnap = found;
      }
    }

    if (!docSnap || !docSnap.exists) continue;

    const data = docSnap.data();
    const stockActual = Number(data.stock) || 0;
    const cant = Number(item.cantidad) || 0;
    const nuevo = stockActual + cant;

    await docSnap.ref.update({ stock: nuevo });
    movimientos.push({
      productoId: docSnap.id,
      nombre: data.nombre || item.nombre,
      cantidad: cant,
      stockAntes: stockActual,
      stockDespues: nuevo
    });
  }

  await registrarKardex(movimientos, origen, refId, 'entrada');
  return { ok: true, movimientos: movimientos };
};

async function registrarKardex(movimientos, origen, refId, tipo) {
  if (!movimientos.length) return;
  const batch = db.batch();
  const ahora = new Date();

  movimientos.forEach(m => {
    const ref = db.collection('kardex').doc();
    batch.set(ref, {
      productoId: m.productoId,
      nombre: m.nombre,
      tipo: tipo, // 'salida' | 'entrada'
      cantidad: m.cantidad,
      stockAntes: m.stockAntes,
      stockDespues: m.stockDespues,
      origen: origen || 'Sistema',
      refId: refId || null,
      fecha: ahora
    });
  });

  try {
    await batch.commit();
  } catch (e) {
    console.warn('No se pudo guardar kardex:', e);
  }
}
