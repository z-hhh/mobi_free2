import { configureStore } from '@reduxjs/toolkit';
import logReducer from './logSlice';
import deviceReducer from './deviceSlice';
import workoutReducer from './workoutSlice';
import settingsReducer, { hydrateSettings } from './settingsSlice';

// Load settings from localStorage
const loadSettings = () => {
    try {
        const serialized = localStorage.getItem('mobi_settings');
        if (serialized === null) return undefined;
        return JSON.parse(serialized);
    } catch (e) {
        return undefined;
    }
};

export const store = configureStore({
    reducer: {
        log: logReducer,
        device: deviceReducer,
        workout: workoutReducer,
        settings: settingsReducer,
    },
});

// Hydrate on start
const savedSettings = loadSettings();
if (savedSettings) {
    store.dispatch(hydrateSettings(savedSettings));
}

// Save settings on change
store.subscribe(() => {
    const settings = store.getState().settings;
    localStorage.setItem('mobi_settings', JSON.stringify(settings));
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
