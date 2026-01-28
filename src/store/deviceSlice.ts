import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DeviceInfo {
    name: string | null;
    id: string | null;
    macAddress?: string;
    manufacturerName?: string;
    modelNumber?: string;
    serialNumber?: string;
    firmwareRevision?: string;
    hardwareRevision?: string;
    softwareRevision?: string;
}

interface DeviceState {
    connectionStatus: 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';
    error: string | null;
    deviceInfo: DeviceInfo;
    protocolVersion: 'v1' | 'v2' | 'ftms' | null;
    supportedEquipment: 'rower' | 'bike' | 'elliptical' | 'treadmill' | 'unknown';
    lastDeviceId: string | null; // Remember last connected device ID for quick reconnect
    lastDeviceName: string | null;
}

const initialState: DeviceState = {
    connectionStatus: 'disconnected',
    error: null,
    deviceInfo: { name: null, id: null },
    protocolVersion: null,
    supportedEquipment: 'unknown',
    lastDeviceId: null,
    lastDeviceName: null,
};

const deviceSlice = createSlice({
    name: 'device',
    initialState,
    reducers: {
        setConnectionStatus: (state, action: PayloadAction<DeviceState['connectionStatus']>) => {
            state.connectionStatus = action.payload;
        },
        setDeviceInfo: (state, action: PayloadAction<Partial<DeviceInfo>>) => {
            state.deviceInfo = { ...state.deviceInfo, ...action.payload };
            // Remember device ID and Name when connected
            if (action.payload.id) {
                state.lastDeviceId = action.payload.id;
            }
            if (action.payload.name) {
                state.lastDeviceName = action.payload.name;
            }
        },
        setProtocol: (state, action: PayloadAction<DeviceState['protocolVersion']>) => {
            state.protocolVersion = action.payload;
        },
        setEquipmentType: (state, action: PayloadAction<DeviceState['supportedEquipment']>) => {
            state.supportedEquipment = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        disconnect: (state) => {
            state.connectionStatus = 'disconnected';
            state.protocolVersion = null;
            state.error = null;
        },
        clearLastDevice: (state) => {
            state.lastDeviceId = null;
            state.lastDeviceName = null;
        },
        hydrateDevice: (state, action: PayloadAction<{ lastDeviceId: string | null, lastDeviceName: string | null }>) => {
            state.lastDeviceId = action.payload.lastDeviceId;
            state.lastDeviceName = action.payload.lastDeviceName;
        },
    },
});

export const { setConnectionStatus, setDeviceInfo, setProtocol, setEquipmentType, setError, disconnect, clearLastDevice, hydrateDevice } = deviceSlice.actions;
export default deviceSlice.reducer;
