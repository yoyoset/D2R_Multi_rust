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
    deep_scan: Option<bool>,
) -> Result<Vec<String>, String> {
    state
        .os
        .list_local_users(deep_scan.unwrap_or(false))
        .map_err(|e| e.to_string())
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
    Ok("User created successfully".to_string())
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
