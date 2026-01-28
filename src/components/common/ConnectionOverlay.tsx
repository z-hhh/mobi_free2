import { Modal, Button, Text, Stack, Loader, Group, Badge, Alert } from '@mantine/core';
import { useBluetooth } from '../../hooks/useBluetooth';
import { IconBluetooth, IconAlertCircle } from '@tabler/icons-react';

export function ConnectionOverlay() {
    const { status, scan, device, error } = useBluetooth();

    // Check if Web Bluetooth API is available
    const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

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

                {/* Bluetooth API 不支持警告 */}
                {!isBluetoothSupported && (
                    <Alert
                        variant="filled"
                        color="red"
                        title="浏览器不支持 Web Bluetooth"
                        icon={<IconAlertCircle />}
                        style={{ maxWidth: '500px' }}
                    >
                        {isIOS ? (
                            <>
                                <strong>iOS 用户：</strong>请使用 <strong>Bluefy</strong> 浏览器
                                <br />
                                <a
                                    href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'white', textDecoration: 'underline' }}
                                >
                                    前往 App Store 下载 Bluefy
                                </a>
                            </>
                        ) : (
                            <>
                                此应用需要 Web Bluetooth API 支持。
                                <br />
                                <strong>请使用 Chrome 或 Edge 浏览器</strong>
                            </>
                        )}
                    </Alert>
                )}

                {/* 仅在支持蓝牙时显示连接按钮和状态 */}
                {isBluetoothSupported && (
                    <>
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
                    </>
                )}

                <Text size="sm" c="dimmed" mt="xl">
                    支持设备：划船机、单车、椭圆机、跑步机
                </Text>
            </Stack>
        </Modal>
    );
}
