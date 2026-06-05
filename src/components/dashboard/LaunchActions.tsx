import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AccountStatus } from '../../lib/api';

interface LaunchActionsProps {
    onLaunch: (bnetOnly?: boolean, advancedMode?: boolean, force?: boolean) => void;
    isLaunching: boolean;
    advancedLaunchMode?: boolean;
    selectedAccountStatus?: AccountStatus;
    isLaunchDisabled: boolean;
}

export const LaunchActions: React.FC<LaunchActionsProps> = ({
    onLaunch,
    isLaunching,
    selectedAccountStatus,
    isLaunchDisabled
}) => {
    const { t } = useTranslation();

    // Force state: relaunching while either Battle.net OR D2R is already running
    // will forcibly kill & restart, so surface it on both buttons.
    const isForce = !!(selectedAccountStatus?.bnet_active || selectedAccountStatus?.d2r_active);

    const forceSuffix = isForce && !isLaunching
        ? <> (<span className="l-force-word">{t('force')}</span>)</>
        : null;

    return (
        <div className="launch-grid">
            {/* Player Launch Button (Green / Force=Amber) */}
            <button
                onClick={() => onLaunch(false, false, isForce)}
                disabled={isLaunchDisabled}
                className={cn("launch player", isForce && "force", isLaunchDisabled && "opacity-50 cursor-not-allowed")}
            >
                {isLaunching && <div className="l-prog"></div>}
                <div className="l-icon">
                    <Play size={20} className="fill-current" />
                </div>
                <div className="l-body">
                    <div className="l-title">
                        {isLaunching ? t('launching') : t('launch_game')}{forceSuffix}
                    </div>
                    <div className="l-sub">
                        {isForce ? t('force_launch') : t('player_one_click')}
                    </div>
                </div>
                <div className="l-arrow">
                    →
                </div>
            </button>

            {/* Network Launch Button (Blue / Force=Amber) — Bnet client only */}
            <button
                onClick={() => onLaunch(true, false, isForce)}
                disabled={isLaunchDisabled}
                className={cn("launch net", isForce && "force", isLaunchDisabled && "opacity-50 cursor-not-allowed")}
            >
                {isLaunching && <div className="l-prog"></div>}
                <div className="l-icon">
                    <Play size={20} className="fill-current" />
                </div>
                <div className="l-body">
                    <div className="l-title">
                        {isLaunching ? t('launching') : t('launch_bnet_only')}{forceSuffix}
                    </div>
                    <div className="l-sub">
                        {t('bnet_chat')}
                    </div>
                </div>
                <div className="l-arrow">
                    →
                </div>
            </button>
        </div>
    );
};
