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

        // Unlock V2 Device (CRITICAL: Required before any control commands)
        // Per mobi-official V2Handler.unlock0x02VerBLeDeviceWritePermission
        try {
            const unlockChar = await this.service.getCharacteristic(BLE_UUIDS.V2_UNLOCK);
            await unlockChar.writeValue(V2_COMMANDS.UNLOCK_INSTRUCTION);
            this.log('info', 'V2: Device unlocked successfully (0x11 0x82 0x07)');
        } catch (e) {
            this.log('error', 'V2: Failed to unlock device - control commands may not work', e);
            throw new Error('Failed to unlock V2 device');
        }

        this.log('info', 'V2Protocol: Connected and unlocked');
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
            this.log('warn', 'V2: Control Characteristic not found');
            return;
        }
        // V2 Protocol Resistance Command: [CMD, LENGTH, LEVEL]
        // Per mobi-official V2Handler.bleVer0x02Control case 4:
        // CMD=0x02 (resistance), LENGTH=0x01, DATA=level
        const command = new Uint8Array([0x02, 0x01, level]);
        await this.controlChar.writeValue(command);
        this.log('info', `V2: Set Resistance to ${level}`);
    }

    async setIncline(level: number): Promise<void> {
        // TODO
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
