import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

export class V2Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V2_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private controlChar: BluetoothRemoteGATTCharacteristic | null = null;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        this.service = await server.getPrimaryService(this.serviceUUID);

        // Get Control Characteristic
        this.controlChar = await this.service.getCharacteristic(BLE_UUIDS.V2_CONTROL);

        // TODO: Implement unlock logic if needed (usually handled by control char write)
        console.log('V2Protocol: Connected and Control Char found');
    }

    disconnect(): void {
        this.server = null;
        this.service = null;
        this.controlChar = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
    }

    async setResistance(level: number): Promise<void> {
        if (!this.controlChar) {
            console.warn('V2 Control Characteristic not found');
            return;
        }
        // V2 Protocol Resistance Command: 0x01, 0x01, Level
        const command = new Uint8Array([0x01, 0x01, level]);
        await this.controlChar.writeValue(command);
    }

    async setIncline(level: number): Promise<void> {
        // TODO
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
}
