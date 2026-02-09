import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, invoke } from '../../lib/api';
import { Button } from '../ui/Button';
import { ShieldAlert, Trash, Play, Skull, FolderPlus, MonitorSmartphone, Settings2, User } from 'lucide-react';
import MirrorModal from '../modals/MirrorModal';

interface ManualToolsProps {
    accounts: Account[];
    selectedAccountId: string | null;
}

const ManualTools: React.FC<ManualToolsProps> = ({ accounts, selectedAccountId }) => {
    const { t } = useTranslation();
    const [log, setLog] = useState<string[]>([]);
    const [isMirrorOpen, setIsMirrorOpen] = useState(false);

    const addLog = (msg: string) => setLog(prev => [new Date().toLocaleTimeString() + ' ' + msg, ...prev].slice(0, 50));

    const runCommand = async (cmd: string, args: Record<string, any> = {}) => {
        try {
            addLog(`> ${cmd}${Object.keys(args).length ? ' (' + JSON.stringify(args) + ')' : ''}...`);
            const res = await invoke(cmd, args) as string;
            addLog(`✔ ${res}`);
            return res;
        } catch (e) {
            addLog(`✖ Error: ${e}`);
            throw e;
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    return (
        <div className="flex flex-col h-full p-6 gap-4 w-full overflow-hidden">
            {/* Top Section: Controls (Scrollable) */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-6 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">


                {/* Tools Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Card: Launch & Mirror */}
                    <div className="space-y-6 bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10 relative overflow-hidden group">
                        <h4 className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10">
                            <Play size={14} className="text-emerald-400" /> {t('launch_tools') || 'Launch Tools'}
                        </h4>

                        <div className="space-y-3 relative z-10">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-11 border-emerald-500/20 text-emerald-100/70 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all text-xs justify-start"
                                onClick={() => setIsMirrorOpen(true)}
                            >
                                <FolderPlus size={16} className="mr-3 opacity-60" /> {t('mirror_title')}
                            </Button>

                            {selectedAccount ? (
                                <Button
                                    variant="outline"
                                    className="w-full h-14 border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 font-bold tracking-widest shadow-xl transition-all group"
                                    onClick={() => runCommand('manual_launch_process', { username: selectedAccount.win_user, password: selectedAccount.win_pass })}
                                >
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] uppercase tracking-widest opacity-60 mb-1 leading-none">{t('ready')}</span>
                                        <div className="flex items-center gap-2">
                                            <Play size={16} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                                            <span>{t('launch_as_identity', { user: selectedAccount.win_user })}</span>
                                        </div>
                                    </div>
                                </Button>
                            ) : (
                                <div className="text-[10px] text-emerald-500/40 flex items-center justify-center border border-dashed border-emerald-500/10 rounded-xl py-6 bg-black/10 italic">
                                    {t('no_accounts_hint')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Card: Cleanup (Rose) */}
                    <div className="space-y-6 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <Skull size={120} className="text-rose-400" />
                        </div>

                        <h4 className="text-rose-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10">
                            <Skull size={14} className="text-rose-400" /> {t('debug_cleanup_title')}
                        </h4>

                        <div className="space-y-3 relative z-10">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                                onClick={() => runCommand('kill_processes')}
                            >
                                <Skull size={16} className="mr-3 opacity-60" /> {t('kill_processes_clashpad')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-400 hover:bg-rose-500/5 text-xs"
                                onClick={() => runCommand('kill_mutexes')}
                            >
                                <ShieldAlert size={16} className="mr-3 opacity-60" /> {t('kill_mutex_force')}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start h-11 border-rose-500/20 text-rose-100/70 hover:text-rose-600 hover:bg-rose-500/5 text-xs"
                                onClick={() => runCommand('manual_delete_config')}
                            >
                                <Trash size={16} className="mr-3 opacity-60" /> {t('delete_global_db_nuke')}
                            </Button>
                        </div>
                    </div>

                    {/* New Card: System Utilities (Blue) */}
                    <div className="space-y-6 bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 relative overflow-hidden group">
                        <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <Settings2 size={120} className="text-blue-400" />
                        </div>

                        <h4 className="text-blue-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 relative z-10">
                            <MonitorSmartphone size={14} className="text-blue-400" /> {t('system_utils') || 'System Utilities'}
                        </h4>

                        <div className="space-y-3 relative z-10">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start h-11 border-blue-500/20 text-blue-100/70 hover:text-blue-400 hover:bg-blue-500/5 text-xs"
                                onClick={() => runCommand('open_lusrmgr')}
                            >
                                <User size={16} className="mr-3 opacity-60" /> {t('open_local_users') || 'Open Local Users & Groups'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start h-11 border-blue-500/20 text-blue-100/70 hover:text-blue-400 hover:bg-blue-500/5 text-xs"
                                onClick={() => runCommand('open_netplwiz')}
                            >
                                <ShieldAlert size={16} className="mr-3 opacity-60" /> {t('open_adv_users') || 'Open Advanced User Panel'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Console Output (Fixed Height at Bottom) */}
            <div className="flex-shrink-0 flex flex-col h-[160px] border border-white/10 rounded-2xl overflow-hidden bg-black/20">
                <div className="bg-zinc-800/80 px-4 py-2 text-[10px] text-zinc-400 uppercase font-bold border-b border-white/5 flex justify-between items-center">
                    <span className="tracking-widest opacity-60">{t('atomic_logs')}</span>
                    <button onClick={() => setLog([])} className="hover:text-white transition-colors text-zinc-600">{t('clear_logs')}</button>
                </div>
                <div className="flex-1 bg-black/50 p-4 font-mono text-[11px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    {log.map((l, i) => (
                        <div key={i} className={l.includes('✖') ? 'text-red-400' : l.includes('✔') ? 'text-green-400' : l.includes('>') ? 'text-zinc-300' : 'text-zinc-500'}>
                            {l}
                        </div>
                    ))}
                    {log.length === 0 && <span className="text-zinc-800 font-bold">{t('waiting_ops')}</span>}
                </div>
            </div>

            {/* Modals */}
            <MirrorModal
                isOpen={isMirrorOpen}
                onClose={() => setIsMirrorOpen(false)}
                onLog={addLog}
            />
        </div>
    );
};

export default ManualTools;
