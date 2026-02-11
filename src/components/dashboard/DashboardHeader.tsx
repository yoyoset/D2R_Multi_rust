import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LaunchActions } from './LaunchActions';
import { AccountStatus } from '../../lib/api';

interface DashboardHeaderProps {
    accountsCount: number;
    viewMode: 'card' | 'list';
    onViewModeChange: (mode: 'card' | 'list') => void;
    onLaunch: (bnetOnly?: boolean) => void;
    isLaunching: boolean;
    multiAccountMode?: boolean;
    selectedAccountStatus?: AccountStatus;
    isLaunchDisabled: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
    accountsCount,
    viewMode,
    onViewModeChange,
    onLaunch,
    isLaunching,
    multiAccountMode,
    selectedAccountStatus,
    isLaunchDisabled
}) => {
    const { t } = useTranslation();

    return (
        <div className="sticky top-0 z-40 w-full flex flex-col items-center bg-zinc-950/80 backdrop-blur-lg border-b border-white/5 px-4 md:px-6 py-2 shadow-2xl">
            {/* View Mode Toggle */}
            <div className="w-full flex justify-between items-center sm:items-end flex-shrink-0 px-2">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--color-primary)/0.5)]"></div>
                        {t('account_sanctum')}
                    </h2>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest pl-4">{t('entities_registered', { count: accountsCount })}</p>
                </div>
                <div className="flex bg-zinc-900/40 border border-white/10 p-1 rounded-lg">
                    <button
                        onClick={() => onViewModeChange('card')}
                        className={cn("p-1.5 rounded-md transition-all", viewMode === 'card' ? "bg-zinc-800 text-primary shadow-sm" : "text-zinc-600 hover:text-zinc-300")}
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-zinc-800 text-primary shadow-sm" : "text-zinc-600 hover:text-zinc-300")}
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Launch Action */}
            <LaunchActions
                onLaunch={onLaunch}
                isLaunching={isLaunching}
                multiAccountMode={multiAccountMode}
                selectedAccountStatus={selectedAccountStatus}
                isLaunchDisabled={isLaunchDisabled}
            />
        </div>
    );
};
