// js/config-loader.js — Carga config/empresa para ticket y catálogo

window.AGROMAX_CONFIG = window.AGROMAX_CONFIG || null;

window.defaultAgroConfig = function () {
  return {
    nombreComercial: 'AGROMAXGTM',
    razonSocial: 'AGROMAX',
    nit: '',
    direccion: '',
    telefono: '',
    whatsapp: '50242664744',
    email: '',
    logoUrl: '',
    mensajeTicket: '¡Gracias por su compra!',
    pieTicket: 'Caja Mostrador',
    serieFactura: 'A',
    moneda: 'Q',
    catalogoWhatsApp: '50242664744',
    catalogoMensaje: 'Hola AGROMAXGTM, quiero más información',
    catalogoEnvio: 'Entrega a coordinar',
    webUrl: 'https://agromax-web.vercel.app'
  };
};

window.getAgroConfig = function () {
  return Object.assign({}, window.defaultAgroConfig(), window.AGROMAX_CONFIG || {});
};

window.cargarConfigPublica = async function () {
  if (window.AGROMAX_CONFIG && window._configPublicaCargada) return window.AGROMAX_CONFIG;
  try {
    if (typeof db === 'undefined' || !db) return window.getAgroConfig();
    var doc = await db.collection('config').doc('empresa').get();
    if (doc.exists) {
      window.AGROMAX_CONFIG = Object.assign(window.defaultAgroConfig(), doc.data());
    } else {
      window.AGROMAX_CONFIG = window.defaultAgroConfig();
    }
    window._configPublicaCargada = true;
  } catch (e) {
    console.warn('config pública:', e);
    if (!window.AGROMAX_CONFIG) window.AGROMAX_CONFIG = window.defaultAgroConfig();
  }
  return window.getAgroConfig();
};

// Precarga en background si hay firebase
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      if (typeof db !== 'undefined') window.cargarConfigPublica();
    }, 400);
  });
}
