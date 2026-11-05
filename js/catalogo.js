// js/catalogo.js — carga base + destacados + relacionados
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
      code = code.replace(
        /window\.onload\s*=\s*function\s*\(\s*\)\s*\{/,
        'function __agroCatalogBoot(){'
      );

      var extras = "\nfunction productosRelacionados(index) {\n  var p = allProductos[index];\n  if (!p) return [];\n  var cat = p.categoria || '';\n  return allProductos.filter(function (x, i) {\n    return i !== index && (Number(x.stock) || 0) > 0 && x.categoria === cat;\n  }).slice(0, 4);\n}\n\nfunction toggleSeccionDestacada(id) {\n  var el = document.getElementById(id);\n  var btn = document.querySelector('[data-toggle=\"' + id + '\"]');\n  if (!el) return;\n  var abierto = !el.classList.contains('hidden');\n  el.classList.toggle('hidden', abierto);\n  if (btn) {\n    var icon = btn.querySelector('[data-chevron]');\n    if (icon) icon.style.transform = abierto ? '' : 'rotate(180deg)';\n  }\n}\n\nfunction renderDestacados() {\n  var boxVendidos = document.getElementById('grid-mas-vendidos');\n  var boxRec = document.getElementById('grid-recomendados');\n  if (!allProductos.length) return;\n  var conStock = allProductos.filter(function (p) { return (Number(p.stock) || 0) > 0; });\n  var vendidos = conStock.filter(function (p) { return p.masVendido || p.bestSeller; });\n  var recom = conStock.filter(function (p) { return p.recomendado || p.destacado; });\n  if (!vendidos.length) vendidos = conStock.slice(0, 8);\n  if (!recom.length) recom = conStock.slice(4, 12);\n  if (!recom.length) recom = conStock.slice(0, 8);\n  function cardHTML(p) {\n    var idx = allProductos.findIndex(function (x) { return x.nombre === p.nombre && x.precio === p.precio; });\n    return '<button type=\"button\" onclick=\"abrirDetalle(' + idx + ')\" class=\"snap-start shrink-0 w-36 sm:w-40 text-left bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition\">' +\n      '<div class=\"aspect-square bg-slate-100 overflow-hidden\">' +\n      '<img src=\"' + (p.imageUrl || 'https://picsum.photos/id/201/400/400') + '\" class=\"w-full h-full object-cover\" alt=\"\" loading=\"lazy\"></div>' +\n      '<div class=\"p-2.5\">' +\n      '<p class=\"font-semibold text-xs sm:text-sm line-clamp-2 min-h-[2.5rem]\">' + (p.nombre || '') + '</p>' +\n      '<p class=\"text-green-700 font-extrabold text-sm mt-1\">Q' + Number(p.precio || 0).toLocaleString('es-GT') + '</p>' +\n      '</div></button>';\n  }\n  if (boxVendidos) boxVendidos.innerHTML = vendidos.length ? vendidos.map(cardHTML).join('') : '<p class=\"text-sm text-slate-400 px-2\">Sin productos</p>';\n  if (boxRec) boxRec.innerHTML = recom.length ? recom.map(cardHTML).join('') : '<p class=\"text-sm text-slate-400 px-2\">Sin productos</p>';\n}\n";

      code = code + extras;

      code = code.replace(
        "document.getElementById('product-modal').classList.remove('hidden');",
        "var relBox = document.getElementById('det-relacionados');\n" +
        "  if (relBox) {\n" +
        "    var rel = productosRelacionados(productoDetalleIdx);\n" +
        "    if (!rel.length) { relBox.innerHTML = ''; relBox.classList.add('hidden'); }\n" +
        "    else {\n" +
        "      relBox.classList.remove('hidden');\n" +
        "      relBox.innerHTML = '<p class=\"text-sm font-bold text-slate-800 mb-2\">Productos relacionados</p><div class=\"flex gap-2 overflow-x-auto pb-1 snap-x\">' +\n" +
        "        rel.map(function (r) {\n" +
        "          var ri = allProductos.findIndex(function (x) { return x.nombre === r.nombre && x.precio === r.precio; });\n" +
        "          return '<button type=\"button\" onclick=\"abrirDetalle(' + ri + ')\" class=\"snap-start shrink-0 w-28 text-left\">' +\n" +
        "            '<div class=\"aspect-square rounded-xl overflow-hidden bg-slate-100 mb-1\"><img src=\"' + (r.imageUrl || 'https://picsum.photos/id/201/200/200') + '\" class=\"w-full h-full object-cover\" alt=\"\"></div>' +\n" +
        "            '<p class=\"text-[11px] font-semibold line-clamp-2\">' + (r.nombre || '') + '</p>' +\n" +
        "            '<p class=\"text-xs font-bold text-green-700\">Q' + Number(r.precio || 0).toLocaleString('es-GT') + '</p></button>';\n" +
        "        }).join('') + '</div>';\n" +
        "    }\n" +
        "  }\n" +
        "  document.getElementById('product-modal').classList.remove('hidden');"
      );

      var s = document.createElement('script');
      s.text = code + '\n;try{__agroCatalogBoot();}catch(e){console.error(e);}';
      document.head.appendChild(s);
    })
    .catch(function (e) {
      console.error('No se pudo cargar catalogo.js', e);
    });
})();
