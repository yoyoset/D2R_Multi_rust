use serde::{Deserialize, Serialize};
use thiserror::Error;
use crate::modules::file_swap;

#[derive(Serialize, Clone, Debug)]
pub struct LaunchLogPayload {
    pub account_id: String,
    pub message: String,
    pub level: String, // "info", "success", "error"
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Account {
    pub id: String,               // UUID
    pub win_user: String,         // The bound Windows Username
    #[serde(skip_serializing)]
    pub win_pass: Option<String>, // Sensitive: Stored separately in Vault
    pub bnet_account: String,     // Display only
    pub note: Option<String>,     // Role remarks
    pub avatar: Option<String>,   // Base64 encoded image or library icon ID
    #[serde(default = "default_true")]
    pub auto_fix_password: bool,  // Auto-refresh password policy (Fixes 0x80070532)
    pub game_path: Option<String>,    // Auto-learned REAL path of the running D2R.exe (junction-resolved; display/diagnostics only)
    #[serde(default = "default_true")]
    pub is_d2r: bool,                 // false = pure Battle.net login-switching account (no D2R multibox): baseline not required, backup by ledger ownership alone
    #[serde(default)]
    pub baseline_path: Option<String>, // User-confirmed CONFIGURED game dir as set in the Battle.net client (mirror path when using junctions). THE sole criterion for the backup gate.
    #[serde(default = "default_false")]
    pub strict_baseline: bool,        // 唯一基准: on mismatch, silently cancel the backup instead of prompting for arbitration
    #[serde(default = "default_false")]
    pub skip_config_sync: bool,       // Skip product.db synchronization (Manual Backup Mode)
}

fn default_false() -> bool { false }

fn default_true() -> bool { true }

#[derive(Deserialize, Serialize, Debug, Default, Clone)]
pub struct AccountStatus {
    pub bnet_active: bool,
    pub bnet_pid: Option<u32>,
    pub d2r_active: bool,
    pub d2r_pid: Option<u32>,
}

#[derive(Error, Debug)]
pub enum AccountError {
    #[error("Launch failed: {0}")]
    LaunchError(#[from] anyhow::Error),
    #[error("BNET_NOT_FOUND")]
    InvalidPath,
    #[error("File Swap Error: {0}")]
    FileSwap(#[from] file_swap::FileSwapError),
    #[error("USER_UNINITIALIZED")]
    UserUninitialized,
    #[error("LAUNCH_TIMEOUT")]
    LaunchTimeout,
    #[error("System Error: {0}")]
    SysInfo(String),
}

#[derive(Serialize, Clone, Debug)]
pub struct DiagnosticResult {
    pub category: String,
    pub name: String,
    pub status: String, // i18n keys: "status_pass" | "status_warning" | "status_fail"
    pub message: String,
}
