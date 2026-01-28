import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

export class V2Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V2_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private controlChar: BluetoothRemoteGATTCharacteristic | null = null;
    private dataChars: Map<string, BluetoothRemoteGATTCharacteristic> = new Map();

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        this.service = await server.getPrimaryService(this.serviceUUID);

        // Get Control Characteristic
        this.controlChar = await this.service.getCharacteristic(BLE_UUIDS.V2_CONTROL);

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

        // Read Device Information (from Device Info Service)
        await this.readDeviceInfo();

        // Setup Data Notifications
        await this.setupDataNotifications();

        this.log('info', 'V2Protocol: Connected, unlocked, and data monitoring active');
    }

    private async readDeviceInfo(): Promise<void> {
        try {
            const deviceInfoService = await this.server!.getPrimaryService(BLE_UUIDS.DEVICE_INFO);

            // Read Model Number (2a24)
            try {
                const modelChar = await deviceInfoService.getCharacteristic(BLE_UUIDS.MODEL_NUMBER);
                const value = await modelChar.readValue();
                const modelNumber = new TextDecoder().decode(value).replace(/\0/g, '').trim();
                this.log('info', `V2: Model Number: ${modelNumber}`);
            } catch (e) {
                this.log('debug', 'V2: Model Number not available');
            }

            // Read Serial Number (2a25)
            try {
                const serialChar = await deviceInfoService.getCharacteristic(BLE_UUIDS.SERIAL_NUMBER);
                const value = await serialChar.readValue();
                const serialNumber = new TextDecoder().decode(value).replace(/\0/g, '').trim();
                this.log('info', `V2: Serial Number: ${serialNumber}`);
            } catch (e) {
                this.log('debug', 'V2: Serial Number not available');
            }

            // Read Firmware Version (2a26)
            try {
                const firmwareChar = await deviceInfoService.getCharacteristic(BLE_UUIDS.FIRMWARE_REV);
                const value = await firmwareChar.readValue();
                const firmwareVersion = new TextDecoder().decode(value).replace(/\0/g, '').trim();
                this.log('info', `V2: Firmware Version: ${firmwareVersion}`);
            } catch (e) {
                this.log('debug', 'V2: Firmware Version not available');
            }
        } catch (e) {
            this.log('debug', 'V2: Device Info Service not available', e);
        }
    }

    private async setupDataNotifications(): Promise<void> {
        // Setup notifications for various data characteristics
        const dataCharUUIDs = [
            { uuid: BLE_UUIDS.V2_INTERVAL, name: 'Interval Data (8811)' },
            { uuid: BLE_UUIDS.V2_RESISTANCE, name: 'Resistance Gear (8812)' },
            { uuid: BLE_UUIDS.V2_DATA_ALL, name: 'All Device Data (8813)' },
            { uuid: '0000880e-0000-1000-8000-00805f9b34fb', name: 'Machine State (880e)' }
        ];

        for (const { uuid, name } of dataCharUUIDs) {
            try {
                const char = await this.service!.getCharacteristic(uuid);
                if (char.properties.notify) {
                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', this.handleDataNotification);
                    this.dataChars.set(uuid, char);
                    this.log('info', `V2: Monitoring ${name}`);
                }
            } catch (e) {
                this.log('debug', `V2: ${name} not available or not notifiable`);
            }
        }

        // Also listen for control responses
        if (this.controlChar && (this.controlChar.properties.notify || this.controlChar.properties.indicate)) {
            try {
                await this.controlChar.startNotifications();
                this.controlChar.addEventListener('characteristicvaluechanged', this.handleControlResponse);
                this.log('info', 'V2: Listening for Control Responses');
            } catch (e) {
                this.log('warn', 'V2: Cannot listen for control responses', e);
            }
        }
    }

    private handleDataNotification = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        const uuid = char.uuid;

        // Log raw data for debugging
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log('debug', `V2 Data [${uuid.substring(4, 8)}]: ${hex}`);

        // Parse data based on characteristic UUID
        const parsedData: ParsedData = {};

        // Parse based on characteristic type
        if (uuid === BLE_UUIDS.V2_RESISTANCE && bytes.length > 0) {
            parsedData.resistance = bytes[0];
        } else if (uuid === BLE_UUIDS.V2_DATA_ALL) {
            // Parse comprehensive data packet (8813)
            // Structure needs to be determined from actual device data
            // This is a placeholder for the parsing logic
            this.parseAllDeviceData(bytes, parsedData);
        }

        // Callback with parsed data
        if (this.onDataCallback && Object.keys(parsedData).length > 0) {
            this.onDataCallback(parsedData);
        }
    }

    private parseAllDeviceData(bytes: Uint8Array, parsedData: ParsedData): void {
        // Parse all device data (8813 characteristic)
        // This is based on common V2 protocol patterns
        // Actual structure should be verified with device logs

        if (bytes.length < 10) return;

        // Example parsing - adjust based on actual device data structure
        // Resistance (if present)
        if (bytes.length > 0) parsedData.resistance = bytes[0];

        // Time (big-endian, seconds)
        if (bytes.length > 2) {
            parsedData.time = (bytes[1] << 8) | bytes[2];
        }

        // Distance (big-endian, 0.1 km units)
        if (bytes.length > 4) {
            const distRaw = (bytes[3] << 8) | bytes[4];
            parsedData.distance = distRaw / 10;
        }

        // Calories
        if (bytes.length > 6) {
            parsedData.calories = (bytes[5] << 8) | bytes[6];
        }

        // Speed (0.1 km/h units)
        if (bytes.length > 8) {
            const speedRaw = (bytes[7] << 8) | bytes[8];
            parsedData.speed = speedRaw / 10;
        }

        // SPM/RPM
        if (bytes.length > 9) {
            parsedData.spm = bytes[9];
        }
    }

    private handleControlResponse = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;
        const hex = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log('info', `V2 Control Response: ${hex}`);
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
        // Stop all notifications
        for (const char of this.dataChars.values()) {
            try {
                char.removeEventListener('characteristicvaluechanged', this.handleDataNotification);
                char.stopNotifications();
            } catch (e) { /* ignore */ }
        }

        if (this.controlChar) {
            try {
                this.controlChar.removeEventListener('characteristicvaluechanged', this.handleControlResponse);
                this.controlChar.stopNotifications();
            } catch (e) { /* ignore */ }
        }

        this.dataChars.clear();
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
        // TODO: Implement incline control if supported
        this.log('warn', 'V2: Incline control not yet implemented');
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
