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


    return (
        <div className="flex-shrink-0 w-full max-w-5xl mt-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-surface/40 border border-line rounded-sm overflow-hidden backdrop-blur-sm shadow-card transition-all duration-300">
                <div
                    className="bg-surface/60 px-6 py-2 flex justify-between items-center border-b border-line cursor-pointer hover:bg-surface/80 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span className="text-[10px] font-black text-text-dim uppercase tracking-widest flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                        {t('atomic_logs')}
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClear();
                        }}
                        className="text-[10px] text-text-faint hover:text-text-dim transition-colors"
                    >
                        {t('clear_logs_btn')}
                    </button>
                </div>
                <div className={cn(
                    "overflow-y-auto font-mono text-[11px] space-y-1 transition-all duration-300 ease-in-out",
                    isExpanded ? "max-h-32 p-4 opacity-100" : "max-h-0 p-0 opacity-0"
                )}>
                    {logs.length === 0 ? (
                        <div className="text-text-faint italic py-2 opacity-60">
                            {'>'} {t('waiting_for_diagnostics')}...
                        </div>
                    ) : logs.map((log, i) => (
                        <div key={i} className={cn(
                            "flex gap-3 leading-relaxed",
                            log.level === 'error' ? "text-danger" : log.level === 'success' ? "text-player" : "text-text-dim"
                        )}>
                            <span className="opacity-40 flex-shrink-0">{log.time}</span>
                            <span className="flex-1">
                                {log.level === 'error' ? '✗ ' : log.level === 'success' ? '✓ ' : '> '}
                                {log.key ? (log.args ? t(log.key, log.args) : t(log.key)) : log.message}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
