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
        <div className="sticky top-0 z-40 w-full flex flex-col items-center bg-zinc-950 border-b border-white/5 px-4 py-1.5 shadow-sm">
            {/* Main Header Content */}
            <div className="w-full flex justify-between items-start flex-shrink-0 px-2 gap-4">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                    {/* Row 1: Title & Status Refresh */}
                    <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                        <h2 className="text-[14px] font-black text-white uppercase tracking-tighter flex items-center gap-1.5 shrink-0">
                            <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary),0.4)]"></div>
                            {t('account_sanctum')}
                        </h2>
                        
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRefresh();
                                }}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-sm border border-white/5 bg-zinc-900 text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                                    "hover:bg-primary/10 hover:border-primary/30 hover:text-primary",
                                    isRefreshing ? "text-primary bg-primary/10 border-primary/20 cursor-default" : "text-zinc-600"
                                )}
                                disabled={isRefreshing}
                            >
                                <RefreshCw size={16} className={cn(isRefreshing && "animate-spin")} />
                                <span>{isRefreshing ? t('refreshing') : t('refresh_status')}</span>
                            </button>
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onRefreshPaths) onRefreshPaths();
                                }}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-sm border border-white/5 bg-zinc-900 text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                                    "hover:bg-primary/10 hover:border-primary/30 hover:text-white text-zinc-500 outline-none"
                                )}
                            >
                                <RefreshCw size={16} />
                                <span>{t('refresh_paths')}</span>
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAuditVault) onAuditVault();
                                }}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-0.5 rounded-sm border border-white/5 bg-zinc-900 text-[10px] font-black uppercase tracking-tight transition-all shrink-0",
                                    "hover:bg-primary/10 hover:border-primary/30 hover:text-white text-zinc-500 outline-none"
                                )}
                            >
                                <RefreshCw size={16} />
                                <span>{t('audit_vault')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Sequence Presets (Stacked) */}
                    <SequencePresetControls 
                        config={config} 
                        onEditPreset={onEditSequencePreset} 
                    />
                </div>

                {/* Right side View Toggle */}
                <div className="flex bg-zinc-900 border border-white/5 p-0.5 rounded-sm shrink-0">
                    <button
                        onClick={() => onViewModeChange('card')}
                        className={cn("p-1 rounded-sm transition-all", viewMode === 'card' ? "bg-zinc-800 text-primary" : "text-zinc-600 hover:text-zinc-400")}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={cn("p-1 rounded-sm transition-all", viewMode === 'list' ? "bg-zinc-800 text-primary" : "text-zinc-600 hover:text-zinc-400")}
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            {/* Launch Action */}
            <LaunchActions
                onLaunch={onLaunch}
                isLaunching={isLaunching}
                advancedLaunchMode={advancedLaunchMode}
                selectedAccountStatus={selectedAccountStatus}
                isLaunchDisabled={isLaunchDisabled}
            />
        </div>
    );
};
