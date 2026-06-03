import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { LogEntry } from '../../../hooks/useManualTools';

interface AtomicLogConsoleProps {
    logs: LogEntry[];
    onClear: () => void;
    isExpanded: boolean;
    onToggle: () => void;
    className?: string;
}

export const AtomicLogConsole: React.FC<AtomicLogConsoleProps> = ({ logs, onClear, isExpanded, onToggle, className }) => {
    const { t } = useTranslation();

    return (
        <div className={cn("shrink-0 border-t border-line bg-bg/80 backdrop-blur-md overflow-hidden", className)}>
            <div 
                className="flex justify-between items-center px-4 h-6 bg-surface/60 border-b border-line cursor-pointer hover:bg-surface/80 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} className="text-text-dim" /> : <ChevronUp size={16} className="text-text-dim" />}
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-dim">{t('atomic_logs')}</span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-text-faint hover:text-text-dim transition-colors"
                >
                    {t('clear_logs_btn')}
                </button>
            </div>
            
            <div className={cn(
                "overflow-y-auto font-mono text-[10px] space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800 transition-all ease-in-out",
                isExpanded ? "flex-1 p-1.5 opacity-100" : "h-0 p-0 opacity-0"
            )}>
                {logs.map((entry) => (
                    <div key={entry.id} className={cn(
                        "flex gap-3 leading-tight px-1 py-0.5 rounded-sm",
                        entry.level === 'error' ? "text-danger-400 bg-danger-500/5" : 
                        entry.level === 'success' ? "text-player-400 bg-player-500/5" : 
                        entry.level === 'warning' ? "text-warn bg-warn/5" : "text-text-dim"
                    )}>
                        <span className="opacity-30 shrink-0 select-none">[{entry.time}]</span>
                        <span className="flex-1 truncate uppercase tracking-tighter">{entry.message}</span>
                    </div>
                ))}
                {logs.length === 0 && (
                    <div className="flex items-center justify-center p-3 text-text-faint text-[10px] font-black uppercase tracking-[0.2em] italic">
                        {t('waiting_ops')}
                    </div>
                )}
            </div>
        </div>
    );
};
