// js/admin-roles.js
// Roles de usuario + permisos + gestión de usuarios

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
    desc: 'Caja, ventas y pedidos',
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

// Secciones / enlaces permitidos por rol (* = todo)
window.AGROMAX_PERMISOS = {
  admin: ['*'],
  supervisor: [
    'dashboard', 'ordenes', 'pedidos', 'reportes', 'clientes',
    'agregar', 'masiva', 'productos',
    'compras', 'inventario', 'ventas', 'bonificaciones', 'alquileres', 'caja', 'scan'
  ],
  cajero: [
    'dashboard', 'pedidos', 'ordenes', 'clientes', 'ventas', 'caja'
  ],
  bodega: [
    'dashboard', 'ordenes', 'productos', 'agregar', 'masiva',
    'compras', 'inventario', 'scan'
  ],
  vendedor: [
    'dashboard', 'ordenes', 'pedidos', 'clientes', 'productos'
  ]
};

window.usuarioActual = null;

window.tienePermiso = function (clave) {
  const u = window.usuarioActual;
  if (!u || u.activo === false) return false;
  const perms = window.AGROMAX_PERMISOS[u.role] || [];
  return perms.includes('*') || perms.includes(clave);
};

async function bootstrapPerfil(user) {
  const ref = db.collection('usuarios').doc(user.uid);
  const snap = await ref.get();
  if (snap.exists) return { uid: user.uid, ...snap.data() };

  // ¿Hay algún usuario admin ya?
  let esPrimero = false;
  try {
    const admins = await db.collection('usuarios').where('role', '==', 'admin').limit(1).get();
    esPrimero = admins.empty;
  } catch (e) {
    // Si no puede leer la colección, asumimos primer acceso
    esPrimero = true;
  }

  const perfil = {
    email: user.email || '',
    nombre: (user.email || 'Usuario').split('@')[0],
    role: esPrimero ? 'admin' : 'vendedor',
    activo: true,
    creado: new Date(),
    actualizado: new Date()
  };

  // Si no es el primero y nadie lo registró, queda como vendedor básico
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
  document.querySelectorAll('[data-permiso]').forEach(el => {
    const clave = el.getAttribute('data-permiso');
    if (!tienePermiso(clave)) {
      el.classList.add('hidden');
      el.style.display = 'none';
    } else {
      el.classList.remove('hidden');
      el.style.display = '';
    }
  });

  // Badge de rol en sidebar
  const badge = document.getElementById('user-role-badge');
  if (badge && window.usuarioActual) {
    const info = window.AGROMAX_ROLES[window.usuarioActual.role] || { label: window.usuarioActual.role, color: 'bg-gray-100 text-gray-700' };
    badge.innerHTML = `
      <div class="text-xs opacity-90 truncate">${window.usuarioActual.nombre || window.usuarioActual.email || ''}</div>
      <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${info.color}">${info.label}</span>
    `;
  }
}

