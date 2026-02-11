import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../lib/api';
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

interface DashboardProps {
    accounts: Account[];
    invalidAccountIds: Set<string>;
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onLaunch: (bnetOnly?: boolean) => void;
    isLaunching: boolean;
    multiAccountMode?: boolean;
    onReorder: (newAccounts: Account[]) => void;
    onEdit: (account: Account) => void;
    launchLogs: any[];
    onClearLogs: () => void;
    viewMode: 'card' | 'list';
    onViewModeChange: (mode: 'card' | 'list') => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    accounts,
    invalidAccountIds,
    selectedAccountId,
    onSelectAccount,
    onLaunch,
    isLaunching,
    multiAccountMode,
    onReorder,
    onEdit,
    launchLogs,
    onClearLogs,
    viewMode,
    onViewModeChange
}) => {
    const { t } = useTranslation();
    const { accountStatuses } = useAccountStatus(accounts);

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
    const isLaunchDisabled = accounts.length === 0 || !selectedAccountId || isLaunching || !!selectedAccountStatus?.d2r_active || !!selectedAccountStatus?.bnet_active;

    return (
        <div className="flex flex-col items-center w-full p-4 md:p-6 gap-4 md:gap-6">
            <DashboardHeader
                accountsCount={accounts.length}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                onLaunch={onLaunch}
                isLaunching={isLaunching}
                multiAccountMode={multiAccountMode}
                selectedAccountStatus={selectedAccountStatus}
                isLaunchDisabled={isLaunchDisabled}
            />

            <div className="w-full shrink-0 pb-10">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className={cn(
                        "w-full pb-6",
                        viewMode === 'card'
                            ? "grid grid-cols-[repeat(auto-fill,minmax(143px,154px))] gap-2 md:gap-3 justify-center"
                            : "flex flex-col gap-2"
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
                                    viewMode={viewMode}
                                    selectedAccountId={selectedAccountId}
                                    onSelectAccount={onSelectAccount}
                                    onEdit={onEdit}
                                    status={accountStatuses[account.win_user]}
                                />
                            ))}
                        </SortableContext>

                        {accounts.length === 0 && (
                            <div className="col-span-full w-full max-w-md mx-auto text-center p-8 md:p-12 text-zinc-600 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/10 mt-10">
                                <User size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="text-sm">{t('no_accounts_hint')}</p>
                            </div>
                        )}
                    </div>
                </DndContext>
            </div>

            <LogConsole logs={launchLogs} onClear={onClearLogs} />
        </div>
    );
};

export default Dashboard;
