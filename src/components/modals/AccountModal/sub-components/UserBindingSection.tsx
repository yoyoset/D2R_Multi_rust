import { ChevronLeft, Sparkles, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../ui/Button";
import { cn } from "../../../../lib/utils";
import { Account } from "../../../../lib/api";

interface UserBindingSectionProps {
    editingAccount: boolean;
    isManualInput: boolean;
    setIsManualInput: (val: boolean) => void;
    isCreatingNew: boolean;
    setIsCreatingNew: (val: boolean) => void;
    winUser: string;
    setWinUser: (val: string) => void;
    osUsers: string[];
    isScanning: boolean;
    hasScannedDeep: boolean;
    handleDiscovery: (deep: boolean) => void;
    currentUser: string;
    existingAccounts: Account[];
}

export function UserBindingSection({
    editingAccount,
    isManualInput,
    setIsManualInput,
    isCreatingNew,
    setIsCreatingNew,
    winUser,
    setWinUser,
    osUsers,
    isScanning,
    hasScannedDeep,
    handleDiscovery,
    currentUser,
    existingAccounts
}: UserBindingSectionProps) {
    const { t } = useTranslation();

    if (editingAccount) return null;

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">
                    {t('win_user_binding')}
                </label>
                <div className="flex gap-3">
                    {(isManualInput || isCreatingNew) && (
                        <button
                            onClick={() => { setIsManualInput(false); setIsCreatingNew(false); }}
                            className="text-[14px] text-text-dim hover:text-white transition-colors flex items-center gap-1"
                        >
                            <ChevronLeft size={16} /> {t('back_to_list')}
                        </button>
                    )}
                    <button
                        onClick={() => { setIsCreatingNew(!isCreatingNew); setIsManualInput(true); }}
                        className={cn(
                            "text-[10px] px-2 py-1 rounded transition-all flex items-center gap-1",
                            isCreatingNew
                                ? "text-text-dim hover:text-white underline underline-offset-4"
                                : "bg-gold/20 text-gold border border-gold/30 hover:bg-gold/30 font-bold shadow-[0_0_10px_rgb(var(--c-gold)/0.2)]"
                        )}
                    >
                        {isCreatingNew ? t('use_existing_user') : (
                            <>
                                <Sparkles size={16} />
                                {t('create_new_win_user')}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {isManualInput ? (
                <div className="flex items-center gap-4 animate-in slide-in-from-top-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim min-w-[3rem] whitespace-nowrap">
                        {t('label_username')}
                    </label>
                    <input
                        type="text"
                        value={winUser}
                        onChange={(e) => setWinUser(e.target.value)}
                        className="flex-1 bg-black/50 border border-white/5 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all font-mono h-8"
                        placeholder={t('win_username')}
                    />
                </div>
            ) : (
                <div className="relative group flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim pointer-events-none">
                            <UserRound size={16} />
                        </div>
                        <select
                            value={winUser}
                            onChange={(e) => setWinUser(e.target.value)}
                            className="w-full h-10 bg-black/50 border border-white/10 rounded-sm pl-10 pr-3 text-[14px] text-text focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 appearance-none cursor-pointer transition-all"
                        >
                            <option value="" disabled>{t('select_win_user')}</option>
                            {osUsers.map(u => {
                                const isAlreadyAdded = existingAccounts.some(acc => acc.win_user.toLowerCase() === u.toLowerCase());
                                return (
                                    <option key={u} value={u} disabled={isAlreadyAdded}>
                                        {u} 
                                        {u.toLowerCase() === currentUser.toLowerCase() ? ` (${t('host_current')})` : ''}
                                        {isAlreadyAdded ? ` [${t('already_added')}]` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    {!hasScannedDeep && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDiscovery(true)}
                            isLoading={isScanning}
                            className="h-10 px-4 border border-white/10 bg-black/20 hover:bg-black/40 text-[14px]"
                        >
                            <Sparkles size={16} className="mr-1.5 text-text-dim" />
                            {t('scan_users')}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
