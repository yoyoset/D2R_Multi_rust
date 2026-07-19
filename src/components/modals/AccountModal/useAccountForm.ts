import { useState, useEffect, useCallback } from "react";
import { invoke, Account, AppConfig, saveConfig, getWindowsUsers, createWindowsUser, getWhoami, getSnapshotGamePaths } from "../../../lib/api";
import { useNotification } from "../../../store/useNotification";
import { useLogs } from "../../../store/useLogs";
import { useTranslation } from "react-i18next";
import { useBlockingNotification } from "../../../store/useBlockingNotification";
interface UseAccountFormProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    editingAccount?: Account;
    missingCredentialIds: Set<string>;
}

export function useAccountForm({ isOpen, onClose, config, onSave, editingAccount, missingCredentialIds }: UseAccountFormProps) {
    const { t } = useTranslation();
    const { addNotification } = useNotification();
    const { show: showBlocking } = useBlockingNotification();
    const addLog = useLogs(state => state.addLog);

    // Form State
    const [winUser, setWinUser] = useState("");
    const [winPass, setWinPass] = useState("");
    const [bnetAccount, setBnetAccount] = useState("");
    const [note, setNote] = useState("");
    const [gamePath, setGamePath] = useState<string | undefined>(undefined);
    const [baselinePath, setBaselinePath] = useState("");
    const [strictBaseline, setStrictBaseline] = useState(false);
    const [isD2r, setIsD2r] = useState(true);
    // Baseline suggestions extracted from the account's snapshot (configured paths)
    const [snapshotPaths, setSnapshotPaths] = useState<string[]>([]);
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [applyPasswordPolicy, setApplyPasswordPolicy] = useState(true);
    const [skipConfigSync, setSkipConfigSync] = useState(false);

    // UI state
    const [isManualInput, setIsManualInput] = useState(false);
    const [osUsers, setOsUsers] = useState<string[]>([]);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [hasScannedDeep, setHasScannedDeep] = useState(false);
    const [currentUser, setCurrentUser] = useState("");
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
    const [showPass, setShowPass] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isValidatingPass, setIsValidatingPass] = useState(false);
    const [isUnmanagedUser, setIsUnmanagedUser] = useState(false);

    // Custom toggle to handle password fetching
    const handleSetShowPass = async (val: boolean) => {
        if (val && winPass === "********" && editingAccount) {
            setIsValidatingPass(true);
            try {
                const realPass = await invoke('get_account_password', { id: editingAccount.id }) as string;
                setWinPass(realPass);
                setShowPass(true);
            } catch (e) {
                console.error("Failed to fetch password from vault", e);
                addNotification('error', t('vault_decrypt_failed'));
            } finally {
                setIsValidatingPass(false);
            }
        } else {
            setShowPass(val);
        }
    };

    const handleDiscovery = useCallback(async (deep: boolean = false) => {
        setIsScanning(true);
        try {
            // Note: depth is handled at backend via different command or logic, 
            // but the exported getWindowsUsers in api.ts doesn't take params anymore.
            const users = await getWindowsUsers();
            const whoami = await getWhoami();
            
            setCurrentUser(whoami);
            if (deep) setHasScannedDeep(true);

            // Extract names and deduplicate
            const combined = [whoami, ...users.map(u => u.name)];
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
    }, []);

    useEffect(() => {
        if (isOpen && osUsers.length === 0) {
            handleDiscovery(false);
        }
    }, [isOpen, handleDiscovery, osUsers.length]);

    useEffect(() => {
        if (isOpen) {
            if (editingAccount) {
                setWinUser(editingAccount.win_user);
                // 馃洝锔?INTELLIGENT INITIALIZATION:
                // Show placeholder if vault has a credential, otherwise keep empty. 
                // This prevents the empty-string reset bug when the user just wants to "keep existing".
                const hasCredential = !missingCredentialIds.has(editingAccount.id);
                setWinPass(hasCredential ? "********" : "");
                setBnetAccount(editingAccount.bnet_account || "");
                setNote(editingAccount.note || "");
                setGamePath(editingAccount.game_path);
                setBaselinePath(editingAccount.baseline_path || "");
                setStrictBaseline(editingAccount.strict_baseline ?? false);
                setIsD2r(editingAccount.is_d2r ?? true);
                setSnapshotPaths([]);
                // Suggest the configured path(s) found in this account's snapshot
                getSnapshotGamePaths(editingAccount.id)
                    .then(setSnapshotPaths)
                    .catch(() => setSnapshotPaths([]));
                setAvatar(editingAccount.avatar);
                setApplyPasswordPolicy(editingAccount.auto_fix_password ?? true);
                setSkipConfigSync(editingAccount.skip_config_sync ?? false);
                setIsCreatingNew(false);
                setIsManualInput(editingAccount.win_user.includes("\\"));
                setIsUnmanagedUser(editingAccount.win_user.includes("\\") && editingAccount.win_user.toLowerCase() !== currentUser.toLowerCase());
            } else {
                setWinUser("");
                setWinPass("");
                setBnetAccount("");
                setNote("");
                setGamePath(undefined);
                setBaselinePath("");
                setStrictBaseline(false);
                setIsD2r(true);
                setSnapshotPaths([]);
                setAvatar(undefined);
                setApplyPasswordPolicy(true);
                setSkipConfigSync(false);
                setIsCreatingNew(false);
                setIsManualInput(false);
                setIsUnmanagedUser(false);
            }
            setPasswordError(null);
            setShowPass(false);
        }
    }, [editingAccount, isOpen, currentUser]);

    // Microsoft Account check
    useEffect(() => {
        const checkUnmanaged = async () => {
            if (!winUser || !isOpen) return;
            try {
                const isDomain = winUser.includes("\\");
                const isSelf = winUser.toLowerCase() === currentUser.toLowerCase();
                
                if (isDomain && !isSelf) {
                    setIsUnmanagedUser(true);
                    setApplyPasswordPolicy(false);
                    return;
                }

                const isMS = await invoke('check_microsoft_account', { username: winUser });
                if (isMS && !isSelf) {
                    setIsUnmanagedUser(true);
                    setApplyPasswordPolicy(false);
                } else {
                    setIsUnmanagedUser(false);
                }
            } catch (e) {
                setIsUnmanagedUser(false);
            }
        };
        checkUnmanaged();
    }, [winUser, currentUser, isOpen]);

    const verifyWindowsPassword = async (pass: string) => {
        if (!pass || isCreatingNew || !winUser || pass === "********") {
            setPasswordError(null);
            return;
        }
        setIsValidatingPass(true);
        try {
            const isValid = await invoke('verify_windows_password', { 
                username: winUser, 
                password: pass,
                accountId: editingAccount?.id
            });
            if (!isValid) {
                setPasswordError(t('win_password_mismatch'));
            } else {
                setPasswordError(null);
            }
        } catch (e) {
            console.error("Verification failed", e);
        } finally {
            setIsValidatingPass(false);
        }
    };

    // Mirror of the backend's normalize_config_path — for the UI-side
    // baseline/snapshot consistency hint only; the authoritative comparison
    // lives in the backend gates.
    const normalizePath = (s: string) => {
        let p = s.trim().replace(/^["']+|["']+$/g, '').trim().toLowerCase().replace(/\\/g, '/');
        p = p.replace(/\/+$/, '');
        if (p.endsWith('/d2r.exe')) p = p.slice(0, -'/d2r.exe'.length);
        return p;
    };

    const handleSave = async (forceSystemSync: boolean = false, resolvedBaseline?: string) => {
        if (!winUser.trim()) return;

        const effectiveBaseline = (resolvedBaseline ?? baselinePath).trim();

        // Required-field constraints for NEW accounts only (existing accounts
        // stay editable for backward compatibility):
        //  - baseline path is mandatory for D2R accounts (it is THE backup
        //    criterion); non-D2R (pure Battle.net switching) accounts skip it;
        //  - password is mandatory, EXCEPT when binding the current logged-in
        //    user (Host is spawned directly, no CreateProcessWithLogonW).
        if (!editingAccount) {
            if (isD2r && !effectiveBaseline) {
                addNotification('error', t('baseline_required') as string, 6000);
                return;
            }
            const isHost = winUser.toLowerCase() === currentUser.toLowerCase();
            if (!winPass && !isHost) {
                addNotification('error', t('password_required') as string, 6000);
                return;
            }
        }

        // Baseline vs snapshot consistency interception: the typed baseline
        // should normally appear among the paths recorded in the account's
        // snapshot. A mismatch means either the user is deliberately declaring
        // a new truth (game moved / mirror changed — snapshot needs re-saving
        // later) or a typo. Let the user decide instead of saving silently.
        // Skipped for non-D2R accounts: the baseline field is hidden but its
        // value is retained, and it plays no role in their backup rule.
        if (isD2r && resolvedBaseline === undefined && effectiveBaseline && snapshotPaths.length > 0) {
            if (!snapshotPaths.includes(normalizePath(effectiveBaseline))) {
                showBlocking(
                    t('baseline_mismatch_title'),
                    t('baseline_mismatch_desc', { baseline: effectiveBaseline, snapshot: snapshotPaths.join('  ·  ') }),
                    [
                        { label: t('cancel'), variant: 'outline', onClick: () => { } },
                        {
                            label: t('baseline_adopt_snapshot'),
                            variant: 'primary',
                            onClick: () => { setBaselinePath(snapshotPaths[0]); handleSave(forceSystemSync, snapshotPaths[0]); }
                        },
                        {
                            label: t('baseline_use_mine'),
                            variant: 'danger',
                            onClick: () => handleSave(forceSystemSync, effectiveBaseline)
                        }
                    ],
                    'warning'
                );
                return;
            }
        }

        // Check for duplicate Windows User (excluding the one we are editing)
        const isDuplicate = config.accounts.some(acc => 
            acc.win_user.toLowerCase() === winUser.toLowerCase() && 
            acc.id !== editingAccount?.id
        );

        if (isDuplicate) {
            addNotification('error', t('err_user_already_registered'));
            return;
        }

        const isPasswordPlaceholder = winPass === "********";
        const isPasswordChanged = editingAccount 
            ? (winPass !== (editingAccount.win_pass || "")) 
            : !!winPass;

        // Validation Step
        if (!forceSystemSync && isPasswordChanged && winPass && !isCreatingNew && !isPasswordPlaceholder) {
            setIsSaving(true);
            try {
                const isValid = await invoke('verify_windows_password', { 
                    username: winUser, 
                    password: winPass,
                    accountId: editingAccount?.id
                });
                if (!isValid) {
                    showBlocking(
                        t('confirm_password_sync_title'),
                        `${t('confirm_password_sync_desc')}\n\n!!${t('confirm_password_reset_instr')}!!`,
                        [
                            { label: t('cancel'), variant: 'outline', onClick: () => setIsSaving(false) },
                            // Thread the resolved baseline through so the
                            // consistency dialog doesn't fire a second time.
                            { label: t('confirm_and_sync'), variant: 'danger', onClick: () => handleSave(true, effectiveBaseline) }
                        ],
                        'error',
                        'yes'
                    );
                    return;
                }
            } catch (e) {
                console.error("Password verification failed", e);
            } finally {
                setIsSaving(false);
            }
        }

        setIsSaving(true);
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(t('error_system_timeout'))), 15000)
            );

            if (isCreatingNew) {
                addLog({ message: t('log_creating_user', { name: winUser }), level: 'info' });
                await Promise.race([
                    createWindowsUser(winUser, winPass, applyPasswordPolicy),
                    timeoutPromise
                ]);
            } else if (applyPasswordPolicy && winPass !== "********") {
                // 馃洝锔?SECURITY HARDENING: Only sync to OS if password actually changed.
                // If it's a placeholder "********", we skip policy/pass reset to prevent corruption.
                // If it's empty "" and was placeholder previously, it IS a change (request to clear).
                addLog({ message: t('log_syncing_policy', { name: winUser }), level: 'info' });
                await Promise.race([
                    invoke('set_password_full_policy', { username: winUser, password: winPass, neverExpires: true }),
                    timeoutPromise
                ]);
            } else if (applyPasswordPolicy && isPasswordPlaceholder && editingAccount) {
                // If policy is requested but password is placeholder, just sync the "Never Expires" bit
                await Promise.race([
                    invoke('set_password_never_expires', { username: winUser, neverExpires: true }),
                    timeoutPromise
                ]);
            }

            const newId = editingAccount ? editingAccount.id : crypto.randomUUID();
            const newAccount: Account = {
                ...(editingAccount || {}),
                id: newId,
                win_user: winUser,
                win_pass: winPass,
                bnet_account: bnetAccount,
                note: note || undefined,
                avatar: avatar,
                game_path: gamePath,
                is_d2r: isD2r,
                baseline_path: effectiveBaseline || undefined,
                strict_baseline: strictBaseline,
                auto_fix_password: applyPasswordPolicy,
                skip_config_sync: skipConfigSync,
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

            if (isCreatingNew) {
                showBlocking(
                    t('jump_to_login_title'),
                    t('jump_to_login_desc'),
                    [
                        { label: t('jump_to_login_cancel'), variant: 'outline', onClick: () => { } },
                        {
                            label: t('jump_to_login_btn'),
                            variant: 'primary',
                            onClick: async () => {
                                try {
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

    return {
        // State
        winUser, setWinUser,
        winPass, setWinPass,
        bnetAccount, setBnetAccount,
        note, setNote,
        gamePath, setGamePath,
        baselinePath, setBaselinePath,
        strictBaseline, setStrictBaseline,
        isD2r, setIsD2r,
        snapshotPaths,
        avatar, setAvatar,
        applyPasswordPolicy, setApplyPasswordPolicy,
        skipConfigSync,
        setSkipConfigSync,
        isManualInput, setIsManualInput,
        osUsers,
        isCreatingNew, setIsCreatingNew,
        isSaving,
        isScanning,
        hasScannedDeep,
        currentUser,
        previewAvatar, setPreviewAvatar,
        showPass, setShowPass: handleSetShowPass,
        passwordError,
        isValidatingPass,
        isUnmanagedUser,
        // Handlers
        handleDiscovery,
        verifyWindowsPassword,
        handleSave
    };
}
