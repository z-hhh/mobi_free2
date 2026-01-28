import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class V1Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V1_SERVICE;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        console.log('V1Protocol: Connecting...');
    }

    disconnect(): void { }
    async setResistance(level: number): Promise<void> { }
    async setIncline(level: number): Promise<void> { }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { }
}
