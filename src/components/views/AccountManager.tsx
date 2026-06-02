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
        // Use requestAnimationFrame to ensure the modal closes before processing
        requestAnimationFrame(() => {
            onDelete(id);
        });
    };

    return (
        <div className="flex flex-col p-6 mx-auto w-full h-full overflow-hidden">
            <div className="flex justify-between items-center mb-3 flex-shrink-0 px-2">
                <div className="flex flex-col gap-0">
                    <h2 className="text-[14px] md:text-[14px] font-black text-text uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-gold rounded-t-sm"></div>
                        {t('account_manager')}
                        <span className="ml-1 px-1 py-0.5 rounded-sm bg-surface border border-line-2 text-[10px] text-text-dim font-mono">
                            {accounts.length.toString().padStart(2, '0')}
                        </span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if (onRefreshPaths) onRefreshPaths(); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-line bg-surface text-[10px] font-black text-text-dim uppercase tracking-tight hover:bg-surface/80 hover:text-text-dim transition-all"
                    >
                        <RefreshCw size={16} />
                        {t('refresh_paths')}
                    </button>
                    <button 
                        onClick={onAdd} 
                        className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-gold/20 bg-gold/10 text-[10px] font-black text-gold uppercase tracking-tight hover:bg-gold/20 transition-all"
                    >
                        <Plus size={16} />
                        {t('add_account')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto border border-line bg-bg/20 rounded-sm">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="border-b border-line-2 bg-surface/40">
                            <th className="w-[40px] px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter">{t('table_avatar')}</th>
                            <th className="w-[120px] px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter">{t('table_system_user')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter">{t('table_bnet_identity')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter">{t('table_game_path')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter">{t('table_notes')}</th>
                            <th className="w-[80px] px-2 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-tighter text-right pr-4">{t('table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {accounts.map((account) => (
                            <tr
                                key={account.id}
                                onClick={() => setSelectedId(account.id)}
                                className={cn(
                                    "group transition-all cursor-pointer h-[28px] hover:bg-line/5",
                                    selectedId === account.id ? "bg-gold/5 border-gold/20" : "",
                                    invalidAccountIds.has(account.id) ? "bg-danger/5 hover:bg-danger/10" : ""
                                )}
                            >
                                <td className="px-2 py-0.5">
                                    <div className="w-6 h-6 rounded-sm border border-line-2 bg-surface flex items-center justify-center overflow-hidden flex-shrink-0 relative mx-auto">
                                        {invalidAccountIds.has(account.id) && (
                                            <div className="absolute inset-0 bg-danger/30 flex items-center justify-center z-10">
                                                <Ghost size={16} className="text-danger" />
                                            </div>
                                        )}
                                        {account.avatar ? (
                                            account.avatar.length <= 3 ? (
                                                <ClassAvatar cls={account.avatar} size="sm" className="w-full h-full border-0" />
                                            ) : (
                                                <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <User size={16} className="text-text-faint" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-2 py-0.5 text-[10px] font-mono text-text-dim group-hover:text-text-dim uppercase truncate">
                                    {account.win_user}
                                </td>
                                <td className="px-2 py-0.5 text-[14px] font-bold text-text group-hover:text-text truncate flex items-center gap-1.5">
                                    <span className="truncate">{account.bnet_account || "---"}</span>
                                    {missingCredentialIds.has(account.id) && (
                                        <div title={t('msg.auth.reauth_required')} className="flex items-center text-warn animate-pulse shrink-0">
                                            <AlertTriangle size={16} />
                                        </div>
                                    )}
                                    {account.skip_config_sync && (
                                        <span title={t('manual_snapshot_mode')} className="shrink-0">
                                            <Lock size={16} className="text-warn/80" />
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-0.5 truncate">
                                    {account.game_path ? (
                                        <span className="text-[10px] font-mono text-text-dim opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis block" title={account.game_path}>
                                            {account.game_path}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-mono text-zinc-700 opacity-20 whitespace-nowrap overflow-hidden text-ellipsis block">---</span>
                                    )}
                                </td>
                                <td className="px-2 py-0.5 text-[10px] text-gold/60 italic truncate">
                                    {account.note || ""}
                                </td>
                                <td className="px-2 py-0.5 text-right pr-4">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                "p-1.5 transition-all duration-300 rounded-sm",
                                                account.skip_config_sync 
                                                    ? "text-amber-500 hover:text-amber-400 bg-amber-500/10" 
                                                    : "text-text-dim hover:text-amber-500"
                                            )}
                                        >
                                            <Save size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(account); }}
                                            className="p-1 text-text-dim hover:text-gold transition-colors rounded-sm"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(account.id); }}
                                            className="p-1 text-zinc-700 hover:text-red-500 transition-colors rounded-sm"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {accounts.length === 0 && (
                    <div className="text-center py-8 text-text-dim bg-surface/5 text-[14px] font-mono uppercase tracking-widest">
                        {t('no_accounts_hint')}
                    </div>
                )}
            </div>

            <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <ModalContent className="max-w-sm">
                    <ModalHeader onClose={() => setConfirmDeleteId(null)}>
                        <AlertTriangle size={16} className="text-red-500" />
                        {t('confirm_delete_title')}
                    </ModalHeader>
                    <ModalBody className="p-4">
                        <p className="text-text-dim text-[10px] leading-normal font-mono uppercase italic">
                            {t('confirm_delete_desc')}
                        </p>
                    </ModalBody>
                    <ModalFooter className="p-3 bg-bg/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 rounded-sm uppercase tracking-widest text-[10px] font-black"
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            className="flex-1 bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600/30 rounded-sm uppercase tracking-widest text-[10px] font-black"
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
