import { Drawer, ScrollArea, Text, Badge, ActionIcon, Group, Code, Stack, Checkbox, Button } from '@mantine/core';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { clearLogs, setDebugOpen } from '../../store/logSlice';
import { IconCopy, IconTrash, IconBug } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';

export function DebugDrawer() {
    const dispatch = useDispatch();
    const { logs, isOpen } = useSelector((state: RootState) => state.log);
    const deviceState = useSelector((state: RootState) => state.device);
    const workoutState = useSelector((state: RootState) => state.workout);
    const clipboard = useClipboard();

    const handleCopy = () => {
        const content = JSON.stringify({ device: deviceState, logs, workout: workoutState }, null, 2);
        clipboard.copy(content);
    };

    return (
        <Drawer
            opened={isOpen}
            onClose={() => dispatch(setDebugOpen(false))}
            title="Debug Console"
            position="right"
            size="xl"
        >
            <Stack h="calc(100vh - 80px)">
                <Group>
                    <Button leftSection={<IconCopy size={16} />} onClick={handleCopy} variant="light">
                        {clipboard.copied ? 'Copied' : 'Copy Logs'}
                    </Button>
                    <Button leftSection={<IconTrash size={16} />} onClick={() => dispatch(clearLogs())} variant="light" color="red">
                        Clear
                    </Button>
                </Group>

                <Code block style={{ flex: 1, overflow: 'hidden' }}>
                    <ScrollArea h="100%">
                        {logs.map(log => (
                            <div key={log.id} style={{ marginBottom: 4 }}>
                                <Text span size="xs" c="dimmed">{dayjs(log.timestamp).format('HH:mm:ss.SSS')} </Text>
                                <Badge
                                    size="xs"
                                    color={log.level === 'error' ? 'red' : log.level === 'warn' ? 'orange' : log.level === 'debug' ? 'gray' : 'blue'}
                                >
                                    {log.level}
                                </Badge>
                                <Text span size="sm" ml="xs" style={{ fontFamily: 'monospace' }}>
                                    {log.message}
                                </Text>
                                {log.data && (
                                    <Text size="xs" c="dimmed" ml="lg">
                                        {JSON.stringify(log.data)}
                                    </Text>
                                )}
                            </div>
                        ))}
                    </ScrollArea>
                </Code>
            </Stack>
        </Drawer>
    );
}

// Helper to make dayjs available if import missing (added import above)
import dayjs from 'dayjs';
