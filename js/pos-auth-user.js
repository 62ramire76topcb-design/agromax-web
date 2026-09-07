// js/pos-auth-user.js
// Arranque de caja por rol:
// - admin / supervisor → venta directa (sin fondo ni nombre manual)
// - cajero → pide abrir turno con fondo
// Ventas siempre con el nombre del usuario logueado

window.rolCaja = null;
window.perfilCaja = null;

window.obtenerPerfilCaja = async function (user) {
  if (!user) return null;
  try {
    var doc = await db.collection('usuarios').doc(user.uid).get();
    if (doc.exists) {
      var d = doc.data() || {};
      return {
        uid: user.uid,
        email: user.email || d.email || '',
        nombre: d.nombre || user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
        role: d.role || 'cajero',
        activo: d.activo !== false
      };
    }
  } catch (e) {
    console.warn('perfil caja:', e);
  }
  return {
    uid: user.uid,
    email: user.email || '',
    nombre: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
    role: 'cajero',
    activo: true
  };
};

window.obtenerNombreUsuarioCaja = async function (user) {
  var p = await obtenerPerfilCaja(user);
  return (p && p.nombre) || 'Cajero';
};

window.esRolSinTurno = function () {
  var r = window.rolCaja || (window.perfilCaja && window.perfilCaja.role);
  return r === 'admin' || r === 'supervisor';
};

window.mostrarUICaja = function (visible) {
  var side = document.getElementById('pos-sidebar');
  var shell = document.getElementById('pos-shell');
  if (side) side.classList.toggle('hidden', !visible);
  if (shell) {
    if (visible) shell.classList.add('flex');
    else shell.classList.remove('flex');
  }
};

window.aplicarMenuPorRol = function () {
  var role = window.rolCaja || 'cajero';
  // data-rol="cajero" se oculta para admin si quieres menú distinto; por ahora todos ven POS completo
  document.querySelectorAll('[data-solo-cajero]').forEach(function (el) {
    // Admin/supervisor no necesitan "abrir/cerrar turno" obligatorio
    if (role === 'admin' || role === 'supervisor') {
      el.classList.add('hidden');
    } else {
      el.classList.remove('hidden');
    }
  });
};

window.arrancarCajaConUsuario = async function (user) {
  if (!user) {
    mostrarUICaja(false);
    if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
    return;
  }

  var perfil = await obtenerPerfilCaja(user);
  if (!perfil || perfil.activo === false) {
    alert('Cuenta inactiva. Contacta al administrador.');
    await auth.signOut();
    return;
  }

  window.perfilCaja = perfil;
  window.rolCaja = perfil.role;
  window.cajeroActual = perfil.nombre;
  try { cajeroActual = perfil.nombre; } catch (e) {}
  localStorage.setItem('ultimoCajero', perfil.nombre);

  mostrarUICaja(true);
  aplicarMenuPorRol();

  if (typeof cargarClientesFrecuentes === 'function') {
    try { cargarClientesFrecuentes(); } catch (e) {}
  }

  // Admin y supervisor: directo a vender, sin turno
  if (esRolSinTurno()) {
    window.turnoActual = {
      id: null,
      cajero: perfil.nombre,
      montoInicial: 0,
      estado: 'libre',
      abiertoEn: new Date()
    };
    localStorage.removeItem('turnoCajaId');
    setTimeout(function () {
      if (typeof irAVentaSeguro === 'function') irAVentaSeguro();
      else if (typeof view === 'function') view('venta');
    }, 30);
    return;
  }

  // Cajero: requiere turno abierto
  var t = null;
  if (typeof cargarTurnoAbierto === 'function') {
    t = await cargarTurnoAbierto(perfil.nombre);
  }
  if (t) {
    setTimeout(function () {
      if (typeof irAVentaSeguro === 'function') irAVentaSeguro();
      else if (typeof view === 'function') view('venta');
    }, 30);
  } else if (typeof mostrarAperturaTurno === 'function') {
    mostrarAperturaTurno(perfil.nombre);
  } else if (typeof view === 'function') {
    view('venta');
  }
};

// Único listener de auth para POS
(function () {
  var started = false;
  function boot() {
    if (started) return;
    started = true;
    auth.onAuthStateChanged(function (user) {
      arrancarCajaConUsuario(user);
    });
  }
  setTimeout(boot, 0);
})();

// Cerrar sesión limpio
window.cambiarCajero = function () {
  if (!confirm('¿Cerrar sesión?')) return;
  localStorage.removeItem('ultimoCajero');
  localStorage.removeItem('turnoCajaId');
  window.cajeroActual = '';
  window.turnoActual = null;
  window.rolCaja = null;
  window.perfilCaja = null;
  try { cajeroActual = ''; } catch (e) {}
  mostrarUICaja(false);
  auth.signOut().then(function () {
    if (typeof mostrarLoginPOS === 'function') mostrarLoginPOS();
  });
};

// No pedir nombre manual
window.mostrarSeleccionCajero = function () {
  var u = auth.currentUser;
  if (u) arrancarCajaConUsuario(u);
  else if (typeof mostrarLoginPOS === 'function') {
    mostrarUICaja(false);
    mostrarLoginPOS();
  }
};

// Evitar que pos.js fuerce turno a admin
window.iniciarSesionCajero = async function (nombre) {
  window.cajeroActual = nombre || window.cajeroActual;
  try { cajeroActual = window.cajeroActual; } catch (e) {}
  if (esRolSinTurno()) {
    if (typeof irAVentaSeguro === 'function') irAVentaSeguro();
    else if (typeof view === 'function') view('venta');
    return;
  }
  if (typeof cargarTurnoAbierto === 'function') {
    var t = await cargarTurnoAbierto(window.cajeroActual);
    if (t) {
      if (typeof irAVentaSeguro === 'function') irAVentaSeguro();
      return;
    }
  }
  if (typeof mostrarAperturaTurno === 'function') mostrarAperturaTurno(window.cajeroActual);
};

/* ===== Clientes ===== */
window.cargarClientesPOS = async function () {
  var app = document.getElementById('app');
  if (!app) return;
  app.innerHTML =
    '<div class="flex justify-between items-center mb-4">' +
    '<h1 class="text-2xl font-bold">Clientes</h1>' +
    '<button onclick="irAVentaSeguro()" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">Volver a venta</button></div>' +
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
  if (typeof irAVentaSeguro === 'function') irAVentaSeguro();
  else view('venta');
  setTimeout(function () {
    var n = document.getElementById('nombreCliente');
    var i = document.getElementById('nitCliente');
    if (n) n.value = nombre;
    if (i) i.value = nit || '';
  }, 120);
};

/* ===== Productos ===== */
window.cargarProductosPOS = async function () {
  var app = document.getElementById('app');
  app.innerHTML =
    '<div class="flex justify-between items-center mb-4">' +
    '<h1 class="text-2xl font-bold">Productos</h1>' +
    '<button onclick="irAVentaSeguro()" class="text-sm bg-green-600 text-white px-4 py-2 rounded-xl">Volver a venta</button></div>' +
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
      ');irAVentaSeguro()" class="mt-1 text-xs bg-green-600 text-white px-2 py-1 rounded-lg">+ Venta</button>' +
      '</div></div>';
  }).join('') || '<p class="text-gray-400 text-center py-8">Sin productos</p>';
};

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
