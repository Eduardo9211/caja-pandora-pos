const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON y archivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ruta principal para servir la aplicación POS
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor de La Caja de Pandora corriendo en el puerto ${PORT}`);
});