// js/admin-security.js
// (1)(16) Login seguro sin credenciales precargadas

window.mostrarLogin = function () {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div class="bg-white p-8 md:p-10 rounded-3xl shadow-2xl max-w-md w-full">
        <div class="flex justify-center mb-6">
          <div class="w-16 h-16 md:w-20 md:h-20 bg-green-700 rounded-3xl flex items-center justify-center text-white text-4xl md:text-5xl">🌱</div>
        </div>
        <h1 class="text-2xl md:text-3xl font-bold text-center mb-2">AGROMAXGTM</h1>
        <p class="text-center text-green-600 mb-8 text-sm md:text-base">Panel de Administración</p>

        <label class="block text-sm text-gray-600 mb-1">Correo</label>
        <input id="email" type="email" autocomplete="username" placeholder="tu@correo.com"
               class="w-full p-3.5 md:p-4 border rounded-2xl mb-4 focus:outline-none focus:ring-2 focus:ring-green-500">

        <label class="block text-sm text-gray-600 mb-1">Contraseña</label>
        <input id="password" type="password" autocomplete="current-password" placeholder="••••••••"
               class="w-full p-3.5 md:p-4 border rounded-2xl mb-2 focus:outline-none focus:ring-2 focus:ring-green-500">

        <p id="login-error" class="hidden text-red-600 text-sm mb-4"></p>

        <button onclick="login()" id="btn-login"
                class="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 md:py-4 rounded-2xl font-bold text-base md:text-lg">
          Ingresar al Panel
        </button>
      </div>
    </div>`;

  // Enter para enviar
  setTimeout(function () {
    var pass = document.getElementById('password');
    if (pass) pass.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });
  }, 100);
};

window.login = async function () {
  var emailEl = document.getElementById('email');
  var passEl = document.getElementById('password');
  var errEl = document.getElementById('login-error');
  var btn = document.getElementById('btn-login');
  if (!emailEl || !passEl) return;

  var email = emailEl.value.trim();
  var password = passEl.value;

  if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
  if (!email || !password) {
    if (errEl) {
      errEl.textContent = 'Ingresa correo y contraseña';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    mostrarPanelPrincipal();
  } catch (e) {
    var msg = 'No se pudo iniciar sesión';
    if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
      msg = 'Correo o contraseña incorrectos';
    } else if (e.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos. Espera un momento';
    } else if (e.message) {
      msg = e.message;
    }
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Ingresar al Panel';
    }
  }
};
