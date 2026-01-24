import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Account, AppConfig, saveConfig, getWindowsUsers, createWindowsUser, getWhoami } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { UserRound, Sparkles, AlertCircle, ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    editingAccount?: Account;
}

export function AccountModal({ isOpen, onClose, config, onSave, editingAccount }: AccountModalProps) {
    const { t } = useTranslation();

    // Form State
    const [winUser, setWinUser] = useState("");
    const [winPass, setWinPass] = useState("");
    const [bnetAccount, setBnetAccount] = useState("");
    const [note, setNote] = useState("");
    const [avatar, setAvatar] = useState<string | undefined>(undefined);

    // UI state
    const [isManualInput, setIsManualInput] = useState(false);
    const [osUsers, setOsUsers] = useState<string[]>([]);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScannedDeep, setHasScannedDeep] = useState(false);
    const [currentUser, setCurrentUser] = useState("");

    const handleDiscovery = async (deep: boolean = false) => {
        setIsScanning(true);
        try {
            const [users, whoami] = await Promise.all([
                getWindowsUsers(deep),
                getWhoami()
            ]);
            setCurrentUser(whoami);
            if (deep) setHasScannedDeep(true);

            // Deduplicate case-insensitively
            const combined = [whoami, ...users];
            const unique = combined.reduce((acc: string[], curr) => {
                if (!acc.some(u => u.toLowerCase() === curr.toLowerCase()) && curr.trim() !== "") {
                    acc.push(curr);
                }
                return acc;
            }, []);

            setOsUsers(unique);
        } catch (e) {
            console.error(e);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        if (isOpen && osUsers.length === 0) {
            handleDiscovery(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (editingAccount) {
                setWinUser(editingAccount.win_user);
                setWinPass(editingAccount.win_pass || "");
                setBnetAccount(editingAccount.bnet_account || "");
                setNote(editingAccount.note || "");
                setAvatar(editingAccount.avatar);
                setIsCreatingNew(false);
                setIsManualInput(editingAccount.win_user.includes("\\"));
            } else {
                setWinUser("");
                setWinPass("");
                setBnetAccount("");
                setNote("");
                setAvatar(undefined);
                setIsCreatingNew(false);
                setIsManualInput(false);
            }
        }
    }, [editingAccount, isOpen]);


    const handleSave = async () => {
        if (!winUser.trim()) return;
        setIsSaving(true);
        try {
            if (isCreatingNew) {
                await createWindowsUser(winUser, winPass);
            }

            const newId = editingAccount ? editingAccount.id : crypto.randomUUID();
            const newAccount: Account = {
                id: newId,
                win_user: winUser,
                win_pass: winPass || undefined,
                bnet_account: bnetAccount,
                note: note || undefined,
                avatar: avatar,
            };

            let newAccounts = [...config.accounts];
            if (editingAccount) {
                newAccounts = newAccounts.map(a => a.id === editingAccount.id ? newAccount : a);
            } else {
                newAccounts.push(newAccount);
            }

            const newConfig = { ...config, accounts: newAccounts };
            await saveConfig(newConfig);
            onSave(newConfig);
            onClose();
        } catch (e) {
            alert(`Error: ${e}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const isHost = winUser.toLowerCase() === currentUser.toLowerCase();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Fixed Header */}
                <div className="p-5 pb-3 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        {editingAccount ? t('edit_account') : t('add_account')}
                    </h2>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-zinc-400">
                                {t('win_user_binding')}
                            </label>
                            <div className="flex gap-3">
                                {!isManualInput && !isCreatingNew ? (
                                    <button
                                        onClick={() => setIsManualInput(true)}
                                        className="text-[10px] text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                                    >
                                        {t('domain_work_account_link') || "Domain"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setIsManualInput(false); setIsCreatingNew(false); }}
                                        className="text-[10px] text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <ChevronLeft size={10} /> {t('back_to_list')}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsCreatingNew(!isCreatingNew); setIsManualInput(true); }}
                                    className="text-[10px] text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                                >
                                    {isCreatingNew ? t('use_existing_user') : t('create_new_win_user')}
                                </button>
                            </div>
                        </div>

                        {isManualInput ? (
                            <div className="space-y-2 animate-in slide-in-from-top-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={winUser}
                                        onChange={(e) => setWinUser(e.target.value)}
                                        className="bg-black/50 border border-zinc-700/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none"
                                        placeholder={t('win_username')}
                                    />
                                    <input
                                        type="password"
                                        value={winPass}
                                        onChange={(e) => setWinPass(e.target.value)}
                                        className="bg-black/50 border border-zinc-700/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none"
                                        placeholder={t('win_password')}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative group flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                                            <UserRound size={14} />
                                        </div>
                                        <select
                                            value={winUser}
                                            onChange={(e) => setWinUser(e.target.value)}
                                            className="w-full bg-black/50 border border-zinc-700/50 rounded pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>{t('select_win_user')}</option>
                                            {osUsers.map(u => (
                                                <option key={u} value={u}>
                                                    {u} {u.toLowerCase() === currentUser.toLowerCase() ? `(${t('host_current')})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {!hasScannedDeep && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleDiscovery(true)}
                                            isLoading={isScanning}
                                            className="text-[10px] h-auto py-1 px-2 border border-white/5"
                                        >
                                            <Sparkles size={10} className="mr-1 text-zinc-400" />
                                            {t('scan_users')}
                                        </Button>
                                    )}
                                </div>

                                {winUser && (
                                    <div className="animate-in slide-in-from-top-1">
                                        <input
                                            type="password"
                                            value={winPass}
                                            onChange={(e) => setWinPass(e.target.value)}
                                            className="w-full bg-black/50 border border-zinc-700/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none"
                                            placeholder={t('win_password')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {winUser && (
                            <div className="flex items-start gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded text-[10px] text-amber-500/80 leading-tight">
                                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                <span>
                                    {t('pin_warning') || "Real Login Password required. NO PIN/Hello."}
                                    {isHost && (
                                        <span className="block mt-0.5 text-green-500 font-bold">
                                            {t('host_no_pass_hint') || "Current User [Host] doesn't need password."}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold text-zinc-400">
                                {t('avatar')}
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {['Ama', 'Sor', 'Nec', 'Pal', 'Bar', 'Dru', 'Ass'].map(cls => (
                                    <button
                                        key={cls}
                                        type="button"
                                        onClick={() => setAvatar(cls)}
                                        className={cn(
                                            "w-7 h-7 rounded border flex items-center justify-center text-[9px] font-bold uppercase transition-all",
                                            avatar === cls ? "border-primary bg-primary/20 text-primary" : "border-white/5 bg-black/40 text-zinc-600 hover:border-white/20"
                                        )}
                                    >
                                        {cls.substring(0, 1)}
                                    </button>
                                ))}
                                <label className={cn(
                                    "w-7 h-7 rounded border flex items-center justify-center cursor-pointer transition-all",
                                    avatar?.startsWith('data:') ? "border-primary bg-primary/20 text-primary" : "border-white/5 bg-black/40 text-zinc-600 hover:border-white/20"
                                )}>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setAvatar(reader.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                    <Sparkles size={12} />
                                </label>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                                    {t('bnet_account')}
                                </label>
                                <input
                                    type="text"
                                    value={bnetAccount}
                                    onChange={(e) => setBnetAccount(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none font-bold"
                                    placeholder="Bnet ID..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                                    {t('note')}
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700/50 rounded px-3 py-1.5 text-sm text-gray-200 focus:border-primary focus:outline-none"
                                    placeholder={t('note_placeholder') || "Note..."}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Fixed Footer */}
                <div className="p-5 pt-3 border-t border-white/5 flex justify-end gap-3 bg-zinc-900/50">
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={handleSave} size="sm" isLoading={isSaving} variant="solid" className="px-6">
                        {t('save')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
