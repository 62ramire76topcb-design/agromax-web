// js/pos-descuento-venta.js
// Conecta descuentoAplicado en finalizarVenta (total, cambio, ticket, venta, usos)

(function () {
  function instalar() {
    if (typeof finalizarVenta !== 'function' || finalizarVenta.__descuento) return;

    var _fin = finalizarVenta;

    window.finalizarVenta = async function () {
      var btn = document.querySelector('button[onclick="finalizarVenta()"]');
      var textoOriginal = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando Venta...';
      }

      function restore() {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = textoOriginal;
        }
      }

      try {
        var metodoPago = document.getElementById('metodoPago').value;
        var montoRecibido = parseFloat((document.getElementById('montoRecibido') || {}).value) || 0;
        var cart = (typeof carrito !== 'undefined') ? carrito : [];
        if (!cart.length) {
          alert('Carrito vac\u00edo');
          restore();
          return;
        }
        if (!metodoPago) {
          alert('Selecciona un m\u00e9todo de pago');
          restore();
          return;
        }

        var subtotal = cart.reduce(function (s, p) { return s + p.precio * p.cantidad; }, 0);
        var descuento = Math.min(Number(window.descuentoAplicado || 0), subtotal);
        var total = Math.max(0, subtotal - descuento);
        var cambio = montoRecibido - total;
        var promo = window.promoAplicada || null;
        var notaVenta = (document.getElementById('notaVenta') && document.getElementById('notaVenta').value.trim()) || '';
        var folio = (typeof generarFolioPOS === 'function') ? generarFolioPOS() : ('POS-' + Date.now().toString().slice(-6));
        var cliente = (document.getElementById('nombreCliente') && document.getElementById('nombreCliente').value.trim()) || 'Consumidor Final';
        var nit = (document.getElementById('nitCliente') && document.getElementById('nitCliente').value.trim()) || '';

        if (metodoPago === 'Efectivo' && montoRecibido < total) {
          alert('El monto recibido es menor al total Q' + total.toFixed(2));
          restore();
          return;
        }

        var msg = 'Finalizar venta por Q' + total.toFixed(2);
        if (descuento > 0) msg += ' (descuento Q' + descuento.toFixed(2) + ')';
        if (!confirm(msg + ' y descontar stock?')) {
          restore();
          return;
        }

        // Ticket con descuento
        if (typeof abrirTicket === 'function') {
          abrirTicket(cart, total, metodoPago, montoRecibido, cambio, cliente, nit, {
            folio: folio,
            cajero: window.cajeroActual || '',
            nota: notaVenta,
            descuento: descuento,
            subtotal: subtotal,
            promoNombre: promo ? (promo.nombre || promo.codigo || '') : ''
          });
        }

        // Stock + venta
        await db.runTransaction(async function (tx) {
          var totalCalc = 0;
          for (var i = 0; i < cart.length; i++) {
            var item = cart[i];
            var pref = db.collection('productos').doc(item.id);
            var snap = await tx.get(pref);
            if (!snap.exists) throw new Error('Producto no encontrado: ' + item.nombre);
            var data = snap.data();
            if ((data.stock || 0) < item.cantidad) throw new Error('Stock insuficiente: ' + item.nombre);
            tx.update(pref, { stock: data.stock - item.cantidad });
            totalCalc += item.precio * item.cantidad;
          }
          var desc = Math.min(descuento, totalCalc);
          var totalFinal = Math.max(0, totalCalc - desc);
          var ventaRef = db.collection('ventas').doc();
          tx.set(ventaRef, {
            fecha: new Date(),
            productos: cart,
            subtotal: totalCalc,
            descuento: desc,
            total: totalFinal,
            tipo: 'CAJA',
            metodoPago: metodoPago,
            montoRecibido: metodoPago === 'Efectivo' ? montoRecibido : 0,
            cambio: metodoPago === 'Efectivo' ? (montoRecibido - totalFinal) : 0,
            cajero: window.cajeroActual || 'Sin registrar',
            cliente: cliente,
            nit: nit,
            folio: folio,
            nota: notaVenta,
            codigoPromo: promo ? (promo.codigo || '') : '',
            promoNombre: promo ? (promo.nombre || '') : '',
            promoId: promo ? (promo.id || null) : null,
            turnoId: (window.turnoActual && window.turnoActual.id) || null,
            userId: (auth.currentUser && auth.currentUser.uid) || null
          });
        });

        if (promo && promo.id && descuento > 0) {
          try {
            await db.collection('bonificaciones').doc(promo.id).update({
              usos: (Number(promo.usos) || 0) + 1
            });
            await db.collection('bonificaciones_uso').add({
              promoId: promo.id,
              codigo: promo.codigo || '',
              nombrePromo: promo.nombre || '',
              descuento: descuento,
              cajero: window.cajeroActual || '',
              cliente: cliente,
              fecha: new Date()
            });
          } catch (e) {
            console.warn('uso bono:', e);
          }
        }

        if (typeof guardarClienteReciente === 'function') guardarClienteReciente(cliente, nit);

        window.descuentoAplicado = 0;
        window.promoAplicada = null;

        // Vaciar carrito global
        if (typeof carrito !== 'undefined') {
          carrito.length = 0;
        }
        if (typeof render === 'function') render();

        alert('\u2705 Venta finalizada. Total cobrado: Q' + total.toFixed(2));
        if (typeof view === 'function') view('venta');
      } catch (e) {
        console.error(e);
        alert('Error: ' + (e.message || e));
      } finally {
        restore();
      }
    };

    window.finalizarVenta.__descuento = true;
  }

  setTimeout(instalar, 150);
  setTimeout(instalar, 500);
  setTimeout(instalar, 1200);
})();
