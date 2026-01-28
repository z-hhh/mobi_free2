import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class FTMSProtocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.FTMS_SERVICE;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        console.log('FTMSProtocol: Connecting...');
        const service = await server.getPrimaryService(this.serviceUUID);

        // Fitness Machine Control Point: 0x2AD9
        try {
            this.controlPoint = await service.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');

            // Listen for Indications (Responses)
            if (this.controlPoint.properties.indicate) {
                await this.controlPoint.startNotifications();
                this.controlPoint.addEventListener('characteristicvaluechanged', this.handleControlPointResponse);
                this.log('info', 'FTMS: Listening for Control Point Indications');
            }

            // Request control? Some FTMS devices require a "Request Control" opcode first (0x00).
            // But standard usually implies we can write straight away if we have permission. 
            // We will attempt to write 0x00 (Request Control) just in case.
            await this.controlPoint.writeValue(new Uint8Array([0x00]));
        } catch (e) {
            console.warn('FTMS Control Point not found or failed to request control', e);
        }
    }

    disconnect(): void {
        if (this.controlPoint) {
            try {
                this.controlPoint.removeEventListener('characteristicvaluechanged', this.handleControlPointResponse);
                this.controlPoint.stopNotifications(); // Best effort cleanup
            } catch (e) { /* ignore */ }
        }
        this.controlPoint = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
        this.onLogCallback = null;
    }

    private handleControlPointResponse = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        // Parse FTMS Control Point Response
        // Format: OpCode (1 byte), Result Code (1 byte), [Params]
        const opCode = value.getUint8(0);

        // Response OpCode is usually 0x80
        if (opCode === 0x80) {
            const reqOpCode = value.getUint8(1);
            const result = value.getUint8(2);
            const resultStr = result === 0x01 ? 'Success' : result === 0x02 ? 'OpCode not supported' : result === 0x03 ? 'Invalid Parameter' : `Failed (${result})`;

            this.log('info', `FTMS Response: OpCode ${reqOpCode.toString(16)} -> ${resultStr}`);
        } else {
            this.log('debug', `FTMS Indication: ${Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        }
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
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
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
