// js/admin-productos-costo.js
// Campo costo de compra en productos (para margen en Reportes)

(function () {
  function inyectarCampoCosto() {
    var form = document.querySelector('#main-content .max-w-2xl');
    if (!form) return;
    if (document.getElementById('costo')) return;

    var precio = document.getElementById('precio');
    if (!precio) return;

    var wrap = document.createElement('div');
    wrap.className = 'grid grid-cols-2 gap-4 mt-4';
    wrap.innerHTML =
      '<div><label class="text-xs text-slate-500">Costo de compra (Q)</label>' +
      '<input id="costo" type="number" step="0.01" min="0" placeholder="Ej: 35.00" ' +
      'class="w-full p-4 border rounded-2xl"></div>' +
      '<div class="flex items-end"><p class="text-xs text-slate-400 pb-3">Usado en Reportes para calcular margen. Si está vacío, solo se muestra ingreso.</p></div>';

    // Insertar después del grid de precio/stock si existe
    var grid = precio.parentElement;
    if (grid && grid.classList.contains('grid')) {
      grid.parentElement.insertBefore(wrap, grid.nextSibling);
    } else {
      precio.parentElement.appendChild(wrap);
    }

    // Si hay producto en edición, cargar costo desde dataset temporal
    if (window._productoCostoEdit != null) {
      document.getElementById('costo').value = window._productoCostoEdit;
    }
  }

  var _form = window.mostrarFormularioAgregar;
  if (typeof _form === 'function') {
    window.mostrarFormularioAgregar = function (producto) {
      window._productoCostoEdit = producto ? (producto.costo || producto.costoCompra || '') : '';
      _form(producto);
      setTimeout(inyectarCampoCosto, 50);
    };
  }

  var _guardar = window.guardarProducto;
  if (typeof _guardar === 'function') {
    window.guardarProducto = async function () {
      // Monkey: intercept after validation by wrapping db calls is hard;
      // instead patch the data object via temporary override of collection.add/update
      var costoEl = document.getElementById('costo');
      var costoVal = costoEl ? parseFloat(costoEl.value) : NaN;
      if (!isNaN(costoVal) && costoVal >= 0) {
        window._costoPendienteGuardar = costoVal;
      } else {
        window._costoPendienteGuardar = null;
      }

      // Override update/add briefly
      var col = db.collection('productos');
      var _add = col.add.bind(col);
      var _doc = col.doc.bind(col);

      col.add = async function (data) {
        if (window._costoPendienteGuardar != null) data.costo = window._costoPendienteGuardar;
        return _add(data);
      };
      col.doc = function (id) {
        var ref = _doc(id);
        var _update = ref.update.bind(ref);
        ref.update = async function (data) {
          if (window._costoPendienteGuardar != null) data.costo = window._costoPendienteGuardar;
          return _update(data);
        };
        return ref;
      };

      try {
        await _guardar();
      } finally {
        col.add = _add;
        col.doc = _doc;
        window._costoPendienteGuardar = null;
      }
    };
  }

  // Tabla productos: mostrar margen si hay costo
  var _tabla = window.mostrarTablaProductos;
  if (typeof _tabla === 'function') {
    // soft enhancement via snapshot after - skip heavy override
  }
})();
