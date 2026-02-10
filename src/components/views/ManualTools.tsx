import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, invoke } from '../../lib/api';
import { Button } from '../ui/Button';
import { ShieldAlert, Play, FolderPlus, MonitorSmartphone, Settings2, User, ChevronDown, ChevronUp, RefreshCw, Trash2, StopCircle } from 'lucide-react';
import MirrorModal from '../modals/MirrorModal';
import { cn } from '../../lib/utils';

interface ManualToolsProps {
    accounts: Account[];
    selectedAccountId: string | null;
}

const ManualTools: React.FC<ManualToolsProps> = ({ accounts, selectedAccountId }) => {
    const { t } = useTranslation();
    const [log, setLog] = useState<any[]>([]);
    const [isMirrorOpen, setIsMirrorOpen] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(true);
    const [isUserActive, setIsUserActive] = useState(false);
    const [isCheckingActive, setIsCheckingActive] = useState(false);
    const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
    const [nukeConfirmText, setNukeConfirmText] = useState('');

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
        setIsNukeModalOpen(true);
        setNukeConfirmText('');
    };

    const confirmNuke = async () => {
        if (nukeConfirmText.toLowerCase() === 'yes') {
            setIsNukeModalOpen(false);
            await runCommand('nuke_reset');
        } else {
            addLog('Confirmation failed. Typed: ' + nukeConfirmText, 'error');
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    useEffect(() => {
        const checkActive = async () => {
            if (selectedAccount) {
                setIsCheckingActive(true);
                try {
                    const active = await invoke('is_user_process_active', { username: selectedAccount.win_user }) as boolean;
                    setIsUserActive(active);
                } catch (e) {
                    console.error("Failed to check process status", e);
                } finally {
                    setIsCheckingActive(false);
                }
            } else {
                setIsUserActive(false);
            }
        };

        checkActive();
        const timer = setInterval(checkActive, 5000);
        return () => clearInterval(timer);
    }, [selectedAccount]);

    return (
        <div className="flex flex-col p-4 md:p-6 gap-6 w-full items-center">
            {/* Main Tools Container - Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 flex-shrink-0">

                {/* 1. Independent Launch (Emerald) */}
                <div className="bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Play size={120} className="text-emerald-400" />
                    </div>

                    <h4 className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10 mb-6">
                        <Play size={14} className="text-emerald-400" /> {t('independent_launch')}
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
                            className="w-full justify-start h-11 border-rose-500/30 bg-rose-500/5 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 text-xs font-bold"
                            onClick={handleNukeReset}
                        >
                            <RefreshCw size={16} className="mr-3 opacity-60" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span>{t('nuke_concise')}</span>
                                <span className="text-[9px] opacity-40 font-normal">{t('nuke_concise_desc')}</span>
                            </div>
                        </Button>

                        {selectedAccount ? (
                            <div className="space-y-3 relative z-10 flex-1">
                                <Button
                                    variant="outline"
                                    disabled={isUserActive || isCheckingActive}
                                    className={cn(
                                        "w-full h-11 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-bold tracking-widest transition-all",
                                        isUserActive ? "opacity-40 grayscale cursor-not-allowed border-rose-500/20 text-rose-300/50" : "hover:bg-emerald-500/10 shadow-lg"
                                    )}
                                    onClick={() => runCommand('manual_launch_process', { username: selectedAccount.win_user, password: selectedAccount.win_pass })}
                                >
                                    <Play size={16} className={cn("mr-3", isUserActive ? "text-rose-400/40" : "text-emerald-400")} />
                                    <span className="text-xs font-bold truncate">
                                        {t('launch_as_identity', { user: selectedAccount.win_user })}
                                    </span>
                                </Button>
                                {isUserActive && (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 animate-in fade-in slide-in-from-top-1">
                                        <ShieldAlert size={14} className="text-rose-400 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-rose-400/90 leading-normal font-medium">
                                            {t('game_running_prevent_launch')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-[10px] text-emerald-500/40 flex items-center justify-center border border-dashed border-emerald-500/10 rounded-xl py-4 bg-black/10 italic h-11">
                                {t('no_accounts_hint_tools')}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Environment Cleanup (Rose) */}
                <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Settings2 size={120} className="text-rose-400" />
                    </div>

                    <h4 className="text-rose-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10 mb-6">
                        <ShieldAlert size={14} className="text-rose-400" /> {t('env_cleanup')}
                    </h4>

                    <div className="space-y-3 relative z-10 flex-1">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                            onClick={() => runCommand('kill_mutexes')}
                        >
                            <ShieldAlert size={16} className="mr-3 opacity-60" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span>{t('close_game_handle')}</span>
                                <span className="text-[9px] opacity-40 font-normal">{t('close_game_handle_desc')}</span>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                            onClick={() => runCommand('cleanup_archives')}
                        >
                            <Trash2 size={16} className="mr-3 opacity-60" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span>{t('cleanup_archives')}</span>
                                <span className="text-[9px] opacity-40 font-normal">{t('cleanup_archives_desc')}</span>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                            onClick={() => runCommand('stop_bnet_processes')}
                        >
                            <StopCircle size={16} className="mr-3 opacity-60" />
                            <div className="flex flex-col items-start leading-tight text-left">
                                <span>{t('stop_bnet_processes')}</span>
                                <span className="text-[9px] opacity-40 font-normal">{t('stop_bnet_processes_desc')}</span>
                            </div>
                        </Button>
                    </div>
                </div>

                {/* 3. System Tools (Blue) */}
                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 relative overflow-hidden group flex flex-col">
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <User size={120} className="text-blue-400" />
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
                            className="w-full justify-start h-11 border-blue-500/20 text-blue-100/70 hover:text-blue-400 hover:bg-blue-500/5 text-xs"
                            onClick={() => runCommand('open_user_switch')}
                        >
                            <MonitorSmartphone size={16} className="mr-3 opacity-60" /> {t('open_user_switch')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="h-6 flex-shrink-0" /> {/* Bottom Spacer */}

            {/* Collapsible Atomic Logs - Sticky at Bottom */}
            <div className="sticky bottom-0 z-20 w-full mt-auto pb-2 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-zinc-950/80 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl transition-all duration-300">
                    <div
                        className="bg-zinc-900/80 px-4 py-2 flex justify-between items-center border-b border-white/5 cursor-pointer hover:bg-zinc-900/90 transition-colors"
                        onClick={() => setIsLogsExpanded(!isLogsExpanded)}
                    >
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            {isLogsExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                            {t('atomic_logs')}
                        </span>
                        <div className="flex items-center gap-4">
                            {isCheckingActive && <RefreshCw size={10} className="text-emerald-400 animate-spin" />}
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
                    </div>
                    <div className={cn(
                        "overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 transition-all duration-300 ease-in-out",
                        isLogsExpanded ? "max-h-32 md:max-h-40 p-3 opacity-100" : "max-h-0 p-0 opacity-0 border-none"
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

            {/* Custom Nuke Confirmation Modal */}
            <div className={cn(
                "fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300",
                isNukeModalOpen ? "opacity-100 visible pointer-events-auto backdrop-blur-md bg-black/40" : "opacity-0 invisible pointer-events-none"
            )}>
                <div className={cn(
                    "w-full max-w-sm bg-zinc-950 border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all transform duration-300",
                    isNukeModalOpen ? "scale-100" : "scale-95"
                )}>
                    <div className="bg-rose-500/10 px-6 py-4 border-b border-rose-500/20 flex items-center gap-3">
                        <RefreshCw size={20} className="text-rose-500" />
                        <h3 className="text-rose-500 font-bold tracking-widest uppercase text-sm">{t('nuke_confirm_title')}</h3>
                    </div>

                    <div className="p-6 space-y-4">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            {t('confirm_nuke_description')}
                        </p>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1">
                                {t('confirm_type_yes')}
                            </label>
                            <input
                                autoFocus
                                value={nukeConfirmText}
                                onChange={(e) => setNukeConfirmText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && confirmNuke()}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                                placeholder="yes"
                            />
                        </div>
                    </div>

                    <div className="px-6 py-4 bg-zinc-900/40 flex justify-end gap-3 border-t border-white/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsNukeModalOpen(false)}
                            className="text-zinc-500 hover:text-zinc-300"
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            disabled={nukeConfirmText.toLowerCase() !== 'yes'}
                            onClick={confirmNuke}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                        >
                            {t('confirm_execution')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualTools;
