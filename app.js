import { thermalPrinter } from './printerService.js';
import { generarReportePDF, generarEstadoCuentaProveedorPDF, generarCatalogoPDF } from './pdfReportService.js';

let proveedores = JSON.parse(localStorage.getItem('pandora_proveedores')) || [];
let inventario = JSON.parse(localStorage.getItem('pandora_inventario')) || [];
let deseos = JSON.parse(localStorage.getItem('pandora_deseos')) || [];
let ventasRealizadas = JSON.parse(localStorage.getItem('pandora_ventas')) || [];
let bitacora = JSON.parse(localStorage.getItem('pandora_bitacora')) || [];

let usuarios = JSON.parse(localStorage.getItem('pandora_usuarios')) || [
    { id: 1, nombre: 'Carlos (Admin)', username: 'admin', password: 'pandora123', rol: 'admin' }
];

let usuarioActual = JSON.parse(localStorage.getItem('pandora_usuario_activo')) || null;

function registrarBitacora(accion, detalle) {
    const nuevoEvento = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual ? usuarioActual.nombre : 'Sistema',
        accion,
        detalle
    };
    bitacora.unshift(nuevoEvento);
    if (bitacora.length > 200) bitacora.pop();
    localStorage.setItem('pandora_bitacora', JSON.stringify(bitacora));
}

function renderBitacora() {
    const contenedor = document.getElementById('lista-bitacora');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    const filtro = (document.getElementById('buscar-bitacora')?.value || '').trim().toLowerCase();

    const eventosFiltrados = bitacora.filter(e => 
        e.usuario.toLowerCase().includes(filtro) || 
        e.accion.toLowerCase().includes(filtro) || 
        e.detalle.toLowerCase().includes(filtro) ||
        e.fecha.toLowerCase().includes(filtro)
    );

    if (eventosFiltrados.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.8rem;">Sin movimientos registrados.</p>';
        return;
    }

    eventosFiltrados.forEach(e => {
        contenedor.innerHTML += `
            <div style="background:#090d16; padding:8px 10px; border-radius:6px; margin-bottom:6px; border:1px solid #475569; font-size:0.78rem;">
                <div style="display:flex; justify-content:space-between; color:#fbbf24; font-weight:bold;">
                    <span>👤 ${e.usuario}</span>
                    <span style="color:#94a3b8; font-weight:normal;">⏱️ ${e.fecha}</span>
                </div>
                <div style="color:#e2e8f0; margin-top:2px;">
                    <strong>${e.accion}:</strong> ${e.detalle}
                </div>
            </div>
        `;
    });
}
window.renderBitacora = renderBitacora;

window.limpiarBitacora = function() {
    if (!confirm('¿Confirmas borrar el historial de auditoría?')) return;
    bitacora = [];
    localStorage.setItem('pandora_bitacora', JSON.stringify(bitacora));
    renderBitacora();
};

window.iniciarSesion = function() {
    const userIn = document.getElementById('login-usuario').value.trim().toLowerCase();
    const passIn = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');
    const usuarioEncontrado = usuarios.find(u => u.username.toLowerCase() === userIn && u.password === passIn);

    if (usuarioEncontrado) {
        usuarioActual = usuarioEncontrado;
        localStorage.setItem('pandora_usuario_activo', JSON.stringify(usuarioActual));
        errorEl.style.display = 'none';
        registrarBitacora('Inicio de Sesión', 'Acceso concedido al sistema POS.');
        verificarEstadoSesion();
    } else {
        errorEl.innerText = 'Usuario o contraseña incorrectos.';
        errorEl.style.display = 'block';
    }
};

window.cerrarSesion = function() {
    if (usuarioActual) registrarBitacora('Cierre de Sesión', 'El usuario salió del sistema.');
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
        renderBitacora();
    }
}

window.crearUsuario = function() {
    const nombre = document.getElementById('newUser-nombre').value.trim();
    const username = document.getElementById('newUser-username').value.trim().toLowerCase();
    const password = document.getElementById('newUser-password').value.trim();
    const rol = document.getElementById('newUser-rol').value;

    if (!nombre || !username || !password) {
        alert('Completa todos los campos.');
        return;
    }
    if (usuarios.some(u => u.username.toLowerCase() === username)) {
        alert('Ese usuario ya existe.');
        return;
    }

    usuarios.push({ id: Date.now(), nombre, username, password, rol });
    localStorage.setItem('pandora_usuarios', JSON.stringify(usuarios));
    registrarBitacora('Alta de Usuario', `Se creó @${username}`);
    document.getElementById('newUser-nombre').value = '';
    document.getElementById('newUser-username').value = '';
    document.getElementById('newUser-password').value = '';
    renderUsuarios();
    alert('¡Usuario creado!');
};

