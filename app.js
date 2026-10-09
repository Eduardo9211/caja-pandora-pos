import { thermalPrinter } from './printerService.js';
import { generarReportePDF } from './pdfReportService.js';

// Base de datos local en memoria (simulada con localStorage para persistencia en el celular)
let proveedores = JSON.parse(localStorage.getItem('pandora_proveedores')) || [];
let inventario = JSON.parse(localStorage.getItem('pandora_inventario')) || [];
let deseos = JSON.parse(localStorage.getItem('pandora_deseos')) || [];
let ventasRealizadas = JSON.parse(localStorage.getItem('pandora_ventas')) || [];

// ==========================================
// CONTROL DE TABS
// ==========================================
window.cambiarTab = function(tabName, element) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add('active');
    if (element) element.classList.add('active');

    if (tabName === 'inventario') renderInventario();
    if (tabName === 'deseos') renderDeseos();
    if (tabName === 'reportes') cargarReportes();
    if (tabName === 'ventas' || tabName === 'proveedores') actualizarSelects();
};

// ==========================================
// 1. PROVEEDORES Y CONSIGNACIÓN
// ==========================================
window.guardarProveedor = function() {
    const nombre = document.getElementById('prov-nombre').value.trim();
    const telefono = document.getElementById('prov-telefono').value.trim();

    if (!nombre) {
        alert('Ingresa el nombre del proveedor.');
        return;
    }

    const proveedor = { id: Date.now(), nombre, telefono };
    proveedores.push(proveedor);
    localStorage.setItem('pandora_proveedores', JSON.stringify(proveedores));

    document.getElementById('prov-nombre').value = '';
    document.getElementById('prov-telefono').value = '';
    actualizarSelects();
    alert('¡Proveedor guardado con éxito!');
};

window.guardarProducto = function() {
    const proveedorId = document.getElementById('prod-proveedor').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value) || 0;
    const comisionPorc = parseFloat(document.getElementById('prod-comision').value) || 20;
    const stock = parseInt(document.getElementById('prod-stock').value) || 1;

    if (!proveedorId || !nombre || precio <= 0) {
        alert('Completa los campos obligatorios del producto.');
        return;
    }

    const codigoBarra = 'PAN-' + Math.floor(100000 + Math.random() * 900000);

    const producto = {
        id: Date.now(),
        codigo: codigoBarra,
        proveedorId,
        nombre,
        precio,
        comisionPorc,
        stock
    };

    inventario.push(producto);
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));

    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-stock').value = '1';
    alert(`¡Producto cargado! Código generado para etiqueta: ${codigoBarra}`);
    renderInventario();
};

function actualizarSelects() {
    const selectProv = document.getElementById('prod-proveedor');
    selectProv.innerHTML = '<option value="">-- Seleccionar --</option>';
    proveedores.forEach(p => {
        selectProv.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
    });

    const selectVenta = document.getElementById('venta-producto');
    selectVenta.innerHTML = '<option value="">-- Seleccionar del inventario --</option>';
    inventario.forEach(prod => {
        if (prod.stock > 0) {
            selectVenta.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}" data-codigo="${prod.codigo}">[${prod.codigo}] ${prod.nombre} - $${prod.precio.toFixed(2)} (Stock: ${prod.stock})</option>`;
        }
    });
}

// ==========================================
// 2. VENTAS Y REGLA DE DESCUENTO A LA TIENDA
// ==========================================
window.filtrarOSeleccionarProducto = function() {
    const query = document.getElementById('venta-buscar').value.trim().toLowerCase();
    const select = document.getElementById('venta-producto');
    
    if (!query) return;

    for (let option of select.options) {
        const text = option.text.toLowerCase();
        const codigo = option.getAttribute('data-codigo') ? option.getAttribute('data-codigo').toLowerCase() : '';
        if (text.includes(query) || codigo.includes(query)) {
            select.value = option.value;
            seleccionarProductoVenta();
            break;
        }
    }
};

window.seleccionarProductoVenta = function() {
    calcularTotalVenta();
};

window.calcularTotalVenta = function() {
    const select = document.getElementById('venta-producto');
    const option = select.options[select.selectedIndex];
    const precioBase = option && option.dataset.precio ? parseFloat(option.dataset.precio) : 0;
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;

    let total = (precioBase * cantidad) - descuento;
    if (total < 0) total = 0;

    document.getElementById('venta-total').innerText = total.toFixed(2);
    calcularCambio();
};

window.calcularCambio = function() {
    const total = parseFloat(document.getElementById('venta-total').innerText) || 0;
    const paga = parseFloat(document.getElementById('venta-paga').value) || 0;
    const cambio = paga >= total ? paga - total : 0;
    document.getElementById('venta-cambio').innerText = cambio.toFixed(2);
};

