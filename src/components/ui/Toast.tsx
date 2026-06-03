import React from 'react';
import { useNotification, NotificationType } from '../../store/useNotification';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle2 size={16} className="text-player-400" />,
    error: <AlertCircle size={16} className="text-danger-400" />,
    info: <Info size={16} className="text-net-400" />,
    warning: <AlertCircle size={16} className="text-warn" />,
    loading: <Loader2 size={16} className="text-gold animate-spin" />,
};

const BORDER_MAP: Record<NotificationType, string> = {
    success: "border-player/20 bg-player-500/5",
    error: "border-danger-500/20 bg-danger-500/5",
    info: "border-net/20 bg-net-500/5",
    warning: "border-warn/20 bg-warn/5",
    loading: "border-gold/20 bg-gold/5",
};

export const ToastContainer = () => {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={cn(
                        "pointer-events-auto min-w-[280px] max-w-md p-4 rounded-sm border-line-2 bg-surface/90 backdrop-blur-md shadow-2xl animate-in slide-in-from-right-10 duration-300 flex items-start gap-3",
                        BORDER_MAP[n.type]
                    )}
                >
                    <div className="shrink-0 mt-0.5">{ICON_MAP[n.type]}</div>
                    <div className="flex-1 text-[14px] font-medium text-text pr-2 leading-relaxed">
                        {n.message}
                        {n.action && (
                            <button
                                onClick={n.action.onClick}
                                className="mt-2 text-[14px] bg-white/10 hover:bg-white/20 text-text px-3 py-1.5 rounded-md transition-colors font-bold block"
                            >
                                {n.action.label}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => removeNotification(n.id)}
                        className="shrink-0 text-text-dim hover:text-text transition-colors self-start"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
