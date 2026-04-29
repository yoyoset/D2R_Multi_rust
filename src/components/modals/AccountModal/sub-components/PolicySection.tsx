import { AlertCircle, Archive, Check, Lock, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../lib/utils";

interface PolicySectionProps {
    applyPasswordPolicy: boolean;
    setApplyPasswordPolicy: (val: boolean) => void;
    skipConfigSync: boolean;
    setSkipConfigSync: (val: boolean) => void;
    isUnmanagedUser: boolean;
    winUser: string;
    isHost: boolean;
}

/**
 * Systematic Efficiency Checkbox Component
 */
const PolicyCheckbox = ({ 
    checked, 
    onChange, 
    icon: Icon, 
    label, 
    hint, 
    activeColor = "text-primary" 
}: { 
    checked: boolean, 
    onChange: (v: boolean) => void, 
    icon: any, 
    label: string, 
    hint: string,
    activeColor?: string
}) => (
    <div 
        className={cn(
            "flex-1 flex items-center gap-3 p-2.5 hover:bg-white/[0.02] transition-all cursor-pointer select-none group/item",
            checked ? "bg-white/[0.01]" : "opacity-60"
        )}
        onClick={() => onChange(!checked)}
    >
        <div className={cn(
            "w-4 h-4 rounded-sm border flex items-center justify-center transition-all shrink-0",
            checked 
                ? cn("border-transparent", activeColor.replace('text-', 'bg-')) 
                : "border-zinc-700 bg-black/40 group-hover/item:border-zinc-500"
        )}>
            {checked && <Check size={12} className="text-black stroke-[4px]" />}
        </div>
        <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
                <Icon size={12} className={cn("shrink-0", checked ? activeColor : "text-zinc-500")} />
                <span className={cn(
                    "text-[11px] font-bold uppercase tracking-tight truncate transition-colors",
                    checked ? "text-zinc-100" : "text-zinc-400 group-hover/item:text-zinc-300"
                )}>
                    {label}
                </span>
            </div>
            <span className="text-[9px] text-zinc-600 uppercase tracking-tighter truncate leading-tight mt-0.5">
                {hint}
            </span>
        </div>
    </div>
);

export function PolicySection({ 
    applyPasswordPolicy, 
    setApplyPasswordPolicy, 
    skipConfigSync,
    setSkipConfigSync,
    isUnmanagedUser, 
    winUser, 
    isHost 
}: PolicySectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-2">
            {/* Efficiency Control Bar */}
            <div className="grid grid-cols-2 bg-zinc-950/40 border border-white/5 rounded-sm overflow-hidden divide-x divide-white/5 shadow-inner">
                <PolicyCheckbox
                    checked={applyPasswordPolicy}
                    onChange={setApplyPasswordPolicy}
                    icon={ShieldCheck}
                    label={t('apply_password_policy')}
                    hint={t('apply_password_policy_hint')}
                    activeColor="text-primary"
                />
                <PolicyCheckbox
                    checked={skipConfigSync}
                    onChange={setSkipConfigSync}
                    icon={Archive}
                    label={t('manual_snapshot_label')}
                    hint={t('manual_snapshot_desc_short')}
                    activeColor="text-amber-500"
                />
            </div>

            {/* Systematic Warnings / Context Area */}
            {(isUnmanagedUser || skipConfigSync || winUser) && (
                <div className="space-y-1 mt-1">
                    {skipConfigSync && (
                        <div className="flex items-center gap-2 px-2 py-1 bg-amber-500/5 border border-amber-500/10 rounded-sm animate-in slide-in-from-top-1">
                            <Lock size={10} className="text-amber-500/60" />
                            <span className="text-[9px] text-amber-500/80 font-medium uppercase tracking-tighter">
                                {t('manual_snapshot_mode_active_hint')}
                            </span>
                        </div>
                    )}
                    
                    {isUnmanagedUser && (
                        <div className="flex items-start gap-2 px-2 py-1 bg-rose-500/5 border border-rose-500/10 rounded-sm">
                            <AlertCircle size={10} className="text-rose-400/80 mt-0.5" />
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-rose-400/90 uppercase tracking-tighter">{t('unmanaged_user_warning')}</span>
                                <span className="text-[8px] text-rose-500/60 uppercase tracking-tighter leading-none mt-0.5">{t('unmanaged_user_hint')}</span>
                            </div>
                        </div>
                    )}

                    {winUser && (
                        <div className="flex items-start gap-2 px-2 py-1.5 bg-zinc-900/40 border border-white/5 rounded-sm text-[9px] text-zinc-500 leading-normal">
                            <AlertCircle size={10} className="mt-0.5 shrink-0 opacity-40" />
                            <div className="flex-1 min-w-0">
                                <span className="uppercase tracking-tighter opacity-80">{t('pin_warning')}</span>
                                {isHost && (
                                    <span className="block mt-0.5 text-green-500/80 font-bold uppercase tracking-tighter">
                                        {t('host_no_pass_hint')}
                                    </span>
                                )}
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
