import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AccountStatus } from '../../lib/api';

interface LaunchActionsProps {
    onLaunch: (bnetOnly?: boolean, advancedMode?: boolean) => void;
    isLaunching: boolean;
    advancedLaunchMode?: boolean;
    selectedAccountStatus?: AccountStatus;
    isLaunchDisabled: boolean;
}

export const LaunchActions: React.FC<LaunchActionsProps> = ({
    onLaunch,
    isLaunching,
    advancedLaunchMode,
    selectedAccountStatus,
    isLaunchDisabled
}) => {
    const { t } = useTranslation();

    const getButtonStyle = (isAdvanced: boolean = false) => {
        if (isLaunchDisabled) return "bg-zinc-900 border-white/5 text-zinc-600 cursor-not-allowed";
        
        // If game is active, show orange alert state
        if (selectedAccountStatus?.d2r_active) {
            return "bg-orange-500/10 border-orange-500/50 text-orange-500 hover:bg-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]";
        }

        // Standard Ready State
        if (isAdvanced) {
            return "bg-blue-500/10 border-blue-500/50 text-blue-500 hover:bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.2)]";
        }

        return "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]";
    };

    return (
        <div className="w-full pt-1 pb-1 px-4">
            {advancedLaunchMode ? (
                <div className="flex gap-2 w-full">
                    {/* Mode A: Managed Launch (One-Click) */}
                    <button
                        onClick={() => onLaunch(false, false)}
                        disabled={isLaunchDisabled}
                        className={cn(
                            "flex-1 h-9 rounded-sm font-black uppercase tracking-tight transition-all relative overflow-hidden group border",
                            getButtonStyle(false)
                        )}
                    >
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <Play size={16} className={cn("transition-all fill-current", isLaunching && "animate-pulse")} />
                            <span className="text-[10px]">
                                {isLaunching ? t('launching') : t('launch_managed')}
                            </span>
                        </div>
                    </button>

                    {/* Mode B: Advanced Launch (Direct) */}
                    <button
                        onClick={() => onLaunch(false, true)}
                        disabled={isLaunchDisabled}
                        className={cn(
                            "flex-1 h-9 rounded-sm font-black uppercase tracking-tight transition-all relative overflow-hidden group border",
                            getButtonStyle(true)
                        )}
                    >
                        <div className="flex items-center justify-center gap-2 relative z-10">
                            <Play size={16} className={cn("transition-all fill-current", isLaunching && "animate-pulse")} />
                            <span className="text-[10px]">
                                {isLaunching ? t('launching') : t('launch_advanced')}
                            </span>
                        </div>
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => onLaunch(false, false)}
                    disabled={isLaunchDisabled}
                    className={cn(
                        "w-full h-10 rounded-sm font-black uppercase tracking-widest transition-all relative overflow-hidden group border",
                        getButtonStyle(false)
                    )}
                >
                    <div className="flex items-center justify-center gap-3 relative z-10">
                        <Play size={16} className={cn("transition-transform fill-current", isLaunching && "animate-pulse")} />
                        <span className="text-[14px]">
                            {isLaunching ? t('launching') : (selectedAccountStatus?.d2r_active || selectedAccountStatus?.bnet_active ? t('force_launch') : t('launch_game'))}
                        </span>
                    </div>
                </button>
            )}
        </div>
    );
};
