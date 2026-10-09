// Servicio simple para generar reporte en texto/PDF descargable
export function generarReportePDF(corteData) {
    const contenido = `
========================================
   LA CAJA DE PANDORA - CORTE DE CAJA
========================================
Fecha: ${corteData.fecha}
Usuario: ${corteData.usuario}

- Ventas Totales: $${corteData.ventasTotales.toFixed(2)}
- Ganancias Netas (Comisiones): $${corteData.ganancias.toFixed(2)}
- A pagar a Proveedores: $${corteData.proveedores.toFixed(2)}
========================================
`;

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Corte_Caja_${corteData.fecha.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('¡Reporte generado y descargado con éxito!');
}