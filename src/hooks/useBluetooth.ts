import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { bluetoothManager } from '../services/bluetooth/BluetoothManager';

export const useBluetooth = () => {
    const { connectionStatus, deviceInfo, error } = useSelector((state: RootState) => state.device);

    const scan = () => bluetoothManager.scan();
    // const disconnect = () => bluetoothManager.disconnect(); // TODO: Add if needed

    return {
        status: connectionStatus,
        device: deviceInfo,
        error,
        scan,
        manager: bluetoothManager
    };
};
