import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { updateMetrics } from '../store/workoutSlice';

/**
 * Elliptical Workout Calculator
 * Estimates distance, calories, speed, and power based on RPM and resistance
 * for V2 protocol devices that only provide interval data
 */
export function useEllipticalCalculator() {
    const dispatch = useDispatch();
    const { rpm, spm, resistance, duration } = useSelector((state: RootState) => state.workout);
    const { connectionStatus, protocolVersion } = useSelector((state: RootState) => state.device);

    const lastUpdateRef = useRef<number>(0);
    const accumulatedDistanceRef = useRef<number>(0);
    const accumulatedCaloriesRef = useRef<number>(0);

    useEffect(() => {
        // Only run for V2 protocol
        if (protocolVersion !== 'v2' || connectionStatus !== 'connected') {
            return;
        }

        // Don't calculate if machine is idle
        if (rpm === 0 && spm === 0) {
            lastUpdateRef.current = 0;
            return;
        }

        const now = Date.now();

        // Initialize on first run
        if (lastUpdateRef.current === 0) {
            lastUpdateRef.current = now;
            return;
        }

        // Calculate time elapsed since last update (in seconds)
        const deltaTime = (now - lastUpdateRef.current) / 1000;
        lastUpdateRef.current = now;

        // Don't update too frequently or after long gaps
        if (deltaTime < 0.5 || deltaTime > 5) {
            return;
        }

        // Use RPM (or SPM if RPM not available) for calculations
        const currentRpm = rpm > 0 ? rpm : spm;
        if (currentRpm === 0) return;

        // --- SPEED CALCULATION ---
        // Average elliptical stride length: 0.5-0.6 meters (we'll use 0.55m)
        // Speed (km/h) = (SPM * stride_length_in_meters * 60) / 1000
        const strideLength = 0.55; // meters
        const speedKmh = (currentRpm * strideLength * 60) / 1000;

        // --- DISTANCE CALCULATION ---
        // Distance (km) = speed (km/h) * time (hours)
        const distanceIncrementKm = speedKmh * (deltaTime / 3600);
        accumulatedDistanceRef.current += distanceIncrementKm;

        // --- POWER CALCULATION ---
        // Power estimation based on RPM and resistance
        // This is a simplified formula: Power (watts) = k * RPM * resistance
        // where k is an empirical constant (typically 0.5-1.5 for ellipticals)
        const powerConstant = 1.0; // Adjust based on equipment
        const power = Math.round(powerConstant * currentRpm * resistance);

        // --- CALORIES CALCULATION ---
        // Calories (kcal) based on power and time
        // 1 watt = 0.86 kcal/hour, so: kcal/hour = watts * 0.86
        // kcal = (watts * 0.86 * time_in_hours)
        const caloriesPerHour = power * 0.86;
        const caloriesIncrement = caloriesPerHour * (deltaTime / 3600);
        accumulatedCaloriesRef.current += caloriesIncrement;

        // Update metrics
        dispatch(updateMetrics({
            speed: parseFloat(speedKmh.toFixed(1)),
            distance: parseFloat(accumulatedDistanceRef.current.toFixed(2)), // Store as km with 2 decimals
            calories: Math.round(accumulatedCaloriesRef.current),
            power: power
        }));

    }, [rpm, spm, resistance, protocolVersion, connectionStatus, dispatch]);

    // Reset accumulated values when workout is reset
    useEffect(() => {
        if (duration === 0) {
            accumulatedDistanceRef.current = 0;
            accumulatedCaloriesRef.current = 0;
            lastUpdateRef.current = 0;
        }
    }, [duration]);
}
