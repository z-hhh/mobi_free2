import { Group, Text, Stack, ThemeIcon, ActionIcon, Modal, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useDispatch } from 'react-redux';
import { useWorkout } from '../../hooks/useWorkout';
import { IconClock, IconFlame, IconSquareRoundedFilled } from '@tabler/icons-react';
import { resetWorkout } from '../../store/workoutSlice';
import { bluetoothManager } from '../../services/bluetooth/BluetoothManager';

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function ActivityHeader() {
    const { duration, calories } = useWorkout();
    const dispatch = useDispatch();
    const [opened, { open, close }] = useDisclosure(false);

    const handleReset = () => {
        dispatch(resetWorkout());
        bluetoothManager.disconnect();
        close();
    };

    return (
        <>
            <Modal opened={opened} onClose={close} title="结束本次运动" centered>
                <Text size="sm" mb="xl">
                    确定要结束运动并清零当前所有数据吗？设备连接也会同时断开。
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={close}>取消</Button>
                    <Button color="red" onClick={handleReset}>结束运动</Button>
                </Group>
            </Modal>

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

                {duration > 0 && (
                    <ActionIcon 
                        variant="light" 
                        color="red" 
                        size={42} 
                        radius="xl" 
                        onClick={open} 
                        title="结束运动"
                        style={{ alignSelf: 'center' }}
                    >
                        <IconSquareRoundedFilled size={22} />
                    </ActionIcon>
                )}

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
        </>
    );
}
