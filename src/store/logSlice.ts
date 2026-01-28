import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    data?: any;
}

interface LogState {
    logs: LogEntry[];
    isOpen: boolean;
}

const initialState: LogState = {
    logs: [],
    isOpen: false,
};

const logSlice = createSlice({
    name: 'log',
    initialState,
    reducers: {
        addLog: (state, action: PayloadAction<Omit<LogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }>) => {
            const entry: LogEntry = {
                id: action.payload.id || crypto.randomUUID(),
                timestamp: action.payload.timestamp || new Date().toISOString(),
                level: action.payload.level,
                message: action.payload.message,
                data: action.payload.data,
            };

            // Limit to 1000
            if (state.logs.length >= 1000) {
                state.logs.shift();
            }
            state.logs.push(entry);
        },
        clearLogs: (state) => {
            state.logs = [];
        },
        setDebugOpen: (state, action: PayloadAction<boolean>) => {
            state.isOpen = action.payload;
        },
    },
});

export const { addLog, clearLogs, setDebugOpen } = logSlice.actions;
export default logSlice.reducer;
