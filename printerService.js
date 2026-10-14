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

        let texto = '\x1B\x40'; // Inicializar impresora ESC/POS
        texto += '\x1B\x61\x01'; // Centrar
        texto += 'LA CAJA DE PANDORA\n';
        texto += 'Bazar & Consignaciones\n\n';
        texto += `Folio: ${ventaData.folio}\n`;
        texto += `Fecha: ${ventaData.fecha}\n`;
        texto += '--------------------------------\n';
        texto += '\x1B\x61\x00'; // Alinear a la izquierda

        ventaData.productos.forEach(p => {
            let subtotal = p.precio * p.cantidad;
            texto += `${p.nombre} x${p.cantidad}\n`;
            texto += `  Subtotal: $${subtotal.toFixed(2)}\n`;
        });

        texto += '--------------------------------\n';
        texto += `TOTAL: $${ventaData.total.toFixed(2)}\n\n`;
        texto += '\x1B\x61\x01'; // Centrar
        texto += '¡Gracias por tu compra!\n\n\n';

        // Convertir texto a Uint8Array usando TextEncoder para asegurar envío correcto de bytes
        let encoder = new TextEncoder();
        let bytes = encoder.encode(texto);

        // Enviar en bloques si es necesario o directamente
        await this.characteristic.writeValue(bytes);
    }
}

export const thermalPrinter = new ThermalPrinterService();