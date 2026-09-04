// js/admin-notif.js
// Notificaciones en tiempo real de pedidos (no modifica admin.js)

(function () {
  let knownIds = new Set();
  let listo = false;
  let unsub = null;

  function ensureToastContainer() {
    if (document.getElementById('toast-container')) return;
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'fixed top-4 right-4 z-[200] space-y-3 max-w-sm w-full pointer-events-none';
    document.body.appendChild(c);
  }

  function mostrarToast(titulo, mensaje, tipo) {
    ensureToastContainer();
    const border = tipo === 'pago' ? 'border-blue-500' : 'border-green-500';
    const icon = tipo === 'pago' ? 'fa-credit-card text-blue-600' : 'fa-bell text-green-600';
    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto bg-white border-l-4 ' + border + ' shadow-xl rounded-2xl p-4 flex gap-3 items-start';
    toast.innerHTML =
      '<i class="fas ' + icon + ' text-xl mt-0.5"></i>' +
      '<div class="flex-1 min-w-0">' +
      '<p class="font-bold text-gray-800 text-sm">' + titulo + '</p>' +
      '<p class="text-gray-600 text-sm mt-0.5">' + mensaje + '</p></div>' +
      '<button class="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>';
    toast.querySelector('button').onclick = function () { toast.remove(); };
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(function () { toast.remove(); }, 400);
    }, 6000);
  }

  function notificarNavegador(titulo, cuerpo) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      var n = new Notification(titulo, { body: cuerpo, tag: 'agromax-pedido' });
      n.onclick = function () { window.focus(); n.close(); };
    } catch (e) {}
  }

  function beep() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      setTimeout(function () { osc.stop(); ctx.close(); }, 150);
    } catch (e) {}
  }

  function actualizarBadge(count) {
    var badge = document.getElementById('badge-pedidos');
    if (!badge) {
      var links = document.querySelectorAll('nav a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].textContent.indexOf('Pedidos') !== -1) {
          links[i].classList.add('relative');
          badge = document.createElement('span');
          badge.id = 'badge-pedidos';
          badge.className = 'hidden ml-auto bg-red-500 text-white text-xs font-bold min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full';
          links[i].appendChild(badge);
          break;
        }
      }
    }
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function iniciarListener() {
    if (typeof db === 'undefined' || !db) return;
    if (unsub) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    unsub = db.collection('pedidos').orderBy('fecha', 'desc').limit(30).onSnapshot(function (snapshot) {
      var pendientes = 0;

      snapshot.forEach(function (doc) {
        var p = doc.data();
        var est = p.estado || 'Pendiente';
        if (est === 'Pendiente' || est === 'Pagado' || est === 'En proceso') pendientes++;
      });

      actualizarBadge(pendientes);

      if (listo) {
        snapshot.docChanges().forEach(function (change) {
          if (change.type !== 'added') return;
          var id = change.doc.id;
          if (knownIds.has(id)) return;

          var p = change.doc.data();
          var total = Number(p.total || 0).toFixed(2);
          var esStripe = p.metodo === 'Stripe';
          var titulo = esStripe ? 'Nuevo pago recibido' : 'Nuevo pedido';
          var mensaje = (p.cliente || 'Cliente') + ' · Q' + total + ' · ' + (esStripe ? 'Stripe' : 'WhatsApp');

          mostrarToast(titulo, mensaje, esStripe ? 'pago' : 'info');
          notificarNavegador('AGROMAXGTM - ' + titulo, mensaje);
          beep();
        });
      }

      knownIds = new Set(snapshot.docs.map(function (d) { return d.id; }));
      listo = true;
    }, function (err) {
      console.error('Notif pedidos:', err);
    });
  }

  function intentarIniciar() {
    if (typeof auth === 'undefined' || !auth) return;
    auth.onAuthStateChanged(function (user) {
      if (user) {
        setTimeout(iniciarListener, 800);
      } else {
        if (unsub) { unsub(); unsub = null; }
        listo = false;
        knownIds = new Set();
        actualizarBadge(0);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', intentarIniciar);
  } else {
    intentarIniciar();
  }
})();
