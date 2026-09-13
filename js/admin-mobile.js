// js/admin-mobile.js
// Layout profesional del Admin: sidebar agrupada + header

(function () {
  window.mostrarPanelPrincipal = function () {
    document.getElementById('app').innerHTML = `
      <div class="flex h-screen relative bg-slate-100">
        <div id="sidebar-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden" onclick="cerrarSidebarAdmin()"></div>

        <aside id="admin-sidebar" class="fixed md:static inset-y-0 left-0 z-50 w-64 md:w-64 bg-white border-r border-slate-200 shadow-sm overflow-y-auto transform -translate-x-full md:translate-x-0 transition-transform duration-200">
          <div class="p-4 border-b bg-gradient-to-br from-green-700 to-green-800 text-white flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-green-700 text-xl shrink-0 shadow-sm">🌱</div>
              <div class="min-w-0">
                <h1 class="text-base font-bold truncate tracking-tight">AGROMAX</h1>
                <p class="text-[10px] opacity-90">Panel de administración</p>
              </div>
            </div>
            <button onclick="cerrarSidebarAdmin()" class="md:hidden text-white text-2xl leading-none px-1">&times;</button>
          </div>

          <div id="user-role-badge" class="px-4 py-3 border-b border-slate-100 bg-slate-50 text-sm">
            <div class="text-xs text-slate-400">Cargando usuario...</div>
          </div>

          <nav class="p-2 pb-8 text-sm">
            <div class="nav-group">Principal</div>
            <a data-permiso="dashboard" data-seccion="dashboard" onclick="navegarAdmin('dashboard')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-home w-5 text-center text-slate-400 text-sm"></i> Dashboard</a>
            <a data-permiso="caja" data-seccion="caja" onclick="navegarAdmin('caja')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-money-bill-wave w-5 text-center text-green-600 text-sm"></i> Caja (POS)</a>

            <div class="nav-group">Operación</div>
            <a data-permiso="ordenes" data-seccion="ordenes" onclick="navegarAdmin('ordenes')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-clipboard-list w-5 text-center text-slate-400 text-sm"></i> Órdenes</a>
            <a data-permiso="pedidos" data-seccion="pedidos" onclick="navegarAdmin('pedidos')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 relative">
              <i class="fas fa-receipt w-5 text-center text-slate-400 text-sm"></i> Pedidos
              <span id="badge-pedidos" class="hidden ml-auto bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full">0</span>
            </a>
            <a data-permiso="clientes" data-seccion="clientes" onclick="navegarAdmin('clientes')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-users w-5 text-center text-slate-400 text-sm"></i> Clientes</a>

            <div class="nav-group">Inventario y compras</div>
            <a data-permiso="productos" data-seccion="productos" onclick="navegarAdmin('productos')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-boxes w-5 text-center text-slate-400 text-sm"></i> Productos</a>
            <a data-permiso="agregar" data-seccion="agregar" onclick="navegarAdmin('agregar')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-plus w-5 text-center text-slate-400 text-sm"></i> Agregar producto</a>
            <a data-permiso="masiva" data-seccion="masiva" onclick="navegarAdmin('masiva')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-file-csv w-5 text-center text-slate-400 text-sm"></i> Subida masiva</a>
            <a data-permiso="compras" data-seccion="compras" onclick="navegarAdmin('compras')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-truck w-5 text-center text-slate-400 text-sm"></i> Compras</a>
            <a data-permiso="scan" href="scan.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-barcode w-5 text-center text-slate-400 text-sm"></i> Scan</a>

            <div class="nav-group">Ventas y finanzas</div>
            <a data-permiso="ventas" href="ventas.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-chart-pie w-5 text-center text-slate-400 text-sm"></i> Ventas</a>
            <a data-permiso="reportes" data-seccion="reportes" onclick="navegarAdmin('reportes')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-chart-bar w-5 text-center text-slate-400 text-sm"></i> Reportes</a>
            <a data-permiso="contabilidad" data-seccion="contabilidad" onclick="navegarAdmin('contabilidad')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-balance-scale w-5 text-center text-slate-400 text-sm"></i> Contabilidad</a>
            <a data-permiso="bonificaciones" href="bonificaciones.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-gift w-5 text-center text-slate-400 text-sm"></i> Bonificaciones</a>
            <a data-permiso="alquileres" href="alquileres.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-key w-5 text-center text-slate-400 text-sm"></i> Alquileres</a>

            <div class="nav-group">Sistema</div>
            <a data-permiso="usuarios" data-seccion="usuarios" id="link-usuarios" onclick="navegarAdmin('usuarios')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700"><i class="fas fa-user-shield w-5 text-center text-slate-400 text-sm"></i> Usuarios y roles</a>
            <a onclick="logout()" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-red-600 mt-2"><i class="fas fa-sign-out-alt w-5 text-center text-sm"></i> Cerrar sesión</a>
          </nav>
        </aside>

        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header class="bg-white border-b border-slate-200 px-3 md:px-6 py-2.5 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
            <button onclick="abrirSidebarAdmin()" class="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <i class="fas fa-bars"></i>
            </button>
            <div class="hidden md:block">
              <div class="text-sm font-bold text-slate-800">Panel AGROMAX</div>
              <div class="text-[10px] text-slate-400" id="admin-clock">—</div>
            </div>
            <div class="md:hidden font-bold text-green-700 text-sm">AGROMAX</div>

            <div class="ml-auto flex items-center gap-2">
              <button type="button" onclick="navegarAdmin('caja')" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700">
                <i class="fas fa-cash-register"></i> Caja
              </button>
              <div class="relative">
                <button type="button" onclick="toggleNotifPanel()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 relative">
                  <i class="fas fa-bell"></i>
                  <span id="notif-badge" class="hidden absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full">0</span>
                </button>
                <div id="notif-panel" class="hidden absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                  <div class="px-4 py-3 border-b flex justify-between items-center">
                    <span class="font-semibold text-sm">Notificaciones</span>
                    <button type="button" onclick="marcarNotifsLeidas()" class="text-xs text-green-600">Marcar leídas</button>
                  </div>
                  <div id="notif-list" class="max-h-72 overflow-auto"></div>
                </div>
              </div>
            </div>
          </header>

          <div class="flex-1 overflow-auto p-4 md:p-6" id="main-content"></div>
        </div>
      </div>
    `;

    if (typeof renderNotifBell === 'function') renderNotifBell();
    if (typeof mostrarSeccion === 'function') mostrarSeccion('dashboard');
    if (typeof marcarMenuActivo === 'function') marcarMenuActivo('dashboard');
  };

  window.abrirSidebarAdmin = function () {
    const sb = document.getElementById('admin-sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.remove('-translate-x-full');
    if (ov) ov.classList.remove('hidden');
  };

  window.cerrarSidebarAdmin = function () {
    const sb = document.getElementById('admin-sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (sb) sb.classList.add('-translate-x-full');
    if (ov) ov.classList.add('hidden');
  };

  window.navegarAdmin = function (seccion) {
    cerrarSidebarAdmin();
    var panel = document.getElementById('notif-panel');
    if (panel) panel.classList.add('hidden');
    if (typeof marcarMenuActivo === 'function') marcarMenuActivo(seccion);
    if (typeof mostrarSeccion === 'function') mostrarSeccion(seccion);
  };
})();
