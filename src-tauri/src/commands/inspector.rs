use crate::modules;
use crate::state;
use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub user: String,
}

#[tauri::command]
pub async fn get_process_list(
    app: tauri::AppHandle,
) -> Result<Vec<ProcessInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<state::AppState>();
        let mut sys = state.sys_lock();
        let mut users = state.users_lock();

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
            let pid: &sysinfo::Pid = pid;
            let pid_u32: u32 = pid.as_u32();
            let user = if let Some(user_id) = process.user_id() {
                let user_id: &sysinfo::Uid = user_id;
                users
                    .get_user_by_id(user_id)
                    .map(|u: &sysinfo::User| u.name().to_string())
                    .unwrap_or_else(|| "status_unknown".to_string())
            } else {
                "status_system".to_string()
            };

            results.push(ProcessInfo {
                pid: pid_u32,
                name: process.name().to_string_lossy().to_string(),
                user,
            });
        }

        Ok(results)
    })
    .await
    .map_err(|e| format!("logs.inspector.task_join_error|{{\"error\":\"{}\"}}", e))?
}

#[tauri::command]
pub async fn get_process_handles(
    app: tauri::AppHandle,
    pid: u32,
) -> Result<Vec<modules::win32_safe::inspector::HandleInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        modules::win32_safe::inspector::list_process_handles(&app, pid).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("logs.inspector.task_join_error|{{\"error\":\"{}\"}}", e))?
}

#[tauri::command]
pub async fn close_specific_handle(pid: u32, handle: usize) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        modules::win32_safe::inspector::close_specific_handle(pid, handle).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?
}
#[tauri::command]
pub fn get_infra_health(
    accounts: Vec<modules::account::Account>,
) -> modules::win32_safe::health::InfraHealthReport {
    modules::win32_safe::health::get_infra_health(&accounts)
}
