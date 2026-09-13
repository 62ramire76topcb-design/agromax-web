// js/admin-clientes.js — Clientes 360° + CRM

function fmtC(n) {
  return 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

window.mostrarClientes = async function () {
  var content = document.getElementById('main-content');
  content.innerHTML =
    '<div class="flex flex-wrap justify-between gap-3 mb-4">' +
    '<div><h1 class="text-2xl md:text-3xl font-bold">Clientes 360°</h1>' +
    '<p class="text-sm text-slate-500">Compras, crédito, CRM y perfil</p></div>' +
    '<button type="button" onclick="formClienteNuevo()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><i class="fas fa-user-plus mr-1"></i> Nuevo</button></div>' +
    '<div id="cli-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4"></div>' +
    '<input id="buscar-cliente" type="text" placeholder="Buscar nombre, NIT o teléfono..." class="w-full md:w-96 p-3 border border-slate-200 rounded-xl text-sm mb-4" oninput="filtrarClientesUI()">' +
    '<div id="lista-clientes" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">' +
    '<p class="text-center text-slate-400 py-10"><i class="fas fa-spinner fa-spin"></i></p></div>' +
    '<div id="cli-detalle" class="hidden mt-4"></div>';

  await cargarClientes360();
};

async function cargarClientes360() {
  var map = {};
  try {
    // Perfiles guardados
    var snapP = await db.collection('clientes').limit(300).get();
    snapP.forEach(function (d) {
      var c = d.data();
      var key = ((c.nit || c.nombre || d.id) + '').toLowerCase();
      map[key] = {
        id: d.id,
        nombre: c.nombre || '',
        nit: c.nit || '',
        telefono: c.telefono || '',
        email: c.email || '',
        direccion: c.direccion || '',
        tipoPrecio: c.tipoPrecio || 'menudeo',
        limiteCredito: Number(c.limiteCredito) || 0,
        saldo: Number(c.saldo) || 0,
        notasCrm: c.notasCrm || '',
        total: 0,
        compras: 0,
        ultima: null,
        desdePerfil: true
      };
    });
  } catch (e) {}

  try {
    var snap = await db.collection('ventas').orderBy('fecha', 'desc').limit(400).get();
    snap.forEach(function (doc) {
      var v = doc.data();
      var nombre = (v.cliente || '').trim();
      var nit = (v.nit || '').trim();
      if (!nombre && !nit) return;
      if (nombre === 'Consumidor Final' && !nit) return;
      var key = (nit || nombre).toLowerCase();
      if (!map[key]) {
        map[key] = { id: null, nombre: nombre || 'Sin nombre', nit: nit || '', telefono: '', email: '', direccion: '', tipoPrecio: 'menudeo', limiteCredito: 0, saldo: 0, notasCrm: '', total: 0, compras: 0, ultima: null };
      }
      map[key].total += Number(v.total) || 0;
      map[key].compras += 1;
      var f = v.fecha && v.fecha.toDate ? v.fecha.toDate() : null;
      if (f && (!map[key].ultima || f > map[key].ultima)) map[key].ultima = f;
      if (nombre) map[key].nombre = nombre;
      if (nit) map[key].nit = nit;
    });
  } catch (e) {}

  window._clientesCache = Object.values(map).sort(function (a, b) { return b.total - a.total; });
  var box = document.getElementById('cli-kpis');
  if (box) {
    var n = window._clientesCache.length;
    var ventas = window._clientesCache.reduce(function (s, c) { return s + c.total; }, 0);
    var conCredito = window._clientesCache.filter(function (c) { return c.limiteCredito > 0; }).length;
    var deuda = window._clientesCache.reduce(function (s, c) { return s + (c.saldo || 0); }, 0);
    box.innerHTML =
      kpiCli('Clientes', String(n), '') +
      kpiCli('Ventas hist.', fmtC(ventas), 'text-green-600') +
      kpiCli('Con crédito', String(conCredito), 'text-blue-600') +
      kpiCli('Saldo CxC', fmtC(deuda), 'text-amber-600');
  }
  filtrarClientesUI();
}

function kpiCli(l, v, c) {
  return '<div class="bg-white rounded-2xl border p-3 shadow-sm"><p class="text-[10px] uppercase text-slate-400 font-semibold">' + l + '</p><p class="text-lg font-bold ' + c + '">' + v + '</p></div>';
}

window.filtrarClientesUI = function () {
  var q = (document.getElementById('buscar-cliente') && document.getElementById('buscar-cliente').value || '').toLowerCase().trim();
  var lista = window._clientesCache || [];
  if (q) {
    lista = lista.filter(function (c) {
      return (c.nombre || '').toLowerCase().includes(q) ||
        (c.nit || '').toLowerCase().includes(q) ||
        (c.telefono || '').includes(q);
    });
  }
  var box = document.getElementById('lista-clientes');
  if (!box) return;
  if (!lista.length) {
    box.innerHTML = '<p class="text-center text-slate-400 py-10">No hay clientes</p>';
    return;
  }
  var html = '<table class="w-full text-sm"><thead><tr class="bg-slate-50 text-left text-xs uppercase text-slate-500">' +
    '<th class="p-3">Cliente</th><th class="p-3">NIT</th><th class="p-3 text-center">Compras</th>' +
    '<th class="p-3 text-right">Total</th><th class="p-3 text-right">Saldo</th><th class="p-3">Acciones</th></tr></thead><tbody>';
  lista.forEach(function (c, i) {
    var key = encodeURIComponent((c.nit || c.nombre) + '|' + i);
    html += '<tr class="border-t border-slate-50 hover:bg-slate-50">' +
      '<td class="p-3"><div class="font-semibold">' + (c.nombre || '') + '</div>' +
      '<div class="text-[10px] text-slate-400">' + (c.tipoPrecio || 'menudeo') + (c.telefono ? ' · ' + c.telefono : '') + '</div></td>' +
      '<td class="p-3 text-slate-500">' + (c.nit || '—') + '</td>' +
      '<td class="p-3 text-center">' + c.compras + '</td>' +
      '<td class="p-3 text-right font-bold text-green-600">' + fmtC(c.total) + '</td>' +
      '<td class="p-3 text-right ' + (c.saldo > 0 ? 'text-amber-600 font-semibold' : '') + '">' + (c.saldo ? fmtC(c.saldo) : '—') + '</td>' +
      '<td class="p-3"><button type="button" onclick="verCliente360(' + i + ')" class="text-blue-600 text-xs font-semibold">Ver 360°</button></td></tr>';
  });
  html += '</tbody></table>';
  box.innerHTML = html;
};

window.verCliente360 = function (idx) {
  var c = (window._clientesCache || [])[idx];
  if (!c) return;
  window._clienteActual = c;
  var det = document.getElementById('cli-detalle');
  det.classList.remove('hidden');
  det.innerHTML =
    '<div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">' +
    '<div class="flex flex-wrap justify-between gap-2 mb-4">' +
    '<div><h2 class="text-xl font-bold">' + (c.nombre || '') + '</h2>' +
    '<p class="text-sm text-slate-500">NIT ' + (c.nit || '—') + ' · Ticket prom. ' +
    fmtC(c.compras ? c.total / c.compras : 0) + '</p></div>' +
    '<button type="button" onclick="document.getElementById(\'cli-detalle\').classList.add(\'hidden\')" class="text-slate-400 text-xl">&times;</button></div>' +
    '<div class="grid sm:grid-cols-3 gap-3 mb-4">' +
    '<div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] text-slate-400">Compras</p><p class="font-bold">' + c.compras + '</p></div>' +
    '<div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] text-slate-400">Total histórico</p><p class="font-bold text-green-600">' + fmtC(c.total) + '</p></div>' +
    '<div class="bg-slate-50 rounded-xl p-3"><p class="text-[10px] text-slate-400">Límite crédito</p><p class="font-bold">' + fmtC(c.limiteCredito) + '</p></div></div>' +
    '<h3 class="font-semibold text-sm mb-2">CRM / notas</h3>' +
    '<textarea id="crm-notas" rows="3" class="w-full p-3 border rounded-2xl text-sm mb-2">' + (c.notasCrm || '') + '</textarea>' +
    '<div class="grid sm:grid-cols-2 gap-2 mb-3">' +
    '<input id="crm-tel" placeholder="Teléfono" value="' + (c.telefono || '') + '" class="p-2.5 border rounded-xl text-sm">' +
    '<select id="crm-precio" class="p-2.5 border rounded-xl text-sm bg-white">' +
    '<option value="menudeo"' + (c.tipoPrecio === 'menudeo' ? ' selected' : '') + '>Precio menudeo</option>' +
    '<option value="mayoreo"' + (c.tipoPrecio === 'mayoreo' ? ' selected' : '') + '>Mayoreo</option>' +
    '<option value="vip"' + (c.tipoPrecio === 'vip' ? ' selected' : '') + '>VIP</option></select></div>' +
    '<div class="grid sm:grid-cols-2 gap-2 mb-3">' +
    '<input id="crm-limite" type="number" placeholder="Límite crédito Q" value="' + (c.limiteCredito || '') + '" class="p-2.5 border rounded-xl text-sm">' +
    '<input id="crm-nit" placeholder="NIT" value="' + (c.nit || '') + '" class="p-2.5 border rounded-xl text-sm"></div>' +
    '<button type="button" onclick="guardarPerfilCliente()" class="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">Guardar perfil</button></div>';
  det.scrollIntoView({ behavior: 'smooth' });
};

window.guardarPerfilCliente = async function () {
  var c = window._clienteActual;
  if (!c) return;
  var data = {
    nombre: c.nombre,
    nit: (document.getElementById('crm-nit').value || '').trim(),
    telefono: (document.getElementById('crm-tel').value || '').trim(),
    tipoPrecio: document.getElementById('crm-precio').value,
    limiteCredito: parseFloat(document.getElementById('crm-limite').value) || 0,
    notasCrm: (document.getElementById('crm-notas').value || '').trim(),
    actualizado: new Date()
  };
  try {
    if (c.id) await db.collection('clientes').doc(c.id).update(data);
    else {
      data.creado = new Date();
      data.saldo = c.saldo || 0;
      await db.collection('clientes').add(data);
    }
    if (typeof logAuditoria === 'function') logAuditoria('cliente_actualizar', data.nombre);
    if (typeof adminToast === 'function') adminToast('Perfil guardado', 'ok');
    else alert('Guardado');
    mostrarClientes();
  } catch (e) { alert(e.message); }
};

window.formClienteNuevo = function () {
  window._clienteActual = { nombre: '', nit: '', telefono: '', tipoPrecio: 'menudeo', limiteCredito: 0, notasCrm: '', total: 0, compras: 0, id: null };
  var det = document.getElementById('cli-detalle');
  det.classList.remove('hidden');
  det.innerHTML =
    '<div class="bg-white rounded-3xl border p-5 max-w-lg">' +
    '<h2 class="font-bold text-lg mb-3">Nuevo cliente</h2>' +
    '<input id="nc-nombre" placeholder="Nombre *" class="w-full p-3 border rounded-2xl mb-2">' +
    '<input id="nc-nit" placeholder="NIT" class="w-full p-3 border rounded-2xl mb-2">' +
    '<input id="nc-tel" placeholder="Teléfono" class="w-full p-3 border rounded-2xl mb-2">' +
    '<input id="nc-limite" type="number" placeholder="Límite crédito" class="w-full p-3 border rounded-2xl mb-2">' +
    '<button type="button" onclick="crearClienteNuevo()" class="w-full bg-green-600 text-white py-3 rounded-2xl font-bold">Crear</button></div>';
};

window.crearClienteNuevo = async function () {
  var nombre = (document.getElementById('nc-nombre').value || '').trim();
  if (!nombre) return alert('Nombre obligatorio');
  try {
    await db.collection('clientes').add({
      nombre: nombre,
      nit: (document.getElementById('nc-nit').value || '').trim(),
      telefono: (document.getElementById('nc-tel').value || '').trim(),
      limiteCredito: parseFloat(document.getElementById('nc-limite').value) || 0,
      tipoPrecio: 'menudeo',
      saldo: 0,
      creado: new Date()
    });
    if (typeof logAuditoria === 'function') logAuditoria('cliente_crear', nombre);
    mostrarClientes();
  } catch (e) { alert(e.message); }
};
