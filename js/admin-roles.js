// js/admin-roles.js
// Roles + permisos. Un solo acceso: admin.html (sin forzar pos.html)

window.AGROMAX_ROLES = {
  admin: {
    label: 'Administrador',
    desc: 'Acceso total al sistema',
    color: 'bg-purple-100 text-purple-800'
  },
  supervisor: {
    label: 'Supervisor',
    desc: 'Operación completa sin gestionar usuarios',
    color: 'bg-blue-100 text-blue-800'
  },
  cajero: {
    label: 'Cajero',
    desc: 'Productos, clientes, ventas y caja en el panel',
    color: 'bg-green-100 text-green-800'
  },
  bodega: {
    label: 'Bodega',
    desc: 'Inventario, productos, compras y órdenes',
    color: 'bg-amber-100 text-amber-800'
  },
  vendedor: {
    label: 'Vendedor',
    desc: 'Pedidos, órdenes y clientes',
    color: 'bg-teal-100 text-teal-800'
  }
};

window.AGROMAX_PERMISOS = {
  admin: ['*'],
  supervisor: [
    'dashboard', 'ordenes', 'pedidos', 'reportes', 'clientes',
    'agregar', 'masiva', 'productos',
    'compras', 'inventario', 'ventas', 'bonificaciones', 'alquileres', 'caja', 'scan'
  ],
  cajero: [
    'productos', 'clientes', 'ventas', 'caja'
  ],
  bodega: [
    'ordenes', 'productos', 'agregar', 'masiva',
    'compras', 'inventario', 'scan'
  ],
  vendedor: [
    'ordenes', 'pedidos', 'clientes', 'productos'
  ]
};

window.usuarioActual = null;

window.tienePermiso = function (clave) {
  var u = window.usuarioActual;
  if (!u || u.activo === false) return false;
  var perms = window.AGROMAX_PERMISOS[u.role] || [];
  return perms.indexOf('*') >= 0 || perms.indexOf(clave) >= 0;
};

window.puedeEditarProductos = function () {
  return tienePermiso('agregar') || tienePermiso('*');
};

function primeraSeccionPermitida() {
  // Todo se queda en admin.html — orden de llegada por rol
  var orden = ['dashboard', 'ventas', 'productos', 'clientes', 'ordenes', 'pedidos', 'caja'];
  for (var i = 0; i < orden.length; i++) {
    if (tienePermiso(orden[i])) return orden[i];
  }
  return 'productos';
}

async function bootstrapPerfil(user) {
  var ref = db.collection('usuarios').doc(user.uid);
  var snap = await ref.get();
  if (snap.exists) return { uid: user.uid, ...snap.data() };

  var esPrimero = false;
  try {
    var admins = await db.collection('usuarios').where('role', '==', 'admin').limit(1).get();
    esPrimero = admins.empty;
  } catch (e) {
    esPrimero = true;
  }

  var perfil = {
    email: user.email || '',
    nombre: (user.email || 'Usuario').split('@')[0],
    role: esPrimero ? 'admin' : 'vendedor',
    activo: true,
    creado: new Date(),
    actualizado: new Date()
  };

  try {
    await ref.set(perfil);
  } catch (e) {
    console.warn('No se pudo crear perfil usuario:', e);
  }

  return { uid: user.uid, ...perfil };
}

window.cargarPerfilUsuario = async function (user) {
  if (!user) {
    window.usuarioActual = null;
    return null;
  }
  try {
    window.usuarioActual = await bootstrapPerfil(user);
  } catch (e) {
    console.error(e);
    window.usuarioActual = {
      uid: user.uid,
      email: user.email,
      nombre: user.email,
      role: 'admin',
      activo: true
    };
  }
  return window.usuarioActual;
};

function aplicarPermisosMenu() {
  document.querySelectorAll('[data-permiso]').forEach(function (el) {
    var clave = el.getAttribute('data-permiso');
    if (!tienePermiso(clave)) {
      el.classList.add('hidden');
      el.style.display = 'none';
    } else {
      el.classList.remove('hidden');
      el.style.display = '';
    }
  });

  // Caja: seccion interna del admin (no redirige solo)
  document.querySelectorAll('a[data-permiso="caja"]').forEach(function (a) {
    a.removeAttribute('href');
    a.setAttribute('onclick', "navegarAdmin('caja')");
    a.classList.add('cursor-pointer');
  });

  var badge = document.getElementById('user-role-badge');
  if (badge && window.usuarioActual) {
    var info = window.AGROMAX_ROLES[window.usuarioActual.role] || {
      label: window.usuarioActual.role,
      color: 'bg-gray-100 text-gray-700'
    };
    badge.innerHTML =
      '<div class="text-xs opacity-90 truncate">' +
      (window.usuarioActual.nombre || window.usuarioActual.email || '') +
      '</div>' +
      '<span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ' +
      info.color + '">' + info.label + '</span>';
  }
}