function renderUsuarios() {
    const contenedor = document.getElementById('lista-usuarios');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    usuarios.forEach(u => {
        const esBorrable = u.username !== 'admin';
        contenedor.innerHTML += `
            <div style="background:#090d16; padding:8px 12px; border-radius:6px; margin-bottom:6px; border:1px solid #475569; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem;">
                <div><strong>${u.nombre}</strong> (@${u.username})<br><span style="color:#fbbf24;">Rol: ${u.rol.toUpperCase()}</span></div>
                ${esBorrable ? `<button style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer;" onclick="eliminarUsuario(${u.id})">Eliminar</button>` : ''}
            </div>
        `;
    });
}

window.eliminarUsuario = function(id) {
    if (!confirm('¿Seguro deseas eliminar este usuario?')) return;
    usuarios = usuarios.filter(u => u.id !== id);
    localStorage.setItem('pandora_usuarios', JSON.stringify(usuarios));
    renderUsuarios();
};

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
    if (tabName === 'admin') { renderUsuarios(); renderBitacora(); }
    if (tabName === 'ventas' || tabName === 'proveedores') actualizarSelects();
};

window.guardarProveedor = function() {
    const nombre = document.getElementById('prov-nombre').value.trim();
    const telefono = document.getElementById('prov-telefono').value.trim();
    if (!nombre) { alert('Ingresa el nombre.'); return; }

    proveedores.push({ id: Date.now(), nombre, telefono });
    localStorage.setItem('pandora_proveedores', JSON.stringify(proveedores));
    registrarBitacora('Alta de Proveedor', `Proveedor "${nombre}"`);
    document.getElementById('prov-nombre').value = '';
    document.getElementById('prov-telefono').value = '';
    actualizarSelects();
    alert('¡Proveedor guardado!');
};

// ==========================================
// GUARDAR PRODUCTO CON DATOS PARA LA WEB
// ==========================================
window.guardarProducto = function() {
    const proveedorId = document.getElementById('prod-proveedor').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value) || 0;
    const comisionPorc = parseFloat(document.getElementById('prod-comision').value) || 20;
    const stock = parseInt(document.getElementById('prod-stock').value) || 1;
    const enWeb = document.getElementById('prod-en-web').checked;
    const imagen = document.getElementById('prod-imagen').value.trim() || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=500';

    if (!proveedorId || !nombre || precio <= 0) {
        alert('Completa los campos obligatorios.');
        return;
    }

    const producto = {
        id: Date.now(),
        codigo: null,
        proveedorId,
        nombre,
        precio,
        comisionPorc,
        stock,
        enWeb,
        imagen
    };

    inventario.push(producto);
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));
    registrarBitacora('Ingreso de Producto', `Se ingresó "${nombre}" (Stock: ${stock}, Web: ${enWeb ? 'Sí' : 'No'})`);

    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-stock').value = '1';
    document.getElementById('prod-en-web').checked = false;
    document.getElementById('prod-imagen').value = '';
    actualizarSelects();
    renderInventario();
    alert('¡Producto cargado con éxito!');
};

function renderProveedoresSaldos() {
    const contenedor = document.getElementById('lista-saldos-proveedores');
    contenedor.innerHTML = '';
    if (proveedores.length === 0) {
        contenedor.innerHTML = '<p style="color:#94a3b8; font-size:0.9rem;">No hay proveedores.</p>';
        return;
    }

    proveedores.forEach(prov => {
        const prodProveedor = inventario.filter(p => p.proveedorId == prov.id);
        const totalStockProv = prodProveedor.reduce((acc, p) => acc + p.stock, 0);
        const ventasPendientes = ventasRealizadas.filter(v => v.proveedorId == prov.id && !v.liquidado);
        const deudaPendiente = ventasPendientes.reduce((acc, v) => acc + v.pagoProveedor, 0);

        contenedor.innerHTML += `
            <div style="background:#171007; padding:12px; border-radius:8px; margin-bottom:12px; border:1px solid #475569;">
                <strong style="color: #fbbf24; font-size: 1.05rem;">${prov.nombre}</strong><br>
                <span style="font-size:0.85rem; color:#94a3b8;">📞 Tel: ${prov.telefono || 'N/R'}</span><br>
                <div style="margin-top: 6px; font-size: 0.9rem;">
                    Stock activo: <strong>${totalStockProv}</strong> | Saldo a pagar: <strong style="color: #f87171;">$${deudaPendiente.toFixed(2)}</strong>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                    <button class="btn-primary" style="padding: 10px; font-size: 0.85rem;" onclick="exportarEstadoCuentaProveedorPDF('${prov.id}')">📄 Estado de Cuenta PDF</button>
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
    if (!confirm(`¿Liquidar saldo a ${prov ? prov.nombre : 'proveedor'}?`)) return;
    ventasRealizadas.forEach(v => { if (v.proveedorId == provId) v.liquidado = true; });
    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    renderProveedoresSaldos();
    alert('¡Liquidado con éxito!');
};

window.imprimirEtiquetasSeleccionadas = async function() {
    const checkboxes = document.querySelectorAll('.check-etiqueta:checked');
    if (checkboxes.length === 0) { alert('Selecciona al menos un producto.'); return; }
    try {
        await thermalPrinter.connect();
        for (let cb of checkboxes) {
            const producto = inventario.find(p => p.id === parseInt(cb.value));
            if (producto) {
                if (!producto.codigo) producto.codigo = 'PAN-' + Math.floor(100000 + Math.random() * 900000);
                await thermalPrinter.printTicket({ folio: producto.codigo, fecha: new Date().toLocaleDateString(), productos: [{ nombre: producto.nombre, cantidad: 1, precio: producto.precio }], total: producto.precio });
                await new Promise(r => setTimeout(r, 500));
            }
        }
        localStorage.setItem('pandora_inventario', JSON.stringify(inventario));
        renderInventario();
        alert('¡Impresión exitosa!');
    } catch (e) { alert('Error: ' + e.message); }
};

function actualizarSelects() {
    const selectProv = document.getElementById('prod-proveedor');
    if (selectProv) {
        selectProv.innerHTML = '<option value="">-- Seleccionar --</option>';
        proveedores.forEach(p => selectProv.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);
    }
    const selectVenta = document.getElementById('venta-producto');
    if (selectVenta) {
        selectVenta.innerHTML = '<option value="">-- Seleccionar del inventario --</option>';
        inventario.forEach(prod => {
            if (prod.stock > 0) {
                selectVenta.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}" data-codigo="${prod.codigo || ''}">[${prod.codigo || 'Sin Cod'}] ${prod.nombre} - $${prod.precio.toFixed(2)} (Stock: ${prod.stock})</option>`;
            }
        });
    }
}

window.filtrarOSeleccionarProducto = function() {
    const query = document.getElementById('venta-buscar').value.trim().toLowerCase();
    const select = document.getElementById('venta-producto');
    if (!query) return;
    for (let option of select.options) {
        if (option.text.toLowerCase().includes(query)) {
            select.value = option.value;
            calcularTotalVenta();
            break;
        }
    }
};

window.seleccionarProductoVenta = function() { calcularTotalVenta(); };
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
    document.getElementById('venta-cambio').innerText = (paga >= total ? paga - total : 0).toFixed(2);
};

