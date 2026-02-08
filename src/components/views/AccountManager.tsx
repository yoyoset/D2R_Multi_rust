import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from '../../lib/api';
import { Button } from '../ui/Button';
import { Edit2, Trash2, Plus, User } from 'lucide-react';
import { ClassAvatar } from '../modals/AccountModal';

interface AccountManagerProps {
    accounts: Account[];
    onAdd: () => void;
    onEdit: (account: Account) => void;
    onDelete: (id: string) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onAdd, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

    const handleDelete = (id: string) => {
        setConfirmDeleteId(null);
        // Use requestAnimationFrame to ensure the modal closes before processing
        requestAnimationFrame(() => {
            onDelete(id);
        });
    };

    return (
        <div className="flex flex-col h-full p-4 md:p-6 max-w-4xl mx-auto w-full overflow-hidden">
            <div className="flex justify-between items-end mb-4 flex-shrink-0 px-2">
                <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-3">
                        <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--color-primary)/0.5)]"></div>
                        {t('account_manager')}
                    </h2>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-widest pl-4 opacity-60">{t('manage_accounts_hint')}</p>
                </div>
                <Button onClick={onAdd} variant="solid" size="sm" className="h-8 bg-primary text-white hover:opacity-90">
                    <Plus size={14} className="mr-1.5" />
                    {t('add_account')}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-2 space-y-2 pb-4 scrollbar-thin scrollbar-thumb-zinc-800">
                {accounts.map((account) => (
                    <div
                        key={account.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-900/20 border border-white/5 rounded-xl hover:bg-zinc-900/40 hover:border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg border border-white/5 bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {account.avatar ? (
                                    account.avatar.length <= 3 ? (
                                        <ClassAvatar cls={account.avatar} size="sm" />
                                    ) : (
                                        <img src={account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <User size={14} className="text-zinc-700" />
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-zinc-300 group-hover:text-white transition-colors leading-tight uppercase tracking-tighter">
                                    {account.win_user}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] text-zinc-400 font-bold leading-none">
                                        {account.bnet_account || t('no_bnet_id')}
                                    </span>
                                    {account.note && (
                                        <>
                                            <span className="text-zinc-800">|</span>
                                            <span className="text-[11px] font-bold text-primary/70 italic leading-none">
                                                {account.note}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(account)}
                                className="h-9 w-9 p-0 text-zinc-500 hover:text-primary hover:bg-white/5 rounded-lg transition-all"
                            >
                                <Edit2 size={16} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmDeleteId(account.id)}
                                className="h-9 w-9 p-0 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    </div>
                ))}

                {accounts.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-zinc-800 rounded-xl text-zinc-600 bg-zinc-900/5">
                        {t('no_accounts_hint')}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <Trash2 size={24} />
                            <h3 className="text-lg font-bold">{t('confirm_delete_title')}</h3>
                        </div>
                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                            {t('confirm_delete_desc')}
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                className="flex-1 text-zinc-400 hover:text-white"
                                onClick={() => setConfirmDeleteId(null)}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="solid"
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                                onClick={() => handleDelete(confirmDeleteId)}
                            >
                                {t('confirm_delete')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default AccountManager;
