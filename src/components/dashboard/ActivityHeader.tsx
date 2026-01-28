import { Group, Text, Stack } from '@mantine/core';
import { useWorkout } from '../../hooks/useWorkout';

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ActivityHeader() {
    const { duration, calories } = useWorkout();

    return (
        <Group justify="space-between" align="start">
            <Stack gap={0}>
                <Text size="xs" c="dimmed">时间</Text>
                <Text size="xl" fw={700}>{formatTime(duration)}</Text>
            </Stack>
            <Stack gap={0} align="end">
                <Text size="xs" c="dimmed">卡路里</Text>
                <Text size="xl" fw={700}>{calories.toFixed(1)}</Text>
            </Stack>
        </Group>
    );
}
