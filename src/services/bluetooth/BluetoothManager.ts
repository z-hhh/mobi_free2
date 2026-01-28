import { store } from '../../store';
import { addLog } from '../../store/logSlice';
import {
    setConnectionStatus,
    setDeviceInfo,
    setProtocol,
    setError
} from '../../store/deviceSlice';
import { updateMetrics } from '../../store/workoutSlice';
import { DeviceProtocol } from './DeviceProtocol';
import { V2Protocol } from './protocols/V2Protocol';
import { V1Protocol } from './protocols/V1Protocol';
import { FTMSProtocol } from './protocols/FTMSProtocol';
import { BLE_UUIDS } from './constants';

class BluetoothManager {
    private device: BluetoothDevice | null = null;
    private protocol: DeviceProtocol | null = null;

    async scan() {
        try {
            store.dispatch(setConnectionStatus('scanning'));
            store.dispatch(addLog({ level: 'info', message: 'Starting Scan...' }));

            const device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'Mobi' }, { namePrefix: 'MB' }],
                optionalServices: [
                    BLE_UUIDS.V2_SERVICE,
                    BLE_UUIDS.V1_SERVICE,
                    BLE_UUIDS.FTMS_SERVICE,
                    BLE_UUIDS.DEVICE_INFO,
                    BLE_UUIDS.HEART_RATE
                ]
            });

            this.device = device;
            store.dispatch(addLog({ level: 'info', message: `Device selected: ${device.name} (${device.id})` }));

            await this.connect(device);

        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                store.dispatch(setConnectionStatus('disconnected'));
                store.dispatch(addLog({ level: 'info', message: 'User cancelled scan' }));
            } else {
                store.dispatch(setError(error.message));
                store.dispatch(addLog({ level: 'error', message: 'Scan Error', data: error }));
                store.dispatch(setConnectionStatus('error'));
            }
        }
    }

    async connect(device: BluetoothDevice) {
        if (!device.gatt) return;

        try {
            store.dispatch(setConnectionStatus('connecting'));
            device.addEventListener('gattserverdisconnected', this.onDisconnect);

            const server = await device.gatt.connect();
            store.dispatch(addLog({ level: 'info', message: 'GATT connected' }));
            store.dispatch(setDeviceInfo({ name: device.name, id: device.id }));

            // Determine Protocol
            const services = await server.getPrimaryServices();
            const serviceUUIDs = services.map((s: BluetoothRemoteGATTService) => s.uuid);
            store.dispatch(addLog({ level: 'debug', message: 'Services found', data: serviceUUIDs }));

            let protocol: DeviceProtocol | null = null;
            let version: 'v2' | 'v1' | 'ftms' | null = null;

            if (serviceUUIDs.includes(BLE_UUIDS.V2_SERVICE)) {
                protocol = new V2Protocol();
                version = 'v2';
            } else if (serviceUUIDs.includes(BLE_UUIDS.V1_SERVICE)) {
                protocol = new V1Protocol();
                version = 'v1';
            } else if (serviceUUIDs.includes(BLE_UUIDS.FTMS_SERVICE)) {
                protocol = new FTMSProtocol();
                version = 'ftms';
            }

            if (!protocol) {
                throw new Error('Unsupported Device Protocol');
            }

            this.protocol = protocol;
            store.dispatch(setProtocol(version));
            store.dispatch(addLog({ level: 'info', message: `Initializing Protocol: ${version}` }));

            // Setup Callbacks
            protocol.onData((data) => {
                store.dispatch(updateMetrics(data));
            });

            protocol.onError((err) => {
                store.dispatch(addLog({ level: 'error', message: 'Protocol Error', data: err }));
            });

            // Connect Protocol
            await protocol.connect(server);

            store.dispatch(setConnectionStatus('connected'));

        } catch (error: any) {
            console.error(error);
            store.dispatch(setError(error.message));
            store.dispatch(addLog({ level: 'error', message: 'Connection Failed', data: error }));
            store.dispatch(setConnectionStatus('error'));
        }
    }

    private onDisconnect = () => {
        store.dispatch(setConnectionStatus('disconnected'));
        store.dispatch(addLog({ level: 'warn', message: 'Device Disconnected' }));
        if (this.protocol) {
            this.protocol.disconnect();
            this.protocol = null;
        }
        this.device = null; // Ensure device is cleared
    }

    disconnect() {
        if (this.device && this.device.gatt?.connected) {
            this.device.gatt.disconnect();
        } else {
            // Force manual cleanup if already physically disconnected
            this.onDisconnect();
        }
    }

    // API for UI
    async setResistance(level: number) {
        if (this.protocol) {
            try {
                await this.protocol.setResistance(level);
                store.dispatch(addLog({ level: 'info', message: `Set Resistance: ${level} (Success)` }));
            } catch (err: any) {
                store.dispatch(addLog({ level: 'error', message: `Set Resistance Failed: ${level}`, data: err }));
            }
        }
    }
}

export const bluetoothManager = new BluetoothManager();
