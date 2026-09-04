// js/admin-mobile.js
// Layout responsive del Admin en teléfono (menú hamburguesa + tamaños compactos)

(function () {
  window.mostrarPanelPrincipal = function () {
    document.getElementById('app').innerHTML = `
      <div class="flex h-screen relative">

        <div id="sidebar-overlay" class="fixed inset-0 bg-black/40 z-40 hidden md:hidden" onclick="cerrarSidebarAdmin()"></div>

        <div id="admin-sidebar" class="fixed md:static inset-y-0 left-0 z-50 w-64 md:w-72 bg-white border-r shadow-xl overflow-y-auto transform -translate-x-full md:translate-x-0 transition-transform duration-200">
          <div class="p-4 md:p-6 border-b bg-green-700 text-white flex items-center justify-between">
            <div class="flex items-center gap-2 md:gap-3 min-w-0">
              <div class="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-green-700 text-xl md:text-2xl shrink-0">🌱</div>
              <div class="min-w-0">
                <h1 class="text-lg md:text-2xl font-bold truncate">AGROMAXGTM</h1>
                <p class="text-[10px] md:text-xs opacity-90">Administración</p>
              </div>
            </div>
            <button onclick="cerrarSidebarAdmin()" class="md:hidden text-white text-2xl leading-none px-2">&times;</button>
          </div>

          <nav class="p-3 md:p-4 space-y-0.5 text-sm md:text-base">
            <a onclick="navegarAdmin('dashboard')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-home w-5 text-center text-sm"></i> Dashboard</a>
            <a onclick="navegarAdmin('reportes')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-chart-bar w-5 text-center text-sm"></i> Reportes</a>
            <a onclick="navegarAdmin('clientes')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-users w-5 text-center text-sm"></i> Clientes</a>
            <a onclick="navegarAdmin('agregar')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-plus w-5 text-center text-sm"></i> Agregar Producto</a>
            <a onclick="navegarAdmin('masiva')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-file-csv w-5 text-center text-sm"></i> Subida Masiva</a>
            <a href="compras.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-truck w-5 text-center text-sm"></i> Compras</a>
            <a href="inventario.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-warehouse w-5 text-center text-sm"></i> Inventario</a>
            <a href="ventas.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-cash-register w-5 text-center text-sm"></i> Ventas</a>
            <a href="bonificaciones.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-gift w-5 text-center text-sm"></i> Bonificaciones</a>
            <a href="alquileres.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-key w-5 text-center text-sm"></i> Alquileres</a>
            <a href="caja.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-money-bill-wave w-5 text-center text-sm"></i> Caja</a>
            <a onclick="navegarAdmin('pedidos')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer relative">
              <i class="fas fa-receipt w-5 text-center text-sm"></i> Pedidos
              <span id="badge-pedidos" class="hidden ml-auto bg-red-500 text-white text-xs font-bold min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full">0</span>
            </a>
            <a href="scan.html" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-barcode w-5 text-center text-sm"></i> Scan</a>
            <a onclick="navegarAdmin('productos')" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-green-50 cursor-pointer"><i class="fas fa-list w-5 text-center text-sm"></i> Productos</a>
            <a onclick="logout()" class="flex items-center gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-red-50 text-red-600 mt-6 md:mt-10 cursor-pointer"><i class="fas fa-sign-out-alt w-5 text-center text-sm"></i> Cerrar Sesión</a>
          </nav>
        </div>

        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div class="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-30">
            <button onclick="abrirSidebarAdmin()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <i class="fas fa-bars"></i>
            </button>
            <div class="font-bold text-green-700">AGROMAXGTM</div>
          </div>
          <div class="flex-1 overflow-auto p-4 md:p-8" id="main-content"></div>
        </div>
      </div>
    `;

    if (typeof mostrarSeccion === 'function') mostrarSeccion('dashboard');
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
    if (typeof mostrarSeccion === 'function') mostrarSeccion(seccion);
  };
})();
