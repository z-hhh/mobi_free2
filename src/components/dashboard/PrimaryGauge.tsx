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
            label = 'SPM';
            break;
        case 'bike':
            value = rpm;
            max = 120;
            label = 'RPM';
            break;
        case 'elliptical':
            value = spm;
            max = 90;
            label = 'SPM';
            break;
        case 'treadmill':
            value = speed;
            max = 20;
            label = 'SPEED';
            unit = 'km/h';
            break;
        default:
            value = spm || rpm || speed;
    }

    const data = [
        { name: 'value', value: Math.min(value, max) },
        { name: 'rest', value: Math.max(0, max - value) },
    ];

    // Logic for color
    let color = '#228be6'; // Blue
    if (value > max * 0.8) color = '#fa5252'; // Red
    else if (value > max * 0.6) color = '#40c057'; // Green

    return (
        <Box h={250} w="100%" style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                        stroke="none"
                    >
                        <Cell fill={color} />
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
