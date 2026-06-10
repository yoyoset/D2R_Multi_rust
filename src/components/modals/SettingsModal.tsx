import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { AppConfig, saveConfig, getDataLocationInfo, relocateData, openPath, openFolderDialog, setDataRoot, DataLocationInfo } from "../../lib/api";
import { useLogs } from "../../store/useLogs";
import { useNotification } from "../../store/useNotification";
import { useTranslation } from "react-i18next";
import { Palette, Settings as SettingsIcon, Settings2, Trash2, FileText, Github, RefreshCw, FolderOpen, HardDrive, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { THEMES as SKINS, ThemeId, getStoredTheme, setTheme } from "../../lib/theme";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_METADATA } from "../../metadata";

declare const __APP_VERSION__: string;

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    initialUpdate?: any; // Optional update object from App launch check
    onOpenWhatsNew?: () => void;
}

export function SettingsModal({ isOpen, onClose, config, onSave, initialUpdate, onOpenWhatsNew }: SettingsModalProps) {
    const { t } = useTranslation();
    const [skin, setSkin] = useState<ThemeId>(getStoredTheme());
    const [closeToTray, setCloseToTray] = useState(config.close_to_tray ?? true);
    const [enableLogging, setEnableLogging] = useState(config.enable_logging ?? false);
    const [enableWindowRename, setEnableWindowRename] = useState(config.enable_window_rename ?? false);
    const [windowRenameFormat, setWindowRenameFormat] = useState(config.window_rename_format || 'note');
    const [showSnapshotReminder, setShowSnapshotReminder] = useState(!(config.snapshot_reminder_dismissed ?? false));
    const [isSaving, setIsSaving] = useState(false);
    const clearLogs = useLogs(state => state.clearLogs);
    const { addNotification } = useNotification();

    const [version, setVersion] = useState(__APP_VERSION__);
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [locationInfo, setLocationInfo] = useState<DataLocationInfo | null>(null);
    const [isRelocating, setIsRelocating] = useState(false);
    const [isRestartRequired, setIsRestartRequired] = useState(false);
    const [restartReason, setRestartReason] = useState<'relocate' | 'load'>('relocate');

    useEffect(() => {
        getVersion().then(setVersion).catch(console.error);
        if (isOpen) {
            refreshLocation();
        }
    }, [isOpen]);

    const refreshLocation = async () => {
        try {
            const info = await getDataLocationInfo();
            setLocationInfo(info);
        } catch (e) {
            console.error("Failed to get location info:", e);
        }
    };

    const handleRelocate = async () => {
        const newPath = await openFolderDialog();
        if (!newPath) return;

        setIsRelocating(true);
        try {
            await relocateData(newPath);
            setRestartReason('relocate');
            setIsRestartRequired(true);
            await refreshLocation();
        } catch (e) {
            addNotification('error', `Relocation failed: ${e}`);
        } finally {
            setIsRelocating(false);
        }
    };

    const handleLoadConfig = async () => {
        const newPath = await openFolderDialog();
        if (!newPath) return;

        try {
            // Check if config.json exists in the selected folder
            // (We could do this in backend but for now just set it and restart)
            await setDataRoot(newPath);
            setRestartReason('load');
            setIsRestartRequired(true);
        } catch (e) {
            addNotification('error', `Load failed: ${e}`);
        }
    };

    const [pendingUpdate, setPendingUpdate] = useState<any>(null); // Store update object

    // If initialUpdate is provided when modal opens, set it
    useEffect(() => {
        if (isOpen && initialUpdate) {
            setPendingUpdate(initialUpdate);
        }
    }, [isOpen, initialUpdate]);

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        setPendingUpdate(null);
        try {
            const update = await check();
            if (update) {
                setPendingUpdate(update);
            } else {
                addNotification('info', t('already_latest'));
            }
        } catch (e) {
            console.error(e);
            addNotification('error', `${t('update_check_failed')}: ${e}`);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    const handleAutoUpdate = async () => {
        if (!pendingUpdate) return;
        try {
            addNotification('info', t('downloading'));
            await pendingUpdate.downloadAndInstall();
            addNotification('success', t('update_installed'));
            setPendingUpdate(null);
        } catch (e) {
            addNotification('error', `${t('update_failed_auto')}: ${e}`);
        }
    };

    const handleManualUpdate = () => {
        // Redirect to the new official download page
        openUrl("https://squareuncle.com/download");
        setPendingUpdate(null);
    };

    useEffect(() => {
        setCloseToTray(config.close_to_tray ?? true);
        setEnableLogging(config.enable_logging ?? false);
        setEnableWindowRename(config.enable_window_rename ?? false);
        setWindowRenameFormat(config.window_rename_format || 'note');
        setShowSnapshotReminder(!(config.snapshot_reminder_dismissed ?? false));
    }, [config]);

    const handleCancel = () => {
        onClose();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newConfig = {
                ...config,
                close_to_tray: closeToTray,
                enable_logging: enableLogging,
                enable_window_rename: enableWindowRename,
                window_rename_format: windowRenameFormat,
                snapshot_reminder_dismissed: !showSnapshotReminder,
            };
            await saveConfig(newConfig);
            onSave(newConfig);
            onClose();
        } catch (e) {
            console.error(e);
            alert(`Failed to save: ${e}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-[500px]">
                <ModalHeader onClose={onClose}>
                    <div className="flex items-center gap-2">
                        <SettingsIcon size={16} className="text-gold" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('settings')}</span>
                    </div>
                </ModalHeader>

                <ModalBody className="p-0">
                    <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Appearance Section */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Palette size={16} className="text-text-dim" />
                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{t('appearance')}</span>
                            </div>

                            {/* Theme (skin) selector */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">{t('theme_skin')}</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {SKINS.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={() => { setSkin(s.id); setTheme(s.id); }}
                                            className={cn(
                                                "flex flex-col items-stretch gap-1.5 p-2 rounded transition-all border",
                                                skin === s.id
                                                    ? "border-gold ring-1 ring-gold/30 bg-gold/5"
                                                    : "border-line hover:border-line-strong opacity-80 hover:opacity-100"
                                            )}
                                            title={t(s.nameKey)}
                                        >
                                            <div className="flex h-7 rounded-[3px] overflow-hidden border border-line">
                                                <span className="flex-1" style={{ background: s.swatch[0] }} />
                                                <span className="flex-1" style={{ background: s.swatch[1] }} />
                                                <span className="flex-1" style={{ background: s.swatch[2] }} />
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wide text-center truncate",
                                                skin === s.id ? "text-gold" : "text-text-dim"
                                            )}>
                                                {t(s.nameKey)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* General Settings */}
                        <div className="p-4 space-y-1.5 pt-3">
                            <Switch
                                label={t('setting_close_to_tray')}
                                checked={closeToTray}
                                onChange={setCloseToTray}
                            />

                            <Switch
                                label={t('setting_enable_logging')}
                                description={t('setting_enable_logging_desc')}
                                checked={enableLogging}
                                onChange={setEnableLogging}
                            />

                            <Switch
                                label={t('setting_show_snapshot_reminder')}
                                description={t('setting_show_snapshot_reminder_desc')}
                                checked={showSnapshotReminder}
                                onChange={setShowSnapshotReminder}
                            />
                        </div>

                        {/* Data Management Section */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <HardDrive size={16} className="text-text-dim" />
                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{t('data_management') || "數據管理"}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="p-3 rounded-sm bg-black/20 border border-line space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen size={16} className="text-gold/60" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{t('setting_current_path')}</span>
                                                <span className="text-[10px] font-mono text-text-dim truncate max-w-[240px]">{locationInfo?.path || "Loading..."}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] bg-white/5" onClick={() => locationInfo && openPath(locationInfo.path)}>
                                                {t('setting_open_data_dir')}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] bg-white/5" onClick={handleLoadConfig}>
                                                {t('load_config')}
                                            </Button>
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] bg-gold/10 text-gold border border-gold/20" onClick={handleRelocate} isLoading={isRelocating}>
                                                {t('setting_change_location')}
                                            </Button>
                                        </div>
                                    </div>

                                    {locationInfo?.exe_on_c_drive && (
                                        <div className="flex items-start gap-2 p-2 rounded-sm bg-warn/5 border border-warn/10">
                                            <AlertTriangle size={16} className="text-warn mt-0.5 flex-shrink-0" />
                                            <span className="text-[10px] text-warn/80 leading-relaxed uppercase tracking-wider">
                                                {t('setting_exe_on_c_drive_warning')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Window Management Section */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings2 size={16} className="text-text-dim" />
                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{t('window_tag_settings')}</span>
                            </div>
                            
                            {/* Enable Window Rename */}
                            <Switch
                                label={t('setting_enable_window_rename')}
                                description={t('setting_enable_window_rename_desc')}
                                checked={enableWindowRename}
                                onChange={setEnableWindowRename}
                            />

                            {enableWindowRename && (
                                <div className="space-y-1.5 pt-1 border-t border-line">
                                    <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{t('setting_window_rename_format')}</span>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'note', label: t('rename_format_note') },
                                            { id: 'bnet', label: t('rename_format_bnet') },
                                            { id: 'username', label: t('rename_format_username') },
                                            { id: 'full', label: t('rename_format_full') },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setWindowRenameFormat(opt.id as any)}
                                                className={cn(
                                                    "px-2 py-1.5 rounded-sm border text-left transition-all",
                                                    windowRenameFormat === opt.id 
                                                        ? "bg-gold/10 border-gold/40 text-gold shadow-lg shadow-gold/5" 
                                                        : "bg-black/20 border-line text-text-dim hover:border-line-2"
                                                )}
                                            >
                                                <div className="text-[10px] font-black uppercase tracking-tighter">{opt.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logs & Maintenance */}
                        <div className="p-4 flex gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                    try { await openPath(locationInfo?.path || ""); } catch (e) { addNotification('error', `${t('error')}: ${e}`); }
                                }}
                                className="flex-1 h-8 text-[10px] bg-white/5 hover:bg-white/10 text-text-dim hover:text-text rounded-sm border border-line"
                            >
                                <FileText size={16} className="mr-2 opacity-60" />
                                {t('view_logs') || "查看日誌"}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { clearLogs(); addNotification('info', t('logs_cleared')); }}
                                className="flex-1 h-8 text-[10px] bg-danger-500/5 hover:bg-danger-500/10 text-danger-400/80 hover:text-danger-400 rounded-sm border border-danger-500/10"
                            >
                                <Trash2 size={16} className="mr-2 opacity-60" />
                                {t('clear_all_logs')}
                            </Button>
                        </div>

                        {/* About Section */}
                        <div className="p-4 bg-bg/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">{APP_METADATA.name}</div>
                                    <div className="text-[10px] text-text-dim uppercase tracking-tighter font-mono">STABLE RELEASE v{version}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={handleCheckUpdate} isLoading={isCheckingUpdate} className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10">
                                        <RefreshCw size={16} className={cn("mr-1.5", isCheckingUpdate && "animate-spin")} />
                                        {t('check_update')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={onOpenWhatsNew} className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10">
                                        <FileText size={16} className="mr-1.5" />
                                        {t('detailed_changelog')}
                                    </Button>
                                </div>
                            </div>
                            
                            {pendingUpdate && (
                                <div className="p-2 rounded-sm bg-player-500/5 border border-player/10 flex items-center justify-between gap-3 animate-in fade-in">
                                    <span className="text-[10px] font-bold text-player-400 uppercase tracking-widest">{t('update_available_title', { version: pendingUpdate.version })}</span>
                                    <div className="flex gap-1.5">
                                        <button onClick={handleAutoUpdate} className="px-2 py-0.5 bg-player-600 text-text text-[10px] rounded-sm font-black uppercase">{t('update_auto')}</button>
                                        <button onClick={handleManualUpdate} className="px-2 py-0.5 bg-white/5 text-text-dim text-[10px] rounded-sm font-black uppercase">{t('update_manual')}</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 border-t border-line pt-3">
                                <button onClick={() => openUrl(APP_METADATA.github)} className="flex items-center gap-1.5 text-text-dim hover:text-text-dim transition-colors">
                                    <Github size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('github_repo')}</span>
                                </button>
                                <button onClick={() => openUrl(APP_METADATA.blog)} className="flex items-center gap-1.5 text-text-dim hover:text-text-dim transition-colors">
                                    <FileText size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{t('blog')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter className="bg-surface/30">
                    <Button variant="ghost" className="text-text-dim h-8 text-[10px] uppercase font-black tracking-widest" onClick={handleCancel} disabled={isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button variant="solid" className="h-8 px-6 bg-gold font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gold/10 border-none" onClick={handleSave} isLoading={isSaving}>
                        {t('save')}
                    </Button>
                </ModalFooter>
            </ModalContent>

            {/* Restart Required Modal */}
            <Modal isOpen={isRestartRequired} onClose={() => setIsRestartRequired(false)}>
                <ModalContent className="max-w-[300px]">
                    <ModalHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={16} className={cn(restartReason === 'relocate' ? "text-warn" : "text-player-500")} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                {restartReason === 'relocate' ? t('setting_relocate_restart') : t('setting_load_restart')}
                            </span>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-[10px] text-text-dim leading-relaxed uppercase tracking-wider">
                            {restartReason === 'relocate' ? t('setting_relocate_success') : t('setting_load_success')}
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="solid" className="w-full h-8 bg-player-600 font-black text-[10px] uppercase tracking-widest" onClick={() => window.location.reload()}>
                            {t('understand')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Modal >
    );
};
