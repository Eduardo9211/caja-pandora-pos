// ==========================================
// APLICACIÓN POS - LA CAJA DE PANDORA
// ==========================================

let inventario = JSON.parse(localStorage.getItem('caja_pandora_inventario')) || [];
let proveedores = JSON.parse(localStorage.getItem('caja_pandora_proveedores')) || [];
let ventas = JSON.parse(localStorage.getItem('caja_pandora_ventas')) || [];
let deseos = JSON.parse(localStorage.getItem('caja_pandora_deseos')) || [];
let bitacora = JSON.parse(localStorage.getItem('caja_pandora_bitacora')) || [];

// BLINDAJE DE ACCESO: Forzamos el usuario admin con contraseña 1234
let usuarios = JSON.parse(localStorage.getItem('caja_pandora_usuarios')) || [];
let adminIndex = usuarios.findIndex(u => u.user === 'admin');
if (adminIndex >= 0) {
    usuarios[adminIndex].pass = '1234';
    usuarios[adminIndex].nombre = 'Admin';
} else {
    usuarios.push({ nombre: 'Admin', user: 'admin', pass: '1234', rol: 'admin' });
}
localStorage.setItem('caja_pandora_usuarios', JSON.stringify(usuarios));

let usuarioActual = JSON.parse(localStorage.getItem('caja_pandora_sesion')) || null;

document.addEventListener('DOMContentLoaded', () => {
    if (usuarioActual) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        const displayEl = document.getElementById('user-display-name');
        if (displayEl) displayEl.innerText = usuarioActual.nombre;
        inicializarSistema();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

// EXPORTAR FUNCIONES AL SCOPE GLOBAL PARA LOS ONCLICK DEL HTML
window.iniciarSesion = function() {
    const usr = document.getElementById('login-usuario').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');

    const encontrado = usuarios.find(u => u.user === usr && u.pass === pass);
    if (encontrado) {
        usuarioActual = encontrado;
        localStorage.setItem('caja_pandora_sesion', JSON.stringify(usuarioActual));
        registrarBitacora(`Inició sesión: ${usuarioActual.nombre}`);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        const displayEl = document.getElementById('user-display-name');
        if (displayEl) displayEl.innerText = usuarioActual.nombre;
        inicializarSistema();
    } else {
        errorEl.style.display = 'block';
        errorEl.innerText = 'Usuario o contraseña incorrectos. Usa admin / 1234';
    }
};

window.cerrarSesion = function() {
    registrarBitacora(`Cerró sesión: ${usuarioActual ? usuarioActual.nombre : 'Admin'}`);
    localStorage.removeItem('caja_pandora_sesion');
    location.reload();
};

function inicializarSistema() {
    actualizarSelects();
    renderInventario();
    renderProveedoresSaldos();
    renderDeseos();
    cargarReportes();
    renderUsuarios();
    renderBitacora();
}

window.cambiarTab = function(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    const tabTarget = document.getElementById(`tab-${tabId}`);
    if (tabTarget) tabTarget.classList.add('active');
    if (btnElement) btnElement.classList.add('active');
};

// GESTIÓN DE PROVEEDORES
window.guardarProveedor = function() {
    const nombre = document.getElementById('prov-nombre').value.trim();
    const telefono = document.getElementById('prov-telefono').value.trim();

    if (!nombre) {
        alert('Escribe el nombre del proveedor.');
        return;
    }

    proveedores.push({ id: Date.now(), nombre, telefono });
    localStorage.setItem('caja_pandora_proveedores', JSON.stringify(proveedores));
    registrarBitacora(`Registró proveedor: ${nombre}`);
    
    document.getElementById('prov-nombre').value = '';
    document.getElementById('prov-telefono').value = '';
    actualizarSelects();
    alert('¡Proveedor guardado con éxito!');
};

// GESTIÓN DE PRODUCTOS CON MEDIDAS Y PESO
window.guardarProducto = function() {
    const proveedorId = document.getElementById('prod-proveedor').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value) || 0;
    const comision = parseFloat(document.getElementById('prod-comision').value) || 20;
    const stock = parseInt(document.getElementById('prod-stock').value) || 1;
    
    const enWeb = document.getElementById('prod-en-web').checked;
    const imagen = document.getElementById('prod-imagen').value.trim();
    const peso = parseFloat(document.getElementById('prod-peso').value) || 1;
    const largo = parseFloat(document.getElementById('prod-largo').value) || 20;
    const ancho = parseFloat(document.getElementById('prod-ancho').value) || 20;
    const alto = parseFloat(document.getElementById('prod-alto').value) || 20;

    if (!proveedorId || !nombre || precio <= 0) {
        alert('Completa los campos obligatorios del producto.');
        return;
    }

    const provObj = proveedores.find(p => p.id == proveedorId);

    const nuevoProducto = {
        id: Date.now(),
        codigo: 'CP-' + Math.floor(100000 + Math.random() * 900000),
        proveedorId,
        proveedorNombre: provObj ? provObj.nombre : 'Desconocido',
        nombre,
        precio,
        comision,
        stock,
        enWeb,
        imagen: imagen || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400',
        peso,
        largo,
        ancho,
        alto
    };

    inventario.push(nuevoProducto);
    localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario));
    registrarBitacora(`Cargó producto a consigna: ${nombre} ($${precio}) [Web: ${enWeb ? 'Sí' : 'No'}]`);

    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-stock').value = '1';
    document.getElementById('prod-en-web').checked = false;
    document.getElementById('prod-imagen').value = '';
    document.getElementById('prod-peso').value = '1';
    document.getElementById('prod-largo').value = '20';
    document.getElementById('prod-ancho').value = '20';
    document.getElementById('prod-alto').value = '20';

    renderInventario();
    actualizarSelects();
    alert('¡Producto cargado al inventario con éxito!');
};