/** Caja dentro de admin: iframe a pos o acceso rápido */
window.mostrarSeccionCaja = function () {
  var content = document.getElementById('main-content');
  if (!content) return;
  var nombre = (window.usuarioActual && window.usuarioActual.nombre) || 'Usuario';
  content.innerHTML =
    '<div class="mb-6">' +
    '<h1 class="text-2xl md:text-3xl font-bold mb-1">Caja / Mostrador</h1>' +
    '<p class="text-sm text-gray-500">Sesión: <b>' + nombre + '</b> · Las ventas se registran con este nombre</p></div>' +
    '<div class="bg-white rounded-3xl shadow p-6 max-w-xl space-y-4">' +
    '<p class="text-gray-600 text-sm">Abre el módulo de caja en esta misma sesión. No necesitas otro usuario.</p>' +
    '<a href="pos.html" class="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-bold">' +
    '<i class="fas fa-cash-register"></i> Abrir módulo de caja</a>' +
    '<p class="text-xs text-gray-400">También puedes usar Productos, Clientes y Ventas desde el menú lateral sin salir de admin.</p>' +
    '</div>';
};

(function () {
  var originalPanel = window.mostrarPanelPrincipal;
  window.mostrarPanelPrincipal = async function () {
    var user = auth.currentUser;
    if (!user) {
      if (typeof mostrarLogin === 'function') mostrarLogin();
      return;
    }

    await cargarPerfilUsuario(user);

    if (window.usuarioActual && window.usuarioActual.activo === false) {
      alert('Tu cuenta está desactivada. Contacta al administrador.');
      await auth.signOut();
      if (typeof mostrarLogin === 'function') mostrarLogin();
      return;
    }

    // Nunca redirigir a pos.html automáticamente
    window._omitirDashboardInicial = !tienePermiso('dashboard');

    if (typeof originalPanel === 'function') originalPanel();

    setTimeout(function () {
      aplicarPermisosMenu();
      if (window._omitirDashboardInicial) {
        window._omitirDashboardInicial = false;
        var destino = primeraSeccionPermitida();
        if (destino === 'caja') {
          window._skipPermisoOnce = 'caja';
          mostrarSeccionCaja();
          return;
        }
        window._skipPermisoOnce = destino;
        if (typeof mostrarSeccion === 'function') mostrarSeccion(destino);
      }
    }, 100);
  };

  var originalSeccion = window.mostrarSeccion;
  window._mostrarSeccionBase = originalSeccion;

  window.mostrarSeccion = function (seccion) {
    if (window._skipPermisoOnce === seccion) {
      window._skipPermisoOnce = null;
      if (seccion === 'caja') return mostrarSeccionCaja();
      if (typeof originalSeccion === 'function') return originalSeccion(seccion);
      return;
    }

    if (seccion === 'dashboard' && window._omitirDashboardInicial) {
      return;
    }

    if (seccion === 'caja') {
      if (!tienePermiso('caja') && !tienePermiso('*')) {
        alert('No tienes permiso de caja');
        return;
      }
      return mostrarSeccionCaja();
    }

    if (seccion === 'usuarios') {
      if (!tienePermiso('usuarios') && !tienePermiso('*')) {
        alert('No tienes permiso para gestionar usuarios');
        return;
      }
      return mostrarGestionUsuarios();
    }

    if (seccion && !tienePermiso(seccion) && !tienePermiso('*')) {
      alert('No tienes permiso para esta sección');
      return;
    }

    if (typeof originalSeccion === 'function') return originalSeccion(seccion);
  };
})();

/* ========== GESTIÓN DE USUARIOS ========== */

