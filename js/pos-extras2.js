// js/pos-extras2.js
// Mejoras restantes: atajos, sonido, carrito persistente, historial turnos, WhatsApp, toasts

/* ===== Toast ===== */
window.posToast = function (msg, tipo) {
  var t = document.getElementById('pos-toast-msg');
  if (!t) {
    t = document.createElement('div');
    t.id = 'pos-toast-msg';
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 20px;border-radius:12px;color:#fff;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:90%;text-align:center;';
    document.body.appendChild(t);
  }
  t.style.background = tipo === 'error' ? '#dc2626' : tipo === 'warn' ? '#d97706' : '#059669';
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function () { t.style.display = 'none'; }, 2800);
};

/* ===== Sonido ===== */
window.posBeep = function (ok) {
  try {
    var ctx = window._audioCtx || (window._audioCtx = new (window.AudioContext || window.webkitAudioContext)());
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = ok ? 880 : 220;
    g.gain.value = 0.06;
    o.start();
    setTimeout(function () { o.stop(); }, ok ? 80 : 150);
  } catch (e) {}
};

/* ===== Carrito en sessionStorage ===== */
window.guardarCarritoSesion = function () {
  try {
    if (typeof carrito === 'undefined') return;
    sessionStorage.setItem('posCarrito', JSON.stringify(carrito));
    sessionStorage.setItem('posDescuento', String(window.descuentoAplicado || 0));
  } catch (e) {}
};

window.restaurarCarritoSesion = function () {
  try {
    var raw = sessionStorage.getItem('posCarrito');
    if (!raw) return;
    var arr = JSON.parse(raw);
    if (!Array.isArray(arr) || !arr.length) return;
    if (typeof carrito !== 'undefined') {
      carrito.length = 0;
      arr.forEach(function (p) { carrito.push(p); });
    }
    window.descuentoAplicado = parseFloat(sessionStorage.getItem('posDescuento') || '0') || 0;
  } catch (e) {}
};

window.limpiarCarritoSesion = function () {
  try {
    sessionStorage.removeItem('posCarrito');
    sessionStorage.removeItem('posDescuento');
  } catch (e) {}
};

/* wrap add + render + del */
(function () {
  function wrapAdd() {
    if (typeof add !== 'function' || add.__persist) return;
    var _add = add;
    window.add = function (id, nombre, precio, stock) {
      var before = (typeof carrito !== 'undefined') ? carrito.length : 0;
      _add(id, nombre, precio, stock);
      var after = (typeof carrito !== 'undefined') ? carrito.length : 0;
      var changed = after > before || (carrito && carrito.some(function (p) { return p.id === id; }));
      if (changed) {
        posBeep(true);
        guardarCarritoSesion();
        if (typeof actualizarTotalSticky === 'function') actualizarTotalSticky();
      }
    };
    window.add.__persist = true;
  }
  function wrapRender() {
    if (typeof render !== 'function' || render.__persist) return;
    var _r = render;
    window.render = function () {
      _r();
      guardarCarritoSesion();
      if (typeof actualizarTotalSticky === 'function') actualizarTotalSticky();
    };
    window.render.__persist = true;
    if (_r.__ux) window.render.__ux = true;
  }
  function wrapDel() {
    if (typeof del !== 'function' || del.__persist) return;
    var _d = del;
    window.del = function (i) {
      _d(i);
      guardarCarritoSesion();
      posBeep(false);
    };
    window.del.__persist = true;
  }
  setTimeout(function () { wrapAdd(); wrapRender(); wrapDel(); }, 200);
  setTimeout(function () { wrapAdd(); wrapRender(); wrapDel(); }, 800);
})();

/* ===== Atajos teclado ===== */
document.addEventListener('keydown', function (e) {
  if (!window.cajeroActual) return;
  // F3 = buscar producto
  if (e.key === 'F3') {
    e.preventDefault();
    var s = document.getElementById('search') || document.getElementById('scanCodigo');
    if (s) { s.focus(); s.select(); }
  }
  // Escape = limpiar carrito (con confirm si hay items)
  if (e.key === 'Escape') {
    if (typeof carrito !== 'undefined' && carrito.length) {
      if (confirm('Vaciar carrito?')) {
        carrito.length = 0;
        window.descuentoAplicado = 0;
        window.promoAplicada = null;
        limpiarCarritoSesion();
        if (typeof render === 'function') render();
        posToast('Carrito vacio');
      }
    }
  }
});