function actualizarSelects() {
    const selectProv = document.getElementById('prod-proveedor');
    if (selectProv) {
        selectProv.innerHTML = '<option value="">-- Seleccionar --</option>';
        proveedores.forEach(p => {
            selectProv.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    }

    const selectVenta = document.getElementById('venta-producto');
    if (selectVenta) {
        selectVenta.innerHTML = '<option value="">-- Seleccionar del inventario --</option>';
        inventario.filter(p => p.stock > 0).forEach(p => {
            selectVenta.innerHTML += `<option value="${p.id}">${p.nombre} - $${p.precio} (Stock: ${p.stock})</option>`;
        });
    }
}

function renderInventario() {
    const contenedor = document.getElementById('lista-inventario');
    if (!contenedor) return;

    if (inventario.length === 0) {
        contenedor.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">No hay productos registrados.</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    inventario.forEach(p => {
        html += `
            <div style="background: #090d16; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #f8fafc; font-size: 0.9rem;">${p.nombre}</strong><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Código: ${p.codigo} | Stock: ${p.stock} | Precio: $${p.precio}</span><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">📦 ${p.peso || 1}kg | Medidas: ${p.largo || 20}x${p.ancho || 20}x${p.alto || 20} cm</span><br>
                    <span style="font-size: 0.75rem; color: ${p.enWeb ? '#4ade80' : '#f87171'};">🌐 En Tienda Web: ${p.enWeb ? 'Sí' : 'No'}</span>
                </div>
                <button onclick="window.eliminarProducto(${p.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">🗑️</button>
            </div>
        `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

window.eliminarProducto = function(id) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        inventario = inventario.filter(p => p.id !== id);
        localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario));
        registrarBitacora(`Eliminó producto ID: ${id}`);
        renderInventario();
        actualizarSelects();
    }
};