// Envolver panel principal
(function () {
  const originalPanel = window.mostrarPanelPrincipal;
  window.mostrarPanelPrincipal = async function () {
    const user = auth.currentUser;
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

    if (typeof originalPanel === 'function') originalPanel();

    // Asegurar atributos data-permiso si el HTML aún no los tiene
    setTimeout(function () {
      const map = {
        'dashboard': 'dashboard',
        'ordenes': 'ordenes',
        'pedidos': 'pedidos',
        'reportes': 'reportes',
        'clientes': 'clientes',
        'agregar': 'agregar',
        'masiva': 'masiva',
        'productos': 'productos'
      };
      document.querySelectorAll('nav a[onclick]').forEach(a => {
        const oc = a.getAttribute('onclick') || '';
        Object.keys(map).forEach(k => {
          if (oc.indexOf(""" + k + """) >= 0 || oc.indexOf("'" + k + "'") >= 0) {
            a.setAttribute('data-permiso', map[k]);
          }
        });
      });
      document.querySelectorAll('nav a[href]').forEach(a => {
        const href = (a.getAttribute('href') || '').toLowerCase();
        if (href.indexOf('compras') >= 0) a.setAttribute('data-permiso', 'compras');
        if (href.indexOf('inventario') >= 0) a.setAttribute('data-permiso', 'inventario');
        if (href.indexOf('ventas') >= 0) a.setAttribute('data-permiso', 'ventas');
        if (href.indexOf('bonificaciones') >= 0) a.setAttribute('data-permiso', 'bonificaciones');
        if (href.indexOf('alquileres') >= 0) a.setAttribute('data-permiso', 'alquileres');
        if (href.indexOf('caja') >= 0) a.setAttribute('data-permiso', 'caja');
        if (href.indexOf('scan') >= 0) a.setAttribute('data-permiso', 'scan');
      });

      // Insertar enlace Usuarios si no existe
      const nav = document.querySelector('#admin-sidebar nav, .w-72 nav, nav');
      if (nav && !document.getElementById('link-usuarios')) {
        const logoutLink = nav.querySelector('a[onclick*="logout"]');
        const a = document.createElement('a');
        a.id = 'link-usuarios';
        a.setAttribute('data-permiso', 'usuarios');
        a.className = 'flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer';
        a.innerHTML = '<i class="fas fa-user-shield w-5 text-center text-sm"></i> Usuarios y roles';
        a.onclick = function () {
          if (typeof navegarAdmin === 'function') navegarAdmin('usuarios');
          else if (typeof mostrarSeccion === 'function') mostrarSeccion('usuarios');
        };
        if (logoutLink) nav.insertBefore(a, logoutLink);
        else nav.appendChild(a);
      }

      // Badge usuario en header sidebar
      const header = document.querySelector('#admin-sidebar .border-b, .w-72 .border-b');
      if (header && !document.getElementById('user-role-badge')) {
        const div = document.createElement('div');
        div.id = 'user-role-badge';
        div.className = 'px-4 py-3 border-b bg-green-800 text-white text-sm';
        header.parentNode.insertBefore(div, header.nextSibling);
      }

      aplicarPermisosMenu();
    }, 50);
  };

  const originalSeccion = window.mostrarSeccion;
  window.mostrarSeccion = function (seccion) {
    if (seccion === 'usuarios') {
      if (!tienePermiso('usuarios') && !tienePermiso('*')) {
        alert('No tienes permiso para gestionar usuarios');
        return;
      }
      return mostrarGestionUsuarios();
    }

    // Mapeo de secciones a permisos
    const clave = seccion;
    if (clave && !tienePermiso(clave) && !tienePermiso('*')) {
      alert('No tienes permiso para esta sección');
      return;
    }

    if (typeof originalSeccion === 'function') return originalSeccion(seccion);
  };
})();

/* ========== GESTIÓN DE USUARIOS ========== */

window.mostrarGestionUsuarios = function () {
  const content = document.getElementById('main-content');
  if (!content) return;

  content.innerHTML = `
    <div class="mb-6 flex flex-wrap justify-between gap-3 items-start">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold mb-1">🔐 Usuarios y roles</h1>
        <p class="text-sm text-gray-500">Control de acceso al panel AGROMAXGTM</p>
      </div>
      <button onclick="mostrarFormUsuario()" class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium">
        <i class="fas fa-user-plus mr-1"></i> Nuevo usuario
      </button>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      ${Object.keys(AGROMAX_ROLES).map(r => {
        const info = AGROMAX_ROLES[r];
        return `<div class="bg-white rounded-2xl p-3 border shadow-sm">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${info.color}">${info.label}</span>
          <p class="text-xs text-gray-500 mt-2">${info.desc}</p>
        </div>`;
      }).join('')}
    </div>

    <div id="lista-usuarios" class="bg-white rounded-3xl shadow overflow-hidden">
      <p class="text-center text-gray-400 py-10"><i class="fas fa-spinner fa-spin"></i> Cargando...</p>
    </div>

    <div id="modal-usuario" class="hidden fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
        <h2 class="text-xl font-bold mb-4" id="modal-usuario-titulo">Nuevo usuario</h2>
        <input type="hidden" id="usr-uid">
        <label class="text-xs text-gray-500">Nombre</label>
        <input id="usr-nombre" class="w-full p-3 border rounded-xl mb-3" placeholder="Nombre completo">
        <label class="text-xs text-gray-500">Correo</label>
        <input id="usr-email" type="email" class="w-full p-3 border rounded-xl mb-3" placeholder="correo@ejemplo.com">
        <label class="text-xs text-gray-500" id="usr-pass-label">Contraseña temporal</label>
        <input id="usr-password" type="password" class="w-full p-3 border rounded-xl mb-3" placeholder="Mínimo 6 caracteres">
        <label class="text-xs text-gray-500">Rol</label>
        <select id="usr-role" class="w-full p-3 border rounded-xl mb-3">
          ${Object.keys(AGROMAX_ROLES).map(r => `<option value="${r}">${AGROMAX_ROLES[r].label}</option>`).join('')}
        </select>
        <label class="flex items-center gap-2 text-sm mb-4">
          <input type="checkbox" id="usr-activo" checked> Activo
        </label>
        <p id="usr-error" class="hidden text-red-600 text-sm mb-3"></p>
        <div class="flex gap-2">
          <button onclick="guardarUsuario()" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium">Guardar</button>
          <button onclick="cerrarFormUsuario()" class="px-4 py-3 border rounded-xl">Cancelar</button>
        </div>
      </div>
    </div>
  `;

  cargarListaUsuarios();
};

