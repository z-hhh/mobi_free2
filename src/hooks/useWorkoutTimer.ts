import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateMetrics } from '../store/workoutSlice';

/**
 * Auto-increment workout duration timer
 * Starts when device is connected and there's activity (speed > 0 or spm > 0)
 * Pauses when workout is paused
 */
export function useWorkoutTimer() {
    const dispatch = useDispatch();
    const { connectionStatus, protocolVersion } = useSelector((state: RootState) => state.device);
    const { isPaused, speed, spm, rpm, duration } = useSelector((state: RootState) => state.workout);

    const timerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);

    useEffect(() => {
        const isConnected = connectionStatus === 'connected';
        const hasActivity = speed > 0 || spm > 0 || rpm > 0;
        const shouldRun = isConnected && hasActivity && !isPaused;

        if (shouldRun) {
            // Start or resume timer
            if (!timerRef.current) {
                startTimeRef.current = Date.now();

                timerRef.current = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    const totalDuration = accumulatedTimeRef.current + elapsed;

                    dispatch(updateMetrics({ duration: totalDuration }));
                }, 1000);
            }
        } else {
            // Stop timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;

                // Always accumulate elapsed time when stopping timer
                // This prevents time from jumping back when activity briefly stops
                if (startTimeRef.current > 0) {
                    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
                    accumulatedTimeRef.current += elapsed;
                    startTimeRef.current = 0; // Reset start time
                }
            }
        }

        // Cleanup on unmount
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [connectionStatus, protocolVersion, isPaused, speed, spm, rpm, dispatch]);

    // Reset accumulated time when workout is reset (duration becomes 0)
    useEffect(() => {
        if (duration === 0) {
            accumulatedTimeRef.current = 0;
            startTimeRef.current = 0;
        }
    }, [duration]);
}
