import { Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

export function BluetoothUnsupportedAlert() {
    // Check if Web Bluetooth API is available
    const isBluetoothSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

    if (isBluetoothSupported) {
        return null; // Don't show anything if supported
    }

    // Detect platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    return (
        <Alert
            variant="filled"
            color="red"
            title="浏览器不支持 Web Bluetooth"
            icon={<IconInfoCircle />}
            style={{ margin: '1rem' }}
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
    );
}
