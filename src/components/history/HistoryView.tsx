import { Container, Grid, Paper, Text, Group, Stack, Badge, ScrollArea } from '@mantine/core';
import { DatePicker } from '@mantine/dates';
import { useState, useEffect } from 'react';
import { getWorkoutsByDateRange, WorkoutRecord } from '../../services/db/db';
import dayjs from 'dayjs';

export function HistoryView() {
    const [date, setDate] = useState<Date | null>(new Date());
    const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);

    useEffect(() => {
        if (date) {
            const start = dayjs(date).startOf('day').toISOString();
            const end = dayjs(date).endOf('day').toISOString();
            getWorkoutsByDateRange(start, end).then(setWorkouts);
        }
    }, [date]);

    return (
        <Container p="md">
            <Grid>
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Paper withBorder p="md" radius="md">
                        <Group justify="center">
                            <DatePicker
                                value={date}
                                onChange={(val) => setDate(val as Date | null)}
                            />
                        </Group>
                    </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                    <Stack>
                        <Text size="lg" fw={700}>
                            {date ? dayjs(date).format('YYYY年M月D日') : '选择日期'}
                        </Text>

                        {workouts.length === 0 ? (
                            <Paper p="xl" withBorder ta="center" c="dimmed">
                                暂无运动记录
                            </Paper>
                        ) : (
                            <ScrollArea h={400}>
                                <Stack>
                                    {workouts.map(w => (
                                        <Paper key={w.id} withBorder p="md" radius="md">
                                            <Group justify="space-between">
                                                <Group>
                                                    <Stack gap={0}>
                                                        <Text fw={700}>{dayjs(w.startTime).format('HH:mm')}</Text>
                                                        <Badge>{w.deviceType || '设备'}</Badge>
                                                    </Stack>
                                                </Group>
                                                <Group gap="xl">
                                                    <div>
                                                        <Text size="xs" c="dimmed">时间</Text>
                                                        <Text fw={500}>{Math.floor(w.duration / 60)}m</Text>
                                                    </div>
                                                    <div>
                                                        <Text size="xs" c="dimmed">距离</Text>
                                                        <Text fw={500}>{w.distance}m</Text>
                                                    </div>
                                                    <div>
                                                        <Text size="xs" c="dimmed">卡路里</Text>
                                                        <Text fw={500}>{w.calories}</Text>
                                                    </div>
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                </Stack>
                            </ScrollArea>
                        )}
                    </Stack>
                </Grid.Col>
            </Grid>
        </Container>
    );
}
