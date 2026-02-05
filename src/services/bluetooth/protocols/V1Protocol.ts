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

        // Get Data Characteristic (FFE4) - This is the main one for Elliptical
        // Try this first to fail fast if device doesn't support V1 data
        try {
            this.dataChar = await this.service.getCharacteristic(BLE_UUIDS.V1_DATA);
            await this.dataChar.startNotifications();
            this.dataChar.addEventListener('characteristicvaluechanged', this.handleDataNotify);
            this.log('info', 'V1: Listening for Data (FFE4)');
        } catch (e) {
            this.log('error', 'V1: Failed to get Data Char (FFE4)', e);
            throw e;
        }

        // Get Write Characteristic
        // Logic:
        // 1. Try standard FFE3 in FFE0 service.
        // 2. Try any writable char in FFE0 service.
        // 3. Try FFE5 service (seen in some variants) => any writable char.
        // 4. Fallback to Read-Only mode.
        try {
            // Helper to find writable char in a service
            const findWritable = async (svc: BluetoothRemoteGATTService, serviceName: string): Promise<BluetoothRemoteGATTCharacteristic | null> => {
                const chars = await svc.getCharacteristics();

                // Helper to log properties robustly
                const getProps = (c: BluetoothRemoteGATTCharacteristic) => {
                    const p = c.properties;
                    const props = [];
                    if (p.broadcast) props.push('broadcast');
                    if (p.read) props.push('read');
                    if (p.writeWithoutResponse) props.push('writeNoResp');
                    if (p.write) props.push('write');
                    if (p.notify) props.push('notify');
                    if (p.indicate) props.push('indicate');
                    if (p.authenticatedSignedWrites) props.push('authSignedWrite');
                    return props.join(',');
                };

                // Log chars for debugging
                const charList = chars.map(c => `${c.uuid} [${getProps(c)}]`).join(', ');
                this.log('debug', `V1: Chars in ${serviceName}: ${charList}`);

                // Try FFE3 first if looking in V1 service
                if (svc.uuid.indexOf('ffe0') > -1) {
                    const ffe3 = chars.find(c => c.uuid.indexOf('ffe3') > -1);
                    if (ffe3) return ffe3;
                }

                // Any writable
                return chars.find(c => c.properties.write || c.properties.writeWithoutResponse) || null;
            };

            // 1. Check FFE0 (Current Service)
            let writeCharCandidate = await findWritable(this.service, 'FFE0');

            // 2. Check FFE5 (Alternative Service)
            if (!writeCharCandidate) {
                this.log('warn', 'V1: No write char in FFE0, checking FFE5...');
                try {
                    const serviceFFE5 = await server.getPrimaryService('0000ffe5-0000-1000-8000-00805f9b34fb');
                    writeCharCandidate = await findWritable(serviceFFE5, 'FFE5');
                } catch (e) {
                    this.log('debug', 'V1: FFE5 service not found');
                }
            }

            if (writeCharCandidate) {
                this.writeChar = writeCharCandidate;
                this.log('info', `V1: Write Char configured: ${this.writeChar.uuid}`);
            } else {
                this.log('warn', 'V1: No writable characteristic found in FFE0 or FFE5.');
                throw new Error('V1 Protocol: Failed to find write characteristic');
            }

        } catch (e) {
            this.log('error', 'V1: Error scanning for write char', e);
            throw e;
        }

        this.log('info', 'V1Protocol: Connected');
    }

    private resistanceScale = 1;

    private handleDataNotify = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        this.lastData = bytes; // Cache for control commands

        // V1 Data Parsing
        // Based on typical elliptical machine protocols and mobi-official patterns
        // The exact byte positions may need adjustment based on actual device behavior

        // Log raw data for debugging
        const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        this.log('debug', `V1 Data (${bytes.length} bytes): ${hex}`);

        if (bytes.length < 10) {
            // Not enough data, skip parsing
            return;
        }

        // Check for error codes (per mobi-official V1Handler.handlingErrorCodes)
        // Error codes are typically in specific byte positions
        if (bytes.length > 2 && bytes[1] === 0xFF) {
            // Error message detected
            const errorCode = bytes[2];
            this.handleErrorCode(errorCode);
            return;
        }

        // Parse data based on common V1 protocol structure
        // Note: These positions are based on actual device data analysis
        const parsedData: ParsedData = {};

        // Resistance - Based on actual device data, it's at byte[13]
        if (bytes.length > 13) {
            const rawResistance = bytes[13];

            // Device Type Detection
            // Based on official App's EnumDeviceKt, Rowing Machine has code 9.
            // In V1 protocol, Byte 3 is typically the Device Type.
            const isRowingMachine = bytes.length > 3 && bytes[3] === 0x09;

            // Resistance Scaling Logic:
            // 1. If it's explicitly a Rowing Machine (Type 9), use 4x scaling (0-96 -> 1-24).
            // 2. Fallback: If raw value > 24, it's definitely scaled, so divide by 4.
            // 3. Otherwise, use raw value (for standard devices).
            if (isRowingMachine || rawResistance > 24) {
                if (this.resistanceScale !== 4) {
                    this.resistanceScale = 4;
                    // Log only once when switching (or if identified as rower)
                    this.log('info', `V1: Resistance scaling active (Type: ${isRowingMachine ? 'Rowing(9)' : 'Auto-Detect'}, Raw: ${rawResistance})`);
                }
                parsedData.resistance = Math.floor(rawResistance / 4);
            } else {
                parsedData.resistance = rawResistance;
            }
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

    /**
     * Handle error codes from the device
     * Per mobi-official V1Handler.handlingErrorCodes
     */
    private handleErrorCode(errorCode: number): void {
        let errorMessage: string;

        if (errorCode >= 1 && errorCode < 19) {
            errorMessage = `设备故障代码 E${errorCode}，请联系客服`;
        } else if (errorCode === 19) {
            errorMessage = '跑步机收起/展开中，请远离';
        } else if (errorCode === 20) {
            errorMessage = '跑步机收起/展开中，请勿阻碍跑台';
        } else if (errorCode === 21) {
            errorMessage = '跑步机收起/展开中，请勿站在跑台上';
        } else if (errorCode === 22) {
            errorMessage = '跑步机里程数已较高，请添加润滑油';
        } else {
            errorMessage = `未知错误代码: ${errorCode}`;
        }

        this.log('error', `V1 Device Error: ${errorMessage}`, { errorCode });

        if (this.onErrorCallback) {
            this.onErrorCallback(new Error(errorMessage));
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

        // Note: We send 'level' directly (1-24).
        // If device expects 0-96 scaling on write, we might need to multiply by 4.
        // But official app sends commandData directly. Assuming symmetric scaling is NOT used for write, or handled by device.

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
        this.log('warn', 'V1: Incline control not supported');
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
