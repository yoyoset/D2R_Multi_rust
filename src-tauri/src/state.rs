use crate::modules::os::{windows::WindowsProvider, OSProvider};
use std::sync::{Arc, Mutex};
use sysinfo::{ProcessRefreshKind, RefreshKind, System, Users};

/// Application state managed by Tauri's dependency injection
pub struct AppState {
    pub sys: Mutex<System>,
    pub users: Mutex<Users>,
    pub os: Arc<dyn OSProvider>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sys: Mutex::new(System::new_with_specifics(
                RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
            )),
            users: Mutex::new(Users::new_with_refreshed_list()),
            os: Arc::new(WindowsProvider),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
