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
                            "flex-1 h-12 md:h-14 text-sm md:text-base rounded-lg shadow-lg font-bold transition-all relative overflow-hidden group",
                            isLaunchDisabled
                                ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed"
                                : "bg-[rgb(var(--color-success))] text-white hover:opacity-90 shadow-[rgb(var(--color-success)/0.2)]"
                        )}
                    >
                        <div className="flex flex-col items-center leading-tight relative z-10">
                            <div className="flex items-center gap-2">
                                <Play size={16} className={cn("fill-current", isLaunching ? "animate-pulse" : "group-hover:scale-110 transition-transform")} />
                                <span>{isLaunching ? t('launching') : (selectedAccountStatus?.d2r_active ? t('ready') : t('launch_full'))}</span>
                            </div>
                            <span className="text-[9px] opacity-60 font-normal uppercase tracking-tighter mt-0.5">{t('full_preparation')}</span>
                        </div>
                        {!isLaunchDisabled && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </Button>

                    <Button
                        variant="solid"
                        size="lg"
                        onClick={() => onLaunch(true)}
                        disabled={isLaunchDisabled}
                        className={cn(
                            "flex-1 h-12 md:h-14 text-sm md:text-base rounded-lg shadow-lg font-bold transition-all relative overflow-hidden group",
                            isLaunchDisabled
                                ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed"
                                : "bg-[rgb(var(--color-info))] text-white hover:opacity-90 shadow-[rgb(var(--color-info)/0.2)]"
                        )}
                    >
                        <div className="flex flex-col items-center leading-tight relative z-10">
                            <div className="flex items-center gap-2">
                                <Play size={16} className={cn("fill-current", isLaunching ? "animate-pulse" : "group-hover:scale-110 transition-transform")} />
                                <span>{isLaunching ? t('launching') : (selectedAccountStatus?.bnet_active ? t('ready') : t('launch_bnet_only'))}</span>
                            </div>
                            <span className="text-[9px] opacity-60 font-normal uppercase tracking-tighter mt-0.5">{t('identity_only')}</span>
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
                        "w-full h-12 md:h-14 text-base md:text-lg rounded-lg shadow-lg tracking-widest font-bold transition-all",
                        isLaunchDisabled ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed" : "bg-primary text-white hover:opacity-90 shadow-primary/20"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Play size={18} className={cn("transition-transform fill-current", isLaunching ? "animate-pulse" : "group-hover:translate-x-1")} />
                        <span>{selectedAccountStatus?.d2r_active ? t('ready') : (isLaunching ? t('launching') : t('launch_game'))}</span>
                    </div>
                </Button>
            )}
        </div>
    );
};
