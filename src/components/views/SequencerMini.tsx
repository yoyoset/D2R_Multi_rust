import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, X, CheckCircle2, Loader2, PlayCircle, ChevronDown, ChevronUp, Circle, Flag } from 'lucide-react';
import { getConfig, AppConfig, ActiveSequenceState, requestSequenceSync, interruptSequence, nextSequenceStep } from '../../lib/api';
import { listen } from '@tauri-apps/api/event';
import { cn } from '../../lib/utils';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

const SequencerMini: React.FC = () => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [state, setState] = useState<ActiveSequenceState | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Resilient Sync Pump: Polling for state if null during initial 1s
    const pullState = async (attemptsLeft: number) => {
        try {
            const s = await requestSequenceSync();
            if (s) {
                setState(s);
                setIsFinished(false);
                return true;
            } else if (attemptsLeft > 0) {
                // Wait 300ms and try again
                await new Promise(r => setTimeout(r, 300));
                return pullState(attemptsLeft - 1);
            }
            return false;
        } catch (e) {
            console.error("Sync pull error:", e);
            return false;
        }
    };

    useEffect(() => {
        const init = async () => {
            const [cfg] = await Promise.all([getConfig()]);
            setConfig(cfg);
            
            const success = await pullState(3); // Try 4 times total
            if (!success) {
                setIsFinished(true); // Genuinely finished or failed to connect
            }
        };
        init();

        const unlisten = listen<ActiveSequenceState | null>('sequence-state-changed', (event) => {
            const newState = event.payload;
            if (!newState) {
                // Wait for the 3s ritual delay before showing finished state? 
                // Actually, the button render logic will handle the delay overlap.
                setIsFinished(true);
            } else {
                setState(newState);
                setIsFinished(false);
                // Removed immediate setIsProcessing(false) to enforce the 3s button cool-down
            }
        });

        const unlistenLog = listen('launch-log', (event: any) => {
            const payload = event.payload;
            if (payload.level === 'success' || payload.level === 'error') {
                setIsProcessing(false);
            }
        });

        return () => {
            unlisten.then(f => f());
            unlistenLog.then(f => f());
        };
    }, []);

    // Window Resizing
    useEffect(() => {
        const syncSize = async () => {
            try {
                const win = getCurrentWindow();
                if (isExpanded) {
                    await win.setSize(new LogicalSize(320, 320));
                    await win.setResizable(true);
                } else {
                    await win.setResizable(false);
                    await win.setSize(new LogicalSize(320, 44));
                }
            } catch (e) {
                console.warn("Resize failed:", e);
            }
        };
        syncSize();
    }, [isExpanded]);

    const handleNext = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isProcessing || isFinished) return;
        setIsProcessing(true);
        try {
            await nextSequenceStep();
            // INDUSTRIAL RITUAL: 3-second enforced delay for account switching
            setTimeout(() => {
                setIsProcessing(false);
            }, 3000);
        } catch (e) {
            console.error(e);
            setIsProcessing(false);
        }
    };

    const handleInterrupt = (e: React.MouseEvent) => {
        e.stopPropagation();
        interruptSequence().catch(console.error);
        getCurrentWindow().close().catch(console.error);
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().close().catch(console.error);
    };

    if (!config) return null;

    const currentAccountId = state ? state.queue[state.current_index] : null;
    const currentAccount = config.accounts.find(a => a.id === currentAccountId);
    const mainLabel = currentAccount 
        ? (currentAccount.bnet_account || currentAccount.note || currentAccount.win_user)
        : "---";

    return (
        <div 
            className={cn(
                "w-full bg-bg/90 backdrop-blur-3xl border border-line-2 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden select-none transition-all duration-300 relative",
                isExpanded ? "rounded-sm h-full" : "rounded-none h-[44px] min-h-[44px]"
            )}
            data-tauri-drag-region
        >
            {/* Header / Pill */}
            <div className="h-[44px] flex items-center shrink-0 relative pointer-events-none" data-tauri-drag-region>
                <div className="h-full flex items-center px-3 border-r border-line opacity-50" data-tauri-drag-region>
                    <GripVertical size={16} className="text-text-dim" />
                </div>

                <div className="flex-1 flex items-center px-3 min-w-0 gap-3" data-tauri-drag-region>
                    {isFinished ? (
                        <div className="flex items-center gap-2 text-player-500">
                            <CheckCircle2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{t('all_done')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0" data-tauri-drag-region>
                            <div className="p-1 bg-gold/10 rounded-sm">
                                <Flag size={16} className="text-gold" />
                            </div>
                            <div className="flex flex-col min-w-0" data-tauri-drag-region>
                                <span className="text-[10px] text-text-dim font-mono leading-none tracking-tighter uppercase truncate opacity-70">
                                    {state ? `${state.preset_name} ? ${state.current_index + 1}/${state.queue.length}` : t('syncing_caps')}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-black truncate leading-tight tracking-tight drop-shadow-sm",
                                    isProcessing ? "text-gold animate-pulse" : "text-text"
                                )}>
                                    {isProcessing ? t('launching') : mainLabel}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Interaction Overlay */}
                <div className="flex items-center h-full pr-1 border-l border-line pointer-events-auto">
                    {state && (
                        <button
                            onClick={isFinished ? handleClose : handleNext}
                            disabled={isProcessing}
                            className={cn(
                                "h-8 px-3 rounded-sm flex items-center gap-1.5 transition-all active:scale-95 mx-1",
                                isProcessing 
                                    ? "bg-surface text-text-dim cursor-not-allowed" 
                                    : isFinished 
                                        ? "bg-player-500 text-text hover:bg-player-600 font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        : "bg-gold text-black hover:bg-gold/80 font-black shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                            )}
                        >
                            {isProcessing ? (
                                <Loader2 size={11} className="animate-spin" />
                            ) : isFinished ? (
                                <CheckCircle2 size={11} fill="currentColor" />
                            ) : (
                                <PlayCircle size={11} fill="currentColor" />
                            )}
                            <span className="text-[10px] uppercase font-black">
                                {isProcessing ? t('launching') : isFinished ? t('finished') : t('launch')}
                            </span>
                        </button>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={cn(
                            "p-2 rounded-sm transition-all",
                            isExpanded ? "bg-white/10 text-text" : "text-text-dim hover:bg-white/5 hover:text-text"
                        )}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <button 
                        onClick={isFinished ? handleClose : handleInterrupt}
                        className="p-2 text-text-dim hover:text-danger-500 hover:bg-danger-500/10 transition-all rounded-sm border-l border-line ml-1"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Expanded Area */}
            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-black/40 scrollbar-none border-t border-line-2 pointer-events-auto">
                    {state ? state.queue.map((id, index) => {
                        const acc = config.accounts.find(a => a.id === id);
                        const isDone = isFinished || index < state.current_index;
                        const isCurrent = !isFinished && index === state.current_index;
                        
                        return (
                            <div key={id} className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-sm transition-all border",
                                isCurrent 
                                    ? "bg-gold/5 border-gold/30 shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]" 
                                    : isDone ? "opacity-30 border-transparent" : "bg-white/2 border-line"
                            )}>
                                {isDone ? <CheckCircle2 size={11} className="text-player-500" /> : 
                                 isCurrent ? <div className="w-3 h-3 rounded-full border-2 border-gold animate-pulse" /> : 
                                 <Circle size={11} className="text-text-faint" />}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className={cn("text-[10px] font-bold truncate", isCurrent ? "text-gold" : "text-zinc-200")}>
                                        {acc?.bnet_account || acc?.note || acc?.win_user}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-700">#{index + 1}</span>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center h-20 text-text-dim gap-2">
                             <Loader2 size={16} className="animate-spin" />
                             <span className="text-[10px] uppercase font-bold">{t('syncing')}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SequencerMini;
