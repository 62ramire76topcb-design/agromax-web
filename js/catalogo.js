// js/catalogo.js — Catálogo público (conectado a config/empresa)

let whatsappNumber = '50242664744';
let allProductos = [];
let carrito = JSON.parse(localStorage.getItem('carritoAGROMAXGTM')) || [];
let checkoutMetodo = 'stripe';
let categoriaActual = 'all';
let ordenActual = 'relevancia';
let productoDetalleIdx = -1;

function cfg() {
  return (typeof getAgroConfig === 'function') ? getAgroConfig() : {
    nombreComercial: 'AGROMAXGTM',
    catalogoWhatsApp: whatsappNumber,
    whatsapp: whatsappNumber,
    catalogoMensaje: 'Hola AGROMAXGTM, quiero más información',
    catalogoEnvio: 'Entrega a coordinar',
    telefono: '',
    direccion: '',
    webUrl: 'https://agromax-web.vercel.app'
  };
}

function waNum() {
  var c = cfg();
  var n = (c.catalogoWhatsApp || c.whatsapp || whatsappNumber || '').replace(/\D/g, '');
  return n || '50242664744';
}

function brandName() {
  return cfg().nombreComercial || 'AGROMAXGTM';
}

function aplicarConfigCatalogoUI() {
  var c = cfg();
  whatsappNumber = waNum();
  document.querySelectorAll('[data-cfg-brand]').forEach(function (el) {
    el.textContent = brandName();
  });
  document.querySelectorAll('a[href*="wa.me"]').forEach(function (fab) {
    fab.href = 'https://wa.me/' + whatsappNumber;
  });
  var telEl = document.querySelector('[data-cfg-tel]');
  if (telEl && c.telefono) telEl.textContent = c.telefono;
  var dirEl = document.querySelector('[data-cfg-dir]');
  if (dirEl && c.direccion) dirEl.textContent = c.direccion;
}
