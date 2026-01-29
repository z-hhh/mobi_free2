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
                    filters: [
                        { namePrefix: 'Mobi' },
                        { namePrefix: 'MB' },
                        { namePrefix: 'MOBI' }
                    ],
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

            // Build list of available protocols in priority order (V2 > V1 > HuanTong > FTMS)
            const availableProtocols: Array<{ protocol: DeviceProtocol; version: 'v2' | 'v1' | 'ftms' }> = [];

            if (serviceUUIDs.includes(v2Service)) {
                availableProtocols.push({ protocol: new V2Protocol(), version: 'v2' });
            }
            if (serviceUUIDs.includes(v1Service)) {
                availableProtocols.push({ protocol: new V1Protocol(), version: 'v1' });
            }
            if (serviceUUIDs.includes(huantongService)) {
                availableProtocols.push({ protocol: new HuanTongProtocol(), version: 'v1' });
            }
            if (serviceUUIDs.includes(ftmsService)) {
                availableProtocols.push({ protocol: new FTMSProtocol(), version: 'ftms' });
            }

            if (availableProtocols.length === 0) {
                throw new Error('Unsupported Device Protocol');
            }

            // Try each protocol in order until one succeeds
            let lastError: any = null;
            for (let i = 0; i < availableProtocols.length; i++) {
                const { protocol: tryProtocol, version: tryVersion } = availableProtocols[i];

                try {
                    store.dispatch(addLog({
                        level: 'info',
                        message: `Trying Protocol: ${tryVersion} (${i + 1}/${availableProtocols.length})`
                    }));

                    // Setup callbacks
                    tryProtocol.onData((data) => {
                        store.dispatch(updateMetrics(data));
                    });

                    tryProtocol.onError((err) => {
                        store.dispatch(addLog({ level: 'error', message: 'Protocol Error', data: err }));
                    });

                    tryProtocol.onLog((level, message, data) => {
                        store.dispatch(addLog({ level, message, data }));
                    });

                    // Try to connect
                    await tryProtocol.connect(server);

                    // Success!
                    protocol = tryProtocol;
                    version = tryVersion;
                    this.protocol = protocol;
                    store.dispatch(setProtocol(version));
                    store.dispatch(addLog({
                        level: 'info',
                        message: `Protocol Connected: ${version}`
                    }));
                    break;

                } catch (error: any) {
                    lastError = error;
                    const errorMsg = error?.message || String(error);
                    store.dispatch(addLog({
                        level: 'warn',
                        message: `Protocol ${tryVersion} failed: ${errorMsg}`,
                        data: { error: errorMsg }
                    }));

                    // Clean up failed protocol
                    try {
                        tryProtocol.disconnect();
                    } catch (e) { /* ignore */ }

                    // If this was the last protocol, throw
                    if (i === availableProtocols.length - 1) {
                        throw new Error(`All protocols failed. Last error: ${errorMsg}`);
                    }

                    // Otherwise, continue to next protocol
                    store.dispatch(addLog({
                        level: 'info',
                        message: `Trying next protocol...`
                    }));
                }
            }

            if (!protocol || !version) {
                throw lastError || new Error('Failed to connect with any protocol');
            }

            store.dispatch(setConnectionStatus('connected'));

        } catch (error: any) {
            console.error('Connection error:', error);

            // Extract detailed error information
            const errorDetails = {
                name: error?.name,
                message: error?.message || String(error),
                code: error?.code,
                stack: error?.stack,
                // For DOMException
                ...(error instanceof DOMException && {
                    domCode: error.code,
                    domMessage: error.message
                })
            };

            store.dispatch(setError(errorDetails.message));
            store.dispatch(addLog({
                level: 'error',
                message: `Connection Failed: ${errorDetails.message}`,
                data: errorDetails
            }));
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
            const isBluefy = navigator.userAgent.toLowerCase().includes('bluefy');
            const errorMessage = error?.message || String(error);
            const errorName = error?.name || 'Unknown';

            store.dispatch(addLog({
                level: 'warn',
                message: `Quick reconnect failed (${errorName}): ${errorMessage}`,
                data: {
                    name: errorName,
                    message: errorMessage,
                    code: error?.code,
                    isBluefy
                }
            }));

            // Fallback to regular scan (with device picker)
            await this.scan();
        }
    }
}

export const bluetoothManager = new BluetoothManager();
