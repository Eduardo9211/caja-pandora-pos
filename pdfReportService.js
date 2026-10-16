// Servicio de generación de documentos PDF con jsPDF

export function generarReportePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(30, 41, 59); // Encabezado azul oscuro
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('LA CAJA DE PANDORA - CORTE DE CAJA', 15, 22);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.text(`Fecha: ${data.fecha}`, 15, 45);
    doc.text(`Responsable: ${data.usuario}`, 15, 52);

    doc.setLineWidth(0.5);
    doc.line(15, 58, 195, 58);

    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Resumen Financiero:', 15, 70);

    doc.setFontSize(12);
    doc.text(`• Ventas Totales: $${data.ventasTotales.toFixed(2)}`, 20, 82);
    doc.text(`• Ganancias Netas (Tienda): $${data.ganancias.toFixed(2)}`, 20, 94);
    doc.text(`• A pagar a Proveedores: $${data.proveedores.toFixed(2)}`, 20, 106);

    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Comprobante generado desde La Caja de Pandora POS', 15, 130);

    doc.save(`Corte_Caja_${data.fecha.replace(/\//g, '-')}.pdf`);
}

export function generarEstadoCuentaProveedorPDF(prov, prodProveedor, ventasPendientes, deudaPendiente) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('ESTADO DE CUENTA - CONSIGNACIÓN', 15, 22);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(`Proveedor: ${prov.nombre}`, 15, 45);
    doc.text(`Teléfono: ${prov.telefono || 'No registrado'}`, 15, 52);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 15, 59);

    doc.line(15, 65, 195, 65);

    let y = 75;
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('Artículos Actuales en Tienda (Stock):', 15, y);
    y += 8;

    doc.setFontSize(10);
    if (prodProveedor.length > 0) {
        prodProveedor.forEach(p => {
            const codigo = p.codigo ? `[${p.codigo}]` : '[Sin código]';
            doc.text(`- ${codigo} ${p.nombre} | Precio: $${p.precio.toFixed(2)} | Stock: ${p.stock}`, 20, y);
            y += 7;
        });
    } else {
        doc.text('(Sin artículos activos en tienda)', 20, y);
        y += 7;
    }

    y += 5;
    doc.setFontSize(13);
    doc.text('Artículos Vendidos (Pendientes de Liquidación):', 15, y);
    y += 8;

    doc.setFontSize(10);
    if (ventasPendientes.length > 0) {
        ventasPendientes.forEach(v => {
            doc.text(`- ${v.producto} (x${v.cantidad}) ➔ A Pagar: $${v.pagoProveedor.toFixed(2)}`, 20, y);
            y += 7;
        });
    } else {
        doc.text('(Sin ventas pendientes por liquidar)', 20, y);
        y += 7;
    }

    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text(`TOTAL ACUMULADO A PAGAR: $${deudaPendiente.toFixed(2)}`, 15, y);

    doc.save(`Estado_Cuenta_${prov.nombre.replace(/\s+/g, '_')}.pdf`);
}

export function generarCatalogoPDF(inventario) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('LA CAJA DE PANDORA - CATÁLOGO', 15, 22);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 45);

    doc.line(15, 52, 195, 52);

    let y = 62;
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);

    const disponibles = inventario.filter(p => p.stock > 0);
    if (disponibles.length === 0) {
        doc.text('No hay productos disponibles en este momento.', 15, y);
    } else {
        disponibles.forEach(p => {
            if (y > 275) {
                doc.addPage();
                y = 20;
            }
            const cod = p.codigo ? `[${p.codigo}]` : '';
            doc.text(`• ${cod} ${p.nombre} - $${p.precio.toFixed(2)} (Disponibles: ${p.stock})`, 15, y);
            y += 8;
        });
    }

    doc.save('Catalogo_La_Caja_de_Pandora.pdf');
}