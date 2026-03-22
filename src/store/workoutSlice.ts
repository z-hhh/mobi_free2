import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WorkoutSession {
    isActive: boolean;
    baselines: {
        distance: number;
        calories: number;
        count: number;
    } | null;
    accumulated: {
        distance: number;
        calories: number;
        count: number;
    };
}

export interface WorkoutMetrics {
    duration: number;
    distance: number;
    calories: number;
    heartRate: number;
    speed: number;
    rpm: number;
    resistance: number;
    power: number;
    incline: number;
    spm: number;
    count: number;
    split500m: number;

    isPaused: boolean;
    hasReceivedAllData: boolean;
    
    session: WorkoutSession;
}

const initialState: WorkoutMetrics = {
    duration: 0,
    distance: 0,
    calories: 0,
    heartRate: 0,
    speed: 0,
    rpm: 0,
    resistance: 0,
    power: 0,
    incline: 0,
    spm: 0,
    count: 0,
    split500m: 0,
    isPaused: false,
    hasReceivedAllData: false,
    session: {
        isActive: false,
        baselines: null,
        accumulated: {
            distance: 0,
            calories: 0,
            count: 0
        }
    }
};

const workoutSlice = createSlice({
    name: 'workout',
    initialState,
    reducers: {
        updateMetrics: (state, action: PayloadAction<Partial<Omit<WorkoutMetrics, 'session'>>>) => {
            const { distance, calories, count, ...instantMetrics } = action.payload;

            // Handle instantaneous metrics directly
            Object.assign(state, instantMetrics);

            // Flag as received first data
            if (!state.hasReceivedAllData) {
                state.hasReceivedAllData = true;
            }

            // Handle cumulative metrics with baseline logic
            const hasCumulativeData = distance !== undefined || calories !== undefined || count !== undefined;
            if (hasCumulativeData) {
                if (!state.session.baselines) {
                    // Start session implicitly on first valid cumulative data
                    state.session.isActive = true;
                    state.session.baselines = {
                        distance: distance || 0,
                        calories: calories || 0,
                        count: count || 0
                    };
                    state.session.accumulated = { distance: 0, calories: 0, count: 0 };
                }

                if (state.session.baselines && state.session.accumulated) {
                    // Distance calculation (with handle for device reset when distance < baseline)
                    if (distance !== undefined) {
                        if (distance < state.session.baselines.distance) {
                            state.session.accumulated.distance = state.distance;
                            state.session.baselines.distance = distance;
                        }
                        state.distance = state.session.accumulated.distance + (distance - state.session.baselines.distance);
                    }
                    
                    // Calories calculation
                    if (calories !== undefined) {
                        if (calories < state.session.baselines.calories) {
                            state.session.accumulated.calories = state.calories;
                            state.session.baselines.calories = calories;
                        }
                        state.calories = state.session.accumulated.calories + (calories - state.session.baselines.calories);
                    }

                    // Count calculation
                    if (count !== undefined) {
                        if (count < state.session.baselines.count) {
                            state.session.accumulated.count = state.count;
                            state.session.baselines.count = count;
                        }
                        state.count = state.session.accumulated.count + (count - state.session.baselines.count);
                    }
                }
            }
        },
        resetWorkout: (state) => {
            // Revert entirely to initial state defaults cleanly
            return {
                ...initialState,
                // Ensure deep copies of nested structures
                session: {
                    isActive: false,
                    baselines: null,
                    accumulated: { distance: 0, calories: 0, count: 0 }
                }
            };
        },
        togglePause: (state) => {
            state.isPaused = !state.isPaused;
        },
    },
});

export const { updateMetrics, resetWorkout, togglePause } = workoutSlice.actions;
export default workoutSlice.reducer;
