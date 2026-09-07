// js/pos-auth-user.js
// Cajero = usuario autenticado (sin pedir nombre)
// Listados de clientes y productos en POS

window.obtenerNombreUsuarioCaja = async function (user) {
  if (!user) return 'Cajero';
  try {
    // 1) Perfil en colección usuarios
    var doc = await db.collection('usuarios').doc(user.uid).get();
    if (doc.exists) {
      var d = doc.data();
      if (d.nombre) return d.nombre;
      if (d.displayName) return d.displayName;
    }
  } catch (e) {}
  if (user.displayName) return user.displayName;
  if (user.email) return user.email.split('@')[0];
  return 'Cajero';
};

// Sustituye el flujo de auth de pos.js
(function () {
  // Esperar a que pos.js registre onAuthStateChanged y reescribir arranque
  function boot() {
    auth.onAuthStateChanged(async function (user) {
      if (!user) {
        if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
        return;
      }
      var nombre = await obtenerNombreUsuarioCaja(user);
      window.cajeroActual = nombre;
      if (typeof cajeroActual !== 'undefined') {
        try { cajeroActual = nombre; } catch (e) {}
      }
      localStorage.setItem('ultimoCajero', nombre);

      if (typeof cargarClientesFrecuentes === 'function') cargarClientesFrecuentes();

      if (typeof cargarTurnoAbierto === 'function') {
        var t = await cargarTurnoAbierto(nombre);
        if (t) {
          if (typeof view === 'function') view('venta');
          return;
        }
      }
      if (typeof mostrarAperturaTurno === 'function') {
        mostrarAperturaTurno(nombre);
      } else if (typeof view === 'function') {
        view('venta');
      }
    });
  }

  // Cambiar cajero = cerrar sesión / cambiar usuario
  window.cambiarCajero = function () {
    if (confirm('¿Cerrar sesión de este usuario?')) {
      localStorage.removeItem('ultimoCajero');
      localStorage.removeItem('turnoCajaId');
      window.cajeroActual = '';
      auth.signOut();
    }
  };

  // Evitar que pos.js pida nombre: si llama mostrarSeleccionCajero, redirigir
  window.mostrarSeleccionCajero = function () {
    var u = auth.currentUser;
    if (u) {
      obtenerNombreUsuarioCaja(u).then(function (n) {
        window.cajeroActual = n;
        if (typeof iniciarSesionCajero === 'function') iniciarSesionCajero(n);
        else if (typeof view === 'function') view('venta');
      });
    } else if (typeof mostrarLoginPOS === 'function') {
      mostrarLoginPOS();
    }
  };

  setTimeout(boot, 0);
})();

