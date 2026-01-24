use sysinfo::{System, Users, ProcessRefreshKind, RefreshKind};
use std::sync::Mutex;

/// Application state managed by Tauri's dependency injection
pub struct AppState {
    pub sys: Mutex<System>,
    pub users: Mutex<Users>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sys: Mutex::new(System::new_with_specifics(
                RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing())
            )),
            users: Mutex::new(Users::new_with_refreshed_list()),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
