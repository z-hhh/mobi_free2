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

                <Text size="xl" fw={700}>Connect to Equipment</Text>

                {status === 'disconnected' && (
                    <Button size="xl" onClick={scan} leftSection={<IconBluetooth />}>
                        Scan for Devices
                    </Button>
                )}

                {(status === 'scanning' || status === 'connecting') && (
                    <Stack align="center">
                        <Loader size="lg" type="dots" />
                        <Text>{status === 'scanning' ? 'Scanning...' : 'Connecting...'}</Text>
                    </Stack>
                )}

                {status === 'error' && (
                    <Stack align="center">
                        <Text c="red">Connection Failed</Text>
                        <Text size="sm" c="dimmed">{error}</Text>
                        <Button onClick={scan} variant="outline" color="red">Retry</Button>
                    </Stack>
                )}

                <Text size="sm" c="dimmed" mt="xl">
                    Supported: Rower, Bike, Elliptical, Treadmill
                </Text>
            </Stack>
        </Modal>
    );
}
