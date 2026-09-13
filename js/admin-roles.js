// js/admin-roles.js
// Roles + permisos. Un solo acceso: admin.html

window.AGROMAX_ROLES = {
  admin: {
    label: 'Administrador',
    desc: 'Acceso total al sistema',
    color: 'bg-purple-100 text-purple-800'
  },
  supervisor: {
    label: 'Supervisor',
    desc: 'Operacion completa sin gestionar usuarios',
    color: 'bg-blue-100 text-blue-800'
  },
  cajero: {
    label: 'Cajero',
    desc: 'Solo modulo de caja (mostrador POS)',
    color: 'bg-green-100 text-green-800'
  },
  bodega: {
    label: 'Bodega',
    desc: 'Productos, compras y ordenes',
    color: 'bg-amber-100 text-amber-800'
  },
  vendedor: {
    label: 'Vendedor',
    desc: 'Pedidos, ordenes y clientes',
    color: 'bg-teal-100 text-teal-800'
  }
};

window.AGROMAX_PERMISOS = {
  admin: ['*'],
  supervisor: [
    'dashboard', 'ordenes', 'pedidos', 'reportes', 'clientes',
    'agregar', 'productos', 'compras', 'contabilidad',
    'ventas', 'bonificaciones', 'alquileres', 'caja', 'notas'
  ],
  cajero: ['caja'],
  bodega: ['ordenes', 'productos', 'agregar', 'compras'],
  vendedor: ['ordenes', 'pedidos', 'clientes', 'productos', 'notas']
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
  if (window.usuarioActual && window.usuarioActual.role === 'cajero') return 'caja';
  var orden = ['dashboard', 'ventas', 'productos', 'clientes', 'ordenes', 'pedidos', 'caja', 'contabilidad', 'notas'];
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
      alert('Tu cuenta esta desactivada. Contacta al administrador.');
      await auth.signOut();
      if (typeof mostrarLogin === 'function') mostrarLogin();
      return;
    }

    window._omitirDashboardInicial = !tienePermiso('dashboard');

    if (typeof originalPanel === 'function') originalPanel();

    setTimeout(function () {
      aplicarPermisosMenu();
      if (window._omitirDashboardInicial) {
        window._omitirDashboardInicial = false;
        var destino = primeraSeccionPermitida();
        if (destino === 'caja') {
          window._skipPermisoOnce = 'caja';
          if (typeof mostrarSeccionCaja === 'function') mostrarSeccionCaja();
          return;
        }
        window._skipPermisoOnce = destino;
        if (typeof mostrarSeccion === 'function') mostrarSeccion(destino);
      }
    }, 120);
  };

  var originalSeccion = window.mostrarSeccion;
  window._mostrarSeccionBase = originalSeccion;

  window.mostrarSeccion = function (seccion) {
    if (window._skipPermisoOnce === seccion) {
      window._skipPermisoOnce = null;
      if (seccion === 'caja') {
        if (typeof mostrarSeccionCaja === 'function') return mostrarSeccionCaja();
        return;
      }
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
      if (typeof mostrarSeccionCaja === 'function') return mostrarSeccionCaja();
      return;
    }

    if (seccion === 'usuarios') {
      if (!tienePermiso('usuarios') && !tienePermiso('*')) {
        alert('No tienes permiso para gestionar usuarios');
        return;
      }
      return mostrarGestionUsuarios();
    }

    if (seccion && !tienePermiso(seccion) && !tienePermiso('*')) {
      alert('No tienes permiso para esta seccion');
      return;
    }

    if (typeof originalSeccion === 'function') return originalSeccion(seccion);
  };
})();

/* GESTION USUARIOS - se mantiene via original si existe en cadena; copia minima si falta */
if (typeof window.mostrarGestionUsuarios !== 'function') {
  window.mostrarGestionUsuarios = function () {
    var content = document.getElementById('main-content');
    if (content) content.innerHTML = '<p class="p-6">Gestion de usuarios no cargada.</p>';
  };
}
