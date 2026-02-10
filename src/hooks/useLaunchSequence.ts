import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Account, launchGame, resolveLaunchConflict } from '../lib/api';
import { useBlockingNotification } from '../store/useBlockingNotification';
import { useLogs } from '../store/useLogs';

export function useLaunchSequence() {
    const { t } = useTranslation();
    const [isLaunching, setIsLaunching] = useState(false);
    const { show: showBlocking, close: closeBlocking } = useBlockingNotification();
    const addLog = useLogs(state => state.addLog);

    const performLaunch = async (account: Account) => {
        try {
            setIsLaunching(true);
            await launchGame(account, "");
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
                                    await performLaunch(account);
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
                                    await performLaunch(account);
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
                    'warning'
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
