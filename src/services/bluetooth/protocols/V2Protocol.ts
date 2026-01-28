import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

export class V2Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V2_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        // TODO: Implement unlock logic
        console.log('V2Protocol: Connecting...');
    }

    disconnect(): void {
        // Cleanup
    }

    async setResistance(level: number): Promise<void> {
        // TODO
    }

    async setIncline(level: number): Promise<void> {
        // TODO
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
}
