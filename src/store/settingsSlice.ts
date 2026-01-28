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
        autoConnect: boolean;
    };
}

const initialState: SettingsState = {
    userProfile: { weightKg: 70 },
    rower: { boatType: 'water' },
    app: { theme: 'auto', autoConnect: false },
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
        setAutoConnect: (state, action: PayloadAction<boolean>) => {
            state.app.autoConnect = action.payload;
        },
        // Hydrate action to load from local storage
        hydrateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
            // Merge logic
            return { ...state, ...action.payload };
        },
    },
});

export const { updateWeight, setBoatType, setTheme, setAutoConnect, hydrateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
