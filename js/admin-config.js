// js/admin-config.js — Panel de configuración AGROMAX

window.AGROMAX_CONFIG = window.AGROMAX_CONFIG || null;

window.cargarConfigGlobal = async function () {
  try {
    var doc = await db.collection('config').doc('empresa').get();
    window.AGROMAX_CONFIG = doc.exists ? doc.data() : defaultConfig();
  } catch (e) {
    window.AGROMAX_CONFIG = defaultConfig();
  }
  aplicarTemaConfig();
  return window.AGROMAX_CONFIG;
};

function defaultConfig() {
  return {
    nombreComercial: 'AGROMAXGTM',
    razonSocial: 'AGROMAX',
    nit: '',
    direccion: '',
    telefono: '',
    whatsapp: '',
    email: '',
    logoUrl: '',
    colorPrimario: '#15803d',
    colorAcento: '#16a34a',
    mensajeTicket: '¡Gracias por su compra!',
    pieTicket: 'Caja Mostrador',
    serieFactura: 'A',
    moneda: 'Q',
    decimales: 2,
    exigirTurnoCaja: true,
    sonidoCaja: true,
    catalogoWhatsApp: '',
    catalogoMensaje: 'Hola, quiero información de mi pedido',
    catalogoEnvio: 'Entrega a coordinar',
    stockMinimoGlobal: 5,
    diasAlertaVence: 30,
    zonaHoraria: 'America/Guatemala',
    temaAdmin: 'claro',
    mostrarReloj: true,
    mostrarBadgePedidos: true,
    // Preferencias por rol (visual)
    rolesUI: {
      admin: { densidad: 'normal', mostrarKPIs: true },
      supervisor: { densidad: 'normal', mostrarKPIs: true },
      cajero: { densidad: 'compacta', mostrarKPIs: false },
      bodega: { densidad: 'normal', mostrarKPIs: false },
      vendedor: { densidad: 'normal', mostrarKPIs: true }
    }
  };
}

function aplicarTemaConfig() {
  var cfg = window.AGROMAX_CONFIG || defaultConfig();
  try {
    document.documentElement.style.setProperty('--agro-primary', cfg.colorPrimario || '#15803d');
    document.documentElement.style.setProperty('--agro-accent', cfg.colorAcento || '#16a34a');
    if (cfg.temaAdmin === 'oscuro') {
      document.body.classList.add('agro-dark');
    } else {
      document.body.classList.remove('agro-dark');
    }
  } catch (e) {}
}

window.mostrarConfiguracion = async function () {
  if (!tienePermiso('*') && !tienePermiso('config') && !(window.usuarioActual && window.usuarioActual.role === 'admin')) {
    alert('Solo administradores pueden editar la configuración');
    return;
  }

  var c = document.getElementById('main-content');
  c.innerHTML =
    '<div class="mb-4">' +
    '<h1 class="text-2xl md:text-3xl font-bold text-slate-900">Configuración</h1>' +
    '<p class="text-sm text-slate-500">Empresa, tickets, caja, catálogo y preferencias visuales</p></div>' +
    '<div class="flex flex-wrap gap-1.5 mb-4" id="cfg-tabs">' +
    tabCfg('empresa', 'Empresa') +
    tabCfg('visual', 'Visual') +
    tabCfg('ticket', 'Tickets') +
    tabCfg('caja', 'Caja') +
    tabCfg('catalogo', 'Catálogo') +
    tabCfg('alertas', 'Alertas') +
    tabCfg('roles', 'Por rol') +
    '</div>' +
    '<div id="cfg-body" class="max-w-2xl"></div>' +
    '<div class="mt-4 flex flex-wrap gap-2">' +
    '<button type="button" onclick="guardarTodaConfig()" class="bg-green-600 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-sm hover:bg-green-700">' +
    '<i class="fas fa-save mr-1"></i> Guardar todo</button>' +
    '<button type="button" onclick="exportarConfig()" class="border border-slate-200 bg-white px-4 py-3 rounded-2xl text-sm font-semibold">Exportar JSON</button>' +
    '</div>';

  await cargarConfigGlobal();
  cfgTab('empresa');
};

