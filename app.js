// ==========================================
// APLICACIÓN POS - LA CAJA DE PANDORA
// ==========================================

// Recuperación segura de datos existentes (Inventario y ventas intactos)
let inventario = JSON.parse(localStorage.getItem('caja_pandora_inventario')) || [];
let proveedores = JSON.parse(localStorage.getItem('caja_pandora_proveedores')) || [];
let ventas = JSON.parse(localStorage.getItem('caja_pandora_ventas')) || [];
let deseos = JSON.parse(localStorage.getItem('caja_pandora_deseos')) || [];
let bitacora = JSON.parse(localStorage.getItem('caja_pandora_bitacora')) || [];

// BLINDAJE DE ACCESO: Forzamos el usuario admin con contraseña 1234 asegurando no perder nada
let usuarios = JSON.parse(localStorage.getItem('caja_pandora_usuarios')) || [];
let adminIndex = usuarios.findIndex(u => u.user === 'admin');
if (adminIndex >= 0) {
    usuarios[adminIndex].pass = '1234';
} else {
    usuarios.push({ nombre: 'Admin', user: 'admin', pass: '1234', rol: 'admin' });
}
localStorage.setItem('caja_pandora_usuarios', JSON.stringify(usuarios));

let usuarioActual = JSON.parse(localStorage.getItem('caja_pandora_sesion')) || null;

document.addEventListener('DOMContentLoaded', () => {
    if (usuarioActual) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('user-display-name').innerText = usuarioActual.nombre;
        inicializarSistema();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

function iniciarSesion() {
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
        document.getElementById('user-display-name').innerText = usuarioActual.nombre;
        inicializarSistema();
    } else {
        errorEl.style.display = 'block';
        errorEl.innerText = 'Usuario o contraseña incorrectos. Usa admin / 1234';
    }
}

function cerrarSesion() {
    registrarBitacora(`Cerró sesión: ${usuarioActual ? usuarioActual.nombre : 'Admin'}`);
    localStorage.removeItem('caja_pandora_sesion');
    location.reload();
}

function inicializarSistema() {
    actualizarSelects();
    renderInventario();
    renderProveedoresSaldos();
    renderDeseos();
    cargarReportes();
    renderUsuarios();
    renderBitacora();
}

function cambiarTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    btnElement.classList.add('active');
}

// GESTIÓN DE PROVEEDORES
function guardarProveedor() {
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
}

// GESTIÓN DE PRODUCTOS (CON SOPORTE TIENDA WEB)
function guardarProducto() {
    const proveedorId = document.getElementById('prod-proveedor').value;
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio = parseFloat(document.getElementById('prod-precio').value) || 0;
    const comision = parseFloat(document.getElementById('prod-comision').value) || 20;
    const stock = parseInt(document.getElementById('prod-stock').value) || 1;
    
    const enWeb = document.getElementById('prod-en-web').checked;
    const imagen = document.getElementById('prod-imagen').value.trim();

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
        imagen: imagen || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400'
    };

    inventario.push(nuevoProducto);
    localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario));
    registrarBitacora(`Cargó producto a consigna: ${nombre} ($${precio}) [Web: ${enWeb ? 'Sí' : 'No'}]`);

    document.getElementById('prod-nombre').value = '';
    document.getElementById('prod-precio').value = '';
    document.getElementById('prod-stock').value = '1';
    document.getElementById('prod-en-web').checked = false;
    document.getElementById('prod-imagen').value = '';

    renderInventario();
    actualizarSelects();
    alert('¡Producto cargado al inventario con éxito!');
}

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
                    <span style="font-size: 0.75rem; color: ${p.enWeb ? '#4ade80' : '#f87171'};">🌐 En Tienda Web: ${p.enWeb ? 'Sí (Publicado)' : 'No'}</span>
                </div>
                <button onclick="eliminarProducto(${p.id})" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">🗑️</button>
            </div>
        `;
    });
    html += '</div>';
    contenedor.innerHTML = html;
}

function eliminarProducto(id) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
        inventario = inventario.filter(p => p.id !== id);
        localStorage.setItem('caja_pandora_inventario', JSON.stringify(inventario));
        registrarBitacora(`Eliminó producto ID: ${id}`);
        renderInventario();
        actualizarSelects();
    }
}

// VENTAS Y COBRO
function seleccionarProductoVenta() {
    calcularTotalVenta();
}

function filtrarOSeleccionarProducto() {
    const filtro = document.getElementById('venta-buscar').value.toLowerCase();
    const select = document.getElementById('venta-producto');
    
    if (!filtro) return;
    
    const encontrado = inventario.find(p => p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro));
    if (encontrado && encontrado.stock > 0) {
        select.value = encontrado.id;
        calcularTotalVenta();
    }
}

function calcularTotalVenta() {
    const prodId = document.getElementById('venta-producto').value;
    const cantidad = parseInt(document.getElementById('venta-cantidad').value) || 1;
    const descuento = parseFloat(document.getElementById('venta-descuento').value) || 0;

    const producto = inventario.find(p => p.id == prodId);
    if (!producto) {
        document.getElementById('venta-total').innerText = '0.00';