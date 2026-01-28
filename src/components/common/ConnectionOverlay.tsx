import { Modal, Button, Text, Stack, Loader, Group, Badge, Alert } from '@mantine/core';
import { useBluetooth } from '../../hooks/useBluetooth';
import { IconBluetooth, IconAlertCircle, IconCopy, IconCheck } from '@tabler/icons-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useState } from 'react';

export function ConnectionOverlay() {
    const { status, scan, device, error } = useBluetooth();
    const logs = useSelector((state: RootState) => state.log.logs);
    const [copied, setCopied] = useState(false);

    // Check if Web Bluetooth API is available
    const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const isOpen = status !== 'connected';

    const copyLogsToClipboard = async () => {
        try {
            // Format logs as text
            const logsText = logs.map(log => {
                const data = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : '';
                return `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${data}`;
            }).join('\n\n');

            const debugInfo = `=== Mobi Free Debug Logs ===
Browser: ${navigator.userAgent}
Time: ${new Date().toISOString()}
Total Logs: ${logs.length}
Last Error: ${error || 'None'}

${logsText}`;

            await navigator.clipboard.writeText(debugInfo);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy logs:', err);
        }
    };

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
                                <Group>
                                    <Button onClick={scan} variant="outline" color="red">重试</Button>
                                    <Button
                                        onClick={copyLogsToClipboard}
                                        variant="outline"
                                        leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                        color={copied ? 'green' : 'gray'}
                                    >
                                        {copied ? '已复制' : '复制调试日志'}
                                    </Button>
                                </Group>
                            </Stack>
                        )}
                    </>
                )}

                <Text size="sm" c="dimmed" mt="xl">
                    支持设备：划船机、单车、椭圆机、跑步机
                </Text>

                {/* 复制日志按钮 - 显示在底部 */}
                {isBluetoothSupported && status !== 'error' && logs.length > 0 && (
                    <Button
                        variant="subtle"
                        size="sm"
                        onClick={copyLogsToClipboard}
                        leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        color={copied ? 'green' : 'gray'}
                        style={{ position: 'absolute', bottom: '2rem' }}
                    >
                        {copied ? '已复制调试日志' : '复制调试日志'}
                    </Button>
                )}
            </Stack>
        </Modal>
    );
}
