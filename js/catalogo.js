// catalogo.js — ensambla partes (restauración)
(async function () {
  try {
    var n = 4;
    var texts = [];
    for (var i = 0; i < n; i++) {
      var res = await fetch('./js/catalogo.p' + i + '.js?v=2');
      texts.push(await res.text());
    }
    var code = texts.join('');
    var s = document.createElement('script');
    s.text = code;
    document.head.appendChild(s);
  } catch (e) {
    console.error('Error cargando catálogo', e);
  }
})();
