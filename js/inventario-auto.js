// js/inventario-auto.js
// Gestión automática de inventario + kardex

async function buscarProductoDoc(item) {
  if (item.id) {
    const snap = await db.collection('productos').doc(item.id).get();
    if (snap.exists) return snap;
  }

  const nombre = (item.nombre || '').trim();
  if (!nombre) return null;

  try {
    const q = await db.collection('productos').where('nombre', '==', nombre).limit(1).get();
    if (!q.empty) return q.docs[0];
  } catch (e) { /* ignore */ }

  const all = await db.collection('productos').limit(300).get();
  const lower = nombre.toLowerCase();
  return all.docs.find(d => {
    const n = (d.data().nombre || '').toLowerCase();
    return n === lower || n.includes(lower);
  }) || null;
}

async function registrarKardex(movimientos, origen, refId, tipo) {
  if (!movimientos.length) return;
  const ahora = new Date();
  for (const m of movimientos) {
    try {
      await db.collection('kardex').add({
        productoId: m.productoId,
        nombre: m.nombre,
        tipo: tipo,
        cantidad: m.cantidad,
        stockAntes: m.stockAntes,
        stockDespues: m.stockDespues,
        origen: origen || 'Sistema',
        refId: refId || null,
        fecha: ahora
      });
    } catch (e) {
      console.warn('kardex:', e);
    }
  }
}

/** Descuenta stock. items: [{id?, nombre, cantidad}] */
window.descontarInventario = async function (items, origen, refId) {
  if (!items || !items.length) return { ok: true, movimientos: [] };
  const movimientos = [];

  for (const item of items) {
    const docSnap = await buscarProductoDoc(item);
    if (!docSnap) {
      console.warn('Producto no encontrado:', item.nombre);
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
};

/** Devuelve stock (cancelación) */
window.devolverInventario = async function (items, origen, refId) {
  if (!items || !items.length) return { ok: true, movimientos: [] };
  const movimientos = [];

  for (const item of items) {
    const docSnap = await buscarProductoDoc(item);
    if (!docSnap) continue;
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
