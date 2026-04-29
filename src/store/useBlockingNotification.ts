import * as React from 'react';
import { create } from 'zustand';

export interface Action {
    label: React.ReactNode;
    onClick: () => Promise<void> | void;
    variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'success' | 'info' | 'solid' | 'ghost';
}

interface NotificationState {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    actions: Action[];
    confirmText?: string;
    onClose?: () => void;
    show: (title: string, message: string, actions: Action[], type?: 'info' | 'warning' | 'error' | 'success', confirmText?: string, onClose?: () => void) => void;
    close: () => void;
}

export const useBlockingNotification = create<NotificationState>((set) => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    actions: [],
    confirmText: undefined,
    onClose: undefined,
    show: (title, message, actions, type = 'info', confirmText, onClose) => set({
        isOpen: true,
        title,
        message,
        actions,
        type,
        confirmText,
        onClose
    }),
    close: () => set((state) => {
        if (state.onClose) state.onClose();
        return { isOpen: false, onClose: undefined };
    })
}));
