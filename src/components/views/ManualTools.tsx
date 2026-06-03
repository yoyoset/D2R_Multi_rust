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
import { cn } from '../../lib/utils';
import { useManualTools } from '../../hooks/useManualTools';
import { useAccountStatus } from '../../hooks/useAccountStatus';

import { ToolSection } from './toolbox/ToolSection';
import { ToolEntry } from './toolbox/ToolEntry';
import { AtomicLogConsole } from './toolbox/AtomicLogConsole';

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

    useEffect(() => {
        if (typeof addLog === 'function') {
            addLog(t('log_audit_online'), 'info');
        }
    }, [addLog]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden select-none">
            {/* Diagnostic toolbar */}
            <div className="flex items-center gap-2 pb-3 mb-1 border-b border-line shrink-0">
                <button onClick={runSystemDiag} disabled={isDiagnosing} className="ghost-btn">
                    <MonitorSmartphone size={15} className="text-net" />
                    {t('diag_check_users')}
                </button>
                <button onClick={runGameDiag} disabled={isDiagnosing} className="ghost-btn">
                    <ShieldAlert size={15} className="text-text-dim" />
                    {t('diag_check_permissions')}
                </button>
            </div>

            {/* Compact 3-column tool grid */}
            <div className="flex-none min-h-0 overflow-y-auto border border-line rounded mt-3 bg-bg/20">
                <div className="grid grid-cols-3 divide-x divide-line">
                    {/* Independent launch */}
                    <ToolSection icon={<Play size={16} />} title={t('independent_launch')} color="player">
                        <div className="p-3 space-y-3">
                            {!selectedAccountId ? (
                                <div className="p-3 border border-dashed border-line rounded-sm bg-surface/20 text-center space-y-1.5 opacity-60">
                                    <AlertTriangle size={16} className="mx-auto text-text-faint" />
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-dim">{t('no_account_selected')}</p>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={forceLaunch}
                                        className={cn(
                                            "w-full h-10 rounded-sm flex flex-col items-center justify-center gap-0 border transition-all",
                                            isClash
                                                ? "bg-warn/10 border-warn/30 text-warn hover:bg-warn/20"
                                                : "bg-player/10 border-player/30 text-player hover:bg-player/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Play size={14} fill="currentColor" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {isClash ? t('force_launch') : t('separate_launch')}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-mono opacity-50 truncate max-w-full px-2">
                                            {selectedAccount?.win_user}
                                        </span>
                                    </button>

                                    {isClash && (
                                        <div className="flex items-start gap-2 p-2 bg-warn/5 border border-warn/10 rounded-sm">
                                            <AlertTriangle size={14} className="text-warn shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-warn/80 leading-relaxed italic">{t('game_running_prevent_launch')}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-0.5">
                                <ToolEntry icon={<RefreshCw size={16} />} title={t('mirror_manager')} onClick={() => setIsMirrorOpen(true)} />
                                <ToolEntry icon={<Settings2 size={16} />} title={t('nuke_concise')} onClick={resetSettings} color="danger" />
                            </div>
                        </div>
                    </ToolSection>

                    {/* Environment cleanup */}
                    <ToolSection icon={<Shield size={16} />} title={t('env_cleanup')} color="danger">
                        <div className="p-2 space-y-0.5">
                            <ToolEntry icon={<Shield size={16} />} title={t('cleanup_handles')} onClick={cleanupHandles} />
                            <ToolEntry icon={<Search size={16} />} title={t('manual_repair_btn')} onClick={() => setIsProcessExplorerOpen(true)} />
                            <ToolEntry icon={<Trash2 size={16} />} title={t('cleanup_archives')} onClick={cleanupArchives} />
                            <ToolEntry icon={<StopCircle size={16} />} title={t('stop_bnet_processes')} onClick={forceKill} color="danger" />
                        </div>
                    </ToolSection>

                    {/* System utilities */}
                    <ToolSection icon={<MonitorSmartphone size={16} />} title={t('system_utils')} color="net">
                        <div className="p-2 space-y-0.5">
                            <ToolEntry icon={<Users size={16} />} title={t('open_local_users')} onClick={() => API.openLusrmgr()} />
                            <ToolEntry icon={<ShieldAlert size={16} />} title={t('open_adv_users')} onClick={() => API.openNetplwiz()} />
                            <ToolEntry icon={<RefreshCw size={16} />} title={t('open_user_switch')} onClick={() => API.openUserSwitch()} />
                            <ToolEntry icon={<Shield size={16} />} title={t('fix_permissions')} onClick={() => setIsPermissionsOpen(true)} color="player" />
                        </div>
                    </ToolSection>
                </div>
            </div>

            {/* Logs */}
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
