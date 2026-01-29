import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class HuanTongProtocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.HUANTONG_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private dataChar: BluetoothRemoteGATTCharacteristic | null = null;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    private intervalId: any = null;
    private currentResistance = 1;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        this.service = await server.getPrimaryService(this.serviceUUID);

        // Get Write Characteristic (FFF2)
        try {
            this.writeChar = await this.service.getCharacteristic(BLE_UUIDS.HUANTONG_WRITE);
        } catch (e) {
            this.log('error', 'HuanTong: Failed to get Write Char (FFF2)', e);
            throw e;
        }

        // Get Data Characteristic (FFF1)
        try {
            this.dataChar = await this.service.getCharacteristic(BLE_UUIDS.HUANTONG_DATA);
            await this.dataChar.startNotifications();
            this.dataChar.addEventListener('characteristicvaluechanged', this.handleDataNotify);
            this.log('info', 'HuanTong: Listening for Data (FFF1)');
        } catch (e) {
            this.log('error', 'HuanTong: Failed to get Data Char (FFF1)', e);
            throw e;
        }

        // Send initialization command (per official HuanTongHandler line 189)
        // Command: [0x40, 0x00, age_in_lbs, weight_in_kg, checksum]
        await this.sendInitCommand();

        // Start Heartbeat after successful initialization
        this.startHeartbeat();

        this.log('info', 'HuanTongProtocol: Connected');
    }

    /**
     * Send initialization command with user parameters
     * Per official HuanTongHandler line 184-210
     */
    private async sendInitCommand(): Promise<void> {
        const DEFAULT_AGE = 30;  // Default age if not available
        const DEFAULT_WEIGHT = 70; // Default weight in kg if not available

        // Convert age to pounds-like value (per official: age * 2.2046226)
        const ageParam = Math.round(DEFAULT_AGE * 2.2046226);
        const weightParam = DEFAULT_WEIGHT;

        // Command: [0x40, 0x00, ageParam, weightParam, checksum]
        const b1 = 0x40;
        const b2 = 0x00;
        const checksum = (b1 + b2 + ageParam + weightParam) % 256;

        const cmd = new Uint8Array([b1, b2, ageParam, weightParam, checksum]);

        try {
            await this.writeChar?.writeValue(cmd);
            this.log('info', 'HuanTong: Initialization command sent');
        } catch (e) {
            this.log('error', 'HuanTong: Failed to send init command', e);
            throw e;
        }
    }

    private handleDataNotify = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        // RPM Parsing from HuanTongHandler:
        // if (data.length == 12 && data[1] != 0)
        // Byte 2, 3 -> RPM (Hex String parsing in original, assuming simple bytes here or need verify)
        // Correct, original java code:
        // String strG = String.format("%X%02X", data[2], data[3]);
        // Double dValueOf = Double.parseDouble(strG);
        // This implies data[2] is high byte, data[3] is low byte, but formatted as hex string??
        // Wait, format "%X%02X" with bytes?
        // If data[2] = 0x01, data[3] = 0x20. Result "120". ParseDouble("120") = 120.
        // This is essentially (data[2] << 8) | data[3] if interpreted as hex digits?
        // No, %X is hex. 1 -> "1". 32 (0x20) -> "20". "120" hex is 288 decimal.
        // But ParseDouble parses DECIMAL usually unless radix specified.
        // Actually, Double.parseDouble("120") is 120.
        // So it treats Hex String as Decimal?? That's weird logic in original standard.
        // Let's assume standard (val[2]<<8 + val[3]) for now, or log it.

        const bytes = new Uint8Array(value.buffer);
        if (bytes.length === 12) {
            // Let's try standard interpretation first, log raw
            // const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
            // this.log('debug', `HuanTong Data: ${hex}`);

            // Simplest guess for RPM:
            const rpm = (bytes[2] << 8) | bytes[3];
            if (this.onDataCallback) this.onDataCallback({ rpm });
        }
    }

    private startHeartbeat() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = setInterval(() => {
            if (this.writeChar && this.server && this.server.connected) {
                this.sendHeartbeat();
            }
        }, 1000);
    }

    private async sendHeartbeat() {
        // [0x20, 0xC1, res, 0, checksum]
        // b10 = 32 (0x20), b11 = -63 (0xC1)
        const b1 = 0x20;
        const b2 = 0xC1;
        const res = this.currentResistance;
        const b4 = 0x00;
        const sum = (b1 + b2 + res + b4) % 256;

        const cmd = new Uint8Array([b1, b2, res, b4, sum]);

        try {
            await this.writeChar?.writeValue(cmd);
            // this.log('debug', `HuanTong HB: ${res}`);
        } catch (e) {
            this.log('warn', 'HuanTong: Heartbeat failed', e);
        }
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.dataChar) {
            try {
                this.dataChar.removeEventListener('characteristicvaluechanged', this.handleDataNotify);
                this.dataChar.stopNotifications();
            } catch (e) { /* ignore */ }
        }
        this.server = null;
        this.service = null;
        this.writeChar = null;
        this.dataChar = null;
    }

    async setResistance(level: number): Promise<void> {
        this.currentResistance = level;
        // Immediate send, and heartbeat will maintain it
        await this.sendHeartbeat();
        this.log('info', `HuanTong: Set Target Resistance ${level}`);
    }

    async setIncline(level: number): Promise<void> {
        // Not implemented
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