window.procesarVenta = function() {
    const select = document.getElementById('venta-producto');
    const option = select.options[select.selectedIndex];
    if (!option || !option.value) { alert('Selecciona un producto.'); return; }

    const prodId = parseInt(option.value);
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;
    const totalVenta = parseFloat(document.getElementById('venta-total').innerText) || 0;

    const producto = inventario.find(p => p.id === prodId);
    if (!producto || producto.stock < cantidad) { alert('Stock insuficiente.'); return; }

    producto.stock -= cantidad;
    
    // Si el stock llega a 0, se quita automáticamente de la web para liberar memoria
    if (producto.stock <= 0) {
        producto.enWeb = false;
    }

    const subtotal = producto.precio * cantidad;
    const comisionBruta = subtotal * (producto.comisionPorc / 100);

    ventasRealizadas.push({
        idVenta: Date.now(),
        folio: Math.floor(1000 + Math.random() * 9000),
        fecha: new Date().toLocaleString(),
        vendedor: usuarioActual ? usuarioActual.nombre : 'Admin',
        producto: producto.nombre,
        proveedorId: producto.proveedorId,
        cantidad,
        total: totalVenta,
        gananciaTienda: (comisionBruta - descuento) > 0 ? (comisionBruta - descuento) : 0,
        pagoProveedor: (subtotal - comisionBruta) > 0 ? (subtotal - comisionBruta) : 0,
        liquidado: false
    });

    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));
    registrarBitacora('Venta POS', `Venta de "${producto.nombre}" (x${cantidad}) por $${totalVenta.toFixed(2)}`);
    alert('¡Venta registrada!');
    document.getElementById('venta-cantidad').value = '1';
    document.getElementById('venta-descuento').value = '0.00';
    document.getElementById('venta-paga').value = '';
    actualizarSelects();
};

