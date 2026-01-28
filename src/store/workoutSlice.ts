import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
};

const workoutSlice = createSlice({
    name: 'workout',
    initialState,
    reducers: {
        updateMetrics: (state, action: PayloadAction<Partial<WorkoutMetrics>>) => {
            Object.assign(state, action.payload);
        },
        resetWorkout: (state) => {
            // Keep isPaused state? Usually reset implies stop.
            Object.assign(state, initialState);
        },
        togglePause: (state) => {
            state.isPaused = !state.isPaused;
        },
    },
});

export const { updateMetrics, resetWorkout, togglePause } = workoutSlice.actions;
export default workoutSlice.reducer;
