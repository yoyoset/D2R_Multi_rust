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
        <div className="flex flex-col p-4 mx-auto w-full h-full overflow-hidden">
            <div className="flex justify-between items-center mb-3 flex-shrink-0 px-2">
                <div className="flex flex-col gap-0">
                    <h2 className="text-xs md:text-sm font-black text-white uppercase tracking-tighter flex items-center gap-2">
                        <div className="w-1 h-3.5 bg-primary rounded-t-sm"></div>
                        {t('account_manager')}
                        <span className="ml-1 px-1 py-0.5 rounded-sm bg-zinc-900 border border-white/10 text-[9px] text-zinc-500 font-mono">
                            {accounts.length.toString().padStart(2, '0')}
                        </span>
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if (onRefreshPaths) onRefreshPaths(); }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-zinc-800 bg-zinc-900 text-[10px] font-black text-zinc-500 uppercase tracking-tight hover:bg-zinc-800 hover:text-zinc-300 transition-all"
                    >
                        <RefreshCw size={12} />
                        {t('refresh_paths')}
                    </button>
                    <button 
                        onClick={onAdd} 
                        className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-primary/20 bg-primary/10 text-[10px] font-black text-primary uppercase tracking-tight hover:bg-primary/20 transition-all"
                    >
                        <Plus size={12} />
                        {t('add_account')}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto border border-white/5 bg-zinc-950/20 rounded-sm">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="border-b border-white/10 bg-zinc-900/40">
                            <th className="w-[40px] px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{t('table_avatar')}</th>
                            <th className="w-[120px] px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{t('table_system_user')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{t('table_bnet_identity')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{t('table_game_path')}</th>
                            <th className="px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter">{t('table_notes')}</th>
                            <th className="w-[80px] px-2 py-1.5 text-[10px] font-black text-zinc-500 uppercase tracking-tighter text-right pr-4">{t('table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {accounts.map((account) => (
                            <tr
                                key={account.id}
                                onClick={() => setSelectedId(account.id)}
                                className={cn(
                                    "group transition-all cursor-pointer h-[28px] hover:bg-white/5",
                                    selectedId === account.id ? "bg-primary/5 border-primary/20" : "",
                                    invalidAccountIds.has(account.id) ? "bg-rose-500/5 hover:bg-rose-500/10" : ""
                                )}
                            >
                                <td className="px-2 py-0.5">
                                    <div className="w-6 h-6 rounded-sm border border-white/10 bg-zinc-900 flex items-center justify-center overflow-hidden flex-shrink-0 relative mx-auto">
                                        {invalidAccountIds.has(account.id) && (
                                            <div className="absolute inset-0 bg-rose-950/40 flex items-center justify-center z-10">
                                                <Ghost size={10} className="text-rose-500" />
                                            </div>
                                        )}
                                        {account.avatar ? (
                                            account.avatar.length <= 3 ? (
                                                <ClassAvatar cls={account.avatar} size="sm" className="w-full h-full border-0" />
                                            ) : (
                                                <img src={account.avatar} alt="" className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <User size={12} className="text-zinc-700" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-2 py-0.5 text-technical text-zinc-400 group-hover:text-zinc-200 uppercase truncate">
                                    {account.win_user}
                                </td>
                                <td className="px-2 py-0.5 text-sm font-bold text-zinc-300 group-hover:text-white truncate flex items-center gap-1.5">
                                    <span className="truncate">{account.bnet_account || "---"}</span>
                                    {missingCredentialIds.has(account.id) && (
                                        <div title={t('msg.auth.reauth_required')} className="flex items-center text-amber-500 animate-pulse shrink-0">
                                            <AlertTriangle size={12} />
                                        </div>
                                    )}
                                    {account.skip_config_sync && (
                                        <span title={t('manual_snapshot_mode')} className="shrink-0">
                                            <Lock size={12} className="text-amber-500/80" />
                                        </span>
                                    )}
                                </td>
                                <td className="px-2 py-0.5 truncate">
                                    {account.game_path ? (
                                        <span className="text-[9px] font-mono text-zinc-500 opacity-60 hover:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis block" title={account.game_path}>
                                            {account.game_path}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-mono text-zinc-700 opacity-20 whitespace-nowrap overflow-hidden text-ellipsis block">---</span>
                                    )}
                                </td>
                                <td className="px-2 py-0.5 text-[11px] text-primary/60 italic truncate">
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
                                                    : "text-zinc-600 hover:text-amber-500"
                                            )}
                                        >
                                            <Save size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(account); }}
                                            className="p-1 text-zinc-600 hover:text-primary transition-colors rounded-sm"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(account.id); }}
                                            className="p-1 text-zinc-700 hover:text-red-500 transition-colors rounded-sm"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {accounts.length === 0 && (
                    <div className="text-center py-8 text-zinc-600 bg-zinc-900/5 text-xs font-mono uppercase tracking-widest">
                        {t('no_accounts_hint')}
                    </div>
                )}
            </div>

            <Modal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
                <ModalContent className="max-w-sm">
                    <ModalHeader onClose={() => setConfirmDeleteId(null)}>
                        <AlertTriangle size={14} className="text-red-500" />
                        {t('confirm_delete_title')}
                    </ModalHeader>
                    <ModalBody className="p-4">
                        <p className="text-zinc-500 text-[11px] leading-normal font-mono uppercase italic">
                            {t('confirm_delete_desc')}
                        </p>
                    </ModalBody>
                    <ModalFooter className="p-3 bg-zinc-950/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 rounded-sm uppercase tracking-widest text-[9px] font-black"
                            onClick={() => setConfirmDeleteId(null)}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="solid"
                            size="sm"
                            className="flex-1 bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600/30 rounded-sm uppercase tracking-widest text-[9px] font-black"
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
