import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical, Edit2, Ghost } from 'lucide-react';
import { Account, AccountStatus } from '../../lib/api';
import { ClassAvatar } from '../modals/AccountModal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface SortableAccountItemProps {
    account: Account;
    isInvalid: boolean;
    viewMode: 'card' | 'list';
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onEdit: (account: Account) => void;
    status: AccountStatus | undefined;
}

export function SortableAccountItem({ account, isInvalid, viewMode, selectedAccountId, onSelectAccount, onEdit, status }: SortableAccountItemProps) {
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
        transition: isDragging ? undefined : transition,
        zIndex: isDragging ? 100 : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    const isActive = status?.bnet_active || status?.d2r_active;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectAccount(account.id)}
            className={cn(
                "relative rounded-xl border cursor-pointer group overflow-hidden flex flex-col",
                !isDragging && "transition-all duration-200 hover:scale-[1.02] hover:bg-zinc-900/40",
                viewMode === 'card' ? "p-3 aspect-square justify-between shadow-sm" : "p-3 flex-row items-center",
                isDragging && "opacity-0",
                isInvalid ? "border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10" :
                    selectedAccountId === account.id
                        ? 'bg-zinc-900/90 border-primary/50 shadow-[0_0_20px_rgba(var(--color-primary),0.15)] ring-1 ring-primary/20'
                        : 'bg-zinc-900/20 border-white/5 hover:border-white/10'
            )}
        >


            {/* Card Mode: Custom Layout */}
            {viewMode === 'card' ? (
                <>
                    {/* Integrated Action & Status Bar (Top Right) - Card Mode Only */}
                    <div className={cn(
                        "absolute top-2 right-2 flex flex-col items-center p-1 rounded-lg bg-black/40 border border-white/5 backdrop-blur-md z-20 transition-all",
                        "opacity-40 group-hover:opacity-100 group-hover:bg-black/60 group-hover:border-white/10",
                        isActive && "opacity-100 border-primary/20 bg-black/60"
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
                            "w-12 h-12 rounded-lg border flex items-center justify-center transition-all overflow-hidden bg-black/40 relative flex-shrink-0",
                            selectedAccountId === account.id ? "border-primary/30" : "border-white/5",
                            isActive && "border-primary/40 ring-2 ring-primary/20",
                            isInvalid && "border-rose-500/50"
                        )}>
                            {isInvalid && (
                                <div className="absolute inset-0 bg-rose-950/40 flex items-center justify-center z-20 animate-pulse backdrop-blur-[1px]">
                                    <Ghost size={16} className="text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                </div>
                            )}
                            {account.avatar ? (
                                account.avatar.length <= 3 ? (
                                    <ClassAvatar cls={account.avatar} className="w-full h-full border-0 relative z-10" />
                                ) : (
                                    <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover relative z-10" />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-800/50 relative z-10">
                                    <User size={18} className={selectedAccountId === account.id ? "text-primary/60" : "text-zinc-700"} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2">
                        <div className="flex items-center justify-between">
                            <span className={cn(
                                "text-[10px] uppercase tracking-widest font-medium opacity-50",
                                selectedAccountId === account.id ? "text-primary" : "text-zinc-500"
                            )}>
                                {account.win_user}
                            </span>
                            {status?.d2r_active && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-500 px-1 rounded font-bold animate-pulse">
                                    RUNNING
                                </span>
                            )}
                        </div>
                        <span className={cn(
                            "text-base font-bold truncate leading-tight transition-colors",
                            selectedAccountId === account.id ? "text-white" : "text-zinc-300 group-hover:text-white"
                        )}>
                            {account.bnet_account || "No Bnet ID"}
                        </span>
                    </div>

                    <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between overflow-hidden">
                        <p className="text-sm font-bold text-primary/80 truncate italic flex-1">
                            {account.note}
                        </p>
                        {status?.bnet_active && !status?.d2r_active && (
                            <span className="text-[8px] text-blue-400 font-bold ml-2 flex-shrink-0">
                                BNET
                            </span>
                        )}
                    </div>
                </>
            ) : (
                /* List Mode: Horizontal Horizontal Row */
                <div className="flex items-center gap-4 w-full px-2">
                    <div className={cn(
                        "w-8 h-8 rounded border flex items-center justify-center transition-all overflow-hidden bg-black/40 flex-shrink-0 relative",
                        selectedAccountId === account.id ? "border-primary/30" : "border-white/5",
                        isInvalid && "border-rose-500/40"
                    )}>
                        {isInvalid && (
                            <div className="absolute inset-0 bg-rose-950/40 flex items-center justify-center z-20">
                                <Ghost size={12} className="text-rose-500" />
                            </div>
                        )}
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
                        "text-xs font-bold min-w-[80px] max-w-[120px] truncate uppercase tracking-tighter transition-colors",
                        selectedAccountId === account.id ? "text-primary" : "text-zinc-500"
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
                        <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-700", status?.bnet_active ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-zinc-800")}></div>
                        <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-700", status?.d2r_active ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-zinc-800")}></div>
                    </div>

                    {/* Edit & Drag Handle in list mode */}
                    <div className="flex items-center gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            className="h-9 w-9 p-0 text-zinc-500 hover:text-primary rounded-lg hover:bg-white/5 transition-all shadow-sm"
                        >
                            <Edit2 size={16} />
                        </Button>
                        <div
                            {...attributes}
                            {...listeners}
                            className="h-9 w-9 flex items-center justify-center text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing rounded-lg hover:bg-white/5 transition-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical size={16} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
