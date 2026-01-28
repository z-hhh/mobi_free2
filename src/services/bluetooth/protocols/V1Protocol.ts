import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS, V1_CONSTANTS } from '../constants';

export class V1Protocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.V1_SERVICE;

    private server: BluetoothRemoteGATTServer | null = null;
    private service: BluetoothRemoteGATTService | null = null;
    private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
    private dataChar: BluetoothRemoteGATTCharacteristic | null = null;

    // Cache last received data for control commands (as per mobi-official V1Handler)
    private lastData: Uint8Array | null = null;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.server = server;
        this.service = await server.getPrimaryService(this.serviceUUID);

        // Get Write Characteristic (FFE3)
        try {
            this.writeChar = await this.service.getCharacteristic(BLE_UUIDS.V1_WRITE);
        } catch (e) {
            this.log('error', 'V1: Failed to get Write Char (FFE3)', e);
            throw e;
        }

        // Get Data Characteristic (FFE4) - This is the main one for Elliptical
        try {
            this.dataChar = await this.service.getCharacteristic(BLE_UUIDS.V1_DATA);
            await this.dataChar.startNotifications();
            this.dataChar.addEventListener('characteristicvaluechanged', this.handleDataNotify);
            this.log('info', 'V1: Listening for Data (FFE4)');
        } catch (e) {
            this.log('error', 'V1: Failed to get Data Char (FFE4)', e);
            throw e;
        }

        this.log('info', 'V1Protocol: Connected');
    }

    private handleDataNotify = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        this.lastData = bytes; // Cache for control commands

        // V1 Data Parsing
        // Based on typical elliptical machine protocols and mobi-official patterns
        // The exact byte positions may need adjustment based on actual device behavior

        // Log raw data for debugging (uncomment if needed)
        // const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        // this.log('debug', `V1 Data (${bytes.length} bytes): ${hex}`);

        if (bytes.length < 10) {
            // Not enough data, skip parsing
            return;
        }

        // Parse data based on common V1 protocol structure
        // Note: These positions are estimated and may need adjustment
        const parsedData: ParsedData = {};

        // Resistance (byte 5 is commonly used, also needed for write-back)
        if (bytes.length > 5) {
            parsedData.resistance = bytes[5];
        }

        // Time (bytes 3-4, typically in seconds, big-endian)
        if (bytes.length > 4) {
            const timeRaw = (bytes[3] << 8) | bytes[4];
            parsedData.time = timeRaw; // in seconds
        }

        // Distance (bytes 6-7, typically in meters or 0.1km units)
        if (bytes.length > 7) {
            const distRaw = (bytes[6] << 8) | bytes[7];
            parsedData.distance = distRaw / 10; // convert to km
        }

        // Calories (bytes 8-9, typically in kcal)
        if (bytes.length > 9) {
            const calRaw = (bytes[8] << 8) | bytes[9];
            parsedData.calories = calRaw;
        }

        // Speed (bytes 10-11, typically in 0.1 km/h units)
        if (bytes.length > 11) {
            const speedRaw = (bytes[10] << 8) | bytes[11];
            parsedData.speed = speedRaw / 10; // convert to km/h
        }

        // SPM/RPM (byte 12, revolutions or steps per minute)
        if (bytes.length > 12) {
            parsedData.spm = bytes[12];
        }

        // Send parsed data to callback
        if (this.onDataCallback) {
            this.onDataCallback(parsedData);
        }
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    disconnect(): void {
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
        if (!this.writeChar) {
            this.log('warn', 'V1: Write Char not found');
            return;
        }

        if (!this.lastData || this.lastData.length <= 6) {
            this.log('warn', 'V1: Cannot set resistance - No data received yet');
            return;
        }

        // Logic from V1Handler.writeBleVer0x01Resistance:
        // byte[] bArr2 = {InstructionCode.FRAME_HEADER, 3, 0, bArr[3], bArr[4], (byte) i4, bArr[6]};
        // where bArr is previous ellipticalData.

        const cmd = new Uint8Array([
            V1_CONSTANTS.FRAME_HEADER, // 0xAB
            V1_CONSTANTS.CMD_RESISTANCE, // 0x03
            0x00,
            this.lastData[3],
            this.lastData[4],
            level,
            this.lastData[6]
        ]);

        try {
            await this.writeChar.writeValue(cmd);
            this.log('info', `V1: Set Resistance to ${level}`);
        } catch (e) {
            this.log('error', 'V1: Failed to write resistance', e);
        }
    }

    async setIncline(level: number): Promise<void> {
        // Not implemented for basic V1
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
