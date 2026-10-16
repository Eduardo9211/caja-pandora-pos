import { thermalPrinter } from './printerService.js';
import { generarReportePDF, generarEstadoCuentaProveedorPDF, generarCatalogoPDF } from './pdfReportService.js';

let proveedores = JSON.parse(localStorage.getItem('pandora_proveedores')) || [];
let inventario = JSON.parse(localStorage.getItem('pandora_inventario')) || [];
let deseos = JSON.parse(localStorage.getItem('pandora_deseos')) || [];
let ventasRealizadas = JSON.parse(localStorage.getItem('pandora_ventas')) || [];

// ==========================================
// AUTENTICACIÓN, ROLES Y PERMISOS
// ==========================================
let usuarios = JSON.parse(localStorage.getItem('pandora_usuarios')) || [
    { id: 1, nombre: 'Carlos (Admin)', username: 'admin', password: 'pandora123', rol: 'admin' }
];

let usuarioActual = JSON.parse(localStorage.getItem('pandora_usuario_activo')) || null;

window.iniciarSesion = function() {
    const userIn = document.getElementById('login-usuario').value.trim().toLowerCase();
    const passIn = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');

    const usuarioEncontrado = usuarios.find(u => u.username.toLowerCase() === userIn && u.password === passIn);

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado;
        localStorage.setItem('pandora_usuario_activo', JSON.stringify(usuarioActual));
        errorEl.style.display = 'none';
        verificarEstadoSesion();
    } else {
        errorEl.innerText = 'Usuario o contraseña incorrectos.';
        errorEl.style.display = 'block';
    }
};

window.cerrarSesion = function() {
    usuarioActual = null;
    localStorage.removeItem('pandora_usuario_activo');
    verificarEstadoSesion();
};

function verificarEstadoSesion() {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (!usuarioActual) {
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
        document.getElementById('login-usuario').value = '';
        document.getElementById('login-password').value = '';
    } else {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'block';
        document.getElementById('user-display-name').innerText = `${usuarioActual.nombre} (${usuarioActual.rol.toUpperCase()})`;
        aplicarPermisosRol();
    }
}

function aplicarPermisosRol() {
    const esAdmin = usuarioActual && usuarioActual.rol === 'admin';

    const selectorOcultar = esAdmin ? [] : ['.nav-tab-proveedores', '.nav-tab-saldos-prov', '.nav-tab-reportes', '.nav-tab-admin'];

    document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'flex');

    if (!esAdmin) {
        selectorOcultar.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
        cambiarTab('ventas', document.querySelector('.nav-tab-ventas'));
    } else {
        renderUsuarios();
    }
}

window.crearUsuario = function() {
    const nombre = document.getElementById('newUser-nombre').value.trim();
    const username = document.getElementById('newUser-username').value.trim().toLowerCase();
    const password = document.getElementById('newUser-password').value.trim();
    const rol = document.getElementById('newUser-rol').value;

    if (!nombre || !username || !password) {
        alert('Completa todos los campos para crear un usuario.');
        return;
    }

    if (usuarios.some(u => u.username.toLowerCase() === username)) {
        alert('Ese nombre de usuario ya está registrado.');
        return;
    }

    usuarios.push({ id: Date.now(), nombre, username, password, rol });
    localStorage.setItem('pandora_usuarios', JSON.stringify(usuarios));

    document.getElementById('newUser-nombre').value = '';
    document.getElementById('newUser-username').value = '';
    document.getElementById('newUser-password').value = '';
    renderUsuarios();
    alert('¡Usuario creado con éxito!');
};

