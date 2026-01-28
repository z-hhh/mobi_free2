import { Box, Center, Text, Stack, useMantineTheme, useComputedColorScheme } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useWorkout } from '../../hooks/useWorkout';
import { useElementSize } from '@mantine/hooks';

export function PrimaryGauge() {
    const { spm, rpm, speed, equipmentType } = useWorkout();
    const { ref, width, height } = useElementSize();
    const theme = useMantineTheme();
    const colorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

    let value = 0;
    let max = 100;
    let label = 'SPM';
    let unit = '';

    switch (equipmentType) {
        case 'rower':
            value = spm;
            max = 60;
            label = '桨频';
            break;
        case 'bike':
            value = rpm;
            max = 120;
            label = '踏频';
            break;
        case 'elliptical':
            value = spm;
            max = 90;
            label = '步频';
            break;
        case 'treadmill':
            value = speed;
            max = 20;
            label = '速度';
            unit = 'km/h';
            break;
        default:
            value = spm || rpm || speed;
    }

    const data = [
        { name: 'value', value: Math.min(value, max) },
        { name: 'rest', value: Math.max(0, max - value) },
    ];

    // Using a gradient ID
    const gradientId = 'gaugeGradient';
    const emptyColor = colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2];

    return (
        <Box ref={ref} h={250} w="100%" style={{ position: 'relative', minWidth: 0 }}>
            {width > 0 && height > 0 && (
                <ResponsiveContainer width={width} height={height}>
                    <PieChart>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#228be6" />
                                <stop offset="100%" stopColor="#40c057" />
                            </linearGradient>
                        </defs>
                        <Pie
                            data={data}
                            cx="50%"
                            cy={145}
                            startAngle={180}
                            endAngle={0}
                            innerRadius={95}
                            outerRadius={115}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={`url(#${gradientId})`} />
                            <Cell fill={emptyColor} />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            )}

            <Center style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, marginTop: 80 }}>
                <Stack gap={0} align="center">
                    <Text size="xl" fw={700} fz={48} lh={1}>{value.toFixed(1)}</Text>
                    <Text size="sm" c="dimmed">{label} {unit}</Text>
                </Stack>
            </Center>
        </Box>
    );
}
