import { Paper, Slider, Group, ActionIcon, Stack, Text } from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';
import { debounce } from 'lodash';
import { useBluetooth } from '../../hooks/useBluetooth';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export function ControlPanel() {
    const { manager } = useBluetooth();
    const resistance = useSelector((state: RootState) => state.workout.resistance);
    const maxResistance = useSelector((state: RootState) => state.device.deviceInfo.id /* temporary placeholder for specs */ ? 32 : 16); // Should get from specs

    // Local state for optimistic UI
    const [localVal, setLocalVal] = useState(resistance);

    // Debounced write
    const debouncedWrite = useCallback(
        debounce((val: number) => {
            manager.setResistance(val);
        }, 300),
        [manager]
    );

    const handleChange = (val: number) => {
        setLocalVal(val);
        debouncedWrite(val);
    };

    const handleStep = (step: number) => {
        const newVal = Math.min(Math.max(localVal + step, 1), maxResistance);
        handleChange(newVal);
    };

    // Sync local value when resistance changes from device
    useEffect(() => {
        setLocalVal(resistance);
    }, [resistance]);

    return (
        <Paper shadow="sm" radius="md" p="md" withBorder>
            <Stack gap="xl">
                <Text size="xs" tt="uppercase" c="dimmed" ta="center" mb="sm">阻力</Text>
                <Group>
                    <ActionIcon size="xl" variant="light" onClick={() => handleStep(-1)}>
                        <IconMinus />
                    </ActionIcon>

                    <Slider
                        value={localVal}
                        onChange={handleChange}
                        min={1}
                        max={maxResistance}
                        step={1}
                        style={{ flex: 1 }}
                        size="xl"
                        labelAlwaysOn
                    />

                    <ActionIcon size="xl" variant="light" onClick={() => handleStep(1)}>
                        <IconPlus />
                    </ActionIcon>
                </Group>
            </Stack>
        </Paper>
    );
}
