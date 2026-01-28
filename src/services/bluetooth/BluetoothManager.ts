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
import { HuanTongProtocol } from './protocols/HuanTongProtocol';
import { BLE_UUIDS } from './constants';

class BluetoothManager {
    private device: BluetoothDevice | null = null;
    private protocol: DeviceProtocol | null = null;

    /**
     * Normalize UUID to full format
     * Bluefy returns short UUIDs like "FFE0", we need to expand them
     */
    private normalizeUUID(uuid: string): string {
        // Already in full format
        if (uuid.length > 8) {
            return uuid.toLowerCase();
        }

        // Short format (4 chars like "FFE0") - expand to full Bluetooth Base UUID
        // Format: 0000XXXX-0000-1000-8000-00805f9b34fb
        const shortUUID = uuid.toLowerCase().padStart(4, '0');
        return `0000${shortUUID}-0000-1000-8000-00805f9b34fb`;
    }

    async scan() {
        try {
            store.dispatch(setConnectionStatus('scanning'));
            store.dispatch(addLog({ level: 'info', message: 'Starting Scan...' }));

            // Detect Bluefy browser
            const isBluefy = navigator.userAgent.toLowerCase().includes('bluefy');

            let device: BluetoothDevice;

            if (isBluefy) {
                // Bluefy: use acceptAllDevices without filters
                store.dispatch(addLog({ level: 'debug', message: 'Bluefy detected: using acceptAllDevices mode' }));
                device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true
                });
            } else {
                // Standard browsers: use filters and optionalServices
                device = await navigator.bluetooth.requestDevice({
                    filters: [{ namePrefix: 'Mobi' }, { namePrefix: 'MB' }, { namePrefix: 'MOBI' }],
                    optionalServices: [
                        BLE_UUIDS.V2_SERVICE,
                        BLE_UUIDS.V1_SERVICE,
                        BLE_UUIDS.HUANTONG_SERVICE,
                        BLE_UUIDS.FTMS_SERVICE,
                        BLE_UUIDS.DEVICE_INFO,
                        BLE_UUIDS.HEART_RATE
                    ]
                });
            }

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
            const serviceUUIDs = services.map((s: BluetoothRemoteGATTService) => this.normalizeUUID(s.uuid));
            store.dispatch(addLog({ level: 'debug', message: 'Services found', data: serviceUUIDs }));

            let protocol: DeviceProtocol | null = null;
            let version: 'v2' | 'v1' | 'ftms' | null = null;

            // Normalize our service UUIDs for comparison
            const v2Service = this.normalizeUUID(BLE_UUIDS.V2_SERVICE);
            const v1Service = this.normalizeUUID(BLE_UUIDS.V1_SERVICE);
            const huantongService = this.normalizeUUID(BLE_UUIDS.HUANTONG_SERVICE);
            const ftmsService = this.normalizeUUID(BLE_UUIDS.FTMS_SERVICE);

            if (serviceUUIDs.includes(v2Service)) {
                protocol = new V2Protocol();
                version = 'v2';
            } else if (serviceUUIDs.includes(v1Service)) {
                protocol = new V1Protocol();
                version = 'v1';
            } else if (serviceUUIDs.includes(huantongService)) {
                // Also could check name for 'MOBI-E' etc as per official app
                protocol = new HuanTongProtocol();
                version = 'v1'; // Reuse V1 UI logic or add new version type? Let's use 'v1' or 'ftms' for now, or add 'huantong' to types.
                // Actually, let's stick to 'v1' for state simplicity if it behaves similarly, or add 'huantong'.
                // Ideally add 'huantong' to types.
            } else if (serviceUUIDs.includes(ftmsService)) {
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

            protocol.onLog((level, message, data) => {
                store.dispatch(addLog({ level, message, data }));
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

    /**
     * Quick reconnect to last device
     * Uses navigator.bluetooth.getDevices() to find previously paired devices
     */
    async quickReconnect(lastDeviceId: string) {
        try {
            // Check if getDevices API is supported
            if (!navigator.bluetooth.getDevices) {
                store.dispatch(addLog({
                    level: 'warn',
                    message: 'Quick reconnect not supported in this browser, using device picker...'
                }));
                await this.scan();
                return;
            }

            store.dispatch(setConnectionStatus('scanning'));
            store.dispatch(addLog({ level: 'info', message: 'Attempting quick reconnect...' }));

            // Get previously authorized devices
            const devices = await navigator.bluetooth.getDevices();

            if (devices.length === 0) {
                throw new Error('No previously authorized devices found');
            }

            // Find the device by ID
            const targetDevice = devices.find(d => d.id === lastDeviceId);

            if (!targetDevice) {
                store.dispatch(addLog({
                    level: 'warn',
                    message: `Device ${lastDeviceId} not found, showing device picker...`
                }));
                // Fallback to regular scan
                await this.scan();
                return;
            }

            store.dispatch(addLog({ level: 'info', message: `Quick reconnecting to: ${targetDevice.name}` }));

            this.device = targetDevice;
            await this.connect(targetDevice);

        } catch (error: any) {
            // If getDevices is not supported or fails, fallback to regular scan
            const errorMessage = error?.message || String(error);
            store.dispatch(addLog({
                level: 'warn',
                message: 'Quick reconnect failed, falling back to device picker: ' + errorMessage
            }));
            await this.scan();
        }
    }
}

export const bluetoothManager = new BluetoothManager();
