import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Play, 
    MonitorSmartphone, 
    Settings2, 
    RefreshCw, 
    Trash2, 
    StopCircle, 
    Search, 
    Shield, 
    ShieldAlert, 
    Users, 
    AlertTriangle
} from 'lucide-react';
import * as API from '../../lib/api';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useManualTools } from '../../hooks/useManualTools';
import { useAccountStatus } from '../../hooks/useAccountStatus';

// Sub-components
import { ToolSection } from './toolbox/ToolSection';
import { ToolEntry } from './toolbox/ToolEntry';
import { AtomicLogConsole } from './toolbox/AtomicLogConsole';

// Modals - Using default imports
import MirrorModal from '../modals/MirrorModal';
import PermissionsModal from '../modals/PermissionsModal';
import ProcessExplorer from '../modals/ProcessExplorer';
import DiagnosticModal from '../modals/DiagnosticModal';

interface ManualToolsProps {
    accounts?: API.Account[];
    selectedAccountId?: string | null;
}

const ManualTools: React.FC<ManualToolsProps> = ({ accounts = [], selectedAccountId = null }) => {
    const { t } = useTranslation();
    
    // Safety check for accounts prop
    const safeAccounts = useMemo(() => Array.isArray(accounts) ? accounts : [], [accounts]);

    const {
        logs = [],
        addLog = () => {},
        isDiagnosing = false,
        diagResults = [],
        diagTitle = '',
        showDiagModal = false,
        setShowDiagModal = () => {},
        runSystemDiag = () => {},
        runGameDiag = () => {},
        cleanupHandles = () => {},
        forceKill = () => {},
        resetSettings = () => {},
        cleanupArchives = () => {},
        forceLaunch = () => {}
    } = useManualTools(safeAccounts, selectedAccountId);

    const { accountStatuses = {} } = useAccountStatus(safeAccounts);
    const [isMirrorOpen, setIsMirrorOpen] = useState(false);
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
    const [isProcessExplorerOpen, setIsProcessExplorerOpen] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(true);

    const selectedAccount = useMemo(() => 
        safeAccounts.find(a => a.id === selectedAccountId),
        [safeAccounts, selectedAccountId]
    );

    const selectedStatus = useMemo(() => 
        (selectedAccount && accountStatuses) ? accountStatuses[selectedAccount.win_user] : undefined,
        [selectedAccount, accountStatuses]
    );

    const isClash = !!(selectedStatus && (selectedStatus.bnet_active || selectedStatus.d2r_active));

    // Audit trace on mount
    useEffect(() => {
        if (typeof addLog === 'function') {
            addLog(t('log_audit_online'), 'info');
        }
    }, [addLog]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 overflow-hidden select-none border-l border-white/5">
            <div className="flex items-center gap-1 p-1 bg-zinc-900/40 border-b border-white/5 shrink-0 h-9 px-4">
                <div className="flex items-center gap-1">
                    <Button 
                        variant="ghost" size="sm" 
                        className="h-6 px-2 text-[10px] font-black tracking-widest uppercase hover:bg-white/5 gap-2 rounded-sm"
                        onClick={runSystemDiag} disabled={isDiagnosing}
                    >
                        <MonitorSmartphone size={16} className="text-blue-500" />
                        {t('diag_check_users')}
                    </Button>
                    <Button 
                        variant="ghost" size="sm" 
                        className="h-6 px-2 text-[10px] font-black tracking-widest uppercase hover:bg-white/5 gap-2 rounded-sm"
                        onClick={runGameDiag} disabled={isDiagnosing}
                    >
                        <ShieldAlert size={16} className="text-zinc-500" />
                        {t('diag_check_permissions')}
                    </Button>
                </div>
            </div>

            {/* Grid Layout - Changed flex-1 to flex-none and added max-height to ensure it doesn't push logs too far */}
            <div className="flex-none min-h-0 overflow-y-auto border-b border-white/5 scrollbar-thin scrollbar-thumb-zinc-700/50">
                <div className="grid grid-cols-3 divide-x divide-white/5">
                    {/* Launch Section */}
                    <ToolSection icon={<Play size={16} />} title={t('independent_launch')} color="emerald">
                        <div className="p-4 space-y-4">
                            {!selectedAccountId ? (
                                <div className="p-4 border border-dashed border-white/5 rounded-sm bg-zinc-900/20 text-center space-y-2 opacity-60">
                                    <AlertTriangle size={16} className="mx-auto text-zinc-700" />
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{t('no_account_selected')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Button 
                                        onClick={forceLaunch}
                                        className={cn(
                                            "w-full h-11 rounded-sm flex flex-col items-center justify-center gap-0 border transition-all shadow-lg shadow-black/40",
                                            isClash 
                                                ? "bg-amber-600/10 border-amber-600/30 text-amber-500 hover:bg-amber-600/20" 
                                                : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Play size={16} fill="currentColor" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {isClash ? t('force_launch') : t('separate_launch')}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-mono opacity-50 truncate max-w-full px-2">
                                            {selectedAccount?.win_user}
                                        </span>
                                    </Button>
                                    
                                    {isClash && (
                                        <div className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/10 rounded-sm">
                                            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-500/80 leading-relaxed italic">{t('game_running_prevent_launch')}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-0.5">
                                <ToolEntry icon={<RefreshCw size={16} />} title={t('mirror_manager')} onClick={() => setIsMirrorOpen(true)} />
                                <ToolEntry icon={<Settings2 size={16} />} title={t('nuke_concise')} onClick={resetSettings} color="rose" />
                            </div>
                        </div>
                    </ToolSection>

                    {/* Cleanup Section */}
                    <ToolSection icon={<Shield size={16} />} title={t('env_cleanup')} color="rose">
                        <div className="p-2 space-y-0.5">
                            <ToolEntry icon={<Shield size={16} />} title={t('cleanup_handles')} onClick={cleanupHandles} />
                            <ToolEntry icon={<Search size={16} />} title={t('manual_repair_btn')} onClick={() => setIsProcessExplorerOpen(true)} />
                            <ToolEntry icon={<Trash2 size={16} />} title={t('cleanup_archives')} onClick={cleanupArchives} />
                            <ToolEntry icon={<StopCircle size={16} />} title={t('stop_bnet_processes')} onClick={forceKill} color="rose" />
                        </div>
                    </ToolSection>

                    {/* Utils Section */}
                    <ToolSection icon={<MonitorSmartphone size={16} />} title={t('system_utils')} color="blue">
                        <div className="p-2 space-y-0.5">
                            <ToolEntry icon={<Users size={16} />} title={t('open_local_users')} onClick={() => API.openLusrmgr()} />
                            <ToolEntry icon={<ShieldAlert size={16} />} title={t('open_adv_users')} onClick={() => API.openNetplwiz()} />
                            <ToolEntry icon={<RefreshCw size={16} />} title={t('open_user_switch')} onClick={() => API.openUserSwitch()} />
                            <ToolEntry icon={<Shield size={16} />} title={t('fix_permissions')} onClick={() => setIsPermissionsOpen(true)} color="emerald" />
                        </div>
                    </ToolSection>
                </div>
            </div>

            {/* Logs Area - Added flex-1 to grow when expanded */}
            <AtomicLogConsole 
                logs={logs} 
                onClear={() => addLog(t('log_audit_cleared'), 'info')} 
                isExpanded={isLogsExpanded} 
                onToggle={() => setIsLogsExpanded(!isLogsExpanded)} 
                className={cn(isLogsExpanded ? "flex-1" : "shrink-0")}
            />

            {/* Modals */}
            <MirrorModal isOpen={isMirrorOpen} onClose={() => setIsMirrorOpen(false)} onLog={msg => addLog(msg, 'info')} />
            <PermissionsModal isOpen={isPermissionsOpen} onClose={() => setIsPermissionsOpen(false)} onLog={msg => addLog(msg, 'info')} />
            <ProcessExplorer isOpen={isProcessExplorerOpen} onClose={() => setIsProcessExplorerOpen(false)} />
            <DiagnosticModal isOpen={showDiagModal} onClose={() => setShowDiagModal(false)} title={diagTitle} results={diagResults} />
        </div>
    );
};

export default ManualTools;
