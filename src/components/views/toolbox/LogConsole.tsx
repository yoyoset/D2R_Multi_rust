import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface LogItem {
    id: number;
    time: string;
    message: string;
    type: string;
}

interface LogConsoleProps {
    logs: LogItem[];
    onClear: () => void;
    className?: string;
}

export function LogConsole({ logs, onClear, className = "" }: LogConsoleProps) {
    const { t } = useTranslation();

    return (
        <div className={cn("flex flex-col bg-black/40 overflow-hidden", className)}>
            <div className="px-3 py-1 bg-zinc-900/60 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {t('operation_logs')}
                    </span>
                </div>
                <button 
                    onClick={onClear}
                    className="text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-tighter"
                >
                    {t('clear_logs_btn')}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-0.5 custom-scrollbar bg-black/20">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center opacity-10 italic select-none">
                        {t('waiting_for_ops')}
                    </div>
                ) : (
                    logs.map(item => (
                        <div key={item.id} className="flex gap-2 group border-b border-white/[0.02] pb-0.5 last:border-0 hover:bg-white/[0.02] transition-colors">
                            <span className="text-zinc-600 shrink-0 select-none">[{item.time}]</span>
                            <span className={cn(
                                "break-all leading-snug",
                                item.type === 'error' ? "text-red-500/80" : 
                                item.type === 'warning' ? "text-amber-500/80" : 
                                item.type === 'success' ? "text-emerald-500/80" : "text-zinc-400"
                            )}>
                                {item.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
