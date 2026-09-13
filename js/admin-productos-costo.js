// js/admin-productos-costo.js
// Formulario de producto profesional + campo costo + margen en vivo

(function () {
  function calcMargenPreview() {
    var precio = parseFloat((document.getElementById('precio') || {}).value) || 0;
    var costo = parseFloat((document.getElementById('costo') || {}).value) || 0;
    var el = document.getElementById('margen-preview');
    if (!el) return;
    if (!precio || !costo) {
      el.innerHTML = '<span class="text-slate-400">Ingresa costo y precio para ver margen</span>';
      return;
    }
    var m = precio - costo;
    var pct = (m / precio) * 100;
    var color = pct < 20 ? 'text-red-600' : pct < 35 ? 'text-amber-600' : 'text-emerald-600';
    el.innerHTML = '<span class="' + color + ' font-bold">Margen: Q' + m.toFixed(2) + ' (' + pct.toFixed(1) + '%)</span>';
  }

  window.mostrarFormularioAgregar = function (producto) {
    producto = producto || null;
    window.productoEditandoId = producto ? producto.id : null;
    var titulo = producto ? 'Editar producto' : 'Nuevo producto';
    var costoVal = producto ? (producto.costo != null ? producto.costo : (producto.costoCompra || '')) : '';

    document.getElementById('main-content').innerHTML =
      '<div class="max-w-2xl mx-auto">' +
      '<div class="flex items-center gap-3 mb-6">' +
      '<button type="button" onclick="mostrarSeccion(\'productos\')" class="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">' +
      '<i class="fas fa-arrow-left"></i></button>' +
      '<div><h1 class="text-2xl font-bold text-slate-900">' + titulo + '</h1>' +
      '<p class="text-sm text-slate-500">Costo, precio y stock para control de margen</p></div></div>' +

      '<div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-5">' +

      (producto && producto.imageUrl
        ? '<div class="flex justify-center"><img src="' + producto.imageUrl + '" class="w-28 h-28 object-cover rounded-2xl border" alt=""></div>'
        : '') +

      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre *</label>' +
      '<input id="nombre" value="' + (producto && producto.nombre ? String(producto.nombre).replace(/"/g, '"') : '') + '" ' +
      'placeholder="Nombre del producto" class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500"></div>' +

      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo compra (Q)</label>' +
      '<input id="costo" type="number" step="0.01" min="0" value="' + costoVal + '" placeholder="0.00" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500" oninput="window._margenPreview && window._margenPreview()">' +
      '<p class="text-[10px] text-slate-400 mt-1">Lo que te cuesta a ti</p></div>' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio venta (Q) *</label>' +
      '<input id="precio" type="number" step="0.01" min="0" value="' + (producto && producto.precio != null ? producto.precio : '') + '" placeholder="0.00" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500" oninput="window._margenPreview && window._margenPreview()">' +
      '<p class="text-[10px] text-slate-400 mt-1">Precio al cliente</p></div>' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</label>' +
      '<input id="stock" type="number" min="0" value="' + (producto && producto.stock != null ? producto.stock : 50) + '" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500"></div></div>' +

      '<div id="margen-preview" class="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm"></div>' +

      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unidad</label>' +
      '<input id="unidad" value="' + (producto && producto.unidad ? String(producto.unidad).replace(/"/g, '"') : '') + '" placeholder="Ej: 1 kg, 1 L, unidad" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500"></div>' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoría</label>' +
      '<select id="categoria" class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500 bg-white">' +
      ['Fertilizantes', 'Foliares', 'Protección', 'Herramientas', 'Accesorios'].map(function (c) {
        var sel = producto && producto.categoria === c ? ' selected' : '';
        return '<option value="' + c + '"' + sel + '>' + c + '</option>';
      }).join('') +
      '</select></div></div>' +

      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Descripción (catálogo)</label>' +
      '<textarea id="descripcion" rows="3" placeholder="Breve descripción para el detalle en el catálogo web" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500 text-sm">' +
      (producto && (producto.descripcion || producto.detalle) ? String(producto.descripcion || producto.detalle) : '') +
      '</textarea></div>' +

      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Código / barcode</label>' +
      '<input id="codigo" value="' + (producto && (producto.codigo || producto.barcode) ? String(producto.codigo || producto.barcode).replace(/"/g, '"') : '') + '" placeholder="Opcional" ' +
      'class="w-full mt-1 p-3.5 border border-slate-200 rounded-2xl outline-none focus:border-green-500"></div>' +
      '<div><label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Imagen</label>' +
      '<input id="imagen" type="file" accept="image/*" class="w-full mt-1 p-3 border border-slate-200 rounded-2xl text-sm"></div></div>' +

      '<div class="flex flex-wrap gap-2 pt-2">' +
      '<button type="button" onclick="guardarProductoPro()" class="flex-1 min-w-[140px] bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-2xl font-bold">' +
      (producto ? 'Actualizar producto' : 'Guardar producto') + '</button>' +
      '<button type="button" onclick="mostrarSeccion(\'productos\')" class="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-semibold">Cancelar</button>' +
      '</div></div></div>';

    window._margenPreview = calcMargenPreview;
    setTimeout(calcMargenPreview, 30);
  };

  window.guardarProductoPro = async function () {
    var nombre = (document.getElementById('nombre').value || '').trim();
    var precio = parseFloat(document.getElementById('precio').value);
    var stock = parseInt(document.getElementById('stock').value, 10) || 0;
    var costo = parseFloat(document.getElementById('costo').value);
    if (!nombre || isNaN(precio)) {
      if (typeof adminToast === 'function') adminToast('Nombre y precio son obligatorios', 'error');
      else alert('Nombre y precio son obligatorios');
      return;
    }

    try {
      var imageUrl = null;
      var file = document.getElementById('imagen').files[0];
      if (file && typeof storage !== 'undefined' && storage) {
        var ref = storage.ref('productos/' + Date.now() + '_' + file.name);
        await ref.put(file);
        imageUrl = await ref.getDownloadURL();
      }

      var data = {
        nombre: nombre,
        precio: precio,
        stock: stock,
        unidad: (document.getElementById('unidad').value || '').trim(),
        categoria: document.getElementById('categoria').value,
        descripcion: (document.getElementById('descripcion').value || '').trim(),
        codigo: (document.getElementById('codigo').value || '').trim(),
        fecha: new Date()
      };
      if (!isNaN(costo) && costo >= 0) data.costo = costo;
      else data.costo = 0;

      if (window.productoEditandoId) {
        if (!imageUrl) {
          // keep existing image - don't overwrite with default
          delete data.imageUrl;
        } else {
          data.imageUrl = imageUrl;
        }
        await db.collection('productos').doc(window.productoEditandoId).update(data);
        if (typeof adminToast === 'function') adminToast('Producto actualizado', 'ok');
        else alert('Producto actualizado');
      } else {
        data.imageUrl = imageUrl || 'https://picsum.photos/id/201/600/400';
        await db.collection('productos').add(data);
        if (typeof adminToast === 'function') adminToast('Producto guardado', 'ok');
        else alert('Producto guardado');
      }
      if (typeof mostrarSeccion === 'function') mostrarSeccion('productos');
    } catch (e) {
      if (typeof adminToast === 'function') adminToast(e.message, 'error');
      else alert(e.message);
    }
  };

  // Compat: guardarProducto del admin.js sigue existiendo; redirigir si hay form pro
  var _g = window.guardarProducto;
  window.guardarProducto = function () {
    if (document.getElementById('costo') && document.getElementById('margen-preview')) {
      return window.guardarProductoPro();
    }
    if (typeof _g === 'function') return _g();
  };
})();
