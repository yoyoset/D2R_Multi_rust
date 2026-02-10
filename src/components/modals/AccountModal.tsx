import { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Account, AppConfig, saveConfig, getWindowsUsers, createWindowsUser, getWhoami, invoke } from "../../lib/api";
import { useNotification } from "../../store/useNotification";
import { useLogs } from "../../store/useLogs";
import { useTranslation } from "react-i18next";
import { UserRound, Sparkles, AlertCircle, ChevronLeft, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { useBlockingNotification } from "../../store/useBlockingNotification";

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
    const { addNotification } = useNotification();
    const { show: showBlocking } = useBlockingNotification();
    const addLog = useLogs(state => state.addLog);


    // Form State
    const [winUser, setWinUser] = useState("");
    const [winPass, setWinPass] = useState("");
    const [bnetAccount, setBnetAccount] = useState("");
    const [note, setNote] = useState("");
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [passNeverExpires, setPassNeverExpires] = useState(true);


    // UI state
    const [isManualInput, setIsManualInput] = useState(false);
    const [osUsers, setOsUsers] = useState<string[]>([]);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScannedDeep, setHasScannedDeep] = useState(false);
    const [currentUser, setCurrentUser] = useState("");
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

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
                setPassNeverExpires(editingAccount.password_never_expires ?? true);
                setIsCreatingNew(false);
                setIsManualInput(editingAccount.win_user.includes("\\"));
            } else {
                setWinUser("");
                setWinPass("");
                setBnetAccount("");
                setNote("");
                setAvatar(undefined);
                setPassNeverExpires(true);
                setIsCreatingNew(false);
                setIsManualInput(false);
            }
        }
    }, [editingAccount, isOpen]);


    const handleSave = async () => {
        if (!winUser.trim()) return;
        setIsSaving(true);
        try {
            // Setup a safety timeout for backend calls
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("系统响应超时，请确认是否具备管理员权限或账户是否被锁定")), 15000)
            );

            if (isCreatingNew) {
                addLog({ message: t('log_creating_user', { name: winUser }), level: 'info' });
                await Promise.race([
                    createWindowsUser(winUser, winPass, passNeverExpires),
                    timeoutPromise
                ]);
                addNotification('success', t('user_created_success') || 'User created successfully');
            } else if (editingAccount && passNeverExpires !== editingAccount.password_never_expires) {
                addLog({ message: t('log_syncing_policy', { name: winUser }), level: 'info' });
                await Promise.race([
                    invoke('set_password_never_expires', { username: winUser, neverExpires: passNeverExpires }),
                    timeoutPromise
                ]);
                addNotification('success', t('policy_synced_success') || 'Policy synced successfully');
            }

            const newId = editingAccount ? editingAccount.id : crypto.randomUUID();
            const newAccount: Account = {
                id: newId,
                win_user: winUser,
                win_pass: winPass || undefined,
                bnet_account: bnetAccount,
                note: note || undefined,
                avatar: avatar,
                password_never_expires: passNeverExpires,
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
            addNotification('success', t('save_success'));
            onClose();

            // If a new user was actually created in the system, show the jump dialog
            if (isCreatingNew) {
                showBlocking(
                    t('jump_to_login_title'),
                    t('jump_to_login_desc'),
                    [
                        {
                            label: t('jump_to_login_cancel'),
                            variant: 'outline',
                            onClick: () => { }
                        },
                        {
                            label: t('jump_to_login_btn'),
                            variant: 'primary',
                            onClick: async () => {
                                try {
                                    // Trigger Windows user switch screen
                                    await invoke('open_user_switch');
                                } catch (e) {
                                    console.error("Failed to trigger user switch", e);
                                }
                            }
                        }
                    ],
                    'info'
                );
            }
        } catch (e) {
            addNotification('error', `${e}`);
            addLog({ message: t('log_save_account_failed', { error: String(e) }), level: 'error' });
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
                    {editingAccount ? `${t('edit_account')}: ${editingAccount.win_user}` : t('add_account')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-6">
                        {/* Windows User Section */}
                        <div className="space-y-3">
                            {!editingAccount && (
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
                                            className={cn(
                                                "text-[10px] px-2 py-1 rounded transition-all flex items-center gap-1",
                                                isCreatingNew
                                                    ? "text-zinc-400 hover:text-white underline underline-offset-4"
                                                    : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 font-bold shadow-[0_0_10px_rgb(var(--color-primary)/0.2)]"
                                            )}
                                        >
                                            {isCreatingNew ? t('use_existing_user') : (
                                                <>
                                                    <Sparkles size={10} />
                                                    {t('create_new_win_user')}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isManualInput && !editingAccount ? (
                                <div className="space-y-4 animate-in slide-in-from-top-1">
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-zinc-400 min-w-[3rem] whitespace-nowrap">
                                            {t('label_username')}
                                        </label>
                                        <input
                                            type="text"
                                            value={winUser}
                                            onChange={(e) => setWinUser(e.target.value)}
                                            className="flex-1 bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                            placeholder={t('win_username')}
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="text-sm font-medium text-zinc-400 min-w-[3rem] whitespace-nowrap">
                                            {t('label_password')}
                                        </label>
                                        <input
                                            type="password"
                                            value={winPass}
                                            onChange={(e) => setWinPass(e.target.value)}
                                            className="flex-1 bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                            placeholder={t('win_password')}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {!editingAccount && (
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
                                    )}

                                    {winUser && (
                                        <div className="space-y-3 animate-in fade-in duration-300">
                                            <div className="flex items-center gap-4">
                                                <label className="text-sm font-medium text-zinc-400 min-w-[3rem] whitespace-nowrap">
                                                    {t('label_password')}
                                                </label>
                                                <input
                                                    type="password"
                                                    value={winPass}
                                                    onChange={(e) => setWinPass(e.target.value)}
                                                    className="flex-1 bg-black/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-gray-200 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-mono"
                                                    placeholder={t('win_password')}
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 p-2 group/check cursor-pointer" onClick={() => setPassNeverExpires(!passNeverExpires)}>
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                    passNeverExpires ? "bg-primary border-primary shadow-[0_0_8px_rgb(var(--color-primary)/0.4)]" : "border-zinc-700 bg-black/40 group-hover/check:border-zinc-500"
                                                )}>
                                                    {passNeverExpires && <Check size={12} className="text-black stroke-[4px]" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-zinc-300 group-hover/check:text-white transition-colors">
                                                        {t('win_pass_never_expires')}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-500">
                                                        {t('win_pass_never_expires_hint')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {winUser && (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg text-xs text-amber-500/80 leading-relaxed">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <span>
                                        {t('pin_warning')}
                                        {isHost && (
                                            <span className="block mt-0.5 text-green-500 font-bold">
                                                {t('host_no_pass_hint')}
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
                            <div className="flex flex-wrap gap-2.5 relative">
                                {Object.keys(CLASS_AVATARS).map(cls => (
                                    <button
                                        key={cls}
                                        type="button"
                                        onMouseEnter={() => setPreviewAvatar(CLASS_AVATARS[cls].src)}
                                        onMouseLeave={() => setPreviewAvatar(null)}
                                        onClick={() => setAvatar(cls)}
                                        className={cn(
                                            "relative transition-all duration-200 outline-none rounded-lg",
                                            avatar === cls ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-900 scale-105 z-10" : "hover:scale-105 opacity-60 hover:opacity-100"
                                        )}
                                    >
                                        <ClassAvatar cls={cls} size="sm" />
                                    </button>
                                ))}
                                <label
                                    onMouseEnter={() => avatar?.startsWith('data:') && setPreviewAvatar(avatar)}
                                    onMouseLeave={() => setPreviewAvatar(null)}
                                    className={cn(
                                        "w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-all bg-black/40 hover:bg-black/60",
                                        avatar?.startsWith('data:') ? "border-primary text-primary" : "border-white/10 text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                const result = reader.result as string;
                                                setAvatar(result);
                                                setPreviewAvatar(result);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                    <Sparkles size={12} />
                                </label>

                                {/* Preview Popup */}
                                {previewAvatar && (
                                    <div className="absolute bottom-full left-0 mb-4 p-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] animate-in zoom-in-95 duration-200 pointer-events-none">
                                        <img
                                            src={previewAvatar}
                                            alt="Preview"
                                            className="w-32 h-32 object-cover rounded-lg border border-white/5"
                                        />
                                    </div>
                                )}
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
