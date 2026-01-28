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

        console.log('V1Protocol: Connected');
    }

    private handleDataNotify = (event: Event) => {
        const char = event.target as BluetoothRemoteGATTCharacteristic;
        const value = char.value;
        if (!value) return;

        const bytes = new Uint8Array(value.buffer);
        this.lastData = bytes; // Cache for control commands

        // V1 Data Parsing (Based on observation/standard metric positions)
        // Need to confirm exact parsing from V1Handler, but typically:
        // [HEADER, ?, ?, TIME_H, TIME_L, DIST_H, DIST_L, CAL_H, CAL_L, SPEED_H, SPEED_L, RPM, RESISTANCE, ...]

        // For now, logging the raw data to reverse engineer if structure differs from assumption
        // const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
        // this.log('debug', `V1 Data: ${hex}`);

        // Placeholder Parsing - will refine based on V1Handler logs if available, 
        // but Mobi Official V1Handler uses an extracted `ellipticalData` which implies standard positions.
        // Assuming:
        // Byte 0: Header (0xAB)
        // Byte 1: Cmd (0x02 usually for data)
        // ...

        // Let's implement basic parsing if possible, or trigger callbacks
        // Note: V1Handler uses 'ellipticalData' [6] as resistance sometimes? 
        // We will need to verify parsing logic. For now, we capture 'lastData' which is critical for writing.

        // Based on common protocols:
        // data[5] might be Resistance Level (used in write back)

        const resistance = bytes.length > 5 ? bytes[5] : 0;

        if (this.onDataCallback) {
            this.onDataCallback({
                resistance
                // TODO: Parse Speed, Time, Dist, Cal
            });
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
