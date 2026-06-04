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
    selectedAccountStatus,
    isLaunchDisabled
}) => {
    const { t } = useTranslation();

    const isGameActive = selectedAccountStatus?.d2r_active;

    return (
        <div className="launch-grid">
            {/* Player Launch Button (Green) */}
            <button
                onClick={() => onLaunch(false, false)}
                disabled={isLaunchDisabled}
                className={cn("launch player", isLaunchDisabled && "opacity-50 cursor-not-allowed")}
            >
                {isLaunching && <div className="l-prog"></div>}
                <div className="l-icon">
                    <Play size={20} className="fill-current" />
                </div>
                <div className="l-body">
                    <div className="l-title">
                        {isLaunching ? t('launching') : t('launch_game')}
                    </div>
                    <div className="l-sub">
                        {isGameActive ? t('force_launch') : t('player_one_click')}
                    </div>
                </div>
                <div className="l-arrow">
                    →
                </div>
            </button>

            {/* Network Launch Button (Blue) — Bnet client only */}
            <button
                onClick={() => onLaunch(true, false)}
                disabled={isLaunchDisabled}
                className={cn("launch net", isLaunchDisabled && "opacity-50 cursor-not-allowed")}
            >
                {isLaunching && <div className="l-prog"></div>}
                <div className="l-icon">
                    <Play size={20} className="fill-current" />
                </div>
                <div className="l-body">
                    <div className="l-title">
                        {isLaunching ? t('launching') : t('launch_bnet_only')}
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
