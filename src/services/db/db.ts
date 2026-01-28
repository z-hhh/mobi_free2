import { openDB, DBSchema } from 'idb';

export interface SavedDevice {
    id: string;
    name: string;
    lastConnected: number;
    deviceType?: string;
    specs?: {
        maxResistance: number;
        manufacturer?: string;
    };
}

export interface WorkoutRecord {
    id?: number;
    startTime: string;
    endTime: string;
    duration: number;
    distance: number;
    calories: number;
    avgHeartRate?: number;
    deviceType: string;
}

interface MobiDB extends DBSchema {
    devices: {
        key: string;
        value: SavedDevice;
    };
    workouts: {
        key: number;
        value: WorkoutRecord;
        indexes: { 'by-startTime': string };
    };
}

export const dbPromise = openDB<MobiDB>('mobi_db', 1, {
    upgrade(db) {
        // Devices store
        if (!db.objectStoreNames.contains('devices')) {
            db.createObjectStore('devices', { keyPath: 'id' });
        }

        // Workouts store
        if (!db.objectStoreNames.contains('workouts')) {
            const workoutStore = db.createObjectStore('workouts', { keyPath: 'id', autoIncrement: true });
            workoutStore.createIndex('by-startTime', 'startTime');
        }
    },
});

export const saveDevice = async (device: SavedDevice) => {
    const db = await dbPromise;
    await db.put('devices', device);
};

export const getSavedDevices = async () => {
    const db = await dbPromise;
    return db.getAll('devices');
};

export const saveWorkout = async (workout: WorkoutRecord) => {
    const db = await dbPromise;
    await db.add('workouts', workout);
};

export const getWorkoutsByDateRange = async (startIso: string, endIso: string) => {
    const db = await dbPromise;
    return db.getAllFromIndex('workouts', 'by-startTime', IDBKeyRange.bound(startIso, endIso));
};
