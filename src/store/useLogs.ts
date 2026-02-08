import { create } from 'zustand';

export interface LogEntry {
    time: string;
    message: string;
    level: 'info' | 'success' | 'error' | 'warn';
    category?: string;
}

interface LogState {
    logs: LogEntry[];
    addLog: (entry: Omit<LogEntry, 'time'>) => void;
    clearLogs: () => void;
}

export const useLogs = create<LogState>((set) => ({
    logs: [],
    addLog: (entry) => set((state) => ({
        logs: [{ ...entry, time: new Date().toLocaleTimeString() }, ...state.logs].slice(0, 200)
    })),
    clearLogs: () => set({ logs: [] })
}));