window.mostrarGestionUsuarios = function () {
  var content = document.getElementById('main-content');
  if (!content) return;

  var rolesHtml = Object.keys(AGROMAX_ROLES).map(function (r) {
    var info = AGROMAX_ROLES[r];
    return '<div class="bg-white rounded-2xl p-3 border shadow-sm">' +
      '<span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + info.color + '">' + info.label + '</span>' +
      '<p class="text-xs text-gray-500 mt-2">' + info.desc + '</p></div>';
  }).join('');

  var optionsHtml = Object.keys(AGROMAX_ROLES).map(function (r) {
    return '<option value="' + r + '">' + AGROMAX_ROLES[r].label + '</option>';
  }).join('');

  content.innerHTML =
    '<div class="mb-6 flex flex-wrap justify-between gap-3 items-start">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold mb-1">🔐 Usuarios y roles</h1>' +
    '<p class="text-sm text-gray-500">Control de acceso al panel AGROMAXGTM</p></div>' +
    '<button onclick="mostrarFormUsuario()" class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium">' +
    '<i class="fas fa-user-plus mr-1"></i> Nuevo usuario</button></div>' +
    '<div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">' + rolesHtml + '</div>' +
    '<div id="lista-usuarios" class="bg-white rounded-3xl shadow overflow-hidden">' +
    '<p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin"></i> Cargando...</p></div>' +
    '<div id="modal-usuario" class="hidden fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">' +
    '<div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">' +
    '<h2 class="text-xl font-bold mb-4" id="modal-usuario-titulo">Nuevo usuario</h2>' +
    '<input type="hidden" id="usr-uid">' +
    '<label class="text-xs text-gray-500">Nombre</label>' +
    '<input id="usr-nombre" class="w-full p-3 border rounded-xl mb-3" placeholder="Nombre completo">' +
    '<label class="text-xs text-gray-500">Correo</label>' +
    '<input id="usr-email" type="email" class="w-full p-3 border rounded-xl mb-3" placeholder="correo@ejemplo.com">' +
    '<label class="text-xs text-gray-500" id="usr-pass-label">Contraseña temporal</label>' +
    '<input id="usr-password" type="password" class="w-full p-3 border rounded-xl mb-3" placeholder="Mínimo 6 caracteres">' +
    '<label class="text-xs text-gray-500">Rol</label>' +
    '<select id="usr-role" class="w-full p-3 border rounded-xl mb-3">' + optionsHtml + '</select>' +
    '<label class="flex items-center gap-2 text-sm mb-4"><input type="checkbox" id="usr-activo" checked> Activo</label>' +
    '<p id="usr-error" class="hidden text-red-600 text-sm mb-3"></p>' +
    '<div class="flex gap-2">' +
    '<button onclick="guardarUsuario()" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium">Guardar</button>' +
    '<button onclick="cerrarFormUsuario()" class="px-4 py-3 border rounded-xl">Cancelar</button>' +
    '</div></div></div>';

  cargarListaUsuarios();
};

async function cargarListaUsuarios() {
  var box = document.getElementById('lista-usuarios');
  if (!box) return;

  try {
    var snap = await db.collection('usuarios').get();
    if (snap.empty) {
      box.innerHTML = '<p class="text-center text-gray-400 py-12">No hay usuarios registrados aún</p>';
      return;
    }

    var rows = [];
    snap.forEach(function (doc) {
      var u = doc.data();
      var info = AGROMAX_ROLES[u.role] || { label: u.role || '?', color: 'bg-gray-100 text-gray-700' };
      var yo = window.usuarioActual && window.usuarioActual.uid === doc.id;
      var creado = u.creado && u.creado.toDate ? u.creado.toDate().getTime() : 0;
      rows.push({ id: doc.id, u: u, info: info, yo: yo, creado: creado });
    });
    rows.sort(function (a, b) { return b.creado - a.creado; });

    var html = '<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left">' +
      '<th class="p-3">Usuario</th><th class="p-3">Rol</th><th class="p-3">Estado</th><th class="p-3">Acciones</th>' +
      '</tr></thead><tbody>';

    rows.forEach(function (row) {
      var u = row.u;
      html += '<tr class="border-t hover:bg-gray-50">' +
        '<td class="p-3"><div class="font-medium">' + (u.nombre || '-') + '</div>' +
        '<div class="text-xs text-gray-500">' + (u.email || '') + '</div></td>' +
        '<td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ' + row.info.color + '">' +
        row.info.label + '</span></td>' +
        '<td class="p-3">' + (u.activo === false ? '<span class="text-red-600">Inactivo</span>' : '<span class="text-green-600">Activo</span>') + '</td>' +
        '<td class="p-3 space-x-2">' +
        '<button onclick="editarUsuario(\'' + row.id + '\')" class="text-blue-600 text-xs font-medium">Editar</button>' +
        (row.yo
          ? '<span class="text-xs text-gray-400">Tú</span>'
          : '<button onclick="toggleUsuarioActivo(\'' + row.id + '\', ' + (u.activo === false) + ')" class="text-xs font-medium ' +
            (u.activo === false ? 'text-green-600' : 'text-orange-600') + '">' +
            (u.activo === false ? 'Activar' : 'Desactivar') + '</button>') +
        '</td></tr>';
    });

    html += '</tbody></table>';
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = '<p class="text-red-600 p-6">Error: ' + e.message +
      '. Revisa las reglas de Firestore para la colección <b>usuarios</b>.</p>';
  }
}

