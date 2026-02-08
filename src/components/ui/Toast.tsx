import React from 'react';
import { useNotification, NotificationType } from '../../store/useNotification';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-rose-400" />,
    info: <Info size={18} className="text-blue-400" />,
    warning: <AlertCircle size={18} className="text-amber-400" />,
    loading: <Loader2 size={18} className="text-primary animate-spin" />,
};

const BORDER_MAP: Record<NotificationType, string> = {
    success: "border-emerald-500/20 bg-emerald-500/5",
    error: "border-rose-500/20 bg-rose-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    loading: "border-primary/20 bg-primary/5",
};

export const ToastContainer = () => {
    const { notifications, removeNotification } = useNotification();

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={cn(
                        "pointer-events-auto min-w-[280px] max-w-md p-4 rounded-xl border backdrop-blur-md shadow-2xl animate-in slide-in-from-right-10 duration-300 flex items-start gap-3",
                        BORDER_MAP[n.type]
                    )}
                >
                    <div className="shrink-0 mt-0.5">{ICON_MAP[n.type]}</div>
                    <div className="flex-1 text-sm font-medium text-zinc-200 pr-2 leading-relaxed">
                        {n.message}
                        {n.action && (
                            <button
                                onClick={n.action.onClick}
                                className="mt-2 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md transition-colors font-bold block"
                            >
                                {n.action.label}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => removeNotification(n.id)}
                        className="shrink-0 text-zinc-500 hover:text-white transition-colors self-start"
                    >
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
};
