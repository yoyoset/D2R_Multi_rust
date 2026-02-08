import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface NotificationState {
    notifications: Notification[];
    addNotification: (
        type: NotificationType,
        message: string,
        duration?: number,
        action?: { label: string; onClick: () => void }
    ) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotification = create<NotificationState>((set) => ({
    notifications: [],
    addNotification: (type, message, duration = 4000, action) => {
        const id = crypto.randomUUID();
        set((state) => ({
            notifications: [...state.notifications, { id, type, message, duration, action }]
        }));

        if (type !== 'loading' && duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id)
                }));
            }, duration);
        }
        return id;
    },
    removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id)
    })),
    clearAll: () => set({ notifications: [] })
}));
