import { thermalPrinter } from './printerService.js';
import { generarReportePDF } from './pdfReportService.js';

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
    if (tabName === 'saldos-prov') renderProveedoresSaldos();
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

    const proveedor = { id: Date.now(), nombre, telefono, saldoLiquidado: 0 };
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

    const producto = {
        id: Date.now(),
        codigo: null,
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
    actualizarSelects();
    renderInventario();
    alert('¡Producto cargado al inventario con éxito!');
};

// ==========================================
// 2. GESTIÓN Y LIQUIDACIÓN DE PROVEEDORES
// ==========================================
function renderProveedoresSaldos() {
    const contenedor = document.getElementById('lista-saldos-proveedores');
    contenedor.innerHTML = '';

    if (proveedores.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay proveedores registrados.</p>';
        return;
    }

    proveedores.forEach(prov => {
        // Calcular productos del proveedor y monto pendiente basado en ventas
        const prodProveedor = inventario.filter(p => p.proveedorId == prov.id);
        const totalStockProv = prodProveedor.reduce((acc, p) => acc + p.stock, 0);

        // Sumar lo que se le debe a este proveedor de las ventas realizadas
        let deudaPendiente = 0;
        ventasRealizadas.forEach(v => {
            if (v.proveedorId == prov.id && !v.liquidado) {
                deudaPendiente += v.pagoProveedor;
            }
        });

        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
                <strong style="color: #38bdf8; font-size: 1.05rem;">${prov.nombre}</strong><br>
                <span style="font-size:0.85rem; color:#94a3b8;">Tel: ${prov.telefono || 'No registrado'}</span><br>
                <div style="margin-top: 6px; font-size: 0.9rem;">
                    📦 Artículos activos en stock: <strong>${totalStockProv}</strong><br>
                    💰 Saldo pendiente a pagar: <strong style="color: #f87171;">$${deudaPendiente.toFixed(2)}</strong>
                </div>
                <button class="btn-primary" style="margin-top: 10px; padding: 6px 12px; font-size: 0.85rem;" onclick="liquidarProveedor('${prov.id}')">💵 Liquidar y Pagar (Reiniciar a $0)</button>
            </div>
        `;
    });
}

window.liquidarProveedor = function(provId) {
    if (!confirm('¿Estás seguro de marcar como pagado y liquidar este proveedor? Esto reiniciará su saldo pendiente a $0.00.')) {
        return;
    }

    // Marcar como liquidadas las ventas de este proveedor
    ventasRealizadas.forEach(v => {
        if (v.proveedorId == provId) {
            v.liquidado = true;
        }
    });

    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    renderProveedoresSaldos();
    alert('¡Proveedor liquidado con éxito! Saldo reiniciado.');
};

// ==========================================
// 3. IMPRESIÓN Y50P
// ==========================================
window.imprimirEtiquetasSeleccionadas = async function() {
    const checkboxes = document.querySelectorAll('.check-etiqueta:checked');
    if (checkboxes.length === 0) {
        alert('Selecciona al menos un producto para generar su código e imprimir su etiqueta.');
        return;
    }

    try {
        await thermalPrinter.connect();

        for (let cb of checkboxes) {
            const prodId = parseInt(cb.value);
            const producto = inventario.find(p => p.id === prodId);
            
            if (producto) {
                if (!producto.codigo) {
                    producto.codigo = 'PAN-' + Math.floor(100000 + Math.random() * 900000);
                }

                await thermalPrinter.printTicket({
                    folio: producto.codigo,
                    fecha: new Date().toLocaleDateString(),
                    productos: [{ nombre: producto.nombre, cantidad: 1, precio: producto.precio }],
                    total: producto.precio
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        localStorage.setItem('pandora_inventario', JSON.stringify(inventario));
        renderInventario();
        actualizarSelects();

        alert('¡Códigos generados y etiquetas impresas con éxito!');
    } catch (error) {
        alert('Error al imprimir etiquetas: ' + error.message);
    }
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
            const codigoMostrado = prod.codigo ? `[${prod.codigo}]` : '[Sin Código]';
            selectVenta.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}" data-codigo="${prod.codigo || ''}">${codigoMostrado} ${prod.nombre} - $${prod.precio.toFixed(2)} (Stock: ${prod.stock})</option>`;
        }
    });
}

// ==========================================
// 4. VENTAS Y CÁLCULOS CORREGIDOS
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

    producto.stock -= cantidad;

    const subtotalBruto = producto.precio * cantidad;
    // CÁLCULOS CORRECTOS:
    const pagoProveedor = subtotalBruto * (1 - (producto.comisionPorc / 100)); 
    const comisionTiendaBruta = subtotalBruto * (producto.comisionPorc / 100);
    const comisionTiendaNeta = comisionTiendaBruta - descuento; 

    const ventaRecord = {
        folio: Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString(),
        producto: producto.nombre,
        proveedorId: producto.proveedorId,
        cantidad,
        total: totalVenta,
        gananciaTienda: comisionTiendaNeta > 0 ? comisionTiendaNeta : 0,
        pagoProveedor,
        liquidado: false
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

// ==========================================
// 5. INVENTARIO Y CATÁLOGO WHATSAPP
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
        const provNombre = prov ? prov.nombre : 'General';
        const codigoTexto = prod.codigo ? `<strong style="color: #38bdf8;">[${prod.codigo}]</strong>` : `<span style="color: #f87171;">[Sin Código Asignado]</span>`;
        
        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #334155; display: flex; align-items: center; justify-content: space-between;">
                <div>
                    ${codigoTexto} ${prod.nombre}<br>
                    Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock}<br>
                    <span style="font-size:0.8rem; color:#94a3b8;">Consignador: ${provNombre}</span>
                </div>
                <div>
                    <input type="checkbox" class="check-etiqueta" value="${prod.id}" style="width: 22px; height: 22px; cursor: pointer;">
                </div>
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
        const cod = p.codigo ? p.codigo : 'Pendiente';
        mensaje += `▪️ *${p.nombre}*\n   Precio: $${p.precio.toFixed(2)}\n   Ref: ${cod}\n\n`;
    });
    mensaje += "¿Te interesa alguno? Escríbenos para apartarlo. 🛍️";

    const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, '_blank');
};

// ==========================================
// 6. LISTA DE DESEOS
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
};

// ==========================================
// 7. CORTE DE CAJA Y REPORTES PDF
// ==========================================
window.cargarReportes = function() {
    let ventasTotales = 0;
    let gananciasNetas = 0;
    let pagarProveedores = 0;

    ventasRealizadas.forEach(v => {
        ventasTotales += v.total;
        gananciasNetas += v.gananciaTienda;
        if (!v.liquidado) {
            pagarProveedores += v.pagoProveedor;
        }
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

actualizarSelects();