import { Modal, Button, Text, Stack, Loader, Group, Badge } from '@mantine/core';
import { useBluetooth } from '../../hooks/useBluetooth';
import { IconBluetooth } from '@tabler/icons-react';

export function ConnectionOverlay() {
    const { status, scan, device, error } = useBluetooth();

    const isOpen = status !== 'connected';

    return (
        <Modal
            opened={isOpen}
            onClose={() => { }}
            withCloseButton={false}
            fullScreen
            zIndex={200}
            overlayProps={{
                backgroundOpacity: 0.8,
                blur: 5,
            }}
        >
            <Stack align="center" justify="center" h="100vh" gap="xl">
                <IconBluetooth size={64} color="#228be6" />

                <Text size="xl" fw={700}>连接设备</Text>

                {status === 'disconnected' && (
                    <Button size="xl" onClick={scan} leftSection={<IconBluetooth />}>
                        扫描设备
                    </Button>
                )}

                {(status === 'scanning' || status === 'connecting') && (
                    <Stack align="center">
                        <Loader size="lg" type="dots" />
                        <Text>{status === 'scanning' ? '扫描中...' : '连接中...'}</Text>
                    </Stack>
                )}

                {status === 'error' && (
                    <Stack align="center">
                        <Text c="red">连接失败</Text>
                        <Text size="sm" c="dimmed">{error}</Text>
                        <Button onClick={scan} variant="outline" color="red">重试</Button>
                    </Stack>
                )}

                <Text size="sm" c="dimmed" mt="xl">
                    支持设备：划船机、单车、椭圆机、跑步机
                </Text>
            </Stack>
        </Modal>
    );
}
