import { store } from '../../../store';
import { setEquipmentType } from '../../../store/deviceSlice';
import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V2_COMMANDS } from '../constants';

export class V2RowerProtocol implements DeviceProtocol {
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

        // Pre-fetch chars (Bluefy workaround)
        let characteristics: BluetoothRemoteGATTCharacteristic[] = [];
        try {
            characteristics = await this.service.getCharacteristics();
        } catch (e) {
            this.log('warn', 'V2Rower: Failed to pre-fetch characteristics', e);
        }

        const getCharSafely = async (uuid: string): Promise<BluetoothRemoteGATTCharacteristic> => {
            const cached = characteristics.find(c => c.uuid.toLowerCase().includes(uuid.substring(4, 8)));
            if (cached) return cached;
            return await this.service!.getCharacteristic(uuid);
        };

        // Get Control & Unlock
        try {
            this.controlChar = await getCharSafely(BLE_UUIDS.V2_CONTROL);
            const unlockChar = await getCharSafely(BLE_UUIDS.V2_UNLOCK);
            await unlockChar.writeValue(V2_COMMANDS.UNLOCK_INSTRUCTION);
            this.log('info', 'V2Rower: Device unlocked');
        } catch (e) {
            this.log('warn', 'V2Rower: Failed to unlock', e);
        }

        // Detect Sport Type (Verification)
        try {
            const sportTypeChar = await getCharSafely(BLE_UUIDS.V2_SPORT_TYPE);
            const value = await sportTypeChar.readValue();
            const sportType = new Uint8Array(value.buffer)[0];
            if (sportType !== 0) {
                // Not a Rower, let BluetoothManager try the standard V2Protocol
                throw new Error('NOT_A_ROWER');
            }
            store.dispatch(setEquipmentType('rower'));
            this.log('info', 'V2Rower: Sport type confirmed (Rower)');
        } catch (e: any) {
            if (e.message === 'NOT_A_ROWER') throw e;
            this.log('warn', 'V2Rower: Sport type detection failed, continuing as rower');
        }

        // Setup Data Notifications
        await this.setupDataNotifications(getCharSafely);
    }

    private async setupDataNotifications(getCharSafely: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristic>): Promise<void> {
        const dataCharUUIDs = [
            { uuid: BLE_UUIDS.V2_INTERVAL, name: 'Interval (8811)' },
            { uuid: BLE_UUIDS.V2_RESISTANCE, name: 'Resistance (8812)' },
            { uuid: BLE_UUIDS.V2_DATA_ALL, name: 'All Data (8813)' }
        ];

        for (const { uuid, name } of dataCharUUIDs) {
            try {
                const char = await getCharSafely(uuid);
                await char.startNotifications();
                char.addEventListener('characteristicvaluechanged', this.handleDataNotification);
                this.dataChars.set(uuid, char);
                this.log('info', `V2Rower: Monitoring ${name}`);
            } catch (e) {
                this.log('debug', `V2Rower: ${name} not available`);
            }
        }
    }

    private handleDataNotification = (event: Event): void => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        const uuid = char.uuid.toLowerCase();

        const parsedData: ParsedData = {};

        if (uuid.includes('8812') && bytes.length > 0) {
            parsedData.resistance = bytes[0];
        } else if (uuid.includes('8811') && bytes.length >= 2) {
            // Rower Specific: 8811 parsing
            const intervalMs = (bytes[0] << 8) | bytes[1];
            if (bytes.length >= 4) {
                parsedData.count = (bytes[2] << 8) | bytes[3];
            }

            if (intervalMs > 0 && intervalMs < 60000) {
                const spm = Math.round(60000 / intervalMs);
                parsedData.spm = spm;
                parsedData.rpm = spm; // Show as RPM on common dashboard gauges
            } else {
                parsedData.spm = 0;
                parsedData.rpm = 0;
            }
        } else if (uuid.includes('8813')) {
            // Rower 8813 structure (from Android V2Handler)
            if (bytes.length >= 9) {
                parsedData.speed = bytes[0] / 10;
                parsedData.spm = bytes[2];
                parsedData.time = (bytes[3] << 8) | bytes[4];
                parsedData.distance = ((bytes[5] << 8) | bytes[6]) / 10;
                parsedData.calories = ((bytes[7] << 8) | bytes[8]) / 10;
            }
        }

        if (this.onDataCallback && Object.keys(parsedData).length > 0) {
            this.onDataCallback(parsedData);
        }
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
        for (const char of this.dataChars.values()) {
            char.removeEventListener('characteristicvaluechanged', this.handleDataNotification);
            char.stopNotifications().catch(() => {});
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
        if (this.controlChar) {
            await this.controlChar.writeValue(new Uint8Array([0x02, 0x01, level]));
        }
    }

    async setIncline(): Promise<void> {
        // Not supported for rowers
    }

    onData(cb: (data: ParsedData) => void): void { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void): void { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void): void { this.onLogCallback = cb; }
}
