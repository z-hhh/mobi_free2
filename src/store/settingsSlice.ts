import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
    userProfile: {
        weightKg: number;
    };
    rower: {
        boatType: 'water' | 'magnet' | 'wind';
    };
    app: {
        theme: 'light' | 'dark' | 'auto';
        rememberDevice: boolean;
    };
}

const initialState: SettingsState = {
    userProfile: { weightKg: 70 },
    rower: { boatType: 'water' },
    app: { theme: 'auto', rememberDevice: true },
};

const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
        updateWeight: (state, action: PayloadAction<number>) => {
            state.userProfile.weightKg = action.payload;
        },
        setBoatType: (state, action: PayloadAction<SettingsState['rower']['boatType']>) => {
            state.rower.boatType = action.payload;
        },
        setTheme: (state, action: PayloadAction<SettingsState['app']['theme']>) => {
            state.app.theme = action.payload;
        },
        setRememberDevice: (state, action: PayloadAction<boolean>) => {
            state.app.rememberDevice = action.payload;
        },
        // Hydrate action to load from local storage
        hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
            // Merge logic
            return { ...state, ...action.payload };
        },
    },
});

export const { updateWeight, setBoatType, setTheme, setRememberDevice, hydrateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
