import { Modal, NumberInput, SegmentedControl, Switch, Select, Text, Stack, Group } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { updateWeight, setBoatType, setTheme, setRememberDevice } from '../../store/settingsSlice';
import { useBluetooth } from '../../hooks/useBluetooth';

interface Props {
    opened: boolean;
    onClose: () => void;
}

export function SettingsModal({ opened, onClose }: Props) {
    const dispatch = useDispatch();
    const settings = useSelector((state: RootState) => state.settings);
    const { device } = useBluetooth();

    return (
        <Modal opened={opened} onClose={onClose} title="设置" centered>
            <Stack gap="lg">
                <Stack gap="xs">
                    <Text size="sm" fw={500}>用户信息</Text>
                    <NumberInput
                        label="体重 (kg)"
                        description="用于计算卡路里"
                        value={settings.userProfile.weightKg}
                        onChange={(val) => dispatch(updateWeight(Number(val) || 70))}
                        min={30}
                        max={200}
                    />
                </Stack>

                <Stack gap="xs">
                    <Text size="sm" fw={500}>划船机设置</Text>
                    <Select
                        label="船型"
                        data={[
                            { value: 'water', label: '水阻 (标准)' },
                            { value: 'magnet', label: '磁阻' },
                            { value: 'wind', label: '风阻' }
                        ]}
                        value={settings.rower.boatType}
                        onChange={(val) => val && dispatch(setBoatType(val as any))}
                    />
                </Stack>

                <Stack gap="xs">
                    <Text size="sm" fw={500}>应用偏好</Text>
                    <Group justify="space-between">
                        <Text size="sm">主题</Text>
                        <SegmentedControl
                            value={settings.app.theme}
                            onChange={(val) => dispatch(setTheme(val as any))}
                            data={['light', 'dark', 'auto']}
                        />
                    </Group>

                    <Group justify="space-between">
                        <div>
                            <Text size="sm">记住设备</Text>
                            <Text size="xs" c="dimmed">下次显示快速连接按钮</Text>
                        </div>
                        <Switch
                            checked={settings.app.rememberDevice}
                            onChange={(e) => dispatch(setRememberDevice(e.currentTarget.checked))}
                        />
                    </Group>
                </Stack>

                <Text size="xs" c="dimmed" ta="center">Version 1.2.2</Text>
            </Stack>
        </Modal>
    );
}
