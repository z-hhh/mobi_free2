import { configureStore } from '@reduxjs/toolkit';
import logReducer from './logSlice';
import deviceReducer, { hydrateDevice } from './deviceSlice';
import workoutReducer from './workoutSlice';
import settingsReducer, { hydrateSettings } from './settingsSlice';
import { createTimerMiddleware } from './timerMiddleware';

// Define reducers first to break circular dependency
const rootReducer = {
    log: logReducer,
    device: deviceReducer,
    workout: workoutReducer,
    settings: settingsReducer,
};

// Export RootState type before store creation
export type RootState = {
    log: ReturnType<typeof logReducer>;
    device: ReturnType<typeof deviceReducer>;
    workout: ReturnType<typeof workoutReducer>;
    settings: ReturnType<typeof settingsReducer>;
};

// Load persisted state from localStorage
const loadState = () => {
    try {
        const settingsSerialized = localStorage.getItem('mobi_settings');
        const deviceSerialized = localStorage.getItem('mobi_device');

        return {
            settings: settingsSerialized ? JSON.parse(settingsSerialized) : undefined,
            device: deviceSerialized ? JSON.parse(deviceSerialized) : undefined,
        };
    } catch (e) {
        return { settings: undefined, device: undefined };
    }
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(createTimerMiddleware()),
});

// Hydrate on start
const savedState = loadState();
if (savedState.settings) {
    store.dispatch(hydrateSettings(savedState.settings));
}
if (savedState.device) {
    // Only hydrate the persisted fields (lastDeviceId, lastDeviceName)
    store.dispatch(hydrateDevice(savedState.device));
}

// Save state changes
store.subscribe(() => {
    const state = store.getState();

    // Save settings
    localStorage.setItem('mobi_settings', JSON.stringify(state.settings));

    // Save only necessary device info
    const deviceStateToSave = {
        lastDeviceId: state.device.lastDeviceId,
        lastDeviceName: state.device.lastDeviceName
    };
    localStorage.setItem('mobi_device', JSON.stringify(deviceStateToSave));
});

export type AppDispatch = typeof store.dispatch;