function tabCfg(id, label) {
  return '<button type="button" data-cfgtab="' + id + '" onclick="cfgTab(\'' + id + '\')" ' +
    'class="cfgtab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-white text-slate-600 border-slate-200">' + label + '</button>';
}

window.cfgTab = function (id) {
  document.querySelectorAll('.cfgtab').forEach(function (b) {
    var on = b.getAttribute('data-cfgtab') === id;
    b.className = 'cfgtab px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold border ' +
      (on ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200');
  });
  var cfg = window.AGROMAX_CONFIG || defaultConfig();
  var body = document.getElementById('cfg-body');
  if (id === 'empresa') body.innerHTML = formEmpresa(cfg);
  else if (id === 'visual') body.innerHTML = formVisual(cfg);
  else if (id === 'ticket') body.innerHTML = formTicket(cfg);
  else if (id === 'caja') body.innerHTML = formCaja(cfg);
  else if (id === 'catalogo') body.innerHTML = formCatalogo(cfg);
  else if (id === 'alertas') body.innerHTML = formAlertas(cfg);
  else if (id === 'roles') body.innerHTML = formRolesUI(cfg);
};

function field(label, id, value, type, placeholder) {
  type = type || 'text';
  return '<div class="mb-3">' +
    '<label class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">' + label + '</label>' +
    '<input id="' + id + '" type="' + type + '" value="' + esc(value) + '" placeholder="' + (placeholder || '') + '" ' +
    'class="w-full mt-1 p-3 border border-slate-200 rounded-2xl text-sm bg-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none">' +
    '</div>';
}

function area(label, id, value, rows) {
  return '<div class="mb-3">' +
    '<label class="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">' + label + '</label>' +
    '<textarea id="' + id + '" rows="' + (rows || 2) + '" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl text-sm">' +
    (value || '') + '</textarea></div>';
}

function check(label, id, checked) {
  return '<label class="flex items-center gap-2 text-sm mb-3 cursor-pointer">' +
    '<input type="checkbox" id="' + id + '" ' + (checked ? 'checked' : '') + ' class="w-4 h-4 rounded text-green-600">' +
    '<span>' + label + '</span></label>';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&').replace(/"/g, '"').replace(/</g, '<');
}

function card(title, html) {
  return '<div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 mb-4">' +
    '<h2 class="font-bold text-slate-900 mb-4 text-lg">' + title + '</h2>' + html + '</div>';
}

function formEmpresa(cfg) {
  return card('Datos de la empresa',
    field('Nombre comercial', 'cfg-nombre', cfg.nombreComercial) +
    field('Razón social', 'cfg-razon', cfg.razonSocial) +
    field('NIT', 'cfg-nit', cfg.nit) +
    field('Dirección', 'cfg-dir', cfg.direccion) +
    field('Teléfono', 'cfg-tel', cfg.telefono) +
    field('WhatsApp (número con código país)', 'cfg-wa', cfg.whatsapp, 'text', '502xxxxxxxx') +
    field('Email', 'cfg-email', cfg.email, 'email') +
    field('URL del logo (opcional)', 'cfg-logo', cfg.logoUrl, 'url', 'https://...')
  );
}

function formVisual(cfg) {
  return card('Aspecto visual del panel',
    field('Color primario', 'cfg-color1', cfg.colorPrimario || '#15803d', 'color') +
    field('Color acento', 'cfg-color2', cfg.colorAcento || '#16a34a', 'color') +
    '<div class="mb-3"><label class="text-[11px] uppercase text-slate-400 font-semibold">Tema del admin</label>' +
    '<select id="cfg-tema" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl text-sm bg-white">' +
    '<option value="claro"' + (cfg.temaAdmin !== 'oscuro' ? ' selected' : '') + '>Claro (profesional)</option>' +
    '<option value="oscuro"' + (cfg.temaAdmin === 'oscuro' ? ' selected' : '') + '>Oscuro</option></select></div>' +
    check('Mostrar reloj en el header', 'cfg-reloj', cfg.mostrarReloj !== false) +
    check('Badge de pedidos nuevos', 'cfg-badge', cfg.mostrarBadgePedidos !== false) +
    '<p class="text-xs text-slate-400 mt-2">Los colores se aplican de inmediato al guardar. El tema oscuro afecta el fondo general del panel.</p>'
  );
}

function formTicket(cfg) {
  return card('Tickets e impresión',
    field('Pie del ticket (ej. Caja Mostrador)', 'cfg-pie', cfg.pieTicket) +
    area('Mensaje de agradecimiento', 'cfg-msg-ticket', cfg.mensajeTicket, 2) +
    field('Serie de documento', 'cfg-serie', cfg.serieFactura || 'A') +
    field('Símbolo de moneda', 'cfg-moneda', cfg.moneda || 'Q') +
    field('Decimales', 'cfg-dec', cfg.decimales != null ? cfg.decimales : 2, 'number')
  );
}

function formCaja(cfg) {
  return card('Módulo de caja (POS)',
    check('Exigir apertura de turno antes de vender', 'cfg-turno', cfg.exigirTurnoCaja !== false) +
    check('Sonidos al cobrar / éxito', 'cfg-sonido', cfg.sonidoCaja !== false) +
    '<p class="text-xs text-slate-400">Estas opciones las puede leer el módulo de caja en el próximo arranque.</p>'
  );
}

function formCatalogo(cfg) {
  return card('Catálogo web / pedidos',
    field('WhatsApp catálogo', 'cfg-cat-wa', cfg.catalogoWhatsApp || cfg.whatsapp, 'text', '502xxxxxxxx') +
    area('Mensaje predeterminado WhatsApp', 'cfg-cat-msg', cfg.catalogoMensaje, 2) +
    area('Texto de envío / entrega', 'cfg-cat-envio', cfg.catalogoEnvio, 2)
  );
}

function formAlertas(cfg) {
  return card('Alertas operativas',
    field('Stock mínimo global (aviso)', 'cfg-stock-min', cfg.stockMinimoGlobal != null ? cfg.stockMinimoGlobal : 5, 'number') +
    field('Días para alertar vencimiento de lotes', 'cfg-dias-vence', cfg.diasAlertaVence != null ? cfg.diasAlertaVence : 30, 'number') +
    field('Zona horaria', 'cfg-tz', cfg.zonaHoraria || 'America/Guatemala')
  );
}

function formRolesUI(cfg) {
  var roles = cfg.rolesUI || defaultConfig().rolesUI;
  var html = '<p class="text-sm text-slate-500 mb-4">Densidad y KPIs visibles según el rol del usuario.</p>';
  Object.keys(roles).forEach(function (r) {
    var info = (window.AGROMAX_ROLES && window.AGROMAX_ROLES[r]) || { label: r };
    var ru = roles[r] || {};
    html += '<div class="border border-slate-100 rounded-2xl p-4 mb-3">' +
      '<div class="font-semibold mb-2">' + info.label + ' <span class="text-xs text-slate-400">(' + r + ')</span></div>' +
      '<div class="grid grid-cols-2 gap-2">' +
      '<div><label class="text-[10px] uppercase text-slate-400">Densidad UI</label>' +
      '<select id="role-den-' + r + '" class="w-full p-2 border rounded-xl text-sm bg-white">' +
      '<option value="compacta"' + (ru.densidad === 'compacta' ? ' selected' : '') + '>Compacta</option>' +
      '<option value="normal"' + (ru.densidad !== 'compacta' ? ' selected' : '') + '>Normal</option>' +
      '<option value="amplia"' + (ru.densidad === 'amplia' ? ' selected' : '') + '>Amplia</option></select></div>' +
      '<div class="flex items-end pb-1">' +
      '<label class="flex items-center gap-2 text-sm"><input type="checkbox" id="role-kpi-' + r + '" ' +
      (ru.mostrarKPIs !== false ? 'checked' : '') + '> Mostrar KPIs</label></div></div></div>';
  });
  return card('Preferencias por rol', html);
}

function leerFormConfig() {
  var prev = window.AGROMAX_CONFIG || defaultConfig();
  var rolesUI = prev.rolesUI || defaultConfig().rolesUI;
  Object.keys(rolesUI).forEach(function (r) {
    var den = document.getElementById('role-den-' + r);
    var kpi = document.getElementById('role-kpi-' + r);
    if (den) rolesUI[r] = rolesUI[r] || {};
    if (den) rolesUI[r].densidad = den.value;
    if (kpi) rolesUI[r].mostrarKPIs = kpi.checked;
  });

  function val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : fallback;
  }
  function chk(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.checked : fallback;
  }

  return Object.assign({}, prev, {
    nombreComercial: val('cfg-nombre', prev.nombreComercial),
    razonSocial: val('cfg-razon', prev.razonSocial),
    nit: val('cfg-nit', prev.nit),
    direccion: val('cfg-dir', prev.direccion),
    telefono: val('cfg-tel', prev.telefono),
    whatsapp: val('cfg-wa', prev.whatsapp),
    email: val('cfg-email', prev.email),
    logoUrl: val('cfg-logo', prev.logoUrl),
    colorPrimario: val('cfg-color1', prev.colorPrimario),
    colorAcento: val('cfg-color2', prev.colorAcento),
    temaAdmin: val('cfg-tema', prev.temaAdmin),
    mostrarReloj: chk('cfg-reloj', prev.mostrarReloj),
    mostrarBadgePedidos: chk('cfg-badge', prev.mostrarBadgePedidos),
    pieTicket: val('cfg-pie', prev.pieTicket),
    mensajeTicket: val('cfg-msg-ticket', prev.mensajeTicket),
    serieFactura: val('cfg-serie', prev.serieFactura),
    moneda: val('cfg-moneda', prev.moneda),
    decimales: parseInt(val('cfg-dec', prev.decimales), 10) || 2,
    exigirTurnoCaja: chk('cfg-turno', prev.exigirTurnoCaja),
    sonidoCaja: chk('cfg-sonido', prev.sonidoCaja),
    catalogoWhatsApp: val('cfg-cat-wa', prev.catalogoWhatsApp),
    catalogoMensaje: val('cfg-cat-msg', prev.catalogoMensaje),
    catalogoEnvio: val('cfg-cat-envio', prev.catalogoEnvio),
    stockMinimoGlobal: parseFloat(val('cfg-stock-min', prev.stockMinimoGlobal)) || 5,
    diasAlertaVence: parseInt(val('cfg-dias-vence', prev.diasAlertaVence), 10) || 30,
    zonaHoraria: val('cfg-tz', prev.zonaHoraria),
    rolesUI: rolesUI,
    actualizado: new Date(),
    actualizadoPor: (window.usuarioActual && window.usuarioActual.nombre) || ''
  });
}

