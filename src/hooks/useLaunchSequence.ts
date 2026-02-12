import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, launchGame, resolveLaunchConflict, openUserSwitch, invoke } from '../lib/api';
import { useBlockingNotification } from '../store/useBlockingNotification';
import { useLogs } from '../store/useLogs';

export function useLaunchSequence() {
    const { t } = useTranslation();
    const [isLaunching, setIsLaunching] = useState(false);
    const { show: showBlocking, close: closeBlocking } = useBlockingNotification();
    const addLog = useLogs(state => state.addLog);

    const performLaunch = async (account: Account, bnetOnly: boolean = false, force: boolean = false) => {
        try {
            setIsLaunching(true);

            // 1. Infrastructure Pre-flight
            try {
                const health = await invoke('get_infra_health', { accounts: [account] }) as any;
                if (!health.agent_config_writable || !health.bnet_path_valid) {
                    addLog({
                        message: t('infra_health_warn'),
                        level: 'warn',
                        category: 'system'
                    });
                }
            } catch (err) {
                console.error("Health check failed", err);
            }

            // 2. Main Launch
            await launchGame(account, "", bnetOnly, force);
            setIsLaunching(false);
        } catch (e) {
            const errorMsg = String(e);

            if (errorMsg.includes('CONFLICT')) {
                showBlocking(
                    t('archive_conflict_title'),
                    t('archive_conflict_desc'),
                    [
                        {
                            label: t('cancel'),
                            variant: 'outline',
                            onClick: () => {
                                setIsLaunching(false);
                                closeBlocking();
                            }
                        },
                        {
                            label: t('delete_and_continue'),
                            variant: 'outline',
                            onClick: async () => {
                                try {
                                    await resolveLaunchConflict(account.id, 'delete');
                                    // Retry the exact same launch after one step resolution
                                    await performLaunch(account, bnetOnly, force);
                                } catch (err) {
                                    addLog({
                                        message: t('conflict_resolve_failed', { error: String(err) }),
                                        level: 'error'
                                    });
                                    setIsLaunching(false);
                                    closeBlocking();
                                }
                            }
                        },
                        {
                            label: t('reset_and_continue'),
                            variant: 'primary',
                            onClick: async () => {
                                try {
                                    await resolveLaunchConflict(account.id, 'reset');
                                    await performLaunch(account, bnetOnly, force);
                                } catch (err) {
                                    addLog({
                                        message: t('double_cleanup_failed', { error: String(err) }),
                                        level: 'error'
                                    });
                                    setIsLaunching(false);
                                    closeBlocking();
                                }
                            }
                        }
                    ],
                    'warning',
                    () => setIsLaunching(false)
                );
                return;
            }

            if (errorMsg.includes('USER_UNINITIALIZED')) {
                showBlocking(
                    t('user_uninitialized_title'),
                    t('user_uninitialized_desc', { user: account.win_user }),
                    [
                        {
                            label: t('jump_to_login_btn'),
                            variant: 'success',
                            onClick: async () => {
                                await openUserSwitch();
                            }
                        },
                        {
                            label: t('understand'),
                            variant: 'info',
                            onClick: () => {
                                setIsLaunching(false);
                                closeBlocking();
                            }
                        },
                        {
                            label: t('ignore_and_launch'),
                            variant: 'danger',
                            onClick: () => {
                                closeBlocking();
                                performLaunch(account, bnetOnly, true);
                            }
                        }
                    ],
                    'error',
                    () => setIsLaunching(false)
                );
                return;
            }

            const displayMsg = errorMsg.includes('BNET_NOT_FOUND')
                ? t('bnet_not_found')
                : `${t('launch_failed')}: ${errorMsg}`;

            addLog({
                message: displayMsg,
                level: 'error',
                category: 'launch'
            });
            setIsLaunching(false);
        }
    };

    return {
        isLaunching,
        performLaunch
    };
}
