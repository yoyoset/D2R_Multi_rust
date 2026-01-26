import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, AccountStatus, getAccountsProcessStatus } from '../../lib/api';
import { Play, User, LayoutGrid, List, GripVertical, Edit2 } from 'lucide-react';
import { ClassAvatar } from '../modals/AccountModal';
import { Button } from '../ui/Button';
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
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DashboardProps {
    accounts: Account[];
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onLaunch: () => void;
    isLaunching: boolean;
    onReorder: (newAccounts: Account[]) => void;
    onEdit: (account: Account) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
    accounts,
    selectedAccountId,
    onSelectAccount,
    onLaunch,
    isLaunching,
    onReorder,
    onEdit
}) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [accountStatuses, setAccountStatuses] = useState<Record<string, AccountStatus>>({});

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = accounts.findIndex((a) => a.id === active.id);
            const newIndex = accounts.findIndex((a) => a.id === over.id);
            onReorder(arrayMove(accounts, oldIndex, newIndex));
        }
    };

    useEffect(() => {
        const poll = async () => {
            if (accounts.length === 0) return;
            try {
                const usernames = accounts.map(a => a.win_user);
                const statuses = await getAccountsProcessStatus(usernames);
                setAccountStatuses(statuses);
            } catch (e) {
                console.error("Failed to poll statuses", e);
            }
        };

        poll();
        const interval = setInterval(poll, 5000);
        return () => clearInterval(interval);
    }, [accounts]);

    return (
        <div className="flex flex-col h-full p-4 md:p-6 gap-4 md:gap-6 items-center w-full overflow-hidden">
            {/* View Mode Toggle - Fixed Top */}
            <div className="w-full max-w-5xl flex justify-between items-center sm:items-end flex-shrink-0 px-2 mt-2">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--color-primary)/0.5)]"></div>
                        {t('account_sanctum')}
                    </h2>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest pl-4">{t('entities_registered', { count: accounts.length })}</p>
                </div>
                <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('card')}
                        className={cn("p-1.5 rounded-md transition-all", viewMode === 'card' ? "bg-zinc-800 text-primary shadow-sm" : "text-zinc-600 hover:text-zinc-300")}
                    >
                        <LayoutGrid size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-zinc-800 text-primary shadow-sm" : "text-zinc-600 hover:text-zinc-300")}
                    >
                        <List size={14} />
                    </button>
                </div>
            </div>

            {/* Account Selection Area - Scrollable Center */}
            <div className="flex-1 w-full max-w-6xl overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-zinc-800 pr-1 px-2">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <div className={cn(
                        "w-full pb-6",
                        viewMode === 'card'
                            ? "grid grid-cols-[repeat(auto-fill,minmax(130px,140px))] gap-3 md:gap-4 justify-center"
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

            {/* Launch Action - Fixed Bottom */}
            <div className="flex-shrink-0 w-full max-w-5xl border-t border-white/5 bg-zinc-950/80 backdrop-blur-sm pt-4 pb-2 z-10 px-4">
                <Button
                    variant="solid"
                    size="lg"
                    onClick={onLaunch}
                    disabled={accounts.length === 0 || !selectedAccountId || isLaunching}
                    className={cn(
                        "w-full h-12 md:h-14 text-base md:text-lg rounded-lg shadow-lg tracking-widest font-bold transition-all",
                        (!selectedAccountId || accounts.length === 0) ? "bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed" : "bg-primary text-white hover:opacity-90"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Play size={18} className={cn("transition-transform fill-current", isLaunching ? "animate-pulse" : "group-hover:translate-x-1")} />
                        <span>{isLaunching ? t('launching') : t('launch_game')}</span>
                    </div>
                </Button>
            </div>
        </div>
    );
};

interface SortableAccountItemProps {
    account: Account;
    viewMode: 'card' | 'list';
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onEdit: (account: Account) => void;
    status: AccountStatus | undefined;
}

function SortableAccountItem({ account, viewMode, selectedAccountId, onSelectAccount, onEdit, status }: SortableAccountItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: account.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectAccount(account.id)}
            className={cn(
                "relative rounded-xl border cursor-pointer transition-all duration-300 group overflow-hidden active:scale-[0.97] flex flex-col",
                viewMode === 'card' ? "p-3 aspect-square justify-between shadow-sm" : "p-3 flex-row items-center",
                selectedAccountId === account.id
                    ? 'bg-zinc-900/90 border-primary/50 ring-1 ring-primary/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                    : 'bg-zinc-900/20 border-white/5 hover:bg-zinc-900/40 hover:border-white/10'
            )}
        >

            {/* Card Mode: Custom Layout */}
            {viewMode === 'card' ? (
                <>
                    {/* Integrated Action & Status Bar (Top Right) - Card Mode Only */}
                    <div className={cn(
                        "absolute top-2 right-2 flex flex-col items-center p-1 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md z-20 transition-all",
                        "opacity-40 group-hover:opacity-100 group-hover:bg-black/60 group-hover:border-white/10"
                    )}>
                        <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-white/10">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(account);
                                }}
                                className="p-0.5 text-zinc-500 hover:text-primary transition-colors rounded"
                            >
                                <Edit2 size={12} />
                            </button>
                            <div {...attributes} {...listeners} className="p-0.5 text-zinc-500 hover:text-white cursor-grab">
                                <GripVertical size={12} />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 px-0.5">
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-700", status?.bnet_active ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-zinc-800")}></div>
                            <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-700", status?.d2r_active ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800")}></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-start w-full">
                        <div className={cn(
                            "w-10 h-10 rounded-lg border flex items-center justify-center transition-all overflow-hidden bg-black/40",
                            selectedAccountId === account.id ? "border-primary/30" : "border-white/5 group-hover:border-white/20"
                        )}>
                            {account.avatar ? (
                                account.avatar.length <= 3 ? (
                                    <ClassAvatar cls={account.avatar} className="w-full h-full border-0" />
                                ) : (
                                    <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-800/50">
                                    <User size={18} className={selectedAccountId === account.id ? "text-primary/60" : "text-zinc-700"} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2">
                        <span className={cn(
                            "text-[10px] uppercase tracking-widest font-medium opacity-50",
                            selectedAccountId === account.id ? "text-primary" : "text-zinc-500"
                        )}>
                            {account.win_user}
                        </span>
                        <span className={cn(
                            "text-base font-bold truncate leading-tight transition-colors",
                            selectedAccountId === account.id ? "text-white" : "text-zinc-300 group-hover:text-white"
                        )}>
                            {account.bnet_account || "No Bnet ID"}
                        </span>
                    </div>

                    {account.note && (
                        <div className="mt-auto pt-2 border-t border-white/5">
                            <p className="text-sm font-bold text-primary/80 truncate italic">
                                {account.note}
                            </p>
                        </div>
                    )}
                </>
            ) : (
                /* List Mode: Horizontal Horizontal Row */
                <div className="flex items-center gap-4 w-full px-2">
                    <div className={cn(
                        "w-8 h-8 rounded border flex items-center justify-center transition-all overflow-hidden bg-black/40 flex-shrink-0",
                        selectedAccountId === account.id ? "border-primary/30" : "border-white/5"
                    )}>
                        {account.avatar ? (
                            account.avatar.length <= 3 ? (
                                <ClassAvatar cls={account.avatar} size="sm" className="w-full h-full border-0" />
                            ) : (
                                <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <User size={16} className={selectedAccountId === account.id ? "text-primary/60" : "text-zinc-700"} />
                        )}
                    </div>

                    <span className={cn(
                        "text-xs font-bold min-w-[80px] max-w-[120px] truncate uppercase tracking-tighter",
                        selectedAccountId === account.id ? "text-primary px-1.5 py-0.5 rounded bg-primary/10" : "text-zinc-500"
                    )}>
                        {account.win_user}
                    </span>

                    <span className={cn(
                        "text-base font-bold flex-1 truncate",
                        selectedAccountId === account.id ? "text-white" : "text-zinc-300"
                    )}>
                        {account.bnet_account || "---"}
                    </span>

                    <span className="text-base font-bold text-primary/70 italic flex-1 truncate text-right">
                        {account.note || ""}
                    </span>

                    <div className="flex items-center gap-1.5 ml-4 flex-shrink-0">
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.bnet_active ? "bg-blue-500" : "bg-zinc-800")}></div>
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.d2r_active ? "bg-emerald-500" : "bg-zinc-800")}></div>
                    </div>

                    {/* Edit & Drag Handle in list mode */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            className="p-1 text-zinc-500 hover:text-primary rounded hover:bg-white/5"
                        >
                            <Edit2 size={13} />
                        </button>
                        <div {...attributes} {...listeners} className="p-1 text-zinc-500 hover:text-white cursor-grab">
                            <GripVertical size={14} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
