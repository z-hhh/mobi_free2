import { Modal, NumberInput, SegmentedControl, Switch, Select, Text, Stack, Button, Group } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateWeight, setBoatType, setTheme, setAutoConnect } from '../../store/settingsSlice';
import { useBluetooth } from '../../hooks/useBluetooth';

interface Props {
    opened: boolean;
    onClose: () => void;
}

export function SettingsModal({ opened, onClose }: Props) {
    const dispatch = useDispatch();
    const settings = useSelector((state: RootState) => state.settings);
    const { device } = useBluetooth();

    // Decide if we show Boat Type (only if Rower)
    // Or simpler: always show but disabled? No, show if setting "rower" is relevant.
    // We'll show it under "Rower Settings" section

    return (
        <Modal opened={opened} onClose={onClose} title="Settings" centered>
            <Stack gap="lg">
                <Stack gap="xs">
                    <Text size="sm" fw={500}>User Profile</Text>
                    <NumberInput
                        label="Weight (kg)"
                        description="Required for accurate calorie calculation"
                        value={settings.userProfile.weightKg}
                        onChange={(val) => dispatch(updateWeight(Number(val) || 70))}
                        min={30}
                        max={200}
                    />
                </Stack>

                <Stack gap="xs">
                    <Text size="sm" fw={500}>Rower Settings</Text>
                    <Select
                        label="Boat Type"
                        data={[
                            { value: 'water', label: 'Water (Standard)' },
                            { value: 'magnet', label: 'Magnetic' },
                            { value: 'wind', label: 'Air / Wind' }
                        ]}
                        value={settings.rower.boatType}
                        onChange={(val) => val && dispatch(setBoatType(val as any))}
                    />
                </Stack>

                <Stack gap="xs">
                    <Text size="sm" fw={500}>App Preferences</Text>
                    <Group justify="space-between">
                        <Text size="sm">Theme</Text>
                        <SegmentedControl
                            value={settings.app.theme}
                            onChange={(val) => dispatch(setTheme(val as any))}
                            data={['light', 'dark', 'auto']}
                        />
                    </Group>

                    <Group justify="space-between">
                        <Text size="sm">Auto-Connect</Text>
                        <Switch
                            checked={settings.app.autoConnect}
                            onChange={(e) => dispatch(setAutoConnect(e.currentTarget.checked))}
                        />
                    </Group>
                </Stack>

                <Text size="xs" c="dimmed" ta="center">Version 1.2.2</Text>
            </Stack>
        </Modal>
    );
}
