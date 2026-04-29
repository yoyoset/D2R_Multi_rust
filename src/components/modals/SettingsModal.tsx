import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { AppConfig, saveConfig, invoke } from "../../lib/api";
import { useLogs } from "../../store/useLogs";
import { useNotification } from "../../store/useNotification";
import { useTranslation } from "react-i18next";
import { Check, Palette, Settings as SettingsIcon, Trash2, FileText, Github, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";
import { applyThemeColor } from "../../lib/utils/color";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_METADATA } from "../../metadata";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    initialUpdate?: any; // Optional update object from App launch check
    onOpenWhatsNew?: () => void;
}

const THEMES = [
    { name: 'Linear Blue', color: '#3b82f6' },
    { name: 'Violet', color: '#8b5cf6' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Rose', color: '#f43f5e' },
];

export function SettingsModal({ isOpen, onClose, config, onSave, initialUpdate, onOpenWhatsNew }: SettingsModalProps) {
    const { t } = useTranslation();
    const [themeColor, setThemeColor] = useState(config.theme_color || '#3b82f6');
    const [closeToTray, setCloseToTray] = useState(config.close_to_tray ?? true);
    const [enableLogging, setEnableLogging] = useState(config.enable_logging ?? false);
    const [advancedLaunchMode, setAdvancedLaunchMode] = useState(config.advanced_launch_mode ?? false);
    const [enableWindowRename, setEnableWindowRename] = useState(config.enable_window_rename ?? false);
    const [windowRenameFormat, setWindowRenameFormat] = useState(config.window_rename_format || 'note');
    const [isSaving, setIsSaving] = useState(false);
    const clearLogs = useLogs(state => state.clearLogs);
    const { addNotification } = useNotification();

    const [version, setVersion] = useState("0.1.0");
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

    useEffect(() => {
        getVersion().then(setVersion).catch(console.error);
    }, []);

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
        setThemeColor(config.theme_color || '#3b82f6');
        setCloseToTray(config.close_to_tray ?? true);
        setEnableLogging(config.enable_logging ?? false);
        setAdvancedLaunchMode(config.advanced_launch_mode ?? false);
        setEnableWindowRename(config.enable_window_rename ?? false);
        setWindowRenameFormat(config.window_rename_format || 'note');
    }, [config]);

    // Apply Live Theme Preview
    useEffect(() => {
        applyThemeColor(themeColor);
    }, [themeColor]);

    const handleCancel = () => {
        onClose();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newConfig = {
                ...config,
                theme_color: themeColor,
                close_to_tray: closeToTray,
                enable_logging: enableLogging,
                advanced_launch_mode: advancedLaunchMode,
                enable_window_rename: enableWindowRename,
                window_rename_format: windowRenameFormat,
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
                        <SettingsIcon size={14} className="text-primary" />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">{t('settings')}</span>
                    </div>
                </ModalHeader>

                <ModalBody className="p-0">
                    <div className="divide-y divide-white/5">
                        {/* Appearance Section */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Palette size={10} className="text-zinc-500" />
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('appearance')}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {THEMES.map((theme) => (
                                    <button
                                        key={theme.color}
                                        onClick={() => setThemeColor(theme.color)}
                                        className={cn(
                                            "w-7 h-7 rounded-sm flex items-center justify-center transition-all border border-white/5",
                                            themeColor === theme.color ? "border-white ring-1 ring-white/20" : "opacity-60 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: theme.color }}
                                    >
                                        {themeColor === theme.color && <Check size={12} className="text-white" />}
                                    </button>
                                ))}
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
                                label={t('setting_advanced_launch_mode')}
                                description={t('setting_advanced_launch_mode_desc')}
                                checked={advancedLaunchMode}
                                onChange={setAdvancedLaunchMode}
                            />
                        </div>

                        {/* Window Management Section */}
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <SettingsIcon size={10} className="text-zinc-500" />
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{t('independent_launch')}</span>
                            </div>
                            
                            {/* Enable Window Rename */}
                            <Switch
                                label={t('setting_enable_window_rename')}
                                description={t('setting_enable_window_rename_desc')}
                                checked={enableWindowRename}
                                onChange={setEnableWindowRename}
                            />

                            {enableWindowRename && (
                                <div className="space-y-1.5 pt-1 border-t border-white/5">
                                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{t('setting_window_rename_format')}</span>
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
                                                        ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/5" 
                                                        : "bg-black/20 border-white/5 text-zinc-500 hover:border-white/10"
                                                )}
                                            >
                                                <div className="text-[8px] font-black uppercase tracking-tighter">{opt.label}</div>
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
                                    try { await invoke('open_log_file'); } catch (e) { addNotification('error', `${t('error')}: ${e}`); }
                                }}
                                className="flex-1 h-8 text-[9px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-sm border border-white/5"
                            >
                                <FileText size={10} className="mr-2 opacity-60" />
                                {t('view_logs')}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { clearLogs(); addNotification('info', t('logs_cleared')); }}
                                className="flex-1 h-8 text-[9px] bg-rose-500/5 hover:bg-rose-500/10 text-rose-400/80 hover:text-rose-400 rounded-sm border border-rose-500/10"
                            >
                                <Trash2 size={10} className="mr-2 opacity-60" />
                                {t('clear_all_logs')}
                            </Button>
                        </div>

                        {/* About Section */}
                        <div className="p-4 bg-zinc-950/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{APP_METADATA.name}</div>
                                    <div className="text-[8px] text-zinc-500 uppercase tracking-tighter font-mono">STABLE RELEASE v{version}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={handleCheckUpdate} isLoading={isCheckingUpdate} className="h-6 px-2 text-[8px] bg-white/5 hover:bg-white/10">
                                        <RefreshCw size={8} className={cn("mr-1.5", isCheckingUpdate && "animate-spin")} />
                                        {t('check_update')}
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={onOpenWhatsNew} className="h-6 px-2 text-[8px] bg-white/5 hover:bg-white/10">
                                        <FileText size={8} className="mr-1.5" />
                                        {t('detailed_changelog')}
                                    </Button>
                                </div>
                            </div>
                            
                            {pendingUpdate && (
                                <div className="p-2 rounded-sm bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between gap-3 animate-in fade-in">
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">{t('update_available_title', { version: pendingUpdate.version })}</span>
                                    <div className="flex gap-1.5">
                                        <button onClick={handleAutoUpdate} className="px-2 py-0.5 bg-emerald-600 text-white text-[8px] rounded-sm font-black uppercase">{t('update_auto')}</button>
                                        <button onClick={handleManualUpdate} className="px-2 py-0.5 bg-white/5 text-zinc-400 text-[8px] rounded-sm font-black uppercase">{t('update_manual')}</button>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 border-t border-white/5 pt-3">
                                <button onClick={() => openUrl(APP_METADATA.github)} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                                    <Github size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{t('github_repo')}</span>
                                </button>
                                <button onClick={() => openUrl(APP_METADATA.blog)} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 transition-colors">
                                    <FileText size={10} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">{t('blog')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter className="bg-zinc-900/30">
                    <Button variant="ghost" className="text-zinc-500 h-8 text-[10px] uppercase font-black tracking-widest" onClick={handleCancel} disabled={isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button variant="solid" className="h-8 px-6 bg-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/10 border-none" onClick={handleSave} isLoading={isSaving}>
                        {t('save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal >
    );
};
