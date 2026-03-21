import { store } from '../../../store';
import { setEquipmentType } from '../../../store/deviceSlice';
import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

/**
 * Standard V2 Protocol (Optimized for Ellipticals/Bikes)
 */
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

        let characteristics: BluetoothRemoteGATTCharacteristic[] = [];
        try {
            characteristics = await this.service.getCharacteristics();
        } catch (e) {}

        const getCharSafely = async (uuid: string) => {
            const cached = characteristics.find(c => c.uuid.toLowerCase().includes(uuid.substring(4, 8)));
            if (cached) return cached;
            return await this.service!.getCharacteristic(uuid);
        };

        try {
            this.controlChar = await getCharSafely(BLE_UUIDS.V2_CONTROL);
            const unlockChar = await getCharSafely(BLE_UUIDS.V2_UNLOCK);
            await unlockChar.writeValue(V2_COMMANDS.UNLOCK_INSTRUCTION);
            this.log('info', 'V2: Device unlocked');
        } catch (e) {}

        // Read Device Information (from Device Info Service)
        await this.readDeviceInfo();

        // Set type as elliptical by default (standard V2)
        store.dispatch(setEquipmentType('elliptical'));

        // Setup Data Notifications
        await this.setupDataNotifications(getCharSafely);

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
            } catch (e) {}

            // Read Serial Number (2a25)
            try {
                const serialChar = await deviceInfoService.getCharacteristic(BLE_UUIDS.SERIAL_NUMBER);
                const value = await serialChar.readValue();
                const serialNumber = new TextDecoder().decode(value).replace(/\0/g, '').trim();
                this.log('info', `V2: Serial Number: ${serialNumber}`);
            } catch (e) {}
        } catch (e) {}
    }

    private async setupDataNotifications(getCharSafely: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristic>): Promise<void> {
        const dataCharUUIDs = [
            { uuid: BLE_UUIDS.V2_INTERVAL, name: 'Interval Data (8811)' },
            { uuid: BLE_UUIDS.V2_RESISTANCE, name: 'Resistance Gear (8812)' },
            { uuid: BLE_UUIDS.V2_DATA_ALL, name: 'All Device Data (8813)' }
        ];

        for (const { uuid, name } of dataCharUUIDs) {
            try {
                const char = await getCharSafely(uuid);
                if (char.properties.notify || char.properties.indicate) {
                    await char.startNotifications();
                    char.addEventListener('characteristicvaluechanged', this.handleDataNotification);
                    this.dataChars.set(uuid, char);
                    this.log('info', `V2: Monitoring ${name}`);
                }
            } catch (e) {
                this.log('debug', `V2: ${name} not available`);
            }
        }
    }

    private handleDataNotification = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        const uuid = char.uuid.toLowerCase();
        const parsedData: ParsedData = {};

        if (uuid.includes('8812') && bytes.length > 0) {
            parsedData.resistance = bytes[0];
        } else if (uuid.includes('8811') && bytes.length >= 2) {
            const intervalMs = (bytes[0] << 8) | bytes[1];
            if (intervalMs > 0) {
                const rpm = Math.round(60000 / intervalMs);
                parsedData.rpm = rpm;
                parsedData.spm = rpm;
            }
        } else if (uuid.includes('8813') && bytes.length >= 9) {
            // Restore Official Offsets based on Mobi V2Handler
            parsedData.hasReceivedAllData = true;
            parsedData.speed = bytes[0] / 10;
            parsedData.incline = bytes[1];
            parsedData.spm = bytes[2];
            parsedData.rpm = bytes[2]; // Common mappings use RPM
            parsedData.time = (bytes[3] << 8) | bytes[4]; // Duration in seconds
            parsedData.distance = ((bytes[5] << 8) | bytes[6]) / 1000; // Sent as meters, convert to km
            parsedData.calories = ((bytes[7] << 8) | bytes[8]) / 10; // Sent as 0.1 kcal
            if (bytes.length >= 11) {
                parsedData.power = (bytes[9] << 8) | bytes[10];
            }
        }

        if (this.onDataCallback) this.onDataCallback(parsedData);
    }

    private log(level: any, message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
        for (const char of this.dataChars.values()) {
            char.removeEventListener('characteristicvaluechanged', this.handleDataNotification);
            char.stopNotifications().catch(() => {});
        }
        this.dataChars.clear();
        this.server = null;
    }

    async setResistance(level: number) {
        if (this.controlChar) {
            await this.controlChar.writeValue(new Uint8Array([0x02, 0x01, level]));
        }
    }

    async setIncline() {}
    onData(cb: any) { this.onDataCallback = cb; }
    onError(cb: any) { this.onErrorCallback = cb; }
    onLog(cb: any) { this.onLogCallback = cb; }
}
