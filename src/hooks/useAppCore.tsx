import { useState, useEffect, useCallback } from "react";
import { getConfig, saveConfig, AppConfig, Account, checkAdmin, getWindowsUsers, getRunningGamePaths, checkVaultIntegrity, VaultIssue, validateAllVaultEntries, verifyWindowsPassword, resolveBaselineConflict, rescanPendingConflicts, ackBaselineSeedReport } from "../lib/api";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { useLogs } from "../store/useLogs";
import { useBlockingNotification } from "../store/useBlockingNotification";
import { useNotification } from "../store/useNotification";
import { useLaunchSequence } from "./useLaunchSequence";
import { getVersion } from "@tauri-apps/api/app";
import { check } from "@tauri-apps/plugin-updater";
import { openUrl } from "@tauri-apps/plugin-opener";

export type View = 'dashboard' | 'accounts' | 'manual';

export function useAppCore() {
    const { t } = useTranslation();
    const [windowLabel, setWindowLabel] = useState<string>('main');
    const [config, setConfig] = useState<AppConfig>({ accounts: [], game_path: '', sequence_presets: [null, null, null] });
    const [invalidAccountIds, setInvalidAccountIds] = useState<Set<string>>(new Set());
    const [missingCredentialIds, setMissingCredentialIds] = useState<Set<string>>(new Set());
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [vaultHealthIssues, setVaultHealthIssues] = useState<VaultIssue[]>([]);
    const [isAuditingVault, setIsAuditingVault] = useState(false);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [isDonateOpen, setIsDonateOpen] = useState(false);
    const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
    const [isEditSequenceModalOpen, setIsEditSequenceModalOpen] = useState(false);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
    const [isInitSetupOpen, setIsInitSetupOpen] = useState(false);
    const [currentPresetIndex, setCurrentPresetIndex] = useState(0);
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

    const addLog = useLogs((state) => state.addLog);
    const launchLogs = useLogs((state) => state.logs);
    const clearLogs = useLogs((state) => state.clearLogs);
    const { show: showBlocking } = useBlockingNotification();
    const { addNotification } = useNotification();
    const { isLaunching, performLaunch } = useLaunchSequence();

    // Logic Helpers
    const checkAdminStatus = useCallback(async () => {
        try {
            const admin = await checkAdmin();
            setIsAdmin(admin);
        } catch (e) {
            console.error('Failed to check admin status', e);
        }
    }, []);

    const checkUpdateOnLaunch = useCallback(async () => {
        try {
            const update = await check();
            if (update) {
                showBlocking(
                    t('update_found'),
                    t('update_available_title', { version: update.version }) + "\n\n" + t('update_desc'),
                    [
                        { label: t('cancel'), variant: 'outline', onClick: () => { } },
                        {
                            label: (
                                <div className="flex flex-col items-center py-1">
                                    <span className="text-[10px] font-bold">{t('update_manual')}</span>
                                    <span className="text-[10px] opacity-60 font-normal">{t('update_manual_sub')}</span>
                                </div>
                            ) as any,
                            variant: 'outline',
                            onClick: () => { openUrl("https://github.com/yoyoset/D2R_Multi_rust/releases/latest"); }
                        },
                        {
                            label: (
                                <div className="flex flex-col items-center py-1">
                                    <span className="text-[10px] font-bold">{t('update_auto')}</span>
                                    <span className="text-[10px] opacity-100 font-normal">{t('update_auto_sub')}</span>
                                </div>
                            ) as any,
                            variant: 'primary',
                            onClick: async () => {
                                try { await update.downloadAndInstall(); } catch (e) { console.error(e); }
                            }
                        }
                    ],
                    'info'
                );
            }
        } catch (e) {
            console.error("Auto-update check failed:", e);
        }
    }, [t, showBlocking]);

    const validateAccounts = useCallback(async (accounts: Account[]) => {
        if (accounts.length === 0) return;
        try {
            const systemUsers = await getWindowsUsers();
            const lowerSystemUsers = systemUsers.map(u => u.name.toLowerCase());
            const invalidIds = new Set<string>();
            const invalidUsers = accounts.filter((acc: Account) => {
                const winUser = acc.win_user.toLowerCase();
                const exists = lowerSystemUsers.some(u => {
                    if (u === winUser) return true;
                    const uParts = u.split("\\");
                    const winParts = winUser.split("\\");
                    return uParts[uParts.length - 1] === winParts[winParts.length - 1];
                });
                if (exists) return false;
                if (!acc.win_user.includes("\\") || acc.win_user.startsWith(".\\")) {
                    invalidIds.add(acc.id);
                    return true;
                }
                return false;
            });

            setInvalidAccountIds(invalidIds);
            if (invalidUsers.length > 0) {
                const names = invalidUsers.map(u => u.win_user).join(", ");
                addLog({ message: t('invalid_users_log', { names }), level: 'warn' });
                showBlocking(
                    t('invalid_users_found'),
                    t('invalid_users_desc') + `\n\n${names}`,
                    [{ label: t('confirm'), variant: 'primary', onClick: () => { } }],
                    'warning'
                );
            }
        } catch (e) {
            console.error("Failed to validate accounts:", e);
        }
    }, [t, addLog, showBlocking]);

    const checkVersionUpdate = useCallback(async (currentConfig: AppConfig) => {
        try {
            const currentVersion = await getVersion();
            if (currentConfig.last_notified_version !== currentVersion) {
                setIsWhatsNewOpen(true);
                return currentVersion;
            }
        } catch (e) {
            console.error("Failed to check version update:", e);
        }
        return null;
    }, []);

    const validateVault = useCallback(async (deep = false) => {
        if (deep) setIsAuditingVault(true);
        try {
            const missing = await checkVaultIntegrity();
            setMissingCredentialIds(new Set(missing));

            const issues = await validateAllVaultEntries();
            setVaultHealthIssues(issues);

            if (deep) {
                // Verify each account's stored password with a real Windows logon.
                // Read accounts fresh so this callback stays referentially stable
                // (the init effect depends on it).
                const accounts = (await getConfig()).accounts;
                const vaultErrors: VaultIssue[] = [];

                for (const acc of accounts) {
                    if (missing.includes(acc.id)) {
                        vaultErrors.push({
                            id: acc.id,
                            win_user: acc.win_user,
                            reason: 'error.vault.missing'
                        });
                        continue;
                    }
                    try {
                        const isValid = await verifyWindowsPassword(acc.win_user, '********', acc.id);
                        if (!isValid) {
                            vaultErrors.push({
                                id: acc.id,
                                win_user: acc.win_user,
                                reason: 'error.vault.password_mismatch'
                            });
                        }
                    } catch (err) {
                        vaultErrors.push({
                            id: acc.id,
                            win_user: acc.win_user,
                            reason: String(err).replace(/^Error: /, '')
                        });
                    }
                }

                setVaultHealthIssues([...issues, ...vaultErrors]);

                if (vaultErrors.length === 0) {
                    addNotification('success', t('vault_audit_ok') as string, 4000);
                } else {
                    const users = vaultErrors.map(v => v.win_user).join(', ');
                    addNotification('warning',
                        t('vault_audit_issues', { count: vaultErrors.length, users }) as string,
                        8000);
                }
            }
        } catch (e) {
            if (deep) {
                addNotification('error', t('vault_audit_failed', { error: String(e) }) as string, 8000);
            } else {
                console.error("Failed to check vault integrity:", e);
            }
        } finally {
            if (deep) setIsAuditingVault(false);
        }
    }, [t, addNotification]);

    // Handlers
    const handleAddAccount = useCallback(() => {
        setEditingAccount(undefined);
        setIsAccountModalOpen(true);
        addLog({ message: t('log_open_add_account'), level: 'info' });
    }, [t, addLog]);

    const handleEditAccount = useCallback((acc: Account) => {
        setEditingAccount(acc);
        setIsAccountModalOpen(true);
        addLog({ message: t('log_edit_account', { name: acc.win_user }), level: 'info' });
    }, [t, addLog]);

    const handleLaunch = useCallback(async (bnetOnly: boolean = false, advancedMode: boolean = false, force: boolean = false) => {
        if (!selectedAccountId) return;
        const account = config.accounts.find(a => a.id === selectedAccountId);
        if (!account) return;
        await performLaunch(account, bnetOnly, force, advancedMode, handleEditAccount);
    }, [selectedAccountId, config.accounts, performLaunch, handleEditAccount]);

    const handleDeleteAccount = useCallback(async (id: string) => {
        const target = config.accounts.find(a => a.id === id);
        const newAccounts = config.accounts.filter(a => a.id !== id);
        const newConfig = { ...config, accounts: newAccounts };
        setConfig(newConfig);
        try {
            await saveConfig(newConfig);
            validateVault();
            addLog({ message: t('log_delete_account', { name: target?.win_user || id }), level: 'warn' });
        } catch (e) { console.error(e); }
    }, [config, addLog, t, validateVault]);

    const handleReorder = useCallback(async (newAccounts: Account[]) => {
        const newConfig = { ...config, accounts: newAccounts };
        setConfig(newConfig);
        try { await saveConfig(newConfig); } catch (e) { console.error("Failed to save order", e); }
    }, [config]);

    const handleViewModeChange = useCallback(async (mode: 'card' | 'list') => {
        const newConfig = { ...config, dashboard_view_mode: mode };
        setConfig(newConfig);
        try { await saveConfig(newConfig); } catch (e) { console.error("Failed to save view mode", e); }
    }, [config]);

    const handleRefreshPaths = useCallback(async () => {
        try {
            await getRunningGamePaths();
            const newConfig = await getConfig();
            setConfig(newConfig);
            validateVault();
            addLog({ message: t('log_refresh_paths_success'), level: 'success' });
        } catch (e) {
            console.error(e);
            addLog({ message: t('log_refresh_paths_error'), level: 'error' });
        }
    }, [t, addLog, validateVault]);

    const handleSaveSnapshot = useCallback(async (account: Account) => {
        try {
            await invoke("manual_backup_save", { accountId: account.id });
            addLog({ message: t('log_manual_snapshot_success', { name: account.win_user }), level: 'success' });
        } catch (e) {
            console.error(e);
            addLog({ message: t('log_manual_snapshot_failed', { name: account.win_user, error: String(e) }), level: 'error' });
        }
    }, [t, addLog]);

    const handleCloseGuide = useCallback(async (dontShowAgain?: boolean) => {
        setIsGuideOpen(false);
        if (dontShowAgain === true && !config.has_shown_guide) {
            const newConfig = { ...config, has_shown_guide: true };
            setConfig(newConfig);
            try { await saveConfig(newConfig); } catch (e) { console.error("Failed to save guide status", e); }
        }
    }, [config]);

    // Effects
    useEffect(() => {
        const checkWindow = async () => {
            try {
                const label = getCurrentWindow().label;
                setWindowLabel(label);
            } catch (e) {
                console.warn("Window label detection failed:", e);
            }
        };
        checkWindow();
    }, []);

    useEffect(() => {
        const init = async () => {
            const exists = await invoke<boolean>('check_config_exists');
            if (!exists) {
                setIsInitSetupOpen(true);
            }

            const cfg = await getConfig();
            setConfig(cfg);
            checkAdminStatus();
            checkUpdateOnLaunch();
            validateAccounts(cfg.accounts);
            validateVault();

            const newVer = await checkVersionUpdate(cfg);
            if (newVer) {
                const updatedCfg = { ...cfg, last_notified_version: newVer };
                setConfig(updatedCfg);
                await saveConfig(updatedCfg);
            }

            if (!cfg.has_shown_guide) {
                setIsGuideOpen(true);
            }

            // Baseline-seeding upgrade report: the migration ran during config
            // load (before any frontend listener existed), so the result is
            // persisted in config until acknowledged. Tell the user what was
            // synced automatically and which accounts still need a manual
            // baseline (computed live: D2R accounts without one).
            if (cfg.baseline_seed_report && cfg.baseline_seed_report.length > 0) {
                const manual = cfg.accounts
                    .filter(a => (a.is_d2r ?? true) && !(a.baseline_path ?? '').trim())
                    .map(a => a.win_user);
                const body =
                    t('baseline_seed_synced', { count: cfg.baseline_seed_report.length }) + '\n' +
                    cfg.baseline_seed_report.join('\n') + '\n\n' +
                    (manual.length > 0
                        ? t('baseline_seed_manual_needed') + '\n' + manual.join(', ')
                        : t('baseline_seed_all_done'));
                showBlocking(
                    t('baseline_seed_title'),
                    body,
                    [{
                        label: t('got_it'),
                        variant: 'primary',
                        onClick: async () => {
                            try { await ackBaselineSeedReport(); } catch (e) { console.error(e); }
                        }
                    }],
                    'info'
                );
            }
        };
        init();

        const unlisten = listen('launch-log', (event: any) => {
            const payload = event.payload;
            addLog({ message: payload.message, level: payload.level as any, category: 'launch' });
        });

        const unlistenResumption = listen('sequence-resumption-ready', () => {
            showBlocking(
                t('sequence_resumption_title'),
                t('sequence_resumption_desc'),
                [
                    { label: t('ignore'), variant: 'outline', onClick: () => { } },
                    {
                        label: t('resume_now'),
                        variant: 'primary',
                        onClick: async () => {
                             await invoke("start_sequence", { presetIndex: config.active_sequence?.preset_index ?? 0 });
                        }
                    }
                ],
                'info'
            );
        });

        const unlistenMigration = listen('migration-required', () => {
            setIsMigrationModalOpen(true);
        });

        // Baseline-path mismatch detected at inject time (restored snapshot
        // doesn't record the baseline — polluted/stale snapshot). Toast only;
        // the fix (re-locate + re-save snapshot, or edit the baseline) lives
        // in the account editor.
        const unlistenBaseline = listen('baseline-mismatch', (event: any) => {
            const user = event.payload?.user ?? '?';
            addNotification('warning', t('baseline_mismatch_toast', { user }) as string, 10000);
        });

        // Baseline conflict arbitration: the launcher found the live config's
        // path differing from the ledger owner's baseline, stashed the
        // disputed copy to pending_{id}.db and skipped the backup. The user
        // rules on the frozen copy — cancel the backup, or adopt the new path
        // as baseline and complete the backup with the disputed bytes.
        const unlistenConflict = listen('baseline-conflict', (event: any) => {
            const p = event.payload ?? {};
            const accountId: string = p.account_id ?? '';
            const user: string = p.user ?? '?';
            const baseline: string = p.baseline ?? '';
            const livePaths: string[] = Array.isArray(p.live_paths) ? p.live_paths : [];
            if (!accountId) return;

            const canAdopt = livePaths.length === 1;
            const desc = t('baseline_conflict_desc', {
                user,
                baseline: baseline || '—',
                live: livePaths.length > 0 ? livePaths.join('  ·  ') : '?',
            }) + (canAdopt ? '' : `\n\n${t('baseline_conflict_multi_hint')}`);

            const actions = [
                {
                    label: t('baseline_conflict_discard'),
                    variant: 'outline' as const,
                    onClick: async () => {
                        try {
                            await resolveBaselineConflict(accountId, 'discard');
                        } catch (e) {
                            addNotification('error', t('baseline_conflict_failed', { error: String(e) }) as string, 8000);
                        }
                    }
                },
                ...(canAdopt ? [{
                    label: t('baseline_conflict_adopt'),
                    variant: 'primary' as const,
                    onClick: async () => {
                        try {
                            const adopted = await resolveBaselineConflict(accountId, 'adopt');
                            addNotification('success', t('baseline_conflict_resolved', { user, path: adopted ?? '' }) as string, 6000);
                        } catch (e) {
                            addNotification('error', t('baseline_conflict_failed', { error: String(e) }) as string, 8000);
                        }
                    }
                }] : [])
            ];

            showBlocking(t('baseline_conflict_title'), desc, actions, 'warning');
        });

        const unlistenConfig = listen('config-updated', async () => {
            console.log("[Config] Update Event Received");
            const cfg = await getConfig();
            setConfig(cfg);
            validateVault();
        });

        // Re-surface conflicts whose dialogs died with a previous app process
        // (pending files survive on disk). Slight delay so listeners are live.
        const rescanTimer = setTimeout(() => {
            rescanPendingConflicts().catch(console.error);
        }, 1500);

        return () => {
            clearTimeout(rescanTimer);
            unlisten.then(f => f());
            unlistenResumption.then(f => f());
            unlistenMigration.then(f => f());
            unlistenBaseline.then(f => f());
            unlistenConflict.then(f => f());
            unlistenConfig.then(f => f());
        };
    }, [checkAdminStatus, checkUpdateOnLaunch, validateAccounts, checkVersionUpdate, addLog, addNotification, showBlocking, t, config.active_sequence?.preset_index, validateVault]);

    return {
        // State
        windowLabel, config, setConfig, invalidAccountIds, missingCredentialIds, isAdmin, currentView, setCurrentView,
        selectedAccountId, setSelectedAccountId, isLaunching, launchLogs, vaultHealthIssues, isAuditingVault,
        // Modal States
        isSettingsOpen, setIsSettingsOpen, isAccountModalOpen, setIsAccountModalOpen,
        isGuideOpen, setIsGuideOpen, isDonateOpen, setIsDonateOpen,
        isWhatsNewOpen, setIsWhatsNewOpen, isEditSequenceModalOpen, setIsEditSequenceModalOpen,
        isMigrationModalOpen, setIsMigrationModalOpen, isInitSetupOpen, setIsInitSetupOpen, currentPresetIndex, setCurrentPresetIndex,
        editingAccount: editingAccount as any,
        // Handlers
        handleLaunch, handleAddAccount, handleEditAccount, handleDeleteAccount,
        handleReorder, handleViewModeChange, handleRefreshPaths, handleSaveSnapshot,
        handleCloseGuide, clearLogs, validateVault
    };
}