window.guardarTodaConfig = async function () {
  // Fusionar lo visible del tab actual + resto en memoria
  var data = leerFormConfig();
  // Si el usuario no visitó todos los tabs, los inputs no existen: leerForm ya usa prev
  try {
    await db.collection('config').doc('empresa').set(data, { merge: true });
    window.AGROMAX_CONFIG = data;
    aplicarTemaConfig();
    if (typeof logAuditoria === 'function') logAuditoria('config_guardar', 'empresa');
    if (typeof adminToast === 'function') adminToast('Configuración guardada', 'ok');
    else alert('Configuración guardada');
  } catch (e) {
    alert(e.message + '\n\nAgrega regla: match /config/{doc} { allow read, write: if request.auth != null; }');
  }
};

window.exportarConfig = function () {
  var data = window.AGROMAX_CONFIG || defaultConfig();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'agromax-config.json';
  a.click();
};

// Auto-cargar config al iniciar si hay auth
(function () {
  var prev = window.mostrarSeccion;
  window.mostrarSeccion = function (s) {
    if (s === 'config' || s === 'configuracion') return mostrarConfiguracion();
    if (typeof prev === 'function') return prev(s);
  };

  var prevPanel = window.mostrarPanelPrincipal;
  if (typeof prevPanel === 'function') {
    window.mostrarPanelPrincipal = function () {
      var r = prevPanel.apply(this, arguments);
      setTimeout(function () { if (typeof cargarConfigGlobal === 'function') cargarConfigGlobal(); }, 300);
      return r;
    };
  }
})();
