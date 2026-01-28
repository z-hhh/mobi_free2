import { Modal, Stack, Image, Text, Center } from '@mantine/core';

interface DonateModalProps {
    opened: boolean;
    onClose: () => void;
}

export function DonateModal({ opened, onClose }: DonateModalProps) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="支持项目开发"
            centered
            size="md"
        >
            <Stack align="center" gap="lg" p="md">
                <Text size="sm" c="dimmed" ta="center">
                    如果这个项目对您有帮助，欢迎请开发者喝杯咖啡 ☕
                </Text>

                <Center>
                    <Image
                        src="/alipay-qr.jpg"
                        alt="支付宝收款码"
                        w={300}
                        h={300}
                        fit="contain"
                    />
                </Center>

                <Text size="xs" c="dimmed" ta="center">
                    请使用支付宝扫描上方二维码
                </Text>
            </Stack>
        </Modal>
    );
}
