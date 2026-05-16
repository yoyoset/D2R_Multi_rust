import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../lib/utils";

interface PasswordSectionProps {
    winPass: string;
    setWinPass: (val: string) => void;
    showPass: boolean;
    setShowPass: (val: boolean) => void;
    passwordError: string | null;
    setPasswordError: (val: string | null) => void;
    isValidatingPass: boolean;
    verifyWindowsPassword: (pass: string) => void;
    hasCredential?: boolean;
}

export function PasswordSection({
    winPass,
    setWinPass,
    showPass,
    setShowPass,
    passwordError,
    setPasswordError,
    isValidatingPass,
    verifyWindowsPassword,
    hasCredential
}: PasswordSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 min-w-[3rem] whitespace-nowrap">
                    {t('label_password')}
                </label>
                <div className="relative flex-1 group/pass">
                    <input
                        type={showPass ? "text" : "password"}
                        value={winPass}
                        onChange={(e) => {
                            setWinPass(e.target.value);
                            setPasswordError(null);
                        }}
                        onBlur={(e) => verifyWindowsPassword(e.target.value)}
                        disabled={isValidatingPass}
                        className={cn(
                            "w-full bg-black/50 border border-white/5 rounded-sm pl-3 pr-10 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:ring-1 transition-all font-mono h-8 disabled:opacity-50",
                            passwordError ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20" : "focus:border-primary focus:ring-primary/20"
                        )}
                        placeholder={t('win_password')}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        disabled={isValidatingPass}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
                    >
                        {isValidatingPass ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            showPass ? <EyeOff size={16} /> : <Eye size={16} />
                        )}
                    </button>
                    {/* CRITICAL: CSS to hide native browser reveal icons is in index.css */}
                </div>
            </div>
            {!passwordError && winPass === "********" && (
                <div className="flex items-center gap-1.5 px-[3.5rem] text-[10px] text-zinc-500 animate-in fade-in slide-in-from-top-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                    {t('credential_stored_hint')}
                </div>
            )}
            {!passwordError && winPass === "" && hasCredential === false && (
                <div className="flex items-center gap-1.5 px-[3.5rem] text-[10px] text-zinc-500 animate-in fade-in slide-in-from-top-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    {t('blank_password_hint')}
                </div>
            )}
            {passwordError && (
                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[10px] text-red-400 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle size={16} />
                    {passwordError}
                </div>
            )}
        </div>
    );
}
