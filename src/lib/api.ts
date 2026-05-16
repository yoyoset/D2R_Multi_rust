import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export const invoke = tauriInvoke;

export interface Account {
    id: string;               // UUID
    win_user: string;         // The bound Windows Username
    win_pass?: string;        // Sensitive: Stored separately in Vault
    bnet_account: string;     // Display only
    avatar?: string;          // Base64 encoded image or library icon ID
    note?: string;            // Role remarks
    auto_fix_password?: boolean; // 自动刷新密码策略 (修复 0x80070532)
    game_path?: string;       // 自定义路径
    skip_config_sync?: boolean;  // 跳过 product.db 同步
}

export interface DataLocationInfo {
    path: string;
    is_custom: boolean;
    exe_on_c_drive: boolean;
    free_space_mb: number;
}

export interface VaultIssue {
    id: string;
    win_user: string;
    reason: string;
}

export interface DiagnosticResult {
    category: string;
    name: string;
    status: 'Pass' | 'Warning' | 'Fail';
    message: string;
}

export interface AccountStatus {
    bnet_active: boolean;
    d2r_active: boolean;
}

export interface ProcessInfo {
    pid: number;
    name: string;
    user: string;
}

export interface HandleInfo {
    handle_value: number;
    name: string;
    type_name: string;
}

export interface SequencePreset {
    name: string;
    accounts: string[]; // Account IDs
}

export interface ActiveSequenceState {
    preset_index: number;
    preset_name: string;
    current_index: number;
    queue: string[]; // Account IDs
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
    advanced_launch_mode?: boolean;
    has_shown_guide?: boolean;
    last_notified_version?: string;
    enable_window_rename?: boolean;
    window_rename_format?: 'note' | 'bnet' | 'username' | 'full';
    sequence_presets: (SequencePreset | null)[];
    active_sequence?: ActiveSequenceState;
}

export interface WindowsUser {
    name: string;
    is_current: boolean;
    is_initialized: boolean;
    is_ms_account: boolean;
}

export async function getWindowsUsers(): Promise<WindowsUser[]> {
    return await invoke('get_windows_users');
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

export async function verifyWindowsPassword(username: string, password: string, accountId?: string): Promise<boolean> {
    return await invoke('verify_windows_password', { username, password, accountId });
}

export async function killMutexes(): Promise<string> {
    try {
        return await invoke('kill_mutexes');
    } catch (e) {
        throw new Error(String(e));
    }
}

export async function launchGame(account: Account, bnetOnly: boolean = false, force: boolean = false, advancedMode: boolean = false): Promise<string> {
    return await invoke("launch_game", {
        account,
        bnetOnly,
        force,
        advancedMode
    });
}

export async function getConfig(): Promise<AppConfig> {
    return await invoke("get_config");
}

export async function checkVaultIntegrity(): Promise<string[]> {
    return await invoke('check_vault_integrity');
}

export async function saveConfig(config: AppConfig): Promise<void> {
    await invoke("save_config", { config });
}

export async function getAccountPassword(id: string): Promise<string> {
    return await invoke("get_account_password", { id });
}

export async function manualBackupSave(accountId: string): Promise<string> {
    return await invoke('manual_backup_save', { accountId });
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

export async function getProcessList(): Promise<ProcessInfo[]> {
    return await invoke('get_process_list');
}

export async function getProcessHandles(pid: number): Promise<HandleInfo[]> {
    return await invoke('get_process_handles', { pid });
}

export async function closeSpecificHandle(pid: number, handle: number): Promise<void> {
    await invoke('close_specific_handle', { pid, handle });
}

export async function getRunningGamePaths(): Promise<void> {
    return await invoke('get_running_game_paths');
}

export async function getDetectedBnetPath(): Promise<string | null> {
    try {
        return await invoke('get_detected_bnet_path');
    } catch {
        return null;
    }
}

export async function getDetectedD2rPath(): Promise<string | null> {
    try {
        return await invoke('get_detected_d2r_path');
    } catch {
        return null;
    }
}

export async function getSystemEnvDiagnostics(): Promise<DiagnosticResult[]> {
    return await invoke('get_system_env_diagnostics');
}

export async function getGamePathDiagnostics(gamePath: string): Promise<DiagnosticResult[]> {
    return await invoke('get_game_path_diagnostics', { gamePath });
}

export async function openPathDialog(): Promise<string | null> {
    const selected = await open({
        multiple: false,
        directory: false,
        filters: [{
            name: 'D2R.exe',
            extensions: ['exe']
        }]
    });
    return selected as string | null;
}

export async function saveSequencePreset(index: number, preset: SequencePreset): Promise<void> {
    await invoke("save_sequence_preset", { index, preset });
}

export async function validateSequence(accountIds: string[]): Promise<string[]> {
    return await invoke("validate_sequence", { accountIds });
}

export async function startSequence(presetIndex: number): Promise<void> {
    await invoke("start_sequence", { presetIndex });
}

export async function nextSequenceStep(): Promise<boolean> {
    return await invoke("next_sequence_step");
}

export async function interruptSequence(): Promise<void> {
    await invoke("interrupt_sequence");
}

export async function requestSequenceSync(): Promise<ActiveSequenceState | null> {
    return await invoke("request_sequence_sync");
}

export async function openLogFile(): Promise<void> {
    await invoke('open_log_file');
}

export async function openPath(path: string): Promise<void> {
    await invoke('open_path', { path });
}

export async function getDataLocationInfo(): Promise<DataLocationInfo> {
    return await invoke('get_data_location_info');
}

export async function relocateData(newPath: string): Promise<string> {
    return await invoke('relocate_data', { newPath });
}

export async function checkConfigExists(): Promise<boolean> {
    return await invoke('check_config_exists');
}

export async function setDataRoot(newPath: string): Promise<void> {
    await invoke('set_data_root', { newPath });
}

export async function validateAllVaultEntries(): Promise<VaultIssue[]> {
    return await invoke('validate_all_vault_entries');
}

export async function openFolderDialog(): Promise<string | null> {
    const selected = await open({
        multiple: false,
        directory: true,
    });
    return selected as string | null;
}
