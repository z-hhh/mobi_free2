import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const useWorkout = () => {
    const workout = useSelector((state: RootState) => state.workout);
    const equipmentType = useSelector((state: RootState) => state.device.supportedEquipment);
    return { ...workout, equipmentType };
};
