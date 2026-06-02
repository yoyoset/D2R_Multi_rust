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
                "relative rounded-sm border cursor-pointer group overflow-hidden flex flex-col transition-all duration-200 shadow-sm",
                viewMode === 'card' ? "p-2 min-h-[84px] w-full justify-start" : "p-2 flex-row items-center",
                isDragging && "opacity-0",
                isInvalid ? "border-danger/50 bg-danger/5 hover:bg-danger/10" :
                    selectedAccountId === account.id
                        ? 'bg-surface border-gold shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]'
                        : 'bg-surface/30 border-line hover:border-line-2 hover:bg-surface/40'
            )}
        >
            {/* Vertical Status Indicator (Left) - Card Mode Only */}
            {viewMode === 'card' && (
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-500 z-30",
                    status?.d2r_active ? "bg-player shadow-[2px_0_10px_rgba(16,185,129,0.5)]" :
                    status?.bnet_active ? "bg-net shadow-[2px_0_10px_rgba(59,130,246,0.3)]" : "bg-text-faint"
                )} />
            )}

            {/* Card Mode: Custom Layout */}
            {viewMode === 'card' ? (
                <>
                    {/* Integrated Action Bar (Top Right) - Compact */}
                    <div className={cn(
                        "absolute top-2 right-2 flex items-center p-0.5 rounded-sm bg-bg/90 backdrop-blur-md border border-line-2 z-20 transition-all opacity-0 group-hover:opacity-100 shadow-card gap-0.5",
                        selectedAccountId === account.id && "opacity-100"
                    )}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            title={t('edit')}
                            className="p-1 text-text-dim hover:text-gold transition-colors rounded-sm"
                        >
                            <Edit2 size={16} />
                        </button>
                        {onSaveSnapshot && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSaveSnapshot(account);
                                }}
                                title={t('save_snapshot')}
                                className="p-1 text-text-dim hover:text-player transition-colors rounded-sm border-l border-line"
                            >
                                <Save size={16} />
                            </button>
                        )}
                        <div {...attributes} {...listeners} className="p-1 text-text-dim hover:text-text cursor-grab border-l border-line">
                            <GripVertical size={16} />
                        </div>
                    </div>

                    <div className="flex justify-between items-start w-full gap-2">
                        <div className={cn(
                            "w-9 h-9 rounded-sm border flex items-center justify-center transition-all overflow-hidden bg-bg relative flex-shrink-0 shadow-inner",
                            selectedAccountId === account.id ? "border-gold/60" : "border-line-2",
                            isInvalid && "border-danger/50"
                        )}>
                            {isInvalid && (
                                <div className="absolute inset-0 bg-danger/30 flex items-center justify-center z-20 animate-pulse backdrop-blur-[1px]">
                                    <Ghost size={16} className="text-danger" />
                                </div>
                            )}
                            {account.avatar ? (
                                account.avatar.length <= 3 ? (
                                    <ClassAvatar cls={account.avatar} className="w-full h-full border-0 relative z-10 scale-110" />
                                ) : (
                                    <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover relative z-10" />
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full bg-surface/80 relative z-10">
                                    <User size={16} className={selectedAccountId === account.id ? "text-gold/80" : "text-text-faint"} />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className={cn(
                                    "text-[10px] uppercase font-mono tracking-wider transition-colors truncate",
                                    selectedAccountId === account.id ? "text-gold/90" : "text-text-dim group-hover:text-text-dim"
                                )}>
                                    {account.win_user}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black truncate leading-tight transition-colors tracking-tight",
                                selectedAccountId === account.id ? "text-text" : "text-text group-hover:text-text"
                            )}>
                                {account.bnet_account || "---"}
                                {isMissingCredentials && (
                                    <div title={t('msg.auth.reauth_required')} className="flex items-center text-warn animate-pulse shrink-0 ml-1">
                                        <AlertTriangle size={16} />
                                    </div>
                                )}
                            </span>
                        </div>

                        {/* Status Dots moved to bottom right absolute for better layout stability */}
                        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 z-10 p-0.5 rounded-sm bg-bg/20">
                             {account.skip_config_sync && <Lock size={16} className="text-warn mr-1" />}
                             <div className={cn("w-1.5 h-1.5 rounded-full ring-1 ring-bg/30", status?.bnet_active ? "bg-net shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-text-faint")}></div>
                             <div className={cn("w-1.5 h-1.5 rounded-full ring-1 ring-bg/30", status?.d2r_active ? "bg-player shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-text-faint")}></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5 mt-2 overflow-hidden">
                        {account.game_path && (
                            <span 
                                className="text-[10px] font-mono text-gold/60 truncate bg-gold/5 py-0.5 px-1.5 rounded-sm border border-gold/10 w-fit max-w-full transition-colors group-hover:border-gold/20 group-hover:bg-gold/10" 
                                title={account.game_path}
                            >
                                {account.game_path}
                            </span>
                        )}
                        
                        <div className="flex items-center justify-between gap-1 mt-0.5 min-h-[12px]">
                            <p className="text-[10px] font-medium text-text-dim truncate italic flex-1 group-hover:text-text-dim">
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
                        selectedAccountId === account.id ? "border-gold/40" : "border-line-2",
                        isInvalid && "border-danger/40"
                    )}>
                        {isInvalid && (
                            <div className="absolute inset-0 bg-danger/30 flex items-center justify-center z-20">
                                <Ghost size={16} className="text-danger" />
                            </div>
                        )}
                        {account.avatar ? (
                            account.avatar.length <= 3 ? (
                                <ClassAvatar cls={account.avatar} size="sm" className="w-full h-full border-0" />
                            ) : (
                                <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            )
                        ) : (
                            <User size={16} className={selectedAccountId === account.id ? "text-gold/60" : "text-text-faint"} />
                        )}
                    </div>

                    <span className="text-[10px] font-mono text-text-dim min-w-[70px] uppercase">
                        {account.win_user}
                    </span>

                    <span className={cn(
                        "text-[14px] font-black flex-1 truncate tracking-tighter flex items-center gap-1.5",
                        selectedAccountId === account.id ? "text-text" : "text-text"
                    )}>
                        {account.bnet_account || "---"}
                        {isMissingCredentials && (
                            <div title={t('msg.auth.reauth_required')} className="flex items-center text-warn animate-pulse shrink-0">
                                <AlertTriangle size={16} />
                            </div>
                        )}
                    </span>
                    
                    {account.game_path ? (
                        <span className="text-[10px] font-mono text-text-dim flex-1 truncate max-w-[200px]" title={account.game_path}>
                            {account.game_path}
                        </span>
                    ) : (
                        <span className="text-[10px] font-mono text-text-faint flex-1 truncate opacity-30">---</span>
                    )}

                    <span className="text-[10px] font-medium text-gold/60 italic flex-1 truncate text-right">
                        {account.note || ""}
                    </span>

                    <div className="flex items-center gap-1.5 ml-4 flex-shrink-0 min-w-[40px] justify-end">
                        {account.skip_config_sync && <Lock size={16} className="text-warn/80 mr-1" />}
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.bnet_active ? "bg-net shadow-[0_0_4px_#3b82f6]" : "bg-text-faint")}></div>
                        <div className={cn("w-1.5 h-1.5 rounded-full", status?.d2r_active ? "bg-player shadow-[0_0_4px_#10b981]" : "bg-text-faint")}></div>
                    </div>

                    {/* Edit, Snapshot & Drag Handle */}
                    <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(account);
                            }}
                            title={t('edit')}
                            className="p-1 text-text-dim hover:text-gold transition-colors rounded-sm hover:bg-line/10"
                        >
                            <Edit2 size={16} />
                        </button>
                        {onSaveSnapshot && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSaveSnapshot(account);
                                }}
                                title={t('save_snapshot')}
                                className="p-1 text-text-dim hover:text-player transition-colors rounded-sm hover:bg-line/10"
                            >
                                <Save size={16} />
                            </button>
                        )}
                        <div
                            {...attributes}
                            {...listeners}
                            className="p-1 text-text-dim hover:text-text cursor-grab active:cursor-grabbing rounded-sm hover:bg-line/10"
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
