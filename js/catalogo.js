// js/catalogo.js — restaura lógica completa (jsDelivr + historial GitHub)
(function () {
  var url = 'https://cdn.jsdelivr.net/gh/62ramire76topcb-design/agromax-web@e5a5f99a5845fe5041169c1e5fc2b2aa72423824/js/catalogo.js';
  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (code) {
      code = code.replace(
        "if (p.oferta || p.promo) return '<span class=\"badge badge-sale\">Oferta</span>';",
        "if (p.masVendido || p.bestSeller) return '<span class=\"badge badge-best\">Más vendido</span>';\n  if (p.recomendado || p.destacado) return '<span class=\"badge badge-rec\">Recomendado</span>';\n  if (p.oferta || p.promo) return '<span class=\"badge badge-sale\">Oferta</span>';"
      );
      code = code.replace(
        "var fab = document.querySelector('a[href*=\"wa.me\"]');\n  if (fab && fab.classList.contains('w-14')) {\n    fab.href = 'https://wa.me/' + whatsappNumber;\n  }",
        "document.querySelectorAll('a[href*=\"wa.me\"]').forEach(function (fab) {\n    fab.href = 'https://wa.me/' + whatsappNumber;\n  });"
      );
      var s = document.createElement('script');
      s.text = code;
      document.head.appendChild(s);
    })
    .catch(function (e) {
      console.error('No se pudo cargar catalogo.js', e);
    });
})();
