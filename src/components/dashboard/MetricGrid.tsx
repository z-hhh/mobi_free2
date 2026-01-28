import { SimpleGrid, Paper, Text, Group, ThemeIcon } from '@mantine/core';
import { useWorkout } from '../../hooks/useWorkout';
import {
    IconBolt, IconRuler2, IconClock, IconGauge, IconTrendingUp, IconBarbell, IconFlame
} from '@tabler/icons-react';

interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon: React.ElementType;
    color?: string;
}

function MetricCard({ label, value, unit, icon: Icon, color = 'blue' }: MetricCardProps) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group align="center" mb="xs">
                <ThemeIcon variant="light" color={color} size="md" radius="xl">
                    <Icon size={18} />
                </ThemeIcon>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{label}</Text>
            </Group>

            <Text fz={32} fw={700} lh={1}>
                {value} <Text span size="sm" fw={400} c="dimmed">{unit}</Text>
            </Text>
        </Paper>
    );
}

export function MetricGrid() {
    const { equipmentType, split500m, distance, power, resistance, speed, incline, spm } = useWorkout();

    // Helper to formatting split (seconds to MM:SS)
    const formatSplit = (s: number) => {
        if (s === 0) return '--:--';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const renderMetrics = () => {
        switch (equipmentType) {
            case 'rower':
                return (
                    <>
                        <MetricCard label="配速 /500m" value={formatSplit(split500m)} icon={IconClock} color="indigo" />
                        <MetricCard label="距离" value={distance} unit="m" icon={IconRuler2} color="teal" />
                        <MetricCard label="功率" value={power} unit="w" icon={IconBolt} color="yellow" />
                        <MetricCard label="阻力等级" value={resistance} icon={IconBarbell} color="gray" />
                    </>
                );
            case 'bike':
                return (
                    <>
                        <MetricCard label="速度" value={speed.toFixed(1)} unit="km/h" icon={IconGauge} color="cyan" />
                        <MetricCard label="距离" value={(distance / 1000).toFixed(2)} unit="km" icon={IconRuler2} color="teal" />
                        <MetricCard label="阻力" value={resistance} icon={IconBarbell} color="gray" />
                        <MetricCard label="功率" value={power} unit="w" icon={IconBolt} color="yellow" />
                    </>
                );
            case 'elliptical':
                return (
                    <>
                        <MetricCard label="距离" value={(distance / 1000).toFixed(2)} unit="km" icon={IconRuler2} color="teal" />
                        <MetricCard label="速度" value={speed.toFixed(1)} unit="km/h" icon={IconGauge} color="cyan" />
                        <MetricCard label="阻力" value={resistance} icon={IconBarbell} color="gray" />
                    </>
                );
            case 'treadmill':
                return (
                    <>
                        <MetricCard label="坡度" value={incline} unit="%" icon={IconTrendingUp} color="orange" />
                        <MetricCard label="距离" value={(distance / 1000).toFixed(2)} unit="km" icon={IconRuler2} color="teal" />
                        <MetricCard label="配速" value={speed > 0 ? (60 / speed).toFixed(2) : '--'} unit="min/km" icon={IconClock} color="indigo" />
                    </>
                );
            default:
                // Generic fallback
                return (
                    <>
                        <MetricCard label="距离" value={distance} unit="m" icon={IconRuler2} color="teal" />
                        <MetricCard label="阻力" value={resistance} icon={IconBarbell} color="gray" />
                    </>
                );
        }
    };

    return (
        <SimpleGrid cols={2} spacing="md">
            {renderMetrics()}
        </SimpleGrid>
    );
}
