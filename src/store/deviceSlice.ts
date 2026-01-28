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
}

const initialState: DeviceState = {
    connectionStatus: 'disconnected',
    error: null,
    deviceInfo: { name: null, id: null },
    protocolVersion: null,
    supportedEquipment: 'unknown',
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
    },
});

export const { setConnectionStatus, setDeviceInfo, setProtocol, setEquipmentType, setError, disconnect } = deviceSlice.actions;
export default deviceSlice.reducer;
