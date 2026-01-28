import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class FTMSProtocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.FTMS_SERVICE;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        console.log('FTMSProtocol: Connecting...');
    }

    disconnect(): void { }
    async setResistance(level: number): Promise<void> { }
    async setIncline(level: number): Promise<void> { }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
}
