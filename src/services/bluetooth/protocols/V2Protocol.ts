import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

export class V2Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V2_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private controlChar: BluetoothRemoteGATTCharacteristic | null = null;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        this.service = await server.getPrimaryService(this.serviceUUID);

        // Get Control Characteristic
        this.controlChar = await this.service.getCharacteristic(BLE_UUIDS.V2_CONTROL);

        // Attempt to listen for responses on Control Char (if supported)
        if (this.controlChar.properties.notify || this.controlChar.properties.indicate) {
            try {
                await this.controlChar.startNotifications();
                this.controlChar.addEventListener('characteristicvaluechanged', this.handleControlResponse);
                this.log('info', 'V2: Listening for Control Responses');
            } catch (e) {
                this.log('warn', 'V2: Functionality limited - Cannot listen for control responses', e);
            }
        }

        // TODO: Implement unlock logic if needed (usually handled by control char write)
        console.log('V2Protocol: Connected and Control Char found');
    }

    private handleControlResponse = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;
        const hex = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log('info', `V2 Response: ${hex}`);
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
        if (this.controlChar) {
            try {
                this.controlChar.removeEventListener('characteristicvaluechanged', this.handleControlResponse);
                this.controlChar.stopNotifications();
            } catch (e) { /* ignore */ }
        }
        this.server = null;
        this.service = null;
        this.controlChar = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
        this.onLogCallback = null;
    }

    async setResistance(level: number): Promise<void> {
        if (!this.controlChar) {
            console.warn('V2 Control Characteristic not found');
            return;
        }
        // V2 Protocol Resistance Command: 0x01, 0x01, Level
        // Writes to 880f (CONTROL_INSTRUCT_TYPE)
        const command = new Uint8Array([0x01, 0x01, level]);
        // Note: controlChar was originally defined as V2_CONTROL which is 880f. This is correct.
        await this.controlChar.writeValue(command);
    }

    async setIncline(level: number): Promise<void> {
        // TODO
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