/* ===== Busqueda unificada (nombre + codigo) ===== */
(function () {
  function installBuscar() {
    if (typeof buscar !== 'function' || buscar.__unified) return;
    var _b = buscar;
    window.buscar = async function () {
      var input = document.getElementById('search');
      if (!input) return _b();
      var t = (input.value || '').trim();
      var box = document.getElementById('results');
      if (!box) return;
      if (t.length < 1) { box.innerHTML = ''; return; }

      // Si parece codigo (solo digitos o corto sin espacios), intentar escaneo directo
      if (/^[A-Za-z0-9\-_]{4,}$/.test(t) && t.indexOf(' ') < 0) {
        try {
          var snapC = await db.collection('productos').limit(120).get();
          var hit = null;
          snapC.forEach(function (doc) {
            if (hit) return;
            var p = doc.data();
            var cod = String(p.codigo || p.barcode || p.sku || '').trim();
            if (cod && cod.toLowerCase() === t.toLowerCase()) hit = { id: doc.id, p: p };
            if (doc.id === t) hit = { id: doc.id, p: p };
          });
          if (hit && (hit.p.stock || 0) > 0) {
            if (typeof add === 'function') add(hit.id, hit.p.nombre, hit.p.precio || 0, hit.p.stock || 0);
            input.value = '';
            box.innerHTML = '<p class="p-2 text-green-700 text-sm">Agregado: ' + hit.p.nombre + '</p>';
            return;
          }
        } catch (e) {}
      }

      // Busqueda por nombre o codigo parcial
      try {
        var snap = await db.collection('productos').limit(80).get();
        var html = '';
        var q = t.toLowerCase();
        snap.forEach(function (doc) {
          var p = doc.data();
          var nom = (p.nombre || '').toLowerCase();
          var cod = String(p.codigo || p.barcode || p.sku || '').toLowerCase();
          if (nom.indexOf(q) >= 0 || cod.indexOf(q) >= 0) {
            var low = (p.stock || 0) < 10;
            html += '<div onclick="add(\'' + doc.id + '\',\'' +
              String(p.nombre || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\',' +
              (p.precio || 0) + ',' + (p.stock || 0) + ')" class="p-3 rounded-xl cursor-pointer flex justify-between ' +
              (low ? 'bg-orange-50' : 'bg-gray-50') + ' mb-1">' +
              '<span>' + (p.nombre || '') +
              (cod ? ' <span class="text-xs text-gray-400">' + cod + '</span>' : '') +
              '</span><b>Q' + Number(p.precio || 0).toFixed(2) + ' · ' + (p.stock || 0) + '</b></div>';
          }
        });
        box.innerHTML = html || '<p class="p-3 text-gray-500">No encontrado</p>';
      } catch (e) {
        _b();
      }
    };
    window.buscar.__unified = true;
  }
  setTimeout(installBuscar, 300);
  setTimeout(installBuscar, 900);
})();

/* ===== Historial de turnos ===== */
window.cargarHistorialTurnos = async function () {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<h1 class="text-2xl font-bold">Historial de turnos</h1>' +
    '<button onclick="irAVentaSeguro()" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">Volver</button></div>' +
    '<div id="lista-turnos">Cargando...</div>';

  try {
    var snap = await db.collection('turnos_caja').orderBy('abiertoEn', 'desc').limit(40).get();
    var html = '';
    snap.forEach(function (doc) {
      var t = doc.data();
      // cajero solo ve los suyos; admin/supervisor ven todos si estan en POS con ese rol
      var role = window.rolCaja || '';
      if (role === 'cajero' && (t.cajero || '') !== (window.cajeroActual || '')) return;
      var ab = t.abiertoEn && t.abiertoEn.toDate ? t.abiertoEn.toDate() : null;
      var ce = t.cerradoEn && t.cerradoEn.toDate ? t.cerradoEn.toDate() : null;
      var diff = t.diferencia != null ? Number(t.diferencia) : null;
      var diffCls = diff == null ? '' : (Math.abs(diff) < 0.01 ? 'text-green-700' : (diff < 0 ? 'text-red-600' : 'text-amber-700'));
      html +=
        '<div class="bg-white p-4 rounded-xl shadow mb-3">' +
        '<div class="flex flex-wrap justify-between gap-2">' +
        '<div><div class="font-semibold">' + (t.cajero || '') + '</div>' +
        '<div class="text-xs text-gray-500">Abierto: ' + (ab ? ab.toLocaleString('es-GT') : '-') + '</div>' +
        (ce ? '<div class="text-xs text-gray-500">Cerrado: ' + ce.toLocaleString('es-GT') + '</div>' : '') +
        '</div>' +
        '<div class="text-right text-sm">' +
        '<span class="px-2 py-0.5 rounded-full text-xs ' +
        (t.estado === 'abierto' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600') + '">' +
        (t.estado || '') + '</span>' +
        '<div class="mt-1">Ventas: <b>' + (t.cantidadVentas || 0) + '</b></div>' +
        '<div>Total: <b>Q' + Number(t.totalVentas || 0).toFixed(2) + '</b></div>' +
        (diff != null ? '<div class="' + diffCls + '">Diff: Q' + diff.toFixed(2) + '</div>' : '') +
        '</div></div>' +
        (t.notaArqueo ? '<div class="text-xs text-gray-500 mt-2">Nota: ' + t.notaArqueo + '</div>' : '') +
        '</div>';
    });
    document.getElementById('lista-turnos').innerHTML = html || '<p class="text-gray-400 text-center py-10">Sin turnos registrados</p>';
  } catch (e) {
    document.getElementById('lista-turnos').innerHTML = '<p class="text-red-600 p-4">' + e.message +
      '<br><span class="text-xs">Puede faltar indice en turnos_caja (abiertoEn).</span></p>';
  }
};

/* ===== WhatsApp ticket ===== */
window.enviarTicketWhatsApp = function (v) {
  v = v || window._ultimaVentaTicket;
  if (!v) return alert('No hay venta reciente para enviar');
  var lineas = (v.productos || []).map(function (p) {
    return '- ' + p.nombre + ' x' + p.cantidad + ' Q' + (p.precio * p.cantidad).toFixed(2);
  }).join('%0A');
  var msg =
    'AGROMAXGTM - Ticket%0A' +
    'Folio: ' + (v.folio || '') + '%0A' +
    'Cliente: ' + (v.cliente || 'Consumidor Final') + '%0A' +
    lineas + '%0A' +
    'Total: Q' + Number(v.total || 0).toFixed(2) + '%0A' +
    'Metodo: ' + (v.metodoPago || '') + '%0A' +
    'Gracias por su compra';
  window.open('https://wa.me/?text=' + msg, '_blank');
};

window._ultimaVentaTicket = null;

/* Guardar ultima venta al finalizar (hook suave) */
(function () {
  function install() {
    if (typeof finalizarVenta !== 'function') return;
    // pos-descuento-venta may replace it; we patch after
    if (finalizarVenta.__wa) return;
    var _f = finalizarVenta;
    window.finalizarVenta = async function () {
      var cliente = (document.getElementById('nombreCliente') && document.getElementById('nombreCliente').value.trim()) || 'Consumidor Final';
      var cart = (typeof carrito !== 'undefined') ? carrito.slice() : [];
      await _f();
      // best effort ultima venta
      try {
        var snap = await db.collection('ventas').where('cajero', '==', window.cajeroActual || '').orderBy('fecha', 'desc').limit(1).get();
        if (!snap.empty) {
          window._ultimaVentaTicket = { id: snap.docs[0].id, ...snap.docs[0].data() };
        } else {
          window._ultimaVentaTicket = { productos: cart, cliente: cliente, total: 0, folio: '', metodoPago: '' };
        }
      } catch (e) {
        window._ultimaVentaTicket = { productos: cart, cliente: cliente };
      }
      limpiarCarritoSesion();
      posBeep(true);
      posToast('Venta registrada');
      // boton whatsapp temporal
      setTimeout(function () {
        if (document.getElementById('btn-wa-ticket')) return;
        var app = document.getElementById('app');
        if (!app) return;
        var b = document.createElement('button');
        b.id = 'btn-wa-ticket';
        b.type = 'button';
        b.className = 'fixed bottom-20 right-4 z-[200] bg-green-500 text-white px-4 py-3 rounded-full shadow-lg text-sm font-bold';
        b.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar ticket';
        b.onclick = function () { enviarTicketWhatsApp(); };
        document.body.appendChild(b);
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 20000);
      }, 400);
    };
    window.finalizarVenta.__wa = true;
    if (_f.__descuento) window.finalizarVenta.__descuento = true;
    if (_f.__extras) window.finalizarVenta.__extras = true;
  }
  setTimeout(install, 400);
  setTimeout(install, 1200);
  setTimeout(install, 2000);
})();

/* Hook view: turnos + restaurar carrito */
(function () {
  function install() {
    if (typeof view !== 'function' || view.__extras2) return;
    var _v = view;
    window.view = function (v) {
      if (v === 'turnos') return cargarHistorialTurnos();
      _v(v);
      if (v === 'venta') {
        setTimeout(function () {
          restaurarCarritoSesion();
          if (typeof render === 'function') render();
          // hint atajos
          var bar = document.getElementById('pos-status-bar');
          if (bar && bar.innerHTML.indexOf('F3') < 0) {
            // status bar already has F2 from ux
          }
        }, 100);
      }
    };
    window.view.__extras2 = true;
    ['__ux', '__extras', '__modulos', '__authUser', '__bonif'].forEach(function (f) {
      if (_v[f]) window.view[f] = true;
    });
  }
  setTimeout(install, 150);
  setTimeout(install, 700);
  setTimeout(install, 1500);
})();
