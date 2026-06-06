import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as API from '../lib/api';

export interface LogEntry {
    id: number;
    time: string;
    message: string;
    level: 'info' | 'success' | 'warning' | 'error';
}

export function useManualTools(accounts: API.Account[], selectedAccountId: string | null) {
    const { t } = useTranslation();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    
    // Diagnostic State
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagResults, setDiagResults] = useState<any[]>([]);
    const [diagTitle, setDiagTitle] = useState('');
    const [showDiagModal, setShowDiagModal] = useState(false);

    const addLog = useCallback((message: string, level: LogEntry['level'] = 'info') => {
        // Backend commands return i18n payloads as "key|{json}" (e.g.
        // "logs.game.mutex_killed|{\"count\":1}") or a bare "key". The dashboard
        // log is pre-translated by the Rust side, but these standalone-tool
        // results are not — so translate here. The regex guard ensures
        // already-translated text, paths, and free-form strings pass through
        // untouched (only dotted ASCII keys are translated).
        const isKey = (s: string) => /^[a-zA-Z0-9_.]+$/.test(s);
        let text = message;
        const idx = message.indexOf('|');
        if (idx > 0 && isKey(message.slice(0, idx))) {
            const key = message.slice(0, idx);
            try {
                text = t(key, JSON.parse(message.slice(idx + 1))) as string;
            } catch {
                text = t(key) as string;
            }
        } else if (isKey(message)) {
            text = t(message) as string;
        }

        setLogs(prev => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            message: text,
            level
        }, ...prev].slice(0, 50));
    }, [t]);

    const runSystemDiag = async () => {
        setIsDiagnosing(true);
        setDiagTitle(t('system_diagnostics'));
        try {
            const results = await API.getSystemEnvDiagnostics();
            setDiagResults(results);
            setShowDiagModal(true);
        } catch (e) {
            addLog(t('diag_failed', { error: e }), 'error');
        } finally {
            setIsDiagnosing(false);
        }
    };

    const runGameDiag = async () => {
        try {
            const path = await API.openPathDialog();
            if (!path) return;

            setIsDiagnosing(true);
            setDiagTitle(t('run_system_diag'));
            const results = await API.getGamePathDiagnostics(path);
            setDiagResults(results);
            setShowDiagModal(true);
        } catch (e) {
            addLog(t('diag_failed', { error: e }), 'error');
        } finally {
            setIsDiagnosing(false);
        }
    };

    const cleanupHandles = async () => {
        addLog(t('cleaning_handles'), 'info');
        try {
            const res = await API.killMutexes();
            addLog(res, 'success');
        } catch (e) { addLog(`${e}`, 'error'); }
    };

    const forceKill = async () => {
        addLog(t('killing_processes'), 'warning');
        try {
            const res = await API.stopBnetProcesses();
            addLog(res, 'success');
        } catch (e) { addLog(`${e}`, 'error'); }
    };

    const resetSettings = async () => {
        addLog(t('settings_reset'), 'info');
        try {
            const res = await API.nukeReset();
            addLog(res, 'success');
        } catch (e) { addLog(`${e}`, 'error'); }
    };

    const cleanupArchives = async () => {
        addLog(t('cleanup_archives'), 'info');
        try {
            const res = await API.cleanupArchives();
            addLog(res, 'success');
        } catch (e) { addLog(`${e}`, 'error'); }
    };

    const forceLaunch = async () => {
        const acc = accounts.find(a => a.id === selectedAccountId);
        if (!acc) {
            addLog(t('no_accounts'), 'error');
            return;
        }
        addLog(`${t('launching')}: ${acc.win_user}`, 'info');
        try {
            const res = await API.launchGame(acc, true, true);
            addLog(res, 'success');
        } catch (e) {
            addLog(`${e}`, 'error');
        }
    };

    return {
        logs,
        setLogs,
        addLog,
        isDiagnosing,
        diagResults,
        diagTitle,
        showDiagModal,
        setShowDiagModal,
        runSystemDiag,
        runGameDiag,
        cleanupHandles,
        forceKill,
        resetSettings,
        cleanupArchives,
        forceLaunch
    };
}
