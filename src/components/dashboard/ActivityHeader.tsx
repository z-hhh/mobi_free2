import { Group, Text, Stack, ThemeIcon } from '@mantine/core';
import { useWorkout } from '../../hooks/useWorkout';
import { IconClock, IconFlame } from '@tabler/icons-react';

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ActivityHeader() {
    const { duration, calories } = useWorkout();

    return (
        <Group justify="space-between" align="start">
            <Group>
                <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
                    <IconClock size={20} />
                </ThemeIcon>
                <Stack gap={0}>
                    <Text size="xs" c="dimmed" fw={700}>时间</Text>
                    <Text fz={24} fw={700} lh={1}>{formatTime(duration)}</Text>
                </Stack>
            </Group>

            <Group>
                <Stack gap={0} align="end">
                    <Text size="xs" c="dimmed" fw={700}>卡路里</Text>
                    <Text fz={24} fw={700} lh={1}>{calories.toFixed(1)}</Text>
                </Stack>
                <ThemeIcon variant="light" color="orange" size="lg" radius="xl">
                    <IconFlame size={20} />
                </ThemeIcon>
            </Group>
        </Group>
    );
}