window.procesarVenta = function() {
    const select = document.getElementById('venta-producto');
    const option = select.options[select.selectedIndex];
    if (!option || !option.value) {
        alert('Selecciona un producto para cobrar.');
        return;
    }

    const prodId = parseInt(option.value);
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;
    const totalVenta = parseFloat(document.getElementById('venta-total').innerText) || 0;

    const producto = inventario.find(p => p.id === prodId);
    if (!producto || producto.stock < cantidad) {
        alert('Stock insuficiente.');
        return;
    }

    // Descontar stock
    producto.stock -= cantidad;

    // Calcular montos aplicando la regla: el descuento afecta SOLO la ganancia de la tienda
    const subtotalBruto = producto.precio * cantidad;
    const comisionTiendaBruta = subtotalBruto * (producto.comisionPorc / 100);
    const comisionTiendaNeta = comisionTiendaBruta - descuento; // El descuento rebaja la ganancia de la tienda
    const pagoProveedor = subtotalBruto - comisionTiendaBruta; // El proveedor recibe integro su porcentaje base

    const ventaRecord = {
        folio: Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString(),
        producto: producto.nombre,
        cantidad,
        total: totalVenta,
        gananciaTienda: comisionTiendaNeta > 0 ? comisionTiendaNeta : 0,
        pagoProveedor
    };

    ventasRealizadas.push(ventaRecord);
    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));

    alert('¡Venta registrada con éxito!');
    document.getElementById('venta-cantidad').value = '1';
    document.getElementById('venta-descuento').value = '0.00';
    document.getElementById('venta-paga').value = '';
    document.getElementById('venta-buscar').value = '';
    actualizarSelects();
};

window.imprimirUltimaVenta = async function() {
  try {
    await thermalPrinter.connect();
    const selectProd = document.getElementById('venta-producto');
    const nombreProd = selectProd.options[selectProd.selectedIndex]?.text || 'Producto Venta';
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const totalVenta = parseFloat(document.getElementById('venta-total').innerText) || 0;

    await thermalPrinter.printTicket({
      folio: Math.floor(1000 + Math.random() * 9000),
      fecha: new Date().toLocaleString(),
      productos: [{ nombre: nombreProd, cantidad, precio: totalVenta / cantidad }],
      total: totalVenta
    });
    alert('¡Ticket impreso en la Y50P!');
  } catch (error) {
    alert('Error al imprimir: ' + error.message);
  }
};

// ==========================================
// 3. INVENTARIO Y CATÁLOGO WHATSAPP LIGERO
// ==========================================
function renderInventario() {
    const contenedor = document.getElementById('lista-inventario');
    contenedor.innerHTML = '';

    if (inventario.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay productos en inventario.</p>';
        return;
    }

    inventario.forEach(prod => {
        const prov = proveedores.find(p => p.id == prod.proveedorId);
        const provNombre = prov ? prov.name || prov.nombre : 'General';
        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #334155;">
                <strong>[${prod.codigo}] ${prod.nombre}</strong><br>
                Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock}<br>
                <span style="font-size:0.8rem; color:#94a3b8;">Consignador: ${provNombre}</span>
            </div>
        `;
    });
}

window.compartirCatalogoWhatsApp = function() {
    if (inventario.length === 0) {
        alert('No hay productos para compartir en el catálogo.');
        return;
    }

    let mensaje = "🌟 *LA CAJA DE PANDORA - CATÁLOGO ESPECIAL* 🌟\n\n¡Hola! Checa nuestros artículos destacados disponibles:\n\n";
    inventario.filter(p => p.stock > 0).forEach(p => {
        mensaje += `▪️ *${p.nombre}*\n   Precio: $${p.precio.toFixed(2)}\n   Código: ${p.codigo}\n\n`;
    });
    mensaje += "¿Te interesa alguno? Escríbenos para apartarlo. 🛍️";

    const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
};

// ==========================================
// 4. LISTA DE DESEOS
// ==========================================
window.guardarDeseo = function() {
    const cliente = document.getElementById('deseo-cliente').value.trim();
    const telefono = document.getElementById('deseo-telefono').value.trim();
    const producto = document.getElementById('deseo-producto').value.trim();

    if (!cliente || !producto) {
        alert('Ingresa el nombre del cliente y el producto buscado.');
        return;
    }

    deseos.push({ id: Date.now(), cliente, telefono, producto });
    localStorage.setItem('pandora_deseos', JSON.stringify(deseos));

    document.getElementById('deseo-cliente').value = '';
    document.getElementById('deseo-telefono').value = '';
    document.getElementById('deseo-producto').value = '';
    renderDeseos();
    alert('¡Guardado en Lista de Deseos!');
};

function renderDeseos() {
    const contenedor = document.getElementById('lista-deseos');
    contenedor.innerHTML = '';
    if (deseos.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">Sin solicitudes pendientes.</p>';
        return;
    }

    deseos.forEach(d => {
        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #334155;">
                <strong>Cliente:</strong> ${d.cliente} (${d.telefono || 'Sin tel'})<br>
                <strong>Busca:</strong> ${d.producto}
            </div>
        `;
    });
}

// ==========================================
// 5. CORTE DE CAJA Y REPORTES PDF
// ==========================================
window.cargarReportes = function() {
    let ventasTotales = 0;
    let gananciasNetas = 0;
    let pagarProveedores = 0;

    ventasRealizadas.forEach(v => {
        ventasTotales += v.total;
        gananciasNetas += v.gananciaTienda;
        pagarProveedores += v.pagoProveedor;
    });

    document.getElementById('rep-ventas').innerText = ventasTotales.toFixed(2);
    document.getElementById('rep-ganancias').innerText = gananciasNetas.toFixed(2);
    document.getElementById('rep-proveedores').innerText = pagarProveedores.toFixed(2);
};

window.generarReporteCortePDF = function() {
    const ventasTotales = parseFloat(document.getElementById('rep-ventas').innerText) || 0;
    const ganancias = parseFloat(document.getElementById('rep-ganancias').innerText) || 0;
    const proveedores = parseFloat(document.getElementById('rep-proveedores').innerText) || 0;

    generarReportePDF({
        fecha: new Date().toLocaleDateString(),
        usuario: 'Carlos Lechuga',
        ventasTotales,
        ganancias,
        proveedores
    });
};

// Inicializar selects al cargar
actualizarSelects();