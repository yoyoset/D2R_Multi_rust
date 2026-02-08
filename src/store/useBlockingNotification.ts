import { create } from 'zustand';

export interface Action {
    label: string;
    onClick: () => Promise<void> | void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

interface NotificationState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    actions: Action[];
    show: (title: string, message: string, actions: Action[], type?: 'info' | 'warning' | 'error') => void;
    close: () => void;
}

export const useBlockingNotification = create<NotificationState>((set) => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    actions: [],
    show: (title, message, actions, type = 'info') => set({
        isOpen: true,
        title,
        message,
        actions,
        type
    }),
    close: () => set({ isOpen: false })
}));