function renderInventario() {
    const contenedor = document.getElementById('lista-inventario');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    if (inventario.length === 0) { contenedor.innerHTML = '<p style="color:#94a3b8;">Inventario vacío.</p>'; return; }

    inventario.forEach(prod => {
        const prov = proveedores.find(p => p.id == prod.proveedorId);
        contenedor.innerHTML += `
            <div style="background:#171007; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #475569; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:#fbbf24;">[${prod.codigo || 'Sin Código'}]</strong> ${prod.nombre}<br>
                    Precio: $${prod.precio.toFixed(2)} | Stock: ${prod.stock} | Web: <span style="color:${prod.enWeb ? '#4ade80':'#f87171'}">${prod.enWeb ? 'Activo' : 'Oculto'}</span><br>
                    <span style="font-size:0.8rem; color:#94a3b8;">Proveedor: ${prov ? prov.nombre : 'General'}</span>
                </div>
                <div><input type="checkbox" class="check-etiqueta" value="${prod.id}" style="width:22px; height:22px; cursor:pointer;"></div>
            </div>
        `;
    });
}

window.generarCatalogoPDF = function() {
    if (inventario.length === 0) { alert('Sin productos.'); return; }
    generarCatalogoPDF(inventario);
};

window.guardarDeseo = function() {
    const cliente = document.getElementById('deseo-cliente').value.trim();
    const telefono = document.getElementById('deseo-telefono').value.trim();
    const producto = document.getElementById('deseo-producto').value.trim();
    if (!cliente || !producto) { alert('Completa los campos.'); return; }
    deseos.push({ id: Date.now(), cliente, telefono, producto });
    localStorage.setItem('pandora_deseos', JSON.stringify(deseos));
    document.getElementById('deseo-cliente').value = '';
    document.getElementById('deseo-producto').value = '';
    renderDeseos();
    alert('¡Guardado en Lista de Deseos!');
};

function renderDeseos() {
    const contenedor = document.getElementById('lista-deseos');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    deseos.forEach(d => {
        contenedor.innerHTML += `<div style="background:#171007; padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid #475569;"><strong>${d.cliente}:</strong> ${d.producto}</div>`;
    });
}

window.cargarReportes = function() {
    let t = 0, g = 0, p = 0;
    ventasRealizadas.forEach(v => {
        t += v.total;
        g += v.gananciaTienda;
        if (!v.liquidado) p += v.pagoProveedor;
    });
    document.getElementById('rep-ventas').innerText = t.toFixed(2);
    document.getElementById('rep-ganancias').innerText = g.toFixed(2);
    document.getElementById('rep-proveedores').innerText = p.toFixed(2);
    renderHistorialVentas();
};

function renderHistorialVentas() {
    const contenedor = document.getElementById('lista-historial-ventas');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    [...ventasRealizadas].reverse().forEach(v => {
        contenedor.innerHTML += `
            <div style="background:#171007; padding:8px; border-radius:6px; margin-bottom:6px; border:1px solid #475569; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
                <div><strong>Folio #${v.folio}</strong> - ${v.producto} (x${v.cantidad}) ➔ $${v.total.toFixed(2)}<br><span style="color:${v.liquidado?'#fbbf24':'#f87171'}">${v.liquidado?'Liquidado':'Pendiente'}</span></div>
                <button style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="devolverVenta(${v.idVenta})">Devolución</button>
            </div>
        `;
    });
}

window.devolverVenta = function(idVenta) {
    const index = ventasRealizadas.findIndex(v => v.idVenta === idVenta);
    if (index === -1) return;
    const venta = ventasRealizadas[index];
    if (venta.liquidado) { alert('Ya liquidado.'); return; }
    if (!confirm('¿Confirmas la devolución?')) return;

    const prod = inventario.find(p => p.nombre.toLowerCase() === venta.producto.toLowerCase());
    if (prod) prod.stock += venta.cantidad;

    ventasRealizadas.splice(index, 1);
    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    localStorage.setItem('pandora_inventario', JSON.stringify(inventario));
    cargarReportes();
    alert('Devolución procesada.');
};

window.reiniciarHistorialCaja = function() {
    if (!confirm('⚠️ ¿Reiniciar caja y borrar historial de ventas?')) return;
    ventasRealizadas = [];
    localStorage.setItem('pandora_ventas', JSON.stringify(ventasRealizadas));
    cargarReportes();
    alert('Caja reiniciada a $0.00');
};

window.generarReporteCortePDF = function() {
    generarReportePDF({
        fecha: new Date().toLocaleDateString(),
        usuario: usuarioActual ? usuarioActual.nombre : 'Admin',
        ventasTotales: parseFloat(document.getElementById('rep-ventas').innerText) || 0,
        ganancias: parseFloat(document.getElementById('rep-ganancias').innerText) || 0,
        proveedores: parseFloat(document.getElementById('rep-proveedores').innerText) || 0
    });
};

verificarEstadoSesion();
actualizarSelects();