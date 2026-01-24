import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export const invoke = tauriInvoke;

export interface Account {
    id: string;
    win_user: string;
    win_pass?: string;
    bnet_account: string;
    avatar?: string;
    note?: string;
}

export interface AccountStatus {
    is_running: boolean;
    pid?: number;
    bnet_active?: boolean;
    d2r_active?: boolean;
}

export interface AppConfig {
    accounts: Account[];
    last_active_account?: string;
    theme_color?: string;
    close_to_tray?: boolean;
}

export async function getWindowsUsers(deepScan: boolean = false): Promise<string[]> {
    return await invoke('get_windows_users', { deepScan });
}

export async function getWhoami(): Promise<string> {
    return await invoke('get_whoami');
}

export async function createWindowsUser(username: string, password: string): Promise<string> {
    return await invoke('create_windows_user', { username, password });
}

export async function killMutexes(): Promise<string> {
    try {
        return await invoke('kill_mutexes');
    } catch (e) {
        throw new Error(String(e));
    }
}

export async function launchGame(account: Account, gamePath: string): Promise<string> {
    return await invoke("launch_game", {
        account,
        gamePath
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
