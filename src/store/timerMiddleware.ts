import { Middleware } from '@reduxjs/toolkit';
import { updateMetrics } from './workoutSlice';

interface ActionWithType {
    type: string;
    payload?: any;
}

/**
 * Timer middleware - automatically manages workout duration
 * Starts when connected and has activity (speed > 0.5)
 * Stops after 3 seconds of no data updates
 */
export const createTimerMiddleware = (): Middleware => (store) => {
    let intervalId: number | null = null;
    let timerStartTime = 0;  // When current timer session started
    let accumulatedDuration = 0;  // Total duration from previous sessions
    let lastDataUpdate = 0;  // Last time we received data
    let isTimerDispatch = false;  // Flag to prevent recursive triggers

    return (next) => (action: unknown) => {
        const typedAction = action as ActionWithType;
        const result = next(action);
        const state = store.getState();

        // Skip processing if this is our own timer dispatch
        if (isTimerDispatch) {
            isTimerDispatch = false;
            return result;
        }

        // Track data updates from device (not from timer)
        if (
            typedAction.type === 'workout/updateMetrics' &&
            (state.workout.speed > 0 || state.workout.spm > 0 || state.workout.rpm > 0)
        ) {
            lastDataUpdate = Date.now();
            console.log('[TimerMiddleware] Data update received, lastDataUpdate refreshed');
        }

        // Reset everything if duration is reset to 0 externally
        if (typedAction.type === 'workout/reset' ||
            (typedAction.type === 'workout/updateMetrics' && typedAction.payload?.duration === 0 && state.workout.duration === 0)) {
            console.log('[TimerMiddleware] Reset detected');
            accumulatedDuration = 0;
            timerStartTime = 0;
            lastDataUpdate = 0;
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
            return result;
        }

        // Determine if timer should run
        const isConnected = state.device.connectionStatus === 'connected';
        const hasActivity = state.workout.speed > 0.5;
        const shouldRun = isConnected && hasActivity;

        console.log(`[TimerMiddleware] speed=${state.workout.speed.toFixed(2)}, shouldRun=${shouldRun}, timerActive=${!!intervalId}`);

        // Start timer
        if (shouldRun && !intervalId) {
            console.log('[TimerMiddleware] Starting timer');
            timerStartTime = Date.now();
            lastDataUpdate = Date.now();

            intervalId = window.setInterval(() => {
                // Check for stale data (no updates for 3 seconds)
                const timeSinceLastUpdate = lastDataUpdate > 0 ? Date.now() - lastDataUpdate : 0;
                if (timeSinceLastUpdate > 3000) {
                    console.log(`[TimerMiddleware] No data for ${(timeSinceLastUpdate / 1000).toFixed(1)}s, stopping timer`);
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;

                        // Save accumulated time
                        if (timerStartTime > 0) {
                            const sessionDuration = Math.floor((Date.now() - timerStartTime) / 1000);
                            accumulatedDuration += sessionDuration;
                            timerStartTime = 0;
                        }
                    }
                    return;
                }

                // Calculate current duration
                const sessionDuration = timerStartTime > 0 ? Math.floor((Date.now() - timerStartTime) / 1000) : 0;
                const newDuration = accumulatedDuration + sessionDuration;

                // Only dispatch if changed
                const currentDuration = store.getState().workout.duration;
                if (newDuration !== currentDuration) {
                    isTimerDispatch = true;  // Mark this as our dispatch
                    store.dispatch(updateMetrics({ duration: newDuration }));
                }
            }, 1000);
        }

        // Stop timer when activity stops
        if (!shouldRun && intervalId) {
            console.log('[TimerMiddleware] Stopping timer (shouldRun=false)');
            clearInterval(intervalId);
            intervalId = null;

            // Save accumulated time
            if (timerStartTime > 0) {
                const sessionDuration = Math.floor((Date.now() - timerStartTime) / 1000);
                accumulatedDuration += sessionDuration;
                timerStartTime = 0;
            }
        }

        return result;
    };
};