function renderUsuarios() {
    const contenedor = document.getElementById('lista-usuarios');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    usuarios.forEach(u => {
        const esBorrable = u.username !== 'admin';
        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:8px 12px; border-radius:6px; margin-bottom:6px; border:1px solid #334155; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <div>
                    <strong>${u.nombre}</strong> (@${u.username})<br>
                    <span style="color:#38bdf8;">Rol: ${u.rol.toUpperCase()}</span>
                </div>
                ${esBorrable ? `<button style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;" onclick="eliminarUsuario(${u.id})">Eliminar</button>` : ''}
            </div>
        `;
    });
}

window.eliminarUsuario = function(id) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    usuarios = usuarios.filter(u => u.id !== id);
    localStorage.setItem('pandora_usuarios', JSON.stringify(usuarios));
    renderUsuarios();
};

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
    if (tabName === 'admin') renderUsuarios();
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
// 2. GESTIÓN Y DETALLE DE PROVEEDORES
// ==========================================
function renderProveedoresSaldos() {
    const contenedor = document.getElementById('lista-saldos-proveedores');
    contenedor.innerHTML = '';

    if (proveedores.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay proveedores registrados.</p>';
        return;
    }

    proveedores.forEach(prov => {
        const prodProveedor = inventario.filter(p => p.proveedorId == prov.id);
        const totalStockProv = prodProveedor.reduce((acc, p) => acc + p.stock, 0);

        const ventasPendientes = ventasRealizadas.filter(v => v.proveedorId == prov.id && !v.liquidado);
        const deudaPendiente = ventasPendientes.reduce((acc, v) => acc + v.pagoProveedor, 0);

        let listaArticulosHTML = '';
        if (prodProveedor.length > 0) {
            listaArticulosHTML += '<div style="margin-top:8px; padding-top:8px; border-top:1px dashed #334155; font-size:0.85rem;">';
            listaArticulosHTML += '<strong style="color:#cbd5e1;">📦 Artículos en Tienda (Stock):</strong><ul style="margin:4px 0 8px 18px; padding:0; color:#94a3b8;">';
            prodProveedor.forEach(art => {
                const cod = art.codigo ? `[${art.codigo}] ` : '[Sin código] ';
                listaArticulosHTML += `<li>${cod}<strong>${art.nombre}</strong> - $${art.precio.toFixed(2)} (Stock: ${art.stock} pz)</li>`;
            });
            listaArticulosHTML += '</ul></div>';
        } else {
            listaArticulosHTML = '<p style="font-size:0.8rem; color:#64748b; margin-top:6px;">Sin productos registrados en stock.</p>';
        }

        let listaVentasHTML = '';
        if (ventasPendientes.length > 0) {
            listaVentasHTML += '<div style="margin-top:6px; font-size:0.85rem;">';
            listaVentasHTML += '<strong style="color:#fca5a5;">🛍️ Artículos Vendidos Por Pagar:</strong><ul style="margin:4px 0 8px 18px; padding:0; color:#f87171;">';
            ventasPendientes.forEach(v => {
                listaVentasHTML += `<li>${v.producto} (x${v.cantidad}) - A Pagar: $${v.pagoProveedor.toFixed(2)}</li>`;
            });
            listaVentasHTML += '</ul></div>';
        }

        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #334155;">
                <strong style="color: #38bdf8; font-size: 1.05rem;">${prov.nombre}</strong><br>
                <span style="font-size:0.85rem; color:#94a3b8;">📞 Tel: ${prov.telefono || 'No registrado'}</span><br>
                
                <div style="margin-top: 6px; font-size: 0.9rem;">
                    Piezas activas en tienda: <strong>${totalStockProv}</strong><br>
                    Saldo acumulado a pagar: <strong style="color: #f87171; font-size:1rem;">$${deudaPendiente.toFixed(2)}</strong>
                </div>

                ${listaArticulosHTML}
                ${listaVentasHTML}

                <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                    <button class="btn-primary" style="padding: 10px; font-size: 0.85rem;" onclick="exportarEstadoCuentaProveedorPDF('${prov.id}')">📄 Descargar Estado de Cuenta PDF</button>
                    <button style="background:#10b981; color:white; border:none; padding:10px; border-radius:6px; font-size:0.85rem; font-weight:bold; cursor:pointer;" onclick="liquidarProveedor('${prov.id}')">💵 Liquidar y Pagar</button>
                </div>
            </div>
        `;
    });
}

window.exportarEstadoCuentaProveedorPDF = function(provId) {
    const prov = proveedores.find(p => p.id == provId);
    if (!prov) return;

    const prodProveedor = inventario.filter(p => p.proveedorId == prov.id);
    const ventasPendientes = ventasRealizadas.filter(v => v.proveedorId == prov.id && !v.liquidado);
    const deudaPendiente = ventasPendientes.reduce((acc, v) => acc + v.pagoProveedor, 0);

    generarEstadoCuentaProveedorPDF(prov, prodProveedor, ventasPendientes, deudaPendiente);
};

window.liquidarProveedor = function(provId) {
    const prov = proveedores.find(p => p.id == provId);
    const nombreProv = prov ? prov.nombre : 'este proveedor';

    if (!confirm(`¿Confirmas liquidar el pago a ${nombreProv}? Esto marcará las ventas como pagadas y reiniciará su saldo pendiente a $0.00.`)) {
        return;
    }

    ventasRealizadas.forEach(v => {
        if (v.proveedorId == provId) {
            v.liquidado = true;
        }
    });

    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    renderProveedoresSaldos();
    alert(`¡Saldo de ${nombreProv} liquidado exitosamente!`);
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
    if (!selectProv) return;
    selectProv.innerHTML = '<option value="">-- Seleccionar --</option>';
    proveedores.forEach(p => {
        selectProv.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
    });

    const selectVenta = document.getElementById('venta-producto');
    if (!selectVenta) return;
    selectVenta.innerHTML = '<option value="">-- Seleccionar del inventario --</option>';
    inventario.forEach(prod => {
        if (prod.stock > 0) {
            const codigoMostrado = prod.codigo ? `[${prod.codigo}]` : '[Sin Código]';
            selectVenta.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}" data-codigo="${prod.codigo || ''}">${codigoMostrado} ${prod.nombre} - $${prod.precio.toFixed(2)} (Stock: ${prod.stock})</option>`;
        }
    });
}

