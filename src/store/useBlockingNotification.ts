import { create } from 'zustand';

export interface Action {
    label: string;
    onClick: () => Promise<void> | void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success' | 'info';
}

interface NotificationState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    actions: Action[];
    onClose?: () => void;
    show: (title: string, message: string, actions: Action[], type?: 'info' | 'warning' | 'error', onClose?: () => void) => void;
    close: () => void;
}

export const useBlockingNotification = create<NotificationState>((set) => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    actions: [],
    onClose: undefined,
    show: (title, message, actions, type = 'info', onClose) => set({
        isOpen: true,
        title,
        message,
        actions,
        type,
        onClose
    }),
    close: () => set((state) => {
        if (state.onClose) state.onClose();
        return { isOpen: false, onClose: undefined };
    })
}));
