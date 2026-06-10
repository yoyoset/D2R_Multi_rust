import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
} from '@dnd-kit/sortable';

import { useAccountStatus } from '../../hooks/useAccountStatus';
import { DashboardHeader } from '../dashboard/DashboardHeader';
import { SortableAccountItem } from '../dashboard/SortableAccountItem';
import { LogConsole } from '../dashboard/LogConsole';
import { AppConfig, Account } from '../../lib/api';

interface DashboardProps {
    config: AppConfig;
    accounts: Account[];
    invalidAccountIds: Set<string>;
    missingCredentialIds: Set<string>;
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onLaunch: (bnetOnly?: boolean, advancedMode?: boolean, force?: boolean) => void;
    isLaunching: boolean;
    advancedLaunchMode?: boolean;
    onReorder: (newAccounts: Account[]) => void;
    onEdit: (account: Account) => void;
    onSaveSnapshot: (account: Account) => void;
    launchLogs: any[];
    onClearLogs: () => void;
    viewMode: 'card' | 'list';
    onViewModeChange: (mode: 'card' | 'list') => void;
    onRefreshPaths?: () => void;
    onAuditVault?: () => void;
    onEditSequencePreset: (index: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    config,
    accounts,
    invalidAccountIds,
    missingCredentialIds,
    selectedAccountId,
    onSelectAccount,
    onLaunch,
    isLaunching,
    advancedLaunchMode,
    onReorder,
    onEdit,
    onSaveSnapshot,
    launchLogs,
    onClearLogs,
    viewMode,
    onViewModeChange,
    onRefreshPaths,
    onAuditVault,
    onEditSequencePreset
}) => {
    const { t } = useTranslation();
    const { accountStatuses, refresh, isRefreshing } = useAccountStatus(accounts);
    
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = accounts.findIndex((a) => a.id === active.id);
            const newIndex = accounts.findIndex((a) => a.id === over.id);
            onReorder(arrayMove(accounts, oldIndex, newIndex));
        }
    };

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const selectedAccountStatus = selectedAccount ? accountStatuses[selectedAccount.win_user] : undefined;
    
    // Disable launch only if no accounts exist, none selected, or already launching. 
    // We no longer lock the button solely due to "detected running" to allow users to attempt cleanup or forced re-launch.
    const isLaunchDisabled = accounts.length === 0 || !selectedAccountId || isLaunching;

    return (
        <div className="flex flex-col w-full">
            <DashboardHeader
                config={config}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                onLaunch={onLaunch}
                isLaunching={isLaunching}
                advancedLaunchMode={advancedLaunchMode}
                selectedAccountStatus={selectedAccountStatus}
                isLaunchDisabled={isLaunchDisabled}
                onRefresh={refresh}
                isRefreshing={isRefreshing}
                onRefreshPaths={onRefreshPaths}
                onAuditVault={onAuditVault}
                onEditSequencePreset={onEditSequencePreset}
            />

            <div className="w-full shrink-0 pt-0 pb-10">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className={cn(
                        "w-full",
                        viewMode === 'card'
                            ? "grid gap-2.5 w-full grid-cols-[repeat(auto-fill,minmax(150px,1fr))]"
                            : "flex flex-col"
                    )}>
                        <SortableContext
                            items={accounts.map(a => a.id)}
                            strategy={viewMode === 'card' ? rectSortingStrategy : verticalListSortingStrategy}
                        >
                            {accounts.map((account) => (
                                <SortableAccountItem
                                    key={account.id}
                                    account={account}
                                    isInvalid={invalidAccountIds.has(account.id)}
                                    isMissingCredentials={missingCredentialIds.has(account.id)}
                                    viewMode={viewMode}
                                    selectedAccountId={selectedAccountId}
                                    onSelectAccount={onSelectAccount}
                                    onEdit={onEdit}
                                    onSaveSnapshot={onSaveSnapshot}
                                    status={accountStatuses[account.win_user]}
                                />
                            ))}
                        </SortableContext>

                        {accounts.length === 0 && (
                            <div className="col-span-full w-full max-w-md mx-auto text-center p-4 text-text-dim border border-dashed border-line rounded-sm bg-surface/10 mt-6">
                                <User size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="text-[14px]">{t('no_accounts_hint')}</p>
                            </div>
                        )}
                    </div>
                </DndContext>
            </div>

            {launchLogs.length > 0 && (
                <LogConsole logs={launchLogs} onClear={onClearLogs} />
            )}
        </div>
    );
};

export default Dashboard;
