use crate::modules;
use crate::state;
use serde::Serialize;

#[derive(Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub user: String,
}

#[tauri::command]
pub fn get_process_list(
    state: tauri::State<'_, state::AppState>,
) -> Result<Vec<ProcessInfo>, String> {
    let mut sys = state.sys.lock().unwrap();
    let mut users = state.users.lock().unwrap();

    users.refresh();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        true,
        sysinfo::ProcessRefreshKind::nothing()
            .with_user(sysinfo::UpdateKind::Always)
            .with_exe(sysinfo::UpdateKind::Always),
    );

    let mut results = Vec::new();
    for (pid, process) in sys.processes() {
        let user = if let Some(user_id) = process.user_id() {
            users
                .get_user_by_id(user_id)
                .map(|u| u.name().to_string())
                .unwrap_or_else(|| "Unknown".to_string())
        } else {
            "System".to_string()
        };

        results.push(ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            user,
        });
    }

    Ok(results)
}

#[tauri::command]
pub fn get_process_handles(
    app: tauri::AppHandle,
    pid: u32,
) -> Result<Vec<modules::win32_safe::inspector::HandleInfo>, String> {
    modules::win32_safe::inspector::list_process_handles(&app, pid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_specific_handle(pid: u32, handle: usize) -> Result<(), String> {
    modules::win32_safe::inspector::close_specific_handle(pid, handle).map_err(|e| e.to_string())
}
#[tauri::command]
pub fn get_infra_health(
    accounts: Vec<modules::account::Account>,
) -> modules::win32_safe::health::InfraHealthReport {
    modules::win32_safe::health::get_infra_health(&accounts)
}
