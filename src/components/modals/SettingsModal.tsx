import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { AppConfig, saveConfig } from "../../lib/api";
import { useLogs } from "../../store/useLogs";
import { useNotification } from "../../store/useNotification";
import { useTranslation } from "react-i18next";
import { Check, Palette, Settings as SettingsIcon, ShieldAlert, Trash2, FileText } from "lucide-react";
import { cn } from "../../lib/utils";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Github, ExternalLink, Info, RefreshCw } from "lucide-react";
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
    const [multiAccountMode, setMultiAccountMode] = useState(config.multi_account_mode ?? false);
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
        setMultiAccountMode(config.multi_account_mode ?? false);
    }, [config]);

    // Apply Live Theme Preview
    useEffect(() => {
        try {
            const hex = themeColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            document.documentElement.style.setProperty('--color-primary', `${r} ${g} ${b}`);
        } catch (e) { }
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
                multi_account_mode: multiAccountMode,
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
            <ModalContent>
                <ModalHeader onClose={onClose}>
                    <SettingsIcon size={18} className="text-primary" />
                    {t('settings')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-8">
                        {/* Appearance */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Palette size={14} className="text-zinc-500" />
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {t('appearance')}
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {THEMES.map((theme) => (
                                    <button
                                        key={theme.color}
                                        onClick={() => setThemeColor(theme.color)}
                                        className={cn(
                                            "w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110",
                                            themeColor === theme.color ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 shadow-xl" : "opacity-80 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: theme.color }}
                                    >
                                        {themeColor === theme.color && <Check size={16} className="text-white drop-shadow-md" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* System Tray Setting */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer"
                            onClick={() => setCloseToTray(!closeToTray)}>
                            <div className="space-y-0.5">
                                <div className="text-sm font-bold text-zinc-200">{t('setting_close_to_tray')}</div>
                            </div>
                            <div className={cn(
                                "w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0",
                                closeToTray ? "bg-primary" : "bg-zinc-800"
                            )}>
                                <div className={cn(
                                    "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm",
                                    closeToTray ? "left-6" : "left-1"
                                )} />
                            </div>
                        </div>

                        {/* Advanced / Logging */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldAlert size={14} className="text-zinc-500" />
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {t('advanced_settings')}
                                </label>
                            </div>

                            <div className="space-y-3">
                                {/* Enable Logging */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer"
                                    onClick={() => setEnableLogging(!enableLogging)}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-primary transition-colors">
                                            <FileText size={16} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-bold text-zinc-200">{t('setting_enable_logging')}</div>
                                            <div className="text-[11px] text-zinc-500 opacity-80">{t('setting_enable_logging_desc')}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0",
                                        enableLogging ? "bg-primary" : "bg-zinc-800"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm",
                                            enableLogging ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>

                                {/* Multi-Account Mode */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer"
                                    onClick={() => setMultiAccountMode(!multiAccountMode)}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-primary transition-colors">
                                            <ShieldAlert size={16} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="text-sm font-bold text-zinc-200">{t('setting_multi_account_mode')}</div>
                                            <div className="text-[11px] text-zinc-500 opacity-80">{t('setting_multi_account_mode_desc')}</div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0",
                                        multiAccountMode ? "bg-primary" : "bg-zinc-800"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm",
                                            multiAccountMode ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        clearLogs();
                                        addNotification('info', t('logs_cleared') || 'Logs cleared');
                                    }}
                                    className="w-full flex items-center justify-between p-4 bg-rose-500/5 rounded-xl border border-rose-500/10 group hover:border-rose-500/20 transition-all"
                                >
                                    <div className="flex items-center gap-3 text-rose-400/80 group-hover:text-rose-400">
                                        <Trash2 size={16} />
                                        <span className="text-sm font-bold">{t('clear_all_logs')}</span>
                                    </div>
                                    <span className="text-[10px] text-rose-500/40 uppercase font-bold tracking-widest">{t('danger_zone')}</span>
                                </button>
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* About Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Info size={14} className="text-zinc-500" />
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {t('about')}
                                </label>
                            </div>

                            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 space-y-4 relative overflow-hidden group/about">
                                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover/about:opacity-10 transition-opacity">
                                    <SettingsIcon size={80} />
                                </div>

                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                                            {APP_METADATA.name}
                                            <span className="text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                                v{version}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-zinc-500">
                                            {t('maintainer')}: <span className="text-zinc-400 font-medium">{APP_METADATA.author}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={onOpenWhatsNew}
                                            className="h-8 text-[11px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                                        >
                                            <FileText size={12} className="mr-1.5 opacity-60" />
                                            {t('detailed_changelog')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={handleCheckUpdate}
                                            isLoading={isCheckingUpdate}
                                            className="h-8 text-xs bg-white/5 hover:bg-white/10 text-zinc-300"
                                        >
                                            <RefreshCw size={12} className={cn("mr-1.5", isCheckingUpdate && "animate-spin")} />
                                            {t('check_update')}
                                        </Button>
                                    </div>
                                </div>

                                {pendingUpdate && (
                                    <div className="p-3 mb-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
                                        <div className="text-xs font-bold text-emerald-400 mb-2">
                                            {t('update_available_title', { version: pendingUpdate.version })}
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <Button size="sm" variant="solid" className="bg-emerald-600 hover:bg-emerald-500 w-full justify-start text-xs" onClick={handleAutoUpdate}>
                                                <RefreshCw size={12} className="mr-2" />
                                                {t('update_auto')}
                                            </Button>
                                            <Button size="sm" variant="outline" className="border-emerald-500/30 hover:bg-emerald-500/10 w-full justify-start text-xs" onClick={handleManualUpdate}>
                                                <ExternalLink size={12} className="mr-2" />
                                                {t('update_manual')}
                                            </Button>
                                        </div>
                                    </div>
                                )}


                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => openUrl(APP_METADATA.github)}
                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white group/link text-left"
                                    >
                                        <Github size={14} />
                                        <span className="text-[11px] font-medium grow">{t('github_repo')}</span>
                                        <ExternalLink size={10} className="opacity-40 group-hover/link:opacity-100 transition-opacity" />
                                    </button>
                                    <button
                                        onClick={() => openUrl(APP_METADATA.blog)}
                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 hover:border-zinc-700 transition-all text-zinc-400 hover:text-white group/link text-left"
                                    >
                                        <FileText size={14} />
                                        <span className="text-[11px] font-medium grow">{t('blog')}</span>
                                        <ExternalLink size={10} className="opacity-40 group-hover/link:opacity-100 transition-opacity" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" className="text-zinc-500 px-6" onClick={handleCancel} disabled={isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button variant="solid" className="px-8 bg-primary font-bold shadow-lg shadow-primary/20" onClick={handleSave} isLoading={isSaving}>
                        {t('save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal >
    );
};
