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
    const { rpm, spm, resistance, duration, hasReceivedAllData } = useSelector((state: RootState) => state.workout);
    const { connectionStatus, protocolVersion } = useSelector((state: RootState) => state.device);

    const lastUpdateRef = useRef<number>(0);
    const accumulatedDistanceRef = useRef<number>(0);
    const accumulatedCaloriesRef = useRef<number>(0);

    useEffect(() => {
        // Only run for V2 protocol
        if (protocolVersion !== 'v2' || connectionStatus !== 'connected') {
            return;
        }

        // If the device natively provides comprehensive 8813 data, disable the local calculator
        if (hasReceivedAllData) {
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

        // --- POWER CALCULATION (Official Mobi Algorithm) ---
        // Exponential polynomial curve fitting based on reverse-engineered Android source
        const maxResistance = 32.0; // Typical max resistance for Mobi ellipticals
        const safeResistance = Math.max(1, resistance);
        
        const x = Math.exp(currentRpm / 100.0);
        const y = Math.exp((safeResistance * 32.0 / maxResistance) / 10.0);
        
        const c0 = 39.94501450202982;
        const c1 = -67.52588516;
        const c2 = -39.15593086;
        const c3 = 27.55487038;
        const c4 = 38.79652081;
        const c5 = -0.30231185;
        
        let powerRaw = (c5 * y * y) + (c4 * x * y) + (c3 * x * x) + (c2 * y) + (c1 * x) + c0;
        const power = Math.max(0, Math.round(powerRaw));

        // --- CALORIES CALCULATION (Official Mobi Algorithm) ---
        // In the official app, instantaneous calories burned per second = Power / 1000
        const caloriesIncrement = (power / 1000.0) * deltaTime;
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
