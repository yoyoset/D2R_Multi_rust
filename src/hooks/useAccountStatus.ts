import { useState, useEffect, useCallback, useRef } from 'react';
import { Account, AccountStatus, getAccountsProcessStatus } from '../lib/api';

export function useAccountStatus(accounts: Account[]) {
    const [accountStatuses, setAccountStatuses] = useState<Record<string, AccountStatus>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const timeoutRef = useRef<any>(null);

    const poll = useCallback(async (isManual: boolean = false) => {
        if (accounts.length === 0) return;

        // Prevent concurrent polls (especially manual ones)
        if (isManual && isRefreshing) return;

        try {
            if (isManual) setIsRefreshing(true);
            const usernames = accounts.map(a => a.win_user);
            const statuses = await getAccountsProcessStatus(usernames);
            setAccountStatuses(statuses);
        } catch (e) {
            console.error("Failed to poll statuses", e);
        } finally {
            if (isManual) setIsRefreshing(false);
        }
    }, [accounts, isRefreshing]);

    useEffect(() => {
        const schedulePoll = () => {
            // Cancel any existing timeout
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            // Skip polling if page is not visible
            if (document.hidden) {
                timeoutRef.current = setTimeout(schedulePoll, 5000); // Check again in 5s
                return;
            }

            poll(false).finally(() => {
                // Schedule next poll 2 seconds after the previous one strictly completes
                timeoutRef.current = setTimeout(schedulePoll, 2000);
            });
        };

        schedulePoll();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [poll]);

    return {
        accountStatuses,
        refresh: () => poll(true),
        isRefreshing
    };
}
