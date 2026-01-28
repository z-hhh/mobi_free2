import { Container, Stack, Overlay, Center, Text, Button } from '@mantine/core';
import { useWorkout } from '../../hooks/useWorkout';
import { ActivityHeader } from './ActivityHeader';
import { PrimaryGauge } from './PrimaryGauge';
import { MetricGrid } from './MetricGrid';
import { ControlPanel } from './ControlPanel';
import { useDispatch } from 'react-redux';
import { togglePause } from '../../store/workoutSlice';

export function Dashboard() {
    const { isPaused } = useWorkout();
    const dispatch = useDispatch();

    return (
        <Container p="md" h="calc(100vh - 60px)" style={{ position: 'relative' }}>
            <Stack h="100%" justify="space-between">
                <ActivityHeader />
                <PrimaryGauge />
                <ControlPanel />
                <MetricGrid />
            </Stack>

            {isPaused && (
                <Overlay color="#000" backgroundOpacity={0.6} zIndex={10}>
                    <Center h="100%">
                        <Stack>
                            <Text c="white" size="xl" fw={700}>已暂停</Text>
                            <Button size="lg" onClick={() => dispatch(togglePause())}>继续</Button>
                        </Stack>
                    </Center>
                </Overlay>
            )}
        </Container>
    );
}
