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
    Users
} from 'lucide-react';
import * as API from '../../lib/api';
import { cn } from '../../lib/utils';
import { useManualTools } from '../../hooks/useManualTools';
import { useAccountStatus } from '../../hooks/useAccountStatus';

import { AtomicLogConsole } from './toolbox/AtomicLogConsole';

import MirrorModal from '../modals/MirrorModal';
import PermissionsModal from '../modals/PermissionsModal';
import ProcessExplorer from '../modals/ProcessExplorer';
import DiagnosticModal from '../modals/DiagnosticModal';

interface ManualToolsProps {
    accounts?: API.Account[];
    selectedAccountId?: string | null;
}

interface TcardProps {
    icon: React.ReactNode;
    name: string;
    desc?: string;
    onClick: () => void;
    danger?: boolean;
}

const Tcard: React.FC<TcardProps> = ({ icon, name, desc, onClick, danger }) => (
    <button className={cn("tcard", danger && "danger")} onClick={onClick}>
        <div className="tc-ic">{icon}</div>
        <div className="tc-body">
            <div className="tc-name">{name}</div>
            {desc && <div className="tc-desc">{desc}</div>}
        </div>
    </button>
);

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
                <button
                    onClick={runSystemDiag}
                    disabled={isDiagnosing}
                    className="ghost-btn"
                >
                    <MonitorSmartphone size={15} className="text-net" />
                    {t('diag_check_users')}
                </button>
                <button
                    onClick={runGameDiag}
                    disabled={isDiagnosing}
                    className="ghost-btn"
                >
                    <ShieldAlert size={15} className="text-text-dim" />
                    {t('diag_check_permissions')}
                </button>
            </div>

            {/* Scrollable tool groups */}
            <div className="flex-1 min-h-0 overflow-y-auto pt-3 pb-4">
                {/* ---- Independent launch ---- */}
                <div className="tool-group">
                    <h2>
                        <Play size={13} className="text-player" />
                        {t('independent_launch')}
                    </h2>

                    {!selectedAccountId ? (
                        <div className="empty-note !py-6">{t('no_account_selected')}</div>
                    ) : (
                        <button
                            onClick={forceLaunch}
                            className={cn(
                                "w-full mb-2 px-4 py-3 rounded border flex items-center gap-3 transition-all text-left",
                                isClash
                                    ? "bg-warn/10 border-warn/30 text-warn hover:bg-warn/15"
                                    : "bg-player/10 border-player/30 text-player hover:bg-player/15"
                            )}
                        >
                            <Play size={18} fill="currentColor" className="shrink-0" />
                            <div className="min-w-0">
                                <div className="text-[13px] font-black uppercase tracking-wide">
                                    {isClash ? t('force_launch') : t('separate_launch')}
                                </div>
                                <div className="text-[11px] font-mono opacity-60 truncate">
                                    {isClash ? t('game_running_prevent_launch') : selectedAccount?.win_user}
                                </div>
                            </div>
                        </button>
                    )}

                    <div className="tool-grid">
                        <Tcard
                            icon={<RefreshCw size={16} />}
                            name={t('mirror_manager')}
                            desc={t('mirror_manager_desc')}
                            onClick={() => setIsMirrorOpen(true)}
                        />
                        <Tcard
                            icon={<Settings2 size={16} />}
                            name={t('nuke_concise')}
                            desc={t('nuke_concise_desc')}
                            onClick={resetSettings}
                            danger
                        />
                    </div>
                </div>

                {/* ---- Environment cleanup ---- */}
                <div className="tool-group">
                    <h2>
                        <Shield size={13} className="text-danger" />
                        {t('env_cleanup')}
                    </h2>
                    <div className="tool-grid">
                        <Tcard
                            icon={<Shield size={16} />}
                            name={t('cleanup_handles')}
                            desc={t('cleanup_handles_desc')}
                            onClick={cleanupHandles}
                        />
                        <Tcard
                            icon={<Search size={16} />}
                            name={t('manual_repair_btn')}
                            desc={t('manual_repair_desc')}
                            onClick={() => setIsProcessExplorerOpen(true)}
                        />
                        <Tcard
                            icon={<Trash2 size={16} />}
                            name={t('cleanup_archives')}
                            desc={t('cleanup_archives_desc')}
                            onClick={cleanupArchives}
                        />
                        <Tcard
                            icon={<StopCircle size={16} />}
                            name={t('stop_bnet_processes')}
                            desc={t('stop_bnet_processes_desc')}
                            onClick={forceKill}
                            danger
                        />
                    </div>
                </div>

                {/* ---- System utilities ---- */}
                <div className="tool-group">
                    <h2>
                        <MonitorSmartphone size={13} className="text-net" />
                        {t('system_utils')}
                    </h2>
                    <div className="tool-grid">
                        <Tcard
                            icon={<Users size={16} />}
                            name={t('open_local_users')}
                            desc={t('open_local_users_desc')}
                            onClick={() => API.openLusrmgr()}
                        />
                        <Tcard
                            icon={<ShieldAlert size={16} />}
                            name={t('open_adv_users')}
                            desc={t('open_adv_users_desc')}
                            onClick={() => API.openNetplwiz()}
                        />
                        <Tcard
                            icon={<RefreshCw size={16} />}
                            name={t('open_user_switch')}
                            desc={t('open_user_switch_desc')}
                            onClick={() => API.openUserSwitch()}
                        />
                        <Tcard
                            icon={<Shield size={16} />}
                            name={t('fix_permissions')}
                            desc={t('fix_permissions_desc')}
                            onClick={() => setIsPermissionsOpen(true)}
                        />
                    </div>
                </div>
            </div>

            {/* Logs */}
            <AtomicLogConsole
                logs={logs}
                onClear={() => addLog(t('log_audit_cleared'), 'info')}
                isExpanded={isLogsExpanded}
                onToggle={() => setIsLogsExpanded(!isLogsExpanded)}
                className={cn("shrink-0", isLogsExpanded ? "max-h-[30vh]" : "")}
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
