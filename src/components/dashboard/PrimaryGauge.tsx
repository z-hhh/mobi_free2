import { Box, Center, Text, Stack } from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useWorkout } from '../../hooks/useWorkout';

export function PrimaryGauge() {
    const { spm, rpm, speed, equipmentType } = useWorkout();

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

    // Logic for color - simplified to use gradient
    // let color = '#228be6'; 
    // if (value > max * 0.8) color = '#fa5252'; 
    // else if (value > max * 0.6) color = '#40c057';

    // Using a gradient ID
    const gradientId = 'gaugeGradient';

    return (
        <Box h={250} w="100%" style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
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
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={0}
                        dataKey="value"
                    >
                        <Cell fill={`url(#${gradientId})`} />
                        <Cell fill="#e9ecef" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>

            <Center style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, marginTop: 40 }}>
                <Stack gap={0} align="center">
                    <Text size="xl" fw={700} fz={48} lh={1}>{value.toFixed(1)}</Text>
                    <Text size="sm" c="dimmed">{label} {unit}</Text>
                </Stack>
            </Center>
        </Box>
    );
}
