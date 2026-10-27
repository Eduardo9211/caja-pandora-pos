// ==========================================
// APLICACIÓN POS - LA CAJA DE PANDORA (FORZAR ACCESO)
// ==========================================

let inventario = JSON.parse(localStorage.getItem('caja_pandora_inventario')) || [];
let proveedores = JSON.parse(localStorage.getItem('caja_pandora_proveedores')) || [];
let ventas = JSON.parse(localStorage.getItem('caja_pandora_ventas')) || [];
let deseos = JSON.parse(localStorage.getItem('caja_pandora_deseos')) || [];
let usuarios = JSON.parse(localStorage.getItem('caja_pandora_usuarios')) || [];

// Si no hay usuarios o el admin se borró por error, lo creamos forzosamente
if (!usuarios.some(u => u.user === 'admin')) {
    usuarios.push({ nombre: 'Admin', user: 'admin', pass: '1234', rol: 'admin' });
    localStorage.setItem('caja_pandora_usuarios', JSON.stringify(usuarios));
}

let bitacora = JSON.parse(localStorage.getItem('caja_pandora_bitacora')) || [];
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

    // Buscamos al usuario en la lista
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