// ==========================================
// 4. VENTAS Y FÓRMULA
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
    const comisionTiendaBruta = subtotalBruto * (producto.comisionPorc / 100);
    const pagoProveedor = subtotalBruto - comisionTiendaBruta; 
    const comisionTiendaNeta = comisionTiendaBruta - descuento; 

    const ventaRecord = {
        idVenta: Date.now(),
        folio: Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString(),
        vendedor: usuarioActual ? usuarioActual.nombre : 'Desconocido',
        producto: producto.nombre,
        proveedorId: producto.proveedorId,
        cantidad,
        total: totalVenta,
        gananciaTienda: comisionTiendaNeta > 0 ? comisionTiendaNeta : 0,
        pagoProveedor: pagoProveedor > 0 ? pagoProveedor : 0,
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
// 5. INVENTARIO Y CATÁLOGO PDF
// ==========================================
function renderInventario() {
    const contenedor = document.getElementById('lista-inventario');
    if (!contenedor) return;
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

window.generarCatalogoPDF = function() {
    if (inventario.length === 0) {
        alert('No hay productos en el inventario para generar el catálogo.');
        return;
    }
    generarCatalogoPDF(inventario);
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
    if (!contenedor) return;
    contenedor.innerHTML = '';
    if (deseos.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay solicitudes pendientes.</p>';
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
// 7. CORTE DE CAJA, REINICIO, HISTORIAL Y REPORTES PDF
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

    const repVentas = document.getElementById('rep-ventas');
    if (repVentas) repVentas.innerText = ventasTotales.toFixed(2);

    const repGanancias = document.getElementById('rep-ganancias');
    if (repGanancias) repGanancias.innerText = gananciasNetas.toFixed(2);

    const repProv = document.getElementById('rep-proveedores');
    if (repProv) repProv.innerText = pagarProveedores.toFixed(2);

    renderHistorialVentas();
};

function renderHistorialVentas() {
    const contenedor = document.getElementById('lista-historial-ventas');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    if (ventasRealizadas.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay ventas registradas en el periodo.</p>';
        return;
    }

    [...ventasRealizadas].reverse().forEach(v => {
        const estadoLiquidado = v.liquidado ? '<span style="color:#38bdf8;">[Ya Liquidado]</span>' : '<span style="color:#f87171;">[Pendiente de Pago]</span>';
        contenedor.innerHTML += `
            <div style="background:#0f172a; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #334155; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>Folio #${v.folio}</strong> - ${v.fecha} <span style="color:#94a3b8;">(${v.vendedor || 'Admin'})</span><br>
                    📦 ${v.producto} (x${v.cantidad}) ➔ Total: $${v.total.toFixed(2)}<br>
                    ${estadoLiquidado}
                </div>
                <div>
                    <button style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer;" onclick="devolverVenta(${v.idVenta || v.folio})">🔄 Devolución</button>
                </div>
            </div>
        `;
    });
}

window.devolverVenta = function(idVenta) {
    const index = ventasRealizadas.findIndex(v => (v.idVenta === idVenta || v.folio === idVenta));
    if (index === -1) {
        alert('No se encontró el registro de la venta.');
        return;
    }

    const venta = ventasRealizadas[index];

    if (venta.liquidado) {
        alert('⚠️ Esta venta ya fue liquidada al proveedor. No se puede realizar la devolución automática hasta que ajustes cuentas con él.');
        return;
    }

    if (!confirm(`¿Confirmas la devolución de "${venta.producto}" (Folio #${venta.folio})? Esto regresará las piezas al inventario y restará el adeudo al proveedor.`)) {
        return;
    }

    const productoInventario = inventario.find(p => p.nombre.toLowerCase() === venta.producto.toLowerCase() || p.id === venta.proveedorId);
    if (productoInventario) {
        productoInventario.stock += venta.cantidad;
    } else {
        const altProd = inventario.find(p => p.proveedorId == venta.proveedorId);
        if (altProd) {
            altProd.stock += venta.cantidad;
        }
    }

    ventasRealizadas.splice(index, 1);

    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));

    cargarReportes();
    actualizarSelects();
    alert('¡Devolución procesada con éxito! Stock restaurado y saldo del proveedor ajustado.');
};

window.reiniciarHistorialCaja = function() {
    if (!confirm('⚠️ ¿Estás seguro de que deseas reiniciar la caja? Esto BORRARÁ permanentemente todo el historial de ventas anteriores y pondrá el corte a $0.00.')) {
        return;
    }

    if (!confirm('CONFIRMACIÓN FINAL: Se eliminarán los registros de ventas pasadas. ¿Deseas continuar?')) {
        return;
    }

    ventasRealizadas = [];
    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    cargarReportes();
    renderProveedoresSaldos();
    alert('¡Historial de ventas reiniciado con éxito! El corte de caja está nuevamente en $0.00.');
};

window.generarReporteCortePDF = function() {
    const ventasTotales = parseFloat(document.getElementById('rep-ventas').innerText) || 0;
    const ganancias = parseFloat(document.getElementById('rep-ganancias').innerText) || 0;
    const proveedores = parseFloat(document.getElementById('rep-proveedores').innerText) || 0;

    generarReportePDF({
        fecha: new Date().toLocaleDateString(),
        usuario: usuarioActual ? usuarioActual.nombre : 'Carlos Lechuga',
        ventasTotales,
        ganancias,
        proveedores
    });
};

verificarEstadoSesion();
actualizarSelects();