// RESPALDO Y RESTAURACIÓN JSON
window.descargarRespaldoJSON = function() {
    const respaldo = {
        inventario,
        proveedores,
        ventas,
        deseos,
        usuarios,
        bitacora,
        fechaRespaldo: new Date().toLocaleString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(respaldo, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `respaldo_caja_pandora_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    registrarBitacora('Descargó respaldo de datos en JSON');
    alert('¡Respaldo descargado con éxito!');
};

window.restaurarRespaldoJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            if (confirm('⚠️ ADVERTENCIA: Esto sobrescribirá todos los datos actuales con los del archivo de respaldo. ¿Deseas continuar?')) {
                if (contenido.inventario) { inventario = contenido.inventario; localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario)); }
                if (contenido.proveedores) { proveedores = contenido.proveedores; localStorage.setItem('caja_pandora_proveedores', JSON.stringify(proveedores)); }
                if (contenido.ventas) { ventas = contenido.ventas; localStorage.setItem('caja_pandora_ventas', JSON.stringify(ventas)); }
                if (contenido.deseos) { deseos = contenido.deseos; localStorage.setItem('caja_pandora_deseos', JSON.stringify(deseos)); }
                if (contenido.usuarios) { usuarios = contenido.usuarios; localStorage.setItem('caja_pandora_usuarios', JSON.stringify(usuarios)); }
                if (contenido.bitacora) { bitacora = contenido.bitacora; localStorage.setItem('caja_pandora_bitacora', JSON.stringify(bitacora)); }
                
                registrarBitacora('Restauró el sistema desde archivo JSON');
                alert('¡Sistema restaurado con éxito!');
                location.reload();
            }
        } catch (error) {
            alert('Error al leer el archivo JSON. Asegúrate de que sea un respaldo válido.');
        }
    };
    reader.readAsText(file);
};

// VENTAS Y COBRO
window.seleccionarProductoVenta = function() {
    calcularTotalVenta();
};

window.filtrarOSeleccionarProducto = function() {
    const filtro = document.getElementById('venta-buscar').value.toLowerCase();
    const select = document.getElementById('venta-producto');
    
    if (!filtro) return;
    
    const encontrado = inventario.find(p => p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro));
    if (encontrado && encontrado.stock > 0) {
        select.value = encontrado.id;
        calcularTotalVenta();
    }
};

window.calcularTotalVenta = function() {
    const prodId = document.getElementById('venta-producto').value;
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;

    const producto = inventario.find(p => p.id == prodId);
    if (!producto) {
        document.getElementById('venta-total').innerText = '0.00';
        return;
    }

    let total = (producto.precio * cantidad) - descuento;
    if (total < 0) total = 0;
    document.getElementById('venta-total').innerText = total.toFixed(2);
    calcularCambio();
};

window.calcularCambio = function() {
    const total = parseFloat(document.getElementById('venta-total').innerText) || 0;
    const paga = parseFloat(document.getElementById('venta-paga').value) || 0;
    const cambio = paga - total;
    document.getElementById('venta-cambio').innerText = cambio >= 0 ? cambio.toFixed(2) : '0.00';
};

window.procesarVenta = function() {
    const prodId = document.getElementById('venta-producto').value;
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;
    const telefono = document.getElementById('venta-telefono').value.trim();

    const producto = inventario.find(p => p.id == prodId);
    if (!producto) {
        alert('Selecciona un producto válido.');
        return;
    }

    if (producto.stock < cantidad) {
        alert('No hay suficiente stock disponible.');
        return;
    }

    const total = (producto.precio * cantidad) - descuento;
    const gananciaTienda = (producto.precio * (producto.comision / 100) * cantidad) - descuento;
    const pagoProveedor = (producto.precio * (1 - producto.comision / 100) * cantidad);

    producto.stock -= cantidad;
    if (producto.stock <= 0) {
        producto.enWeb = false;
    }

    const nuevaVenta = {
        id: Date.now(),
        fecha: new Date().toLocaleString(),
        productoId: producto.id,
        productoNombre: producto.nombre,
        proveedorId: producto.proveedorId,
        proveedorNombre: producto.proveedorNombre,
        cantidad,
        total,
        gananciaTienda: gananciaTienda > 0 ? gananciaTienda : 0,
        pagoProveedor,
        telefonoCliente: telefono
    };

    ventas.push(nuevaVenta);
    localStorage.setItem('caja_pandora_ventas', JSON.stringify(ventas));
    localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario));
    registrarBitacora(`Venta registrada: ${producto.nombre} x${cantidad} ($${total})`);

    document.getElementById('venta-producto').value = '';
    document.getElementById('venta-cantidad').value = '1';
    document.getElementById('venta-descuento').value = '0.00';
    document.getElementById('venta-paga').value = '';
    document.getElementById('venta-telefono').value = '';
    document.getElementById('venta-total').innerText = '0.00';
    document.getElementById('venta-cambio').innerText = '0.00';

    actualizarSelects();
    renderInventario();
    alert('¡Venta registrada con éxito!');
};

// SALDOS Y PROVEEDORES
function renderProveedoresSaldos() {
    const contenedor = document.getElementById('lista-saldos-proveedores');
    if (!contenedor) return;

    if (proveedores.length === 0) {
        contenedor.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">No hay proveedores registrados.</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    proveedores.forEach(prov => {
        const ventasProv = ventas.filter(v => v.proveedorId == prov.id);
        const totalPorPagar = ventasProv.reduce((acc, v) => acc + v.pagoProveedor, 0);

        html += `
            <div style="background: #090d16; padding: 10px; border-radius: 6px; border: 1px solid #1e293b;">
                <strong style="color: #fbbf24;">${prov.nombre}</strong><br>
                <span style="font-size: 0.75rem; color: #94a3b8;">Tel: ${prov.telefono || 'No registrado'}</span><br>
                <span style="font-size: 0.85rem; color: #4ade80;">Por pagar al proveedor: $${totalPorPagar.toFixed(2)}</span>
            </div>
        `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

// LISTA DE DESEOS
window.guardarDeseo = function() {
    const cliente = document.getElementById('deseo-cliente').value.trim();
    const telefono = document.getElementById('deseo-telefono').value.trim();
    const producto = document.getElementById('deseo-producto').value.trim();

    if (!cliente || !producto) {
        alert('Ingresa el nombre del cliente y el producto buscado.');
        return;
    }

    deseos.push({ id: Date.now(), cliente, telefono, producto, fecha: new Date().toLocaleDateString() });
    localStorage.setItem('caja_pandora_deseos', JSON.stringify(deseos));
    registrarBitacora(`Agregó a lista de deseos: ${producto} para ${cliente}`);

    document.getElementById('deseo-cliente').value = '';
    document.getElementById('deseo-telefono').value = '';
    document.getElementById('deseo-producto').value = '';
    renderDeseos();
    alert('¡Guardado en la lista de deseos!');
};

function renderDeseos() {
    const contenedor = document.getElementById('lista-deseos');
    if (!contenedor) return;

    if (deseos.length === 0) {
        contenedor.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">No hay solicitudes pendientes.</p>';
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    deseos.forEach(d => {
        html += `
            <div style="background: #090d16; padding: 10px; border-radius: 6px; border: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="color: #f8fafc; font-size: 0.85rem;">${d.producto}</strong><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Cliente: ${d.cliente} (${d.telefono || 'Sin tel'})</span>
                </div>
                <button onclick="window.eliminarDeseo(${d.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">✔️ Atendido</button>
            </div>
        `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

window.eliminarDeseo = function(id) {
    deseos = deseos.filter(d => d.id !== id);
    localStorage.setItem('caja_pandora_deseos', JSON.stringify(deseos));
    renderDeseos();
};

// REPORTES Y CORTE
window.cargarReportes = function() {
    const totalVentas = ventas.reduce((acc, v) => acc + v.total, 0);
    const totalGanancias = ventas.reduce((acc, v) => acc + v.gananciaTienda, 0);
    const totalProveedores = ventas.reduce((acc, v) => acc + v.pagoProveedor, 0);

    const rVentas = document.getElementById('rep-ventas');
    const rGanancias = document.getElementById('rep-ganancias');
    const rProv = document.getElementById('rep-proveedores');

    if (rVentas) rVentas.innerText = totalVentas.toFixed(2);
    if (rGanancias) rGanancias.innerText = totalGanancias.toFixed(2);
    if (rProv) rProv.innerText = totalProveedores.toFixed(2);

    const contenedorHistorial = document.getElementById('lista-historial-ventas');
    if (contenedorHistorial) {
        if (ventas.length === 0) {
            contenedorHistorial.innerHTML = '<p style="color: #94a3b8; font-size: 0.85rem;">No hay ventas registradas.</p>';
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
        ventas.slice().reverse().forEach(v => {
            html += `
                <div style="background: #090d16; padding: 10px; border-radius: 6px; border: 1px solid #1e293b;">
                    <strong style="color: #f8fafc; font-size: 0.85rem;">${v.productoNombre} (x${v.cantidad})</strong><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Total: $${v.total.toFixed(2)} | Fecha: ${v.fecha}</span>
                </div>
            `;
        });
        html += '</div>';
        contenedorHistorial.innerHTML = html;
    }
};

window.reiniciarHistorialCaja = function() {
    if (confirm('¿Estás seguro de reiniciar el historial de ventas y la caja? Esta acción no se puede deshacer.')) {
        ventas = [];
        localStorage.setItem('caja_pandora_ventas', JSON.stringify(ventas));
        registrarBitacora('Reinició la caja y el historial de ventas');
        cargarReportes();
        renderProveedoresSaldos();
        alert('Caja reiniciada.');
    }
};

// USUARIOS Y BITÁCORA
window.crearUsuario = function() {
    const nombre = document.getElementById('newUser-nombre').value.trim();
    const user = document.getElementById('newUser-username').value.trim();
    const pass = document.getElementById('newUser-password').value.trim();
    const rol = document.getElementById('newUser-rol').value;

    if (!nombre || !user || !pass) {
        alert('Completa todos los campos para crear el usuario.');
        return;
    }

    usuarios.push({ nombre, user, pass, rol });
    localStorage.setItem('caja_pandora_usuarios', JSON.stringify(usuarios));
    registrarBitacora(`Creó nuevo usuario: ${nombre} (${rol})`);

    document.getElementById('newUser-nombre').value = '';
    document.getElementById('newUser-username').value = '';
    document.getElementById('newUser-password').value = '';
    renderUsuarios();
    alert('¡Usuario creado con éxito!');
};

function renderUsuarios() {
    const contenedor = document.getElementById('lista-usuarios');
    if (!contenedor) return;

    let html = '<div style="display: flex; flex-direction: column; gap: 6px;">';
    usuarios.forEach(u => {
        html += `<div style="background: #090d16; padding: 8px; border-radius: 4px; font-size: 0.8rem; color: #f8fafc;">👤 ${u.nombre} (${u.rol})</div>`;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

function registrarBitacora(accion) {
    const registro = {
        fecha: new Date().toLocaleString(),
        usuario: usuarioActual ? usuarioActual.nombre : 'Admin',
        accion
    };
    bitacora.unshift(registro);
    localStorage.setItem('caja_pandora_bitacora', JSON.stringify(bitacora));
}

window.renderBitacora = function() {
    const contenedor = document.getElementById('lista-bitacora');
    if (!contenedor) return;

    const buscador = document.getElementById('buscar-bitacora');
    const filtro = buscador ? buscador.value.toLowerCase() : '';
    const filtrados = bitacora.filter(b => b.accion.toLowerCase().includes(filtro) || b.usuario.toLowerCase().includes(filtro));

    if (filtrados.length === 0) {
        contenedor.innerHTML = '<p style="color: #94a3b8; font-size: 0.8rem;">Sin registros en la bitácora.</p>';
        return;
    }

    let html = '';
    filtrados.forEach(b => {
        html += `<div style="font-size: 0.75rem; color: #94a3b8; border-bottom: 1px solid #1e293b; padding: 4px 0;">[${b.fecha}] <b>${b.usuario}:</b> ${b.accion}</div>`;
    });
    contenedor.innerHTML = html;
};

window.limpiarBitacora = function() {
    if (confirm('¿Limpiar la bitácora de movimientos?')) {
        bitacora = [];
        localStorage.setItem('caja_pandora_bitacora', JSON.stringify(bitacora));
        renderBitacora();
    }
};

window.generarCatalogoPDF = function() { alert('Generando Catálogo PDF...'); };
window.generarReporteCortePDF = function() { alert('Generando Reporte de Corte PDF...'); };
window.imprimirEtiquetasSeleccionadas = function() { alert('Imprimiendo etiquetas Y50P...'); };