async function cargarListaUsuarios() {
  const box = document.getElementById('lista-usuarios');
  if (!box) return;

  try {
    const snap = await db.collection('usuarios').orderBy('creado', 'desc').get();
    if (snap.empty) {
      box.innerHTML = '<p class="text-center text-gray-400 py-12">No hay usuarios registrados aún</p>';
      return;
    }

    let html = `<table class="w-full text-sm"><thead><tr class="bg-gray-50 text-left">
      <th class="p-3">Usuario</th><th class="p-3">Rol</th><th class="p-3">Estado</th><th class="p-3">Acciones</th>
    </tr></thead><tbody>`;

    snap.forEach(doc => {
      const u = doc.data();
      const info = AGROMAX_ROLES[u.role] || { label: u.role || '?', color: 'bg-gray-100 text-gray-700' };
      const yo = window.usuarioActual && window.usuarioActual.uid === doc.id;
      html += `<tr class="border-t hover:bg-gray-50">
        <td class="p-3">
          <div class="font-medium">${u.nombre || '-'}</div>
          <div class="text-xs text-gray-500">${u.email || ''}</div>
        </td>
        <td class="p-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold ${info.color}">${info.label}</span></td>
        <td class="p-3">${u.activo === false ? '<span class="text-red-600">Inactivo</span>' : '<span class="text-green-600">Activo</span>'}</td>
        <td class="p-3 space-x-2">
          <button onclick="editarUsuario('${doc.id}')" class="text-blue-600 text-xs font-medium">Editar</button>
          ${!yo ? `<button onclick="toggleUsuarioActivo('${doc.id}', ${u.activo === false})" class="text-xs font-medium ${u.activo === false ? 'text-green-600' : 'text-orange-600'}">${u.activo === false ? 'Activar' : 'Desactivar'}</button>` : '<span class="text-xs text-gray-400">Tú</span>'}
        </td>
      </tr>`;
    });
    html += '</tbody></table>';
    box.innerHTML = html;
  } catch (e) {
    box.innerHTML = `<p class="text-red-600 p-6">Error: ${e.message}. Revisa las reglas de Firestore para la colección <b>usuarios</b>.</p>`;
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
  document.getElementById('usr-password').parentElement; // keep
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
  const doc = await db.collection('usuarios').doc(uid).get();
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
  const uid = document.getElementById('usr-uid').value;
  const nombre = document.getElementById('usr-nombre').value.trim();
  const email = document.getElementById('usr-email').value.trim().toLowerCase();
  const password = document.getElementById('usr-password').value;
  const role = document.getElementById('usr-role').value;
  const activo = document.getElementById('usr-activo').checked;
  const err = document.getElementById('usr-error');

  if (!nombre) {
    err.textContent = 'Ingresa el nombre';
    err.classList.remove('hidden');
    return;
  }

  try {
    if (uid) {
      // Solo actualizar perfil
      await db.collection('usuarios').doc(uid).update({
        nombre, role, activo, actualizado: new Date()
      });
      alert('✅ Usuario actualizado');
    } else {
      if (!email || !password || password.length < 6) {
        err.textContent = 'Correo y contraseña (mín. 6) son obligatorios';
        err.classList.remove('hidden');
        return;
      }

      // Crear cuenta Auth sin cerrar sesión actual (app secundaria)
      const secondary = firebase.apps.find(a => a.name === 'Secondary')
        || firebase.initializeApp(firebase.app().options, 'Secondary');
      const secAuth = secondary.auth();
      const cred = await secAuth.createUserWithEmailAndPassword(email, password);
      const newUid = cred.user.uid;

      await db.collection('usuarios').doc(newUid).set({
        email,
        nombre,
        role,
        activo,
        creado: new Date(),
        actualizado: new Date()
      });

      await secAuth.signOut();
      alert('✅ Usuario creado. Ya puede iniciar sesión con su correo.');
    }

    cerrarFormUsuario();
    cargarListaUsuarios();
  } catch (e) {
    let msg = e.message;
    if (e.code === 'auth/email-already-in-use') msg = 'Ese correo ya está registrado';
    if (e.code === 'auth/weak-password') msg = 'Contraseña muy débil';
    err.textContent = msg;
    err.classList.remove('hidden');
  }
};
