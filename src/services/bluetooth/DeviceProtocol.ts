export interface ParsedData {
    time?: number; // seconds
    duration?: number; // seconds (elapsed time)
    distance?: number; // meters
    speed?: number; // km/h (or m/s depending on usage, standardize on storage)
    rpm?: number;
    spm?: number;
    calories?: number;
    heartRate?: number;
    power?: number; // watts
    resistance?: number; // level
    incline?: number; // %
    count?: number; // Total strokes/steps
}

export interface DeviceProtocol {
    // Identifiers
    serviceUUID: string;

    // Lifecycle
    connect(server: BluetoothRemoteGATTServer): Promise<void>;
    disconnect(): void;

    // Control
    setResistance(level: number): Promise<void>;
    setIncline(level: number): Promise<void>; // Treadmill only

    // Event Subscription
    onData(callback: (data: ParsedData) => void): void;
    onError(callback: (error: Error) => void): void;
    onLog(callback: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => void): void;
}
