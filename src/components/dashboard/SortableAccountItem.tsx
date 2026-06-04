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

    const isSelected = selectedAccountId === account.id;
    const isOnline = !!status?.d2r_active;

    // ---- shared sub-renders ----
    const Avatar = (
        <div className={cn("av", isOnline && "online")}>
            {isInvalid && (
                <div className="absolute inset-0 grid place-items-center z-20 bg-[rgba(207,90,68,0.25)] backdrop-blur-[1px]">
                    <Ghost size={16} className="text-danger" />
                </div>
            )}
            {account.avatar ? (
                account.avatar.length <= 3 ? (
                    <ClassAvatar cls={account.avatar} className="w-full h-full border-0" />
                ) : (
                    <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                )
            ) : (
                <User size={16} className={isSelected ? "text-gold/80" : "text-text-faint"} />
            )}
        </div>
    );

    const Actions = (
        <div className="acct-actions">
            <button
                onClick={(e) => { e.stopPropagation(); onEdit(account); }}
                title={t('edit')}
            >
                <Edit2 size={14} />
            </button>
            {onSaveSnapshot && (
                <button
                    className="snap"
                    onClick={(e) => { e.stopPropagation(); onSaveSnapshot(account); }}
                    title={t('save_snapshot')}
                >
                    <Save size={14} />
                </button>
            )}
            <div
                className="drag"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                title="Reorder"
            >
                <GripVertical size={14} />
            </div>
        </div>
    );

    const StatusPips = (
        <>
            {account.skip_config_sync && <Lock size={13} className="lock-ic" />}
            <span className={cn("pip", status?.bnet_active && "on")} />
            <span className={cn("pip", status?.d2r_active && "play")} />
        </>
    );

    // ============================= CARD =============================
    if (viewMode === 'card') {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={() => onSelectAccount(account.id)}
                className={cn("gcard group fade-in", isSelected && "sel", isInvalid && "invalid")}
            >
                <div className="gc-top">
                    {Avatar}
                    <div className="min-w-0 flex-1">
                        <div className="gc-alias truncate" title={account.bnet_account || ''}>
                            {account.bnet_account || "—"}
                        </div>
                        <div className="gc-uid truncate">{account.win_user}</div>
                    </div>
                    {isMissingCredentials && (
                        <span className="warn-ic shrink-0" title={t('msg.auth.reauth_required')}>
                            <AlertTriangle size={13} />
                        </span>
                    )}
                </div>

                <div className="gc-foot">
                    <span className="gc-note truncate" title={account.note || account.game_path || ''}>
                        {account.note || (account.game_path ? account.game_path.split(/[\\/]/).pop() : "—")}
                    </span>
                    <span className="col-status">{StatusPips}</span>
                </div>

                {Actions}
            </div>
        );
    }

    // ============================= LIST =============================
    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectAccount(account.id)}
            className={cn("acct-row group", isSelected && "sel", isInvalid && "invalid")}
        >
            {Avatar}

            <div className="col-uid truncate">{account.win_user}</div>

            <div className={cn("col-alias", !account.bnet_account && "muted")}>
                {account.bnet_account || "—"}
                {isMissingCredentials && (
                    <span className="warn-ic" title={t('msg.auth.reauth_required')}>
                        <AlertTriangle size={14} />
                    </span>
                )}
            </div>

            <div className={cn("col-path", !account.game_path && "none")} title={account.game_path}>
                {account.game_path || "—"}
            </div>

            <div className="col-class truncate">{account.note || ""}</div>

            <div className="col-status">{StatusPips}</div>

            {Actions}
        </div>
    );
}