/* ===== Clientes (solo lectura + usar en venta) ===== */
window.cargarClientesPOS = async function () {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="flex justify-between items-center mb-4">' +
    '<h1 class="text-2xl font-bold">Clientes</h1>' +
    '<button onclick="view(\'venta\')" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">Volver a venta</button></div>' +
    '<input id="filtroClientesPOS" placeholder="Buscar cliente o NIT..." class="w-full p-3 border rounded-xl mb-4" onkeyup="filtrarClientesPOS()">' +
    '<div id="listaClientesPOS" class="space-y-2">Cargando...</div>';

  try {
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(150).get();
    var map = {};
    snap.forEach(function (doc) {
      var v = doc.data();
      if (!v.cliente || v.cliente === 'Consumidor Final') return;
      var k = v.cliente.toLowerCase();
      if (!map[k]) map[k] = { nombre: v.cliente, nit: v.nit || '', compras: 0, total: 0 };
      map[k].compras++;
      map[k].total += Number(v.total) || 0;
      if (v.nit) map[k].nit = v.nit;
    });
    window._clientesPOS = Object.keys(map).map(function (k) { return map[k]; });
    window._clientesPOS.sort(function (a, b) { return b.compras - a.compras; });
    filtrarClientesPOS();
  } catch (e) {
    document.getElementById('listaClientesPOS').innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
};

window.filtrarClientesPOS = function () {
  var q = ((document.getElementById('filtroClientesPOS') || {}).value || '').toLowerCase();
  var list = (window._clientesPOS || []).filter(function (c) {
    return !q || c.nombre.toLowerCase().includes(q) || (c.nit || '').toLowerCase().includes(q);
  });
  document.getElementById('listaClientesPOS').innerHTML = list.map(function (c) {
    return '<div class="bg-white p-4 rounded-xl shadow flex justify-between items-center gap-3">' +
      '<div><div class="font-semibold">' + c.nombre + '</div>' +
      (c.nit ? '<div class="text-xs text-gray-500">NIT: ' + c.nit + '</div>' : '') +
      '<div class="text-xs text-gray-400">' + c.compras + ' compras · Q' + c.total.toFixed(2) + '</div></div>' +
      '<button onclick="usarClienteEnVenta(\'' + c.nombre.replace(/'/g, "\\'") + '\',\'' + (c.nit || '').replace(/'/g, "\\'") + '\')" ' +
      'class="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-xl">Usar en venta</button></div>';
  }).join('') || '<p class="text-gray-400 text-center py-8">Sin clientes</p>';
};

window.usarClienteEnVenta = function (nombre, nit) {
  view('venta');
  setTimeout(function () {
    var n = document.getElementById('nombreCliente');
    var i = document.getElementById('nitCliente');
    if (n) n.value = nombre;
    if (i) i.value = nit || '';
  }, 100);
};

/* ===== Productos (solo lectura) ===== */
window.cargarProductosPOS = async function () {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="flex justify-between items-center mb-4">' +
    '<h1 class="text-2xl font-bold">Productos</h1>' +
    '<button onclick="view(\'venta\')" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">Volver a venta</button></div>' +
    '<input id="filtroProdPOS" placeholder="Buscar producto..." class="w-full p-3 border rounded-xl mb-4" onkeyup="filtrarProductosPOS()">' +
    '<div id="listaProdPOS" class="space-y-2">Cargando...</div>';

  try {
    var snap = await db.collection('productos').limit(200).get();
    window._prodsPOS = [];
    snap.forEach(function (doc) {
      var p = doc.data();
      window._prodsPOS.push({
        id: doc.id,
        nombre: p.nombre || '',
        precio: p.precio || 0,
        stock: p.stock || 0,
        codigo: p.codigo || p.barcode || p.sku || ''
      });
    });
    window._prodsPOS.sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
    filtrarProductosPOS();
  } catch (e) {
    document.getElementById('listaProdPOS').innerHTML = '<p class="text-red-600">' + e.message + '</p>';
  }
};

window.filtrarProductosPOS = function () {
  var q = ((document.getElementById('filtroProdPOS') || {}).value || '').toLowerCase();
  var list = (window._prodsPOS || []).filter(function (p) {
    return !q || p.nombre.toLowerCase().includes(q) || String(p.codigo).toLowerCase().includes(q);
  });
  document.getElementById('listaProdPOS').innerHTML = list.map(function (p) {
    var low = p.stock < 10;
    return '<div class="bg-white p-3 rounded-xl shadow flex justify-between items-center gap-2 ' +
      (low ? 'border border-orange-200' : '') + '">' +
      '<div><div class="font-medium">' + p.nombre + '</div>' +
      '<div class="text-xs text-gray-500">Stock: ' + p.stock +
      (p.codigo ? ' · Cód: ' + p.codigo : '') + '</div></div>' +
      '<div class="text-right">' +
      '<div class="font-bold">Q' + Number(p.precio).toFixed(2) + '</div>' +
      '<button onclick="add(\'' + p.id + '\',\'' + p.nombre.replace(/'/g, "\\'") + '\',' + p.precio + ',' + p.stock +
      ');view(\'venta\')" class="mt-1 text-xs bg-green-600 text-white px-2 py-1 rounded-lg">+ Venta</button>' +
      '</div></div>';
  }).join('') || '<p class="text-gray-400 text-center py-8">Sin productos</p>';
};

/* Hook view */
(function () {
  function install() {
    if (typeof view !== 'function' || view.__authUser) return;
    var _v = view;
    window.view = function (v) {
      if (v === 'clientes-pos') return cargarClientesPOS();
      if (v === 'productos-pos') return cargarProductosPOS();
      return _v(v);
    };
    window.view.__authUser = true;
    if (_v.__modulos) window.view.__modulos = true;
    if (_v.__extras) window.view.__extras = true;
  }
  setTimeout(install, 80);
  setTimeout(install, 500);
})();