window.mostrarFormUsuario = function (data) {
  document.getElementById('modal-usuario').classList.remove('hidden');
  document.getElementById('modal-usuario-titulo').textContent = data ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('usr-uid').value = data ? data.uid : '';
  document.getElementById('usr-nombre').value = data ? (data.nombre || '') : '';
  document.getElementById('usr-email').value = data ? (data.email || '') : '';
  document.getElementById('usr-email').disabled = !!data;
  document.getElementById('usr-password').value = '';
  document.getElementById('usr-pass-label').style.display = data ? 'none' : 'block';
  document.getElementById('usr-password').style.display = data ? 'none' : 'block';
  document.getElementById('usr-role').value = data ? (data.role || 'vendedor') : 'vendedor';
  document.getElementById('usr-activo').checked = data ? data.activo !== false : true;
  document.getElementById('usr-error').classList.add('hidden');
};

window.cerrarFormUsuario = function () {
  document.getElementById('modal-usuario').classList.add('hidden');
};

window.editarUsuario = async function (uid) {
  var doc = await db.collection('usuarios').doc(uid).get();
  if (!doc.exists) return alert('Usuario no encontrado');
  mostrarFormUsuario({ uid: uid, ...doc.data() });
};

window.toggleUsuarioActivo = async function (uid, activar) {
  if (!confirm(activar ? '¿Activar este usuario?' : '¿Desactivar este usuario?')) return;
  try {
    await db.collection('usuarios').doc(uid).update({ activo: !!activar, actualizado: new Date() });
    cargarListaUsuarios();
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

window.guardarUsuario = async function () {
  var uid = document.getElementById('usr-uid').value;
  var nombre = document.getElementById('usr-nombre').value.trim();
  var email = document.getElementById('usr-email').value.trim().toLowerCase();
  var password = document.getElementById('usr-password').value;
  var role = document.getElementById('usr-role').value;
  var activo = document.getElementById('usr-activo').checked;
  var err = document.getElementById('usr-error');

  if (!nombre) {
    err.textContent = 'Ingresa el nombre';
    err.classList.remove('hidden');
    return;
  }

  try {
    if (uid) {
      await db.collection('usuarios').doc(uid).update({
        nombre: nombre,
        role: role,
        activo: activo,
        actualizado: new Date()
      });
      alert('✅ Usuario actualizado');
    } else {
      if (!email || !password || password.length < 6) {
        err.textContent = 'Correo y contraseña (mín. 6) son obligatorios';
        err.classList.remove('hidden');
        return;
      }

      var secondary = firebase.apps.find(function (a) { return a.name === 'Secondary'; })
        || firebase.initializeApp(firebase.app().options, 'Secondary');
      var secAuth = secondary.auth();
      var cred = await secAuth.createUserWithEmailAndPassword(email, password);
      var newUid = cred.user.uid;

      await db.collection('usuarios').doc(newUid).set({
        email: email,
        nombre: nombre,
        role: role,
        activo: activo,
        creado: new Date(),
        actualizado: new Date()
      });

      await secAuth.signOut();
      alert('✅ Usuario creado. Ya puede iniciar sesión con su correo.');
    }

    cerrarFormUsuario();
    cargarListaUsuarios();
  } catch (e) {
    var msg = e.message;
    if (e.code === 'auth/email-already-in-use') msg = 'Ese correo ya está registrado';
    if (e.code === 'auth/weak-password') msg = 'Contraseña muy débil';
    err.textContent = msg;
    err.classList.remove('hidden');
  }
};
