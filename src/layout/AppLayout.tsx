import { AppShell, Burger, Group, Text, Image, ActionIcon, Tooltip, Tabs, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setDebugOpen } from '../store/logSlice';
import logo from '../assets/logo.png';

// Views
import { Dashboard } from '../components/dashboard/Dashboard';
import { HistoryView } from '../components/history/HistoryView';
import { SettingsModal } from '../components/settings/SettingsModal';
import { DebugDrawer } from '../components/debug/DebugDrawer';
import { ConnectionOverlay } from '../components/common/ConnectionOverlay';
import { BluetoothUnsupportedAlert } from '../components/common/BluetoothUnsupportedAlert';

import { useBluetooth } from '../hooks/useBluetooth';
import { bluetoothManager } from '../services/bluetooth/BluetoothManager';
import { IconSettings, IconBug, IconLayoutDashboard, IconHistory, IconPlugConnectedX, IconBrandGithub } from '@tabler/icons-react';

export function AppLayout() {
    const [opened, { toggle }] = useDisclosure();
    const [settingsOpen, { open: openSettings, close: closeSettings }] = useDisclosure(false);
    const [view, setView] = useState<string | null>('dashboard');
    const dispatch = useDispatch();
    const { device, status } = useBluetooth();

    return (
        <AppShell
            header={{ height: 60 }}
            padding="0"
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Image src={logo} h={32} w="auto" alt="Logo" />
                        <Text fw={700} size="lg" variant="gradient" gradient={{ from: 'cyan', to: 'blue', deg: 45 }} visibleFrom="xs">
                            Mobi Free
                        </Text>
                    </Group>

                    <Group>
                        <Tabs value={view} onChange={setView} variant="pills">
                            <Tabs.List>
                                <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={16} />}>
                                    <Text span visibleFrom="sm">仪表盘</Text>
                                </Tabs.Tab>
                                <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                                    <Text span visibleFrom="sm">历史记录</Text>
                                </Tabs.Tab>
                            </Tabs.List>
                        </Tabs>

                        {status === 'connected' && (
                            <Group gap={5}>
                                {device && (
                                    <Badge variant="light" color="green" size="lg" leftSection={<Text span>🔗</Text>} visibleFrom="xs">
                                        {device.name}
                                    </Badge>
                                )}
                                <Tooltip label="断开连接">
                                    <ActionIcon variant="light" color="red" size="lg" onClick={() => bluetoothManager.disconnect()}>
                                        <IconPlugConnectedX size={20} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        )}

                        <Tooltip label="调试">
                            <ActionIcon variant="light" size="lg" onClick={() => dispatch(setDebugOpen(true))}>
                                <IconBug size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="GitHub 仓库">
                            <ActionIcon
                                variant="light"
                                size="lg"
                                component="a"
                                href="https://github.com/z-hhh/mobi_free2"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <IconBrandGithub size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="设置">
                            <ActionIcon variant="light" size="lg" onClick={openSettings}>
                                <IconSettings size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main>
                <BluetoothUnsupportedAlert />
                {view === 'dashboard' && <Dashboard />}
                {view === 'history' && <HistoryView />}
            </AppShell.Main>

            <SettingsModal opened={settingsOpen} onClose={closeSettings} />
            <DebugDrawer />
            <ConnectionOverlay />
        </AppShell>
    );
}
