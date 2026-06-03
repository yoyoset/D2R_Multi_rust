import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account, invoke } from '../../lib/api';
import { Edit2, Trash2, Plus, User, Ghost, AlertTriangle, Save, Lock, RefreshCw } from 'lucide-react';
import { ClassAvatar } from '../modals/AccountModal';
import { cn } from '../../lib/utils';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useNotification } from '../../store/useNotification';

interface AccountManagerProps {
    accounts: Account[];
    invalidAccountIds: Set<string>;
    missingCredentialIds: Set<string>;
    onAdd: () => void;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
    onRefreshPaths?: () => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({ accounts, invalidAccountIds, missingCredentialIds, onAdd, onEdit, onDelete, onRefreshPaths }) => {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);

    const handleDelete = (id: string) => {
        setConfirmDeleteId(null);
        requestAnimationFrame(() => {
            onDelete(id);
        });
    };

    return (
        <div className="flex flex-col w-full h-full overflow-hidden">
            {/* Section header */}
            <div className="sec-head">
                <div className="sec-title">
                    <div className="sec-tick"></div>
                    <h1>{t('account_manager')}</h1>
                    <span className="ml-1 px-1.5 py-0.5 rounded-sm bg-surface border border-line-2 text-[11px] text-text-dim font-mono">
                        {accounts.length.toString().padStart(2, '0')}
                    </span>
                </div>
                <div className="sec-actions">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (onRefreshPaths) onRefreshPaths(); }}
                        className="ghost-btn"
                    >
                        <RefreshCw size={15} />
                        {t('refresh_paths')}
                    </button>
                    <button
                        onClick={onAdd}
                        className="ghost-btn !text-gold !border-gold/30 hover:!bg-gold/10"
                    >
                        <Plus size={15} />
                        {t('add_account')}
                    </button>
                </div>
            </div>

            {/* Account table (semantic .amt grid) */}
            <div className="flex-1 overflow-auto pb-6">
                <div className="amt">
                    <div className="amt-head">
                        <div>{t('table_avatar')}</div>
                        <div>{t('table_system_user')}</div>
                        <div>{t('table_bnet_identity')}</div>
                        <div>{t('table_game_path')}</div>
                        <div>{t('table_notes')}</div>
                        <div className="text-right">{t('table_actions')}</div>
                    </div>

                    {accounts.map((account) => {
                        const isInvalid = invalidAccountIds.has(account.id);
                        const isMissing = missingCredentialIds.has(account.id);
                        return (
                            <div
                                key={account.id}
                                onClick={() => setSelectedId(account.id)}
                                className={cn(
                                    "amt-row group cursor-pointer",
                                    selectedId === account.id && "bg-gold/5",
                                    isInvalid && "bg-danger/5"
                                )}
                            >
                                {/* avatar */}
                                <div className="av" style={{ width: 36, height: 36 }}>
                                    {isInvalid && (
                                        <div className="absolute inset-0 grid place-items-center z-10 bg-[rgba(207,90,68,0.25)]">
                                            <Ghost size={15} className="text-danger" />
                                        </div>
                                    )}
                                    {account.avatar ? (
                                        account.avatar.length <= 3 ? (
                                            <ClassAvatar cls={account.avatar} size="sm" className="w-full h-full border-0" />
                                        ) : (
                                            <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                        )
                                    ) : (
                                        <User size={15} className="text-text-faint" />
                                    )}
                                </div>

                                {/* system user */}
                                <div className="col-uid truncate">{account.win_user}</div>

                                {/* bnet identity */}
                                <div className={cn("col-alias", !account.bnet_account && "muted")}>
                                    <span className="truncate">{account.bnet_account || "—"}</span>
                                    {isMissing && (
                                        <span className="warn-ic animate-pulse" title={t('msg.auth.reauth_required')}>
                                            <AlertTriangle size={13} />
                                        </span>
                                    )}
                                    {account.skip_config_sync && (
                                        <span className="warn-ic" title={t('manual_snapshot_mode')}>
                                            <Lock size={12} />
                                        </span>
                                    )}
                                </div>

                                {/* game path */}
                                <div className={cn("col-path", !account.game_path && "none")} title={account.game_path}>
                                    {account.game_path || "—"}
                                </div>

                                {/* notes */}
                                <div className="col-class truncate" style={{ textAlign: 'left' }}>
                                    {account.note || ""}
                                </div>

                                {/* actions */}
                                <div className="flex items-center justify-end gap-0.5">
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await invoke('save_account_snapshot', { accountId: account.id });
                                                addNotification('success', t('snapshot_save_success'));
                                            } catch (err) {
                                                addNotification('error', String(err));
                                            }
                                        }}
                                        title={t('save_snapshot_hint')}
                                        className={cn(
                                            "p-1.5 rounded-sm transition-colors",
                                            account.skip_config_sync
                                                ? "text-warn bg-warn/10 hover:text-warn"
                                                : "text-text-faint hover:text-warn opacity-0 group-hover:opacity-100"
                                        )}
                                    >
                                        <Save size={15} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(account); }}
                                        title={t('edit')}
                                        className="p-1.5 text-text-faint hover:text-gold rounded-sm transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Edit2 size={15} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(account.id); }}
                                        title={t('confirm_delete')}
                                        className="p-1.5 text-text-faint hover:text-danger rounded-sm transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {accounts.length === 0 && (
                        <div className="empty-note">{t('no_accounts_hint')}</div>
                    )}
                </div>
            </div>

            {/* Delete confirmation */}
            <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <ModalContent className="max-w-sm">
                    <ModalHeader onClose={() => setConfirmDeleteId(null)}>
                        <AlertTriangle size={16} className="text-danger" />
                        {t('confirm_delete_title')}
                    </ModalHeader>
                    <ModalBody className="p-4">
                        <p className="text-text-dim text-[11px] leading-normal font-mono uppercase italic">
                            {t('confirm_delete_desc')}
                        </p>
                    </ModalBody>
                    <ModalFooter className="p-3 bg-bg/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 rounded-sm uppercase tracking-widest text-[11px] font-black"
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            className="flex-1 bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 rounded-sm uppercase tracking-widest text-[11px] font-black"
                            onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                        >
                            {t('confirm_delete')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default AccountManager;
