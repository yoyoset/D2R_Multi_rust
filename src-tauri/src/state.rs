use crate::modules::os::{windows::WindowsProvider, OSProvider};
use crate::modules::config::ActiveSequenceState;
use crate::modules::account::AccountStatus;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;
use std::collections::HashMap;
use sysinfo::{ProcessRefreshKind, RefreshKind, System, Users};
use parking_lot::{Mutex, MutexGuard};

/// Application state managed by Tauri's dependency injection
/// INDUSTRIAL UPGRADE: Using parking_lot for high-performance non-poisoning locks
pub struct AppState {
    pub sys: Mutex<System>,
    pub users: Mutex<Users>,
    pub os: Arc<dyn OSProvider>,
    pub is_quitting: AtomicBool,
    pub active_sequence: Mutex<Option<ActiveSequenceState>>,
    pub config: Mutex<crate::modules::config::AppConfig>,
    pub account_statuses: Mutex<HashMap<String, AccountStatus>>,
    pub shutdown_tx: tokio::sync::broadcast::Sender<()>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            sys: Mutex::new(System::new_with_specifics(
                RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
            )),
            users: Mutex::new(Users::new_with_refreshed_list()),
            os: Arc::new(WindowsProvider),
            is_quitting: AtomicBool::new(false),
            active_sequence: Mutex::new(None),
            config: Mutex::new(crate::modules::config::AppConfig::default()),
            account_statuses: Mutex::new(HashMap::new()),
            shutdown_tx: tokio::sync::broadcast::channel(1).0,
        }
    }

    /// Optimized zero-latency lock for config
    pub fn config_lock(&self) -> MutexGuard<'_, crate::modules::config::AppConfig> {
        self.config.lock()
    }

    /// Optimized zero-latency lock for system monitoring
    pub fn sys_lock(&self) -> MutexGuard<'_, System> {
        self.sys.lock()
    }

    /// Optimized zero-latency lock for user tracking
    pub fn users_lock(&self) -> MutexGuard<'_, Users> {
        self.users.lock()
    }

    /// Optimized zero-latency lock for sequence automation
    pub fn sequence_lock(&self) -> MutexGuard<'_, Option<ActiveSequenceState>> {
        self.active_sequence.lock()
    }

    /// Optimized zero-latency lock for account process status cache
    pub fn status_lock(&self) -> MutexGuard<'_, HashMap<String, AccountStatus>> {
        self.account_statuses.lock()
    }

    pub fn refresh_game_processes(&self) {
        let mut sys = self.sys.lock();
        sys.refresh_processes_specifics(
            sysinfo::ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing()
                .with_user(sysinfo::UpdateKind::Always)
                .with_exe(sysinfo::UpdateKind::Always),
        );
    }
}
