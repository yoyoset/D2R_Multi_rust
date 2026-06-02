import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { SequencePresetControls } from './SequencePresetControls';
import { LaunchActions } from './LaunchActions';
import { AppConfig, AccountStatus } from '../../lib/api';

interface DashboardHeaderProps {
    config: AppConfig;
    viewMode: 'card' | 'list';
    onViewModeChange: (mode: 'card' | 'list') => void;
    onLaunch: (bnetOnly?: boolean, advancedMode?: boolean) => void;
    isLaunching: boolean;
    advancedLaunchMode?: boolean;
    selectedAccountStatus?: AccountStatus;
    isLaunchDisabled: boolean;
    onRefresh: () => void;
    isRefreshing: boolean;
    onRefreshPaths?: () => void;
    onAuditVault?: () => void;
    onEditSequencePreset: (index: number) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    config,
    viewMode,
    onViewModeChange,
    onLaunch,
    isLaunching,
    advancedLaunchMode,
    selectedAccountStatus,
    isLaunchDisabled,
    onRefresh,
    isRefreshing,
    onRefreshPaths,
    onAuditVault,
    onEditSequencePreset,
}) => {
    const { t } = useTranslation();

    return (
        <div className="sticky top-0 z-40 w-full flex flex-col border-b border-line bg-surface/40 backdrop-blur-sm">
            {/* Section Header */}
            <div className="flex-1 px-6 pt-6 pb-0">
                <div className="sec-head">
                    <div className="sec-title">
                        <div className="sec-tick"></div>
                        <h1>{t('account_sanctum')}</h1>
                    </div>
                    <div className="sec-actions">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRefresh();
                            }}
                            className={cn("ghost-btn", isRefreshing && "opacity-60 cursor-default")}
                            disabled={isRefreshing}
                            title={t('refresh_status')}
                        >
                            <RefreshCw size={15} className={cn(isRefreshing && "animate-spin")} />
                            <span>{isRefreshing ? t('refreshing') : t('refresh_status')}</span>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onRefreshPaths) onRefreshPaths();
                            }}
                            className="ghost-btn"
                            title={t('refresh_paths')}
                        >
                            <RefreshCw size={15} />
                            <span>{t('refresh_paths')}</span>
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAuditVault) onAuditVault();
                            }}
                            className="ghost-btn"
                            title={t('audit_vault')}
                        >
                            <RefreshCw size={15} />
                            <span>{t('audit_vault')}</span>
                        </button>

                        <div className="seg">
                            <button
                                onClick={() => onViewModeChange('card')}
                                className={cn("on", viewMode === 'card' && "on")}
                                title="Grid view"
                            >
                                <LayoutGrid size={14} />
                            </button>
                            <button
                                onClick={() => onViewModeChange('list')}
                                className={cn("on", viewMode === 'list' && "on")}
                                title="List view"
                            >
                                <List size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sequence Presets */}
                <SequencePresetControls
                    config={config}
                    onEditPreset={onEditSequencePreset}
                />
            </div>

            {/* Launch Action */}
            <div className="px-6 pb-6">
                <LaunchActions
                    onLaunch={onLaunch}
                    isLaunching={isLaunching}
                    advancedLaunchMode={advancedLaunchMode}
                    selectedAccountStatus={selectedAccountStatus}
                    isLaunchDisabled={isLaunchDisabled}
                />
            </div>
        </div>
    );
};
