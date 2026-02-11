import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { AccountStatus } from '../../lib/api';

interface LaunchActionsProps {
    onLaunch: (bnetOnly?: boolean) => void;
    isLaunching: boolean;
    multiAccountMode?: boolean;
    selectedAccountStatus?: AccountStatus;
    isLaunchDisabled: boolean;
}

export const LaunchActions: React.FC<LaunchActionsProps> = ({
    onLaunch,
    isLaunching,
    multiAccountMode,
    selectedAccountStatus,
    isLaunchDisabled
}) => {
    const { t } = useTranslation();

    return (
        <div className="w-full pt-3 pb-1 px-4">
            {multiAccountMode ? (
                <div className="flex gap-3 w-full">
                    <Button
                        variant="solid"
                        size="lg"
                        onClick={() => onLaunch(false)}
                        disabled={isLaunchDisabled}
                        className={cn(
                            "flex-1 h-12 md:h-14 rounded-xl shadow-lg font-bold transition-all relative overflow-hidden group border border-white/5",
                            isLaunchDisabled
                                ? "bg-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed"
                                : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90 shadow-emerald-500/20"
                        )}
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            <Play size={16} className={cn("transition-all fill-current", isLaunching ? "animate-pulse" : "group-hover:scale-110")} />
                            <span className="text-sm md:text-base">
                                {isLaunching ? t('launching') : (selectedAccountStatus?.d2r_active ? t('ready') : t('launch_full'))}
                            </span>
                            <span className="text-[10px] opacity-60 font-normal hidden md:inline-block">({t('full_preparation')})</span>
                        </div>
                        {!isLaunchDisabled && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </Button>

                    <Button
                        variant="solid"
                        size="lg"
                        onClick={() => onLaunch(true)}
                        disabled={isLaunchDisabled}
                        className={cn(
                            "flex-1 h-12 md:h-14 rounded-xl shadow-lg font-bold transition-all relative overflow-hidden group border border-white/5",
                            isLaunchDisabled
                                ? "bg-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 shadow-blue-500/20"
                        )}
                    >
                        <div className="flex items-center gap-2 relative z-10">
                            <Play size={16} className={cn("transition-all fill-current", isLaunching ? "animate-pulse" : "group-hover:scale-110")} />
                            <span className="text-sm md:text-base">
                                {isLaunching ? t('launching') : (selectedAccountStatus?.bnet_active ? t('ready') : t('launch_bnet_only'))}
                            </span>
                            <span className="text-[10px] opacity-60 font-normal hidden md:inline-block">({t('identity_only')})</span>
                        </div>
                        {!isLaunchDisabled && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </Button>
                </div>
            ) : (
                <Button
                    variant="solid"
                    size="lg"
                    onClick={() => onLaunch(false)}
                    disabled={isLaunchDisabled}
                    className={cn(
                        "w-full h-12 md:h-14 rounded-xl shadow-xl font-bold transition-all relative overflow-hidden group border border-white/5",
                        isLaunchDisabled
                            ? "bg-zinc-900 text-zinc-600 opacity-50 cursor-not-allowed"
                            : "bg-gradient-to-r from-primary via-primary/90 to-primary text-white hover:opacity-90 shadow-primary/25"
                    )}
                >
                    <div className="flex items-center gap-3 relative z-10">
                        <Play size={18} className={cn("transition-transform fill-current", isLaunching ? "animate-pulse" : "group-hover:translate-x-1")} />
                        <span className="text-base md:text-lg tracking-widest">
                            {selectedAccountStatus?.d2r_active ? t('ready') : (isLaunching ? t('launching') : t('launch_game'))}
                        </span>
                        <span className="text-[10px] opacity-60 font-normal hidden md:inline-block">({t('full_preparation')})</span>
                    </div>
                    {!isLaunchDisabled && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </Button>
            )}
        </div>
    );
};
