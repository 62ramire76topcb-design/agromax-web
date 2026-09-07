// js/pos-bonif.js - Aplicar cupones / bonificaciones en caja
window.descuentoAplicado = 0;
window.promoAplicada = null;

window.aplicarCodigoPromo = async function () {
  var input = document.getElementById('codigoPromo');
  var codigo = (input && input.value ? input.value : '').trim().toUpperCase();
  if (!codigo) return alert('Escribe un código');
  if (!window.carrito && typeof carrito === 'undefined') return alert('Carrito no disponible');

  var cart = (typeof carrito !== 'undefined') ? carrito : [];
  if (!cart.length) return alert('Carrito vacío');

  try {
    var snap = await db.collection('bonificaciones').where('codigo', '==', codigo).limit(5).get();
    if (snap.empty) {
      // fallback sin índice: escanear activas
      var all = await db.collection('bonificaciones').limit(50).get();
      var found = null;
      all.forEach(function (d) {
        var b = d.data();
        if ((b.codigo || '').toUpperCase() === codigo) found = { id: d.id, ...b };
      });
      if (!found) return alert('Código no válido');
      return aplicarPromoObj(found);
    }
    var doc = snap.docs[0];
    aplicarPromoObj({ id: doc.id, ...doc.data() });
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

function aplicarPromoObj(b) {
  if (!b.activa) return alert('Promo inactiva');
  var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  if (b.desde && hoy < new Date(b.desde)) return alert('Promo aún no inicia');
  if (b.hasta) {
    var h = new Date(b.hasta); h.setHours(23, 59, 59, 0);
    if (hoy > h) return alert('Promo vencida');
  }
  if (b.limiteUsos && (b.usos || 0) >= b.limiteUsos) return alert('Límite de usos alcanzado');

  var cart = carrito;
  var subtotal = cart.reduce(function (s, p) { return s + p.precio * p.cantidad; }, 0);
  if (b.aplicaA === 'monto_min' && subtotal < (b.montoMinimo || 0)) {
    return alert('Monto mínimo Q' + Number(b.montoMinimo).toFixed(2));
  }

  var descuento = 0;
  if (b.tipo === 'porcentaje' || b.porcentaje) {
    var pct = b.valor || b.porcentaje || 0;
    if (b.aplicaA === 'producto' && b.productoId) {
      cart.forEach(function (p) {
        if (p.id === b.productoId) descuento += p.precio * p.cantidad * (pct / 100);
      });
    } else {
      descuento = subtotal * (pct / 100);
    }
  } else if (b.tipo === 'monto') {
    descuento = Math.min(Number(b.valor) || 0, subtotal);
  } else if (b.tipo === '2x1') {
    // simplificado: descuenta unidades "gratis" del ítem más barato aplicable
    descuento = 0;
    alert('2x1 se aplica en mostrador de forma manual por ahora; usa % o monto fijo');
    return;
  }

  if (descuento <= 0) return alert('Esta promo no aplica al carrito actual');

  window.descuentoAplicado = descuento;
  window.promoAplicada = b;
  var el = document.getElementById('descuentoTexto');
  if (el) el.textContent = 'Descuento: -Q' + descuento.toFixed(2) + ' (' + (b.nombre || b.codigo) + ')';
  alert('✅ Promo aplicada: -Q' + descuento.toFixed(2));
}

// UI en venta
(function () {
  function inject() {
    if (typeof view !== 'function' || view.__bonif) return;
    var _v = view;
    window.view = function (v) {
      _v(v);
      if (v === 'venta') {
        setTimeout(function () {
          if (document.getElementById('codigoPromo')) return;
          var metodo = document.getElementById('metodoPago');
          if (!metodo) return;
          var wrap = document.createElement('div');
          wrap.className = 'mt-3';
          wrap.innerHTML =
            '<label class="block mb-1 text-sm font-semibold text-gray-700">Código promo</label>' +
            '<div class="flex gap-2">' +
            '<input id="codigoPromo" class="flex-1 p-2 border rounded-xl text-sm uppercase" placeholder="Ej. AGRO10">' +
            '<button type="button" onclick="aplicarCodigoPromo()" class="bg-purple-600 text-white px-3 rounded-xl text-sm">Aplicar</button></div>' +
            '<p id="descuentoTexto" class="text-sm text-purple-700 mt-1"></p>';
          metodo.parentNode.insertBefore(wrap, metodo);
        }, 100);
      }
    };
    window.view.__bonif = true;
  }
  setTimeout(inject, 200);
  setTimeout(inject, 600);
})();
