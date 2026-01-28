import { SimpleGrid, Paper, Text, Stack } from '@mantine/core';
import { useWorkout } from '../../hooks/useWorkout';

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
}

function MetricCard({ label, value, unit }: MetricCardProps) {
    return (
        <Paper withBorder p="md" radius="md">
            <Stack gap={0} align="center">
                <Text size="xs" c="dimmed" tt="uppercase">{label}</Text>
                <Text size="lg" fw={700}>
                    {value} <Text span size="xs" fw={400}>{unit}</Text>
                </Text>
            </Stack>
        </Paper>
    );
}

export function MetricGrid() {
    const { equipmentType, split500m, distance, power, resistance, speed, heartRate, incline, count } = useWorkout();

    // Helper to formatting split (seconds to MM:SS)
    const formatSplit = (s: number) => {
        if (s === 0) return '--:--';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const renderMetrics = () => {
        switch (equipmentType) {
            case 'rower':
                return (
                    <>
                        <MetricCard label="Split /500m" value={formatSplit(split500m)} />
                        <MetricCard label="Distance" value={distance} unit="m" />
                        <MetricCard label="Watts" value={power} />
                        <MetricCard label="Drag / Level" value={resistance} />
                    </>
                );
            case 'bike':
                return (
                    <>
                        <MetricCard label="Speed" value={speed.toFixed(1)} unit="km/h" />
                        <MetricCard label="Distance" value={(distance / 1000).toFixed(2)} unit="km" />
                        <MetricCard label="Resistance" value={resistance} />
                        <MetricCard label="Power" value={power} unit="w" />
                    </>
                );
            case 'elliptical':
                return (
                    <>
                        <MetricCard label="Resistance" value={resistance} />
                        <MetricCard label="Distance" value={(distance / 1000).toFixed(2)} unit="km" />
                        <MetricCard label="Speed" value={speed.toFixed(1)} unit="km/h" />
                        <MetricCard label="Heart Rate" value={heartRate} unit="bpm" />
                    </>
                );
            case 'treadmill':
                return (
                    <>
                        <MetricCard label="Incline" value={incline} unit="%" />
                        <MetricCard label="Distance" value={(distance / 1000).toFixed(2)} unit="km" />
                        <MetricCard label="Pace" value={speed > 0 ? (60 / speed).toFixed(2) : '--'} unit="min/km" />
                        <MetricCard label="Heart Rate" value={heartRate} unit="bpm" />
                    </>
                );
            default:
                // Generic fallback
                return (
                    <>
                        <MetricCard label="Distance" value={distance} unit="m" />
                        <MetricCard label="Heart Rate" value={heartRate} unit="bpm" />
                        <MetricCard label="Resistance" value={resistance} />
                    </>
                );
        }
    };

    return (
        <SimpleGrid cols={2} spacing="md">
            {renderMetrics()}
        </SimpleGrid>
    );
}
