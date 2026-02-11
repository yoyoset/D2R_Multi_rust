import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogConsoleProps {
    logs: any[];
    onClear: () => void;
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs, onClear }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(true);

    if (logs.length === 0) return null;

    return (
        <div className="flex-shrink-0 w-full max-w-5xl mt-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-950/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl transition-all duration-300">
                <div
                    className="bg-zinc-900/50 px-4 py-1.5 flex justify-between items-center border-b border-white/5 cursor-pointer hover:bg-zinc-900/70 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        {t('atomic_logs')}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                        {t('clear_logs_btn')}
                    </button>
                </div>
                <div className={cn(
                    "overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-32 p-3 opacity-100" : "max-h-0 p-0 opacity-0 border-none"
                )}>
                    {logs.map((log, i) => (
                        <div key={i} className={cn(
                            "flex gap-3 leading-relaxed",
                            log.level === 'error' ? "text-rose-400" : log.level === 'success' ? "text-emerald-400" : "text-zinc-400"
                        )}>
                            <span className="opacity-30 flex-shrink-0">{log.time}</span>
                            <span className="flex-1">
                                {log.level === 'error' ? '✖ ' : log.level === 'success' ? '✔ ' : '> '}
                                {log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
