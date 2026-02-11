import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const invoke = tauriInvoke;

export interface Account {
    id: string;
    win_user: string;
    win_pass?: string;
    bnet_account: string;
    avatar?: string;
    note?: string;
    password_never_expires: boolean;
}

export interface AccountStatus {
    bnet_active: boolean;
    d2r_active: boolean;
}

export interface AppConfig {
    accounts: Account[];
    game_path: string;
    last_active_account?: string;
    theme_color?: string;
    close_to_tray?: boolean;
    language?: string;
    enable_logging?: boolean;
    dashboard_view_mode?: 'card' | 'list';
    multi_account_mode?: boolean;
    has_shown_guide?: boolean;
    last_notified_version?: string;
}

export async function getWindowsUsers(deepScan: boolean = false): Promise<string[]> {
    return await invoke('get_windows_users', { deepScan });
}

export async function getWhoami(): Promise<string> {
    return await invoke('get_whoami');
}

export async function createWindowsUser(username: string, password: string, neverExpires: boolean = true): Promise<string> {
    return await invoke('create_windows_user', { username, password, neverExpires });
}

export async function setPasswordNeverExpires(username: string, neverExpires: boolean): Promise<void> {
    await invoke('set_password_never_expires', { username, neverExpires });
}

export async function killMutexes(): Promise<string> {
    try {
        return await invoke('kill_mutexes');
    } catch (e) {
        throw new Error(String(e));
    }
}

export async function launchGame(account: Account, gamePath: string, bnetOnly: boolean = false): Promise<string> {
    return await invoke("launch_game", {
        account,
        gamePath,
        bnetOnly
    });
}

export async function getConfig(): Promise<AppConfig> {
    return await invoke("get_config");
}

export async function saveConfig(config: AppConfig): Promise<void> {
    await invoke("save_config", { config });
}

export async function getAccountsProcessStatus(usernames: string[]): Promise<Record<string, AccountStatus>> {
    return await invoke("get_accounts_process_status", { usernames });
}

export async function checkAdmin(): Promise<boolean> {
    return await invoke<boolean>('check_admin');
}

export async function openLusrmgr(): Promise<void> {
    await invoke('open_lusrmgr');
}

export async function openNetplwiz(): Promise<void> {
    await invoke('open_netplwiz');
}

export async function openUserSwitch(): Promise<void> {
    await invoke('open_user_switch');
}

export async function cleanupArchives(): Promise<string> {
    return await invoke('cleanup_archives');
}

export async function stopBnetProcesses(): Promise<string> {
    return await invoke('stop_bnet_processes');
}

export async function isUserProcessActive(username: string): Promise<boolean> {
    return await invoke('is_user_process_active', { username });
}

export async function nukeReset(): Promise<string> {
    return await invoke('nuke_reset');
}

export async function resolveLaunchConflict(accountId: string, action: 'delete' | 'reset'): Promise<void> {
    await invoke('resolve_launch_conflict', { accountId, action });
}

export async function fixGamePermissions(path: string): Promise<string> {
    return await invoke('fix_game_permissions', { path });
}

export async function checkUserInitialization(username: string): Promise<boolean> {
    return await invoke('check_user_initialization', { username });
}

export async function getLatestChangelog(): Promise<string> {
    return await invoke('get_latest_changelog');
}

