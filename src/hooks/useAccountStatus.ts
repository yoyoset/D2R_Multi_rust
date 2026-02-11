import { useState, useEffect, useCallback } from 'react';
import { Account, AccountStatus, getAccountsProcessStatus } from '../lib/api';

export function useAccountStatus(accounts: Account[]) {
    const [accountStatuses, setAccountStatuses] = useState<Record<string, AccountStatus>>({});

    const poll = useCallback(async () => {
        if (accounts.length === 0) return;
        try {
            const usernames = accounts.map(a => a.win_user);
            const statuses = await getAccountsProcessStatus(usernames);
            setAccountStatuses(statuses);
        } catch (e) {
            console.error("Failed to poll statuses", e);
        }
    }, [accounts]);

    useEffect(() => {
        poll();
        // 降低轮询频率到 2s，让 UI 响应更即时
        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [poll]);

    return { accountStatuses, refresh: poll };
}
