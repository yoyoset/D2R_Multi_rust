use crate::modules;
use crate::modules::os::OSProvider;
use crate::state;
use std::os::windows::process::CommandExt;

#[tauri::command]
pub fn get_whoami(state: tauri::State<'_, state::AppState>) -> String {
    state.os.get_whoami()
}

#[tauri::command]
pub fn check_admin() -> bool {
    modules::win_admin::is_admin()
}

#[tauri::command]
pub fn get_windows_users(
    state: tauri::State<'_, state::AppState>,
) -> Result<Vec<crate::modules::os::windows::user::WindowsUser>, String> {
    state
        .os
        .list_local_users()
        .map_err(|e: anyhow::Error| e.to_string())
}

#[tauri::command]
pub fn create_windows_user(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: String,
    never_expires: bool,
) -> Result<String, String> {
    state
        .os
        .create_user(&username, &password, never_expires)
        .map_err(|e| e.to_string())?;
    Ok("logs.os.user_created_success".to_string())
}

#[tauri::command]
pub fn set_password_never_expires(
    state: tauri::State<'_, state::AppState>,
    username: String,
    never_expires: bool,
) -> Result<(), String> {
    state
        .os
        .set_password_never_expires(&username, never_expires)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_password_full_policy(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: String,
    never_expires: bool,
) -> Result<(), String> {
    // Industrial Hardening: Compose policy from primitive trait methods
    state.os.reset_password(&username, &password).map_err(|e| e.to_string())?;
    state.os.set_password_never_expires(&username, never_expires).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn verify_windows_password(
    app: tauri::AppHandle,
    state: tauri::State<'_, state::AppState>,
    account_id: Option<String>,
    username: String,
    password: String,
) -> Result<bool, String> {
    // 1. FLOW ALIGNMENT: Check if it's the redacted placeholder "********"
    let final_password = if password == "********" {
        if let Some(id) = account_id {
            // Force physical lookup from the local encrypted vault
            match modules::vault::Vault::load_password(&app, &id) {
                Ok(p) => p,
                Err(e) => {
                    tracing::error!("Vault-to-OS Authentication failed: {} (id: {}): {}", username, id, e);
                    return Err(format!("error.os.vault_failure|{{\"error\":\"{}\"}}", e));
                }
            }
        } else {
            // Cannot verify with placeholders alone without account context
            return Err("error.os.missing_account_context".to_string());
        }
    } else {
        password
    };

    // 2. PHYSICAL VERIFICATION: Always perform real OS-level authentication
    state
        .os
        .verify_password(&username, &final_password)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_lusrmgr() -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "lusrmgr.msc"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_netplwiz() -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "netplwiz"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_user_switch() -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "tsdiscon"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn check_user_initialization(username: String) -> bool {
    let os = modules::os::windows::WindowsProvider;
    os.is_user_initialized(&username)
}

#[tauri::command]
pub fn check_microsoft_account(username: String) -> bool {
    modules::os::windows::user::is_microsoft_account(&username)
}
