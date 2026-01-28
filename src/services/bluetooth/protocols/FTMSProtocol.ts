import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class FTMSProtocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.FTMS_SERVICE;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;

    private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        console.log('FTMSProtocol: Connecting...');
        const service = await server.getPrimaryService(this.serviceUUID);

        // Fitness Machine Control Point: 0x2AD9
        try {
            this.controlPoint = await service.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');
            // Request control? Some FTMS devices require a "Request Control" opcode first (0x00).
            // But standard usually implies we can write straight away if we have permission. 
            // We will attempt to write 0x00 (Request Control) just in case.
            await this.controlPoint.writeValue(new Uint8Array([0x00]));
        } catch (e) {
            console.warn('FTMS Control Point not found or failed to request control', e);
        }
    }

    disconnect(): void {
        this.controlPoint = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
    }

    async setResistance(level: number): Promise<void> {
        if (!this.controlPoint) return;
        // FTMS Set Target Resistance Level: Opcode 0x04, Level (Uint8)
        const command = new Uint8Array([0x04, level]);
        await this.controlPoint.writeValue(command);
    }

    async setIncline(level: number): Promise<void> {
        if (!this.controlPoint) return;
        // FTMS Set Target Inclination: Opcode 0x03, Incline (Sint16)
        // Level is %, pass as integer for now (x10 if 0.1% resolution required)
        // Assuming input is integer %, FTMS usually uses 0.1% units.
        const val = level * 10;
        const view = new DataView(new ArrayBuffer(3));
        view.setUint8(0, 0x03);
        view.setInt16(1, val, true);
        await this.controlPoint.writeValue(view);
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
}
