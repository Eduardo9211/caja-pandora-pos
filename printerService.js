// Servicio de impresión térmica Bluetooth para Y50P
class ThermalPrinterService {
    constructor() {
        this.device = null;
        this.characteristic = null;
    }

    async connect() {
        try {
            if (!navigator.bluetooth) {
                throw new Error("El navegador no soporta Bluetooth Web.");
            }
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });
            const server = await this.device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            this.characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
            alert('¡Impresora Y50P conectada con éxito!');
        } catch (error) {
            console.error(error);
            throw new Error('Error al conectar con la impresora: ' + error.message);
        }
    }

    async printTicket(ventaData) {
        if (!this.characteristic) {
            await this.connect();
        }

        let encoder = new TextEncoder();
        let comandos = '\x1B\x40'; // Inicializar impresora
        comandos += '\x1B\x61\x01'; // Centrar
        comandos += 'LA CAJA DE PANDORA\n';
        comandos += 'Bazar & Consignaciones\n\n';
        comandos += `Folio: ${ventaData.folio}\n`;
        comandos += `Fecha: ${ventaData.fecha}\n`;
        comandos += '--------------------------------\n';
        comandos += '\x1B\x61\x00'; // Alinear a la izquierda

        ventaData.productos.forEach(p => {
            comandos += `${p.nombre} x${p.cantidad}\n`;
            comandos += `  Subtotal: $${(p.precio * p.cantidad).toFixed(2)}\n`;
        });

        comandos += '--------------------------------\n';
        comandos += `TOTAL: $${ventaData.total.toFixed(2)}\n\n`;
        comandos += '\x1B\x61\x01'; // Centrar
        comandos += '¡Gracias por tu compra!\n\n\n';

        await this.characteristic.writeValue(encoder.encode(comandos));
    }
}

export const thermalPrinter = new ThermalPrinterService();