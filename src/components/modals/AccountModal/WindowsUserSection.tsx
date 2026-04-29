import { Sparkles, ChevronLeft, UserRound, EyeOff, Eye, Loader2, AlertCircle, Check, CloudOff } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/Button";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { invoke } from "../../../lib/api";

interface WindowsUserSectionProps {
    editingAccount: boolean;
    isManualInput: boolean;
    setIsManualInput: (v: boolean) => void;
    isCreatingNew: boolean;
    setIsCreatingNew: (v: boolean) => void;
    winUser: string;
    setWinUser: (v: string) => void;
    winPass: string;
    setWinPass: (v: string) => void;
    showPass: boolean;
    setShowPass: (v: boolean) => void;
    passwordError: string | null;
    setPasswordError: (v: string | null) => void;
    isValidatingPass: boolean;
    verifyWindowsPassword: (pass: string) => void;
    osUsers: import("../../../lib/api").WindowsUser[];
    currentUser: string;
    isScanning: boolean;
    handleDiscovery: () => void;
    passNeverExpires: boolean;
    setPassNeverExpires: (v: boolean) => void;
}

export const WindowsUserSection = (props: WindowsUserSectionProps) => {
    const { t } = useTranslation();
    const {
        editingAccount, isManualInput, setIsManualInput, isCreatingNew, setIsCreatingNew,
        winUser, setWinUser, winPass, setWinPass, showPass, setShowPass,
        passwordError, setPasswordError, isValidatingPass, verifyWindowsPassword,
        osUsers, currentUser, isScanning, handleDiscovery,
        passNeverExpires, setPassNeverExpires
    } = props;

    const selectedUserObj = osUsers.find(u => u.name === winUser);
    
    // Robust host check: Compare only the username part after the last backslash
    const normalize = (name: string) => name.split('\\').pop()?.toLowerCase() || name.toLowerCase();
    const isHost = selectedUserObj?.is_current || (normalize(winUser) === normalize(currentUser));

    // Microsoft account detection
    const [isMsAccount, setIsMsAccount] = useState(false);
    const [isDomainAccount, setIsDomainAccount] = useState(false);

    useEffect(() => {
        if (!winUser || isCreatingNew) {
            setIsMsAccount(false);
            setIsDomainAccount(false);
            return;
        }
        
        // If already identified as MS account by backend, set state directly
        if (selectedUserObj?.is_ms_account) {
            setIsMsAccount(true);
        } else if (winUser.includes("@")) {
            setIsMsAccount(true);
        } else {
            // Async check fallback
            let cancelled = false;
            const check = async () => {
                try {
                    const result = await invoke('check_microsoft_account', { username: winUser });
                    if (!cancelled) setIsMsAccount(result as boolean);
                } catch {
                    if (!cancelled) setIsMsAccount(false);
                }
            };
            check();
            return () => { cancelled = true; };
        }

        if (winUser.includes("\\")) {
            setIsDomainAccount(true);
        } else {
            setIsDomainAccount(false);
        }
    }, [winUser, isCreatingNew, selectedUserObj]);

    return (
        <div className="space-y-3">
            {!editingAccount && (
                <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        {t('win_user_binding')}
                    </label>
                    <div className="flex gap-3">
                        {!isManualInput && isCreatingNew && (
                            <button
                                onClick={() => { setIsManualInput(false); setIsCreatingNew(false); }}
                                className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                            >
                                <ChevronLeft size={10} /> {t('back_to_list')}
                            </button>
                        )}
                        <button
                            onClick={() => { setIsCreatingNew(!isCreatingNew); setIsManualInput(true); }}
                            className={cn(
                                "text-[10px] px-2 py-1 rounded-sm transition-all flex items-center gap-1 uppercase font-black tracking-tight",
                                isCreatingNew
                                    ? "text-zinc-500 hover:text-white underline underline-offset-4"
                                    : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                            )}
                        >
                            {isCreatingNew ? t('use_existing_user') : (
                                <>
                                    <Sparkles size={10} />
                                    {t('create_new_win_user')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {isManualInput && !editingAccount ? (
                <div className="space-y-4 animate-in slide-in-from-top-1">
                    <div className="flex items-center gap-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase min-w-[3rem] whitespace-nowrap tracking-tighter">
                            {t('label_username')}
                        </label>
                        <input
                            type="text"
                            value={winUser}
                            onChange={(e) => setWinUser(e.target.value)}
                            className="flex-1 bg-black/50 border border-white/5 rounded-sm px-3 h-8 text-[11px] text-zinc-200 focus:border-primary/50 focus:outline-none transition-all font-mono"
                            placeholder={t('win_username')}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-[10px] font-black text-zinc-500 uppercase min-w-[3rem] whitespace-nowrap tracking-tighter">
                            {isCreatingNew ? t('label_initial_password') : t('label_verify_password')}
                        </label>
                        <div className="relative flex-1 group/pass">
                            <input
                                type={showPass ? "text" : "password"}
                                value={winPass}
                                onChange={(e) => { setWinPass(e.target.value); setPasswordError(null); }}
                                onBlur={(e) => verifyWindowsPassword(e.target.value)}
                                className={cn(
                                    "w-full bg-black/50 border rounded-sm pl-3 pr-10 h-8 text-[11px] text-zinc-200 focus:outline-none transition-all font-mono",
                                    passwordError ? "border-rose-500/30 focus:border-rose-500/50" : "border-white/10 focus:border-primary/50"
                                )}
                                placeholder={t('win_password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                disabled={isValidatingPass}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors z-10"
                            >
                                {isValidatingPass ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    showPass ? <EyeOff size={13} /> : <Eye size={13} />
                                )}
                            </button>
                        </div>
                    </div>
                    {passwordError && (
                        <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-red-400 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle size={10} />
                            {passwordError}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {!editingAccount && (
                        <div className="relative group flex gap-3">
                            <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                                    <UserRound size={14} />
                                </div>
                                <select
                                    value={winUser}
                                    onChange={(e) => setWinUser(e.target.value)}
                                    className="w-full h-8 bg-black/50 border border-white/5 rounded-sm pl-9 pr-3 text-[11px] text-zinc-200 focus:border-primary/50 focus:outline-none appearance-none cursor-pointer transition-all uppercase font-bold tracking-tight"
                                >
                                    <option value="" disabled>{t('select_win_user')}</option>
                                    {osUsers.map(u => (
                                        <option key={u.name} value={u.name}>
                                            {u.name} {u.is_current ? `(${t('host_current')})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDiscovery()}
                                isLoading={isScanning}
                                className="h-8 px-3 border border-zinc-700/50 bg-black/20 hover:bg-black/40 text-xs"
                            >
                                <Sparkles size={11} className="mr-1.5 text-zinc-400" />
                                {t('scan_users')}
                            </Button>
                        </div>
                    )}

                    {winUser && (
                        <div className="space-y-3 animate-in fade-in duration-300">
                            {/* Microsoft Account Unusable Warning (Non-Host) */}
                            {(isMsAccount && !isHost) ? (
                                <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-sm animate-in fade-in zoom-in-95">
                                    <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight">
                                            {t('ms_account_unusable_title')}
                                        </span>
                                        <span className="text-[10px] text-zinc-300 leading-tight">
                                            {t('ms_account_unusable_desc')}
                                        </span>
                                    </div>
                                </div>
                            ) : isMsAccount ? (
                                <div className="flex items-start gap-2.5 p-3 bg-amber-500/5 border border-amber-500/20 rounded-sm animate-in fade-in">
                                    <CloudOff size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-tight">{t('ms_account_warning_title')}</span>
                                        <span className="text-[10px] text-zinc-400 leading-tight">{t('ms_account_warning_desc')}</span>
                                    </div>
                                </div>
                            ) : null}
 
                            {/* Domain Account Warning */}
                            {isDomainAccount && (
                                <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/20 rounded-sm animate-in fade-in">
                                    <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">{t('domain_account_warning_title')}</span>
                                        <span className="text-[10px] text-zinc-400 leading-tight">{t('domain_account_warning_desc')}</span>
                                    </div>
                                </div>
                            )}
                            {!isHost && (
                                <>
                                    <div className="flex items-center gap-4">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase min-w-[3rem] whitespace-nowrap tracking-tighter">
                                            {isCreatingNew ? t('label_initial_password') : t('label_verify_password')}
                                        </label>
                                        <div className="relative flex-1 group/pass">
                                            <input
                                                type={showPass ? "text" : "password"}
                                                value={winPass}
                                                onChange={(e) => { setWinPass(e.target.value); setPasswordError(null); }}
                                                onBlur={(e) => verifyWindowsPassword(e.target.value)}
                                                className={cn(
                                                    "w-full bg-zinc-900 border rounded-sm pl-3 pr-10 py-1.5 text-[11px] text-zinc-200 focus:outline-none transition-all font-mono",
                                                    passwordError ? "border-rose-500/30 focus:border-rose-500/50" : "border-white/10 focus:border-primary/50"
                                                )}
                                                placeholder={t('win_password')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                disabled={isValidatingPass}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors z-10"
                                            >
                                                {isValidatingPass ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    showPass ? <EyeOff size={13} /> : <Eye size={13} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {passwordError && (
                                        <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-red-400 animate-in fade-in slide-in-from-top-1">
                                            <AlertCircle size={10} />
                                            {passwordError}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 p-2 bg-zinc-950/50 border border-white/5 rounded-sm group/check cursor-pointer" onClick={() => setPassNeverExpires(!passNeverExpires)}>
                                        <div className={cn(
                                            "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all",
                                            passNeverExpires ? "bg-primary border-primary" : "border-white/10 bg-black/40 group-hover/check:border-white/20"
                                        )}>
                                            {passNeverExpires && <Check size={10} className="text-black stroke-[4px]" />}
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-tight group-hover/check:text-white transition-colors">
                                                {t('win_pass_never_expires')}
                                            </span>
                                            <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                                                {t('win_pass_never_expires_hint')}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {winUser && (
                <div className="flex items-start gap-3 p-3 bg-zinc-950/50 border border-white/5 rounded-sm relative overflow-hidden">
                    {/* Industrial background accent */}
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-amber-500/40" />
                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black text-amber-600/80 uppercase tracking-widest flex items-center gap-1.5">
                            <i className="w-1 h-1 bg-amber-600/50 rounded-full animate-pulse" />
                            {t('notice') || 'SECURITY PROTOCOL'}
                        </span>
                        <span className="text-[10px] text-zinc-400 leading-snug">
                            {t('pin_warning')}
                            {isHost && (
                                <span className="block mt-2 text-emerald-500/80 font-black uppercase tracking-tight bg-emerald-500/5 border border-emerald-500/20 px-2 py-1 rounded-sm w-fit">
                                    {t('host_no_pass_hint')}
                                </span>
                            )}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
