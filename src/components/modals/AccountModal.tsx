import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Account, AppConfig, saveConfig, getWindowsUsers, createWindowsUser, getWhoami } from "../../lib/api";
import { useTranslation } from "react-i18next";
import { UserRound, Sparkles, AlertCircle, ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';

// Import Avatar Assets
import amaImg from "../../assets/avatars/ama.png";
import sorImg from "../../assets/avatars/sor.png";
import necImg from "../../assets/avatars/nec.png";
import palImg from "../../assets/avatars/pal.png";
import barImg from "../../assets/avatars/bar.png";
import druImg from "../../assets/avatars/dru.png";
import assImg from "../../assets/avatars/ass.png";

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    editingAccount?: Account;
}

const CLASS_AVATARS: Record<string, { label: string; src: string }> = {
    'Ama': { label: 'Amazon', src: amaImg },
    'Sor': { label: 'Sorceress', src: sorImg },
    'Nec': { label: 'Necromancer', src: necImg },
    'Pal': { label: 'Paladin', src: palImg },
    'Bar': { label: 'Barbarian', src: barImg },
    'Dru': { label: 'Druid', src: druImg },
    'Ass': { label: 'Assassin', src: assImg },
};

export const ClassAvatar = ({ cls, size = "md", className }: { cls: string; size?: "sm" | "md" | "lg"; className?: string }) => {
    const config = CLASS_AVATARS[cls];
    if (!config) return null;

    const sizes = {
        sm: "w-7 h-7",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    };

    return (
        <div className={cn(
            "rounded-lg border border-white/10 flex items-center justify-center overflow-hidden bg-black relative group/avatar",
            sizes[size],
            className
        )}>
            <img
                src={config.src}
                alt={config.label}
                className="w-full h-full object-cover opacity-80 group-hover/avatar:opacity-100 transition-opacity"
            />
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>
    );
};

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
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader onClose={onClose}>
                    <UserRound size={16} />
                    {editingAccount ? t('edit_account') : t('add_account')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-6">
                        {/* Windows User Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-zinc-300">
                                    {t('win_user_binding')}
                                </label>
                                <div className="flex gap-3">
                                    {!isManualInput && !isCreatingNew ? (
                                        <button
                                            onClick={() => setIsManualInput(true)}
                                            className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                                        >
                                            {t('domain_work_account_link') || "Domain"}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setIsManualInput(false); setIsCreatingNew(false); }}
                                            className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                                        >
                                            <ChevronLeft size={10} /> {t('back_to_list')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setIsCreatingNew(!isCreatingNew); setIsManualInput(true); }}
                                        className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-4"
                                    >
                                        {isCreatingNew ? t('use_existing_user') : t('create_new_win_user')}
                                    </button>
                                </div>
                            </div>

                            {isManualInput ? (
                                <div className="space-y-4 animate-in slide-in-from-top-1">
                                    <input
                                        type="text"
                                        value={winUser}
                                        onChange={(e) => setWinUser(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                        placeholder={t('win_username')}
                                    />
                                    <input
                                        type="password"
                                        value={winPass}
                                        onChange={(e) => setWinPass(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                        placeholder={t('win_password')}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="relative group flex gap-3">
                                        <div className="relative flex-1">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
                                                <UserRound size={16} />
                                            </div>
                                            <select
                                                value={winUser}
                                                onChange={(e) => setWinUser(e.target.value)}
                                                className="w-full h-10 bg-black/50 border border-zinc-700/50 rounded-lg pl-10 pr-3 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
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
                                                className="h-10 px-4 border border-zinc-700/50 bg-black/20 hover:bg-black/40 text-xs"
                                            >
                                                <Sparkles size={12} className="mr-1.5 text-zinc-400" />
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
                                                className="w-full bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                                placeholder={t('win_password')}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {winUser && (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-500/80 leading-relaxed">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
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

                        {/* Class Avatar Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-zinc-300">
                                {t('avatar')}
                            </label>
                            <div className="flex flex-wrap gap-2.5">
                                {Object.keys(CLASS_AVATARS).map(cls => (
                                    <button
                                        key={cls}
                                        type="button"
                                        onClick={() => setAvatar(cls)}
                                        className={cn(
                                            "relative transition-all duration-200 outline-none rounded-lg",
                                            avatar === cls ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-900 scale-105 z-10" : "hover:scale-105 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <ClassAvatar cls={cls} size="sm" />
                                    </button>
                                ))}
                                <label className={cn(
                                    "w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all bg-black/40 hover:bg-black/60",
                                    avatar?.startsWith('data:') ? "border-primary text-primary" : "border-white/10 text-zinc-500 hover:text-zinc-300"
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

                        {/* Bnet Account & Note (Vertical Stack) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    {t('bnet_account')}
                                </label>
                                <input
                                    type="text"
                                    value={bnetAccount}
                                    onChange={(e) => setBnetAccount(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 font-medium transition-all"
                                    placeholder="Bnet ID..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">
                                    {t('note')}
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                    placeholder={t('note_placeholder') || "Note..."}
                                />
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button onClick={handleSave} size="sm" isLoading={isSaving} variant="solid" className="px-6">
                        {t('save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
