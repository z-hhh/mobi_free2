import { ParsedData, DeviceProtocol } from '../DeviceProtocol';
import { BLE_UUIDS } from '../constants';

export class FTMSProtocol implements DeviceProtocol {
    serviceUUID = BLE_UUIDS.FTMS_SERVICE;

    private onDataCallback: ((data: ParsedData) => void) | null = null;
    private onErrorCallback: ((error: Error) => void) | null = null;
    private onLogCallback: ((level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) | null = null;

    private controlPoint: BluetoothRemoteGATTCharacteristic | null = null;
    private lastResistance: number = 0; // Keep track of last non-zero resistance

    async connect(server: BluetoothRemoteGATTServer): Promise<void> {
        this.log('info', 'FTMSProtocol: Connecting...');
        const service = await server.getPrimaryService(this.serviceUUID);

        // Setup Fitness Machine Control Point: 0x2AD9
        try {
            this.controlPoint = await service.getCharacteristic('00002ad9-0000-1000-8000-00805f9b34fb');

            // Listen for Indications (Responses)
            if (this.controlPoint.properties.indicate) {
                await this.controlPoint.startNotifications();
                this.controlPoint.addEventListener('characteristicvaluechanged', this.handleControlPointResponse);
                this.log('info', 'FTMS: Listening for Control Point Indications');
            }

            // Request control (OpCode 0x00)
            await this.controlPoint.writeValue(new Uint8Array([0x00]));
        } catch (e) {
            this.log('warn', 'FTMS Control Point not found or failed to request control', e);
        }

        // Setup Cross Trainer Data (Elliptical): 0x2ACE
        try {
            const crossTrainerChar = await service.getCharacteristic('00002ace-0000-1000-8000-00805f9b34fb');

            if (crossTrainerChar.properties.notify) {
                await crossTrainerChar.startNotifications();
                crossTrainerChar.addEventListener('characteristicvaluechanged', this.handleCrossTrainerData);
                this.log('info', 'FTMS: Listening for Cross Trainer Data (0x2ACE)');
            }
        } catch (e) {
            this.log('warn', 'FTMS Cross Trainer Data not available', e);
        }
    }

    disconnect(): void {
        if (this.controlPoint) {
            try {
                this.controlPoint.removeEventListener('characteristicvaluechanged', this.handleControlPointResponse);
                this.controlPoint.stopNotifications(); // Best effort cleanup
            } catch (e) { /* ignore */ }
        }
        this.controlPoint = null;
        this.onDataCallback = null;
        this.onErrorCallback = null;
        this.onLogCallback = null;
    }

    private handleControlPointResponse = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        // Parse FTMS Control Point Response
        // Format: OpCode (1 byte), Result Code (1 byte), [Params]
        const opCode = value.getUint8(0);

        // Response OpCode is usually 0x80
        if (opCode === 0x80) {
            const reqOpCode = value.getUint8(1);
            const result = value.getUint8(2);
            const resultStr = result === 0x01 ? 'Success' : result === 0x02 ? 'OpCode not supported' : result === 0x03 ? 'Invalid Parameter' : `Failed (${result})`;

            this.log('info', `FTMS Response: OpCode ${reqOpCode.toString(16)} -> ${resultStr}`);
        } else {
            this.log('debug', `FTMS Indication: ${Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        }
    }

    private handleCrossTrainerData = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        // Parse Cross Trainer Data (0x2ACE)
        // Format: Flags (3 bytes) + data fields based on flags
        const flags = value.getUint16(0, true) | (value.getUint8(2) << 16);
        let offset = 3;

        const parsedData: ParsedData = {};

        // 1. Instantaneous Speed (Always present, not in flags - Uint16, 0.01 km/h)
        const speedRaw = value.getUint16(offset, true);
        parsedData.speed = speedRaw / 100; // Convert to km/h
        offset += 2;

        // 2. Average Speed (Bit 1)
        if (flags & (1 << 1)) {
            offset += 2; // Skip average speed
        }

        // 3. Total Distance (Bit 2) - Uint24 (meters)
        if (flags & (1 << 2)) {
            const distanceMeters = value.getUint16(offset, true) | (value.getUint8(offset + 2) << 16);
            parsedData.distance = distanceMeters / 1000; // Convert to km
            offset += 3;
        }

        // 4. Step Count / Instant Step Rate (Bit 3)
        // Bit 3 presence implies TWO fields:
        // - Step Per Minute (Uint16) -> Instant Cadence (SPM)
        // - Average Step Rate (Uint16)
        if (flags & (1 << 3)) {
            const stepRate = value.getUint16(offset, true);
            parsedData.spm = stepRate;
            parsedData.rpm = stepRate; // For elliptical, SPM = RPM
            offset += 2;

            // Average Step Rate (Skip)
            offset += 2;
        }

        // 5. Stride Count (Bit 4)
        if (flags & (1 << 4)) {
            offset += 2; // Skip stride count
        }

        // 6. Elevation Gain (Bit 5)
        if (flags & (1 << 5)) {
            offset += 2; // Skip elevation
        }

        // 7. Inclination (Bit 6)
        if (flags & (1 << 6)) {
            offset += 2; // Skip inclination
        }

        // 8. Resistance Level (Bit 7) - Sint16, 0.1 resolution
        if (flags & (1 << 7)) {
            const resistanceRaw = value.getInt16(offset, true);
            const resistance = resistanceRaw / 10;

            // Keep track of last non-zero resistance to prevent reset when device sends 0
            if (resistance > 0) {
                this.lastResistance = resistance;
                parsedData.resistance = resistance;
            } else if (this.lastResistance > 0) {
                // Device sent 0, keep last known resistance
                parsedData.resistance = this.lastResistance;
            }

            offset += 2;
        } else if (this.lastResistance > 0) {
            // Resistance not in this packet, maintain last known value
            parsedData.resistance = this.lastResistance;
        }

        // 9. Instantaneous Power (Bit 8) - Sint16, watts
        if (flags & (1 << 8)) {
            const power = value.getInt16(offset, true);
            parsedData.power = power;
            offset += 2;
        }

        // 10. Average Power (Bit 9)
        if (flags & (1 << 9)) {
            offset += 2; // Skip average power
        }

        // 11. Total Energy (Bit 10) - Uint16 (kcal)
        if (flags & (1 << 10)) {
            const energy = value.getUint16(offset, true);
            parsedData.calories = energy;
            offset += 2;
        }

        // 12. Energy Per Hour (Bit 11) - Uint16
        if (flags & (1 << 11)) {
            offset += 2; // Skip energy per hour
        }

        // 13. Energy Per Minute (Bit 12) - Uint8
        if (flags & (1 << 12)) {
            offset += 1; // Skip energy per minute
        }

        // 14. Heart Rate (Bit 13) - Uint8
        if (flags & (1 << 13)) {
            const heartRate = value.getUint8(offset);
            parsedData.heartRate = heartRate;
            offset += 1;
        }

        // 15. Metabolic Equivalent (Bit 14) - Uint8
        if (flags & (1 << 14)) {
            offset += 1; // Skip metabolic equivalent
        }

        // 16. Elapsed Time (Bit 15) - Uint16 (seconds)
        // Note: This device doesn't provide reliable duration data, use client-side timer instead
        if (flags & (1 << 15)) {
            // const elapsedTime = value.getUint16(offset, true);
            // parsedData.duration = elapsedTime;
            offset += 2;
        }

        // 17. Remaining Time (Bit 16) - Uint16
        if (flags & (1 << 16)) {
            offset += 2; // Skip remaining time
        }

        // Callback with parsed data
        if (this.onDataCallback && Object.keys(parsedData).length > 0) {
            this.onDataCallback(parsedData);
        }
    }

    private log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
        if (this.onLogCallback) this.onLogCallback(level, message, data);
    }

    async setResistance(level: number): Promise<void> {
        if (!this.controlPoint) return;
        // FTMS Set Target Resistance Level: Opcode 0x04
        // Mobi's implementation: read value / 10, write value directly
        // Resistance range for this device: 10-24
        const clamped = Math.max(10, Math.min(24, Math.round(level)));
        const command = new Uint8Array([0x04, clamped & 0xFF, (clamped >> 8) & 0xFF]);
        await this.controlPoint.writeValue(command);
    }

    async setIncline(level: number): Promise<void> {
        if (!this.controlPoint) return;
        // FTMS Set Target Inclination: Opcode 0x03, Incline (Sint16)
        // Level is %, pass as integer for now (x10 if 0.1% resolution required)
        // Assuming input is integer %, FTMS usually uses 0.1% units.
        const val = level * 10;
        const view = new DataView(new ArrayBuffer(3));
        view.setUint8(0, 0x03);
        view.setInt16(1, val, true);
        await this.controlPoint.writeValue(view);
    }

    onData(cb: (data: ParsedData) => void) { this.onDataCallback = cb; }
    onError(cb: (error: Error) => void) { this.onErrorCallback = cb; }
    onLog(cb: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void) { this.onLogCallback = cb; }
}
