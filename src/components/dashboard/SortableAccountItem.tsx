import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical, Edit2, Ghost, Lock, Save, AlertTriangle } from 'lucide-react';
import { Account, AccountStatus } from '../../lib/api';
import { ClassAvatar } from '../modals/AccountModal';
import { cn } from '../../lib/utils';

interface SortableAccountItemProps {
    account: Account;
    isInvalid: boolean;
    isMissingCredentials: boolean;
    viewMode: 'card' | 'list';
    selectedAccountId: string | null;
    onSelectAccount: (id: string) => void;
    onEdit: (account: Account) => void;
    onSaveSnapshot?: (account: Account) => void;
    status: AccountStatus | undefined;
}

export function SortableAccountItem({ account, isInvalid, isMissingCredentials, viewMode, selectedAccountId, onSelectAccount, onEdit, onSaveSnapshot, status }: SortableAccountItemProps) {
    const { t } = useTranslation();
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectAccount(account.id)}
            className={cn(
                "relative rounded-sm border cursor-pointer group overflow-hidden flex flex-col transition-all duration-200 shadow-lg/5",
                viewMode === 'card' ? "p-1.5 min-h-[84px] w-full justify-start" : "p-2 flex-row items-center",
                isDragging && "opacity-0",
                isInvalid ? "border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10" :
                    selectedAccountId === account.id
                        ? 'bg-zinc-900 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]'
                        : 'bg-zinc-900/40 border-white/5 hover:border-white/10 hover:bg-zinc-900/60'
            )}
        >
            {/* Vertical Status Indicator (Left) - Card Mode Only */}
            {viewMode === 'card' && (
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-500 z-30",
                    status?.d2r_active ? "bg-emerald-500 shadow-[2px_0_10px_rgba(16,185,129,0.5)]" : 
                    status?.bnet_active ? "bg-blue-500 shadow-[2px_0_10px_rgba(59,130,246,0.3)]" : "bg-zinc-800"
                )} />
            )}

            {/* Card Mode: Custom Layout */}
            {viewMode === 'card' ? (
                <>
                    {/* Integrated Action Bar (Top Right) - Compact */}
                    <div className={cn(
                        "absolute top-1.5 right-1.5 flex items-center p-0.5 rounded-sm bg-zinc-950/90 backdrop-blur-md border border-white/10 z-20 transition-all opacity-0 group-hover:opacity-100 shadow-xl gap-0.5",
                        selectedAccountId === account.id && "opacity-100"
                    )}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            title={t('edit')}
                            className="p-1 text-zinc-500 hover:text-primary transition-colors rounded-sm"
                        >
                            <Edit2 size={10} />
                        </button>
                        {onSaveSnapshot && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSaveSnapshot(account);
                                }}
                                title={t('save_snapshot')}
                                className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors rounded-sm border-l border-white/5"
                            >
                                <Save size={10} />
                            </button>
                        )}
                        <div {...attributes} {...listeners} className="p-1 text-zinc-500 hover:text-white cursor-grab border-l border-white/5">
                            <GripVertical size={10} />
                        </div>
                    </div>

                    <div className="flex justify-between items-start w-full gap-2">
                        <div className={cn(
                            "w-9 h-9 rounded-sm border flex items-center justify-center transition-all overflow-hidden bg-zinc-950 relative flex-shrink-0 shadow-inner",
                            selectedAccountId === account.id ? "border-primary/60" : "border-white/10",
                            isInvalid && "border-rose-500/50"
                        )}>
                            {isInvalid && (
                                <div className="absolute inset-0 bg-rose-950/60 flex items-center justify-center z-20 animate-pulse backdrop-blur-[1px]">
                                    <Ghost size={12} className="text-rose-500" />
                                </div>
                            )}
                            {account.avatar ? (
                                account.avatar.length <= 3 ? (
                                    <ClassAvatar cls={account.avatar} className="w-full h-full border-0 relative z-10 scale-110" />
                                ) : (
                                    <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover relative z-10" />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-900/80 relative z-10">
                                    <User size={16} className={selectedAccountId === account.id ? "text-primary/80" : "text-zinc-700"} />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className={cn(
                                    "text-[9px] uppercase font-mono tracking-wider transition-colors truncate",
                                    selectedAccountId === account.id ? "text-primary/90" : "text-zinc-500 group-hover:text-zinc-400"
                                )}>
                                    {account.win_user}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[12px] font-black truncate leading-tight transition-colors tracking-tight",
                                selectedAccountId === account.id ? "text-white" : "text-zinc-200 group-hover:text-white"
                            )}>
                                {account.bnet_account || "---"}
                                {isMissingCredentials && (
                                    <div title={t('msg.auth.reauth_required')} className="flex items-center text-amber-500 animate-pulse shrink-0 ml-1">
                                        <AlertTriangle size={12} />
                                    </div>
                                )}
                            </span>
                        </div>

                        {/* Status Dots moved to bottom right absolute for better layout stability */}
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 z-10 p-0.5 rounded-sm bg-zinc-950/20">
                             {account.skip_config_sync && <Lock size={10} className="text-amber-500 mr-1" />}
                             <div className={cn("w-1.5 h-1.5 rounded-full ring-1 ring-zinc-950/30", status?.bnet_active ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-zinc-800")}></div>
                             <div className={cn("w-1.5 h-1.5 rounded-full ring-1 ring-zinc-950/30", status?.d2r_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-zinc-800")}></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2 overflow-hidden">
                        {account.game_path && (
                            <span 
                                className="text-[9px] font-mono text-primary/60 truncate bg-primary/5 py-0.5 px-1.5 rounded-sm border border-primary/10 w-fit max-w-full transition-colors group-hover:border-primary/20 group-hover:bg-primary/10" 
                                title={account.game_path}
                            >
                                {account.game_path}
                            </span>
                        )}
                        
                        <div className="flex items-center justify-between gap-1 mt-0.5 min-h-[12px]">
                            <p className="text-[9px] font-medium text-zinc-500 truncate italic flex-1 group-hover:text-zinc-400">
                                {account.note || "---"}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                {/* Status badges removed as requested - using status dots instead */}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* List Mode: High Density Row */
                <div className="flex items-center gap-3 w-full px-1.5">
                    <div className={cn(
                        "w-4 h-4 rounded-sm border flex items-center justify-center transition-all",
                        selectedAccountId === account.id ? "border-primary/40" : "border-white/10",
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
                            <User size={14} className={selectedAccountId === account.id ? "text-primary/60" : "text-zinc-700"} />
                        )}
                    </div>

                    <span className="text-technical text-zinc-500 min-w-[70px] uppercase">
                        {account.win_user}
                    </span>

                    <span className={cn(
                        "text-sm font-black flex-1 truncate tracking-tighter flex items-center gap-1.5",
                        selectedAccountId === account.id ? "text-white" : "text-zinc-300"
                    )}>
                        {account.bnet_account || "---"}
                        {isMissingCredentials && (
                            <div title={t('msg.auth.reauth_required')} className="flex items-center text-amber-500 animate-pulse shrink-0">
                                <AlertTriangle size={12} />
                            </div>
                        )}
                    </span>
                    
                    {account.game_path ? (
                        <span className="text-[9px] font-mono text-zinc-600 flex-1 truncate max-w-[200px]" title={account.game_path}>
                            {account.game_path}
                        </span>
                    ) : (
                        <span className="text-[9px] font-mono text-zinc-800 flex-1 truncate opacity-30">---</span>
                    )}

                    <span className="text-[11px] font-medium text-primary/60 italic flex-1 truncate text-right">
                        {account.note || ""}
                    </span>

                    <div className="flex items-center gap-1.5 ml-4 flex-shrink-0 min-w-[40px] justify-end">
                        {account.skip_config_sync && <Lock size={10} className="text-amber-500/80 mr-1" />}
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.bnet_active ? "bg-blue-500 shadow-[0_0_4px_#3b82f6]" : "bg-zinc-800")}></div>
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.d2r_active ? "bg-emerald-500 shadow-[0_0_4px_#10b981]" : "bg-zinc-800")}></div>
                    </div>

                    {/* Edit, Snapshot & Drag Handle */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            title={t('edit')}
                            className="p-1 text-zinc-500 hover:text-primary transition-colors rounded-sm hover:bg-white/5"
                        >
                            <Edit2 size={12} />
                        </button>
                        {onSaveSnapshot && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSaveSnapshot(account);
                                }}
                                title={t('save_snapshot')}
                                className="p-1 text-zinc-500 hover:text-emerald-500 transition-colors rounded-sm hover:bg-white/5"
                            >
                                <Save size={12} />
                            </button>
                        )}
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1 text-zinc-500 hover:text-white cursor-grab active:cursor-grabbing rounded-sm hover:bg-white/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical size={12} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
