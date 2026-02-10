import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, invoke } from '../../lib/api';
import { Button } from '../ui/Button';
import { ShieldAlert, Play, Skull, FolderPlus, MonitorSmartphone, Settings2, User, ChevronDown, ChevronUp } from 'lucide-react';
import MirrorModal from '../modals/MirrorModal';
import { cn } from '../../lib/utils';
import { useBlockingNotification } from '../../store/useBlockingNotification';

interface ManualToolsProps {
    accounts: Account[];
    selectedAccountId: string | null;
}

const ManualTools: React.FC<ManualToolsProps> = ({ accounts, selectedAccountId }) => {
    const { t } = useTranslation();
    const [log, setLog] = useState<any[]>([]);
    const [isMirrorOpen, setIsMirrorOpen] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(true);
    const { show: showBlocking } = useBlockingNotification();

    const addLog = (message: string, level: 'info' | 'success' | 'error' = 'info') => {
        setLog(prev => [{
            message,
            level,
            time: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50));
    };

    const runCommand = async (cmd: string, args: Record<string, any> = {}) => {
        try {
            addLog(`> ${cmd}${Object.keys(args).length ? ' (' + JSON.stringify(args) + ')' : ''}...`, 'info');
            const res = await invoke(cmd, args) as string;
            addLog(`✔ ${res}`, 'success');
            return res;
        } catch (e) {
            addLog(`✖ Error: ${e}`, 'error');
            throw e;
        }
    };

    const handleNukeReset = () => {
        showBlocking(
            t('nuke_confirm_title'),
            t('nuke_confirm_desc'),
            [
                {
                    label: t('cancel'),
                    variant: 'outline',
                    onClick: () => addLog('Nuke reset cancelled.', 'info')
                },
                {
                    label: 'NUKE IT',
                    variant: 'danger',
                    onClick: async () => {
                        // For critical actions, we still use a simple prompt for the "yes" typing 
                        // as suggested by the user "强校验，输入yes确认".
                        const typed = window.prompt(t('nuke_confirm_desc'));
                        if (typed?.toLowerCase() === 'yes') {
                            await runCommand('nuke_reset');
                        }
                    }
                }
            ],
            'warning'
        );
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="flex flex-col h-full p-4 md:p-6 gap-6 w-full overflow-hidden items-center">
            {/* Main Tools Container - No Scrolling */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0">
                
                {/* 1. Launch Tools (Emerald) */}
                <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Play size={120} className="text-emerald-400" />
                    </div>
                    
                    <h4 className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10 mb-6">
                        <Play size={14} className="text-emerald-400" /> {t('launch_tools')}
                    </h4>

                    <div className="space-y-3 relative z-10 flex-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-11 border-emerald-500/20 text-emerald-100/70 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-xs justify-start"
                            onClick={() => setIsMirrorOpen(true)}
                        >
                            <FolderPlus size={16} className="mr-3 opacity-60" /> {t('mirror_title')}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-emerald-500/20 text-emerald-100/70 hover:text-emerald-400 hover:bg-emerald-500/5 text-xs"
                            onClick={() => runCommand('open_user_switch')}
                        >
                            <MonitorSmartphone size={16} className="mr-3 opacity-60" /> {t('open_user_switch')}
                        </Button>

                        {selectedAccount ? (
                            <Button
                                variant="outline"
                                className="w-full h-20 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 font-bold tracking-widest shadow-xl transition-all group mt-2"
                                onClick={() => runCommand('manual_launch_process', { username: selectedAccount.win_user, password: selectedAccount.win_pass })}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-[9px] uppercase tracking-widest opacity-60 leading-none">{t('ready')}</span>
                                    <div className="flex items-center gap-2">
                                        <Play size={16} className="text-emerald-400 group-hover:scale-110 transition-transform fill-current" />
                                        <span className="text-sm truncate max-w-[150px]">{t('launch_as_identity', { user: selectedAccount.win_user })}</span>
                                    </div>
                                </div>
                            </Button>
                        ) : (
                            <div className="text-[10px] text-emerald-500/40 flex items-center justify-center border border-dashed border-emerald-500/10 rounded-xl py-8 bg-black/10 italic h-20 mt-2">
                                {t('no_accounts_hint')}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Cleanup Tools (Rose) */}
                <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Skull size={120} className="text-rose-400" />
                    </div>

                    <h4 className="text-rose-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10 mb-6">
                        <Skull size={14} className="text-rose-400" /> {t('debug_cleanup_title')}
                    </h4>

                    <div className="space-y-3 relative z-10 flex-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs shadow-lg shadow-rose-500/5"
                            onClick={() => runCommand('kill_processes')}
                        >
                            <Skull size={16} className="mr-3 opacity-60 group-hover:animate-pulse" /> {t('kill_processes_clashpad')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                            onClick={() => runCommand('kill_mutexes')}
                        >
                            <ShieldAlert size={16} className="mr-3 opacity-60" /> {t('kill_mutex_force')}
                        </Button>
                    </div>
                </div>

                {/* 3. System Utilities (Blue) */}
                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Settings2 size={120} className="text-blue-400" />
                    </div>

                    <h4 className="text-blue-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10 mb-6">
                        <MonitorSmartphone size={14} className="text-blue-400" /> {t('system_utils')}
                    </h4>

                    <div className="space-y-3 relative z-10 flex-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-blue-500/20 text-blue-100/70 hover:text-blue-400 hover:bg-blue-500/5 text-xs"
                            onClick={() => runCommand('open_lusrmgr')}
                        >
                            <User size={16} className="mr-3 opacity-60" /> {t('open_local_users')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-blue-500/20 text-blue-100/70 hover:text-blue-400 hover:bg-blue-500/5 text-xs"
                            onClick={() => runCommand('open_netplwiz')}
                        >
                            <ShieldAlert size={16} className="mr-3 opacity-60" /> {t('open_adv_users')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/30 bg-rose-500/5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs font-bold"
                            onClick={handleNukeReset}
                        >
                            <Skull size={16} className="mr-3 opacity-60" /> {t('nuke_reset')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Collapsible Atomic Logs - Fixed at Bottom */}
            <div className="flex-shrink-0 w-full max-w-6xl mb-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-zinc-950/40 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl transition-all duration-300">
                    <div
                        className="bg-zinc-900/50 px-4 py-2 flex justify-between items-center border-b border-white/5 cursor-pointer hover:bg-zinc-900/70 transition-colors"
                        onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                    >
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            {isLogsExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                            {t('atomic_logs')}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLog([]);
                            }}
                            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            {t('clear_logs_btn')}
                        </button>
                    </div>
                    <div className={cn(
                        "overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 transition-all duration-300 ease-in-out",
                        isLogsExpanded ? "max-h-40 p-3 opacity-100" : "max-h-0 p-0 opacity-0 border-none"
                    )}>
                        {log.map((entry, i) => (
                            <div key={i} className={cn(
                                "flex gap-3 leading-relaxed",
                                entry.level === 'error' ? "text-rose-400" : entry.level === 'success' ? "text-emerald-400" : "text-zinc-400"
                            )}>
                                <span className="opacity-30 flex-shrink-0">{entry.time}</span>
                                <span className="flex-1 whitespace-pre-wrap">{entry.message}</span>
                            </div>
                        ))}
                        {log.length === 0 && <span className="text-zinc-800 font-bold">{t('waiting_ops')}</span>}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <MirrorModal
                isOpen={isMirrorOpen}
                onClose={() => setIsMirrorOpen(false)}
                onLog={(msg) => addLog(msg, 'info')}
            />
        </div>
    );
};

export default ManualTools;
