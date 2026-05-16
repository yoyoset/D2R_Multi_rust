use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[derive(thiserror::Error, Debug)]
pub enum FileSwapError {
    #[error("error.file_swap.deletion_failed")]
    FileDeletionFailed(String),
    #[error("error.file_swap.env_error")]
    EnvError,
    #[error("error.file_swap.permission_denied")]
    PermissionDenied(String),
    #[error("error.file_swap.file_in_use")]
    FileInUse(String),
    #[error("error.file_swap.io")]
    Io(#[from] std::io::Error),
}

fn map_io_error(e: std::io::Error, path: &Path) -> FileSwapError {
    match e.kind() {
        std::io::ErrorKind::PermissionDenied => {
            FileSwapError::PermissionDenied(path.to_string_lossy().to_string())
        }
        _ => {
            // code 32 = ERROR_SHARING_VIOLATION
            let msg = e.to_string();
            if msg.contains("32") || msg.contains("sharing") {
                FileSwapError::FileInUse(path.to_string_lossy().to_string())
            } else {
                FileSwapError::Io(e)
            }
        }
    }
}

/// (Industrial Grade Verify) Attempt to open the file with exclusive access to check for locks
pub fn verify_config_writable() -> Result<(), FileSwapError> {
    let path = get_bnet_config_path()?;
    if !path.exists() {
        return Ok(());
    }

    // Try to open with write access and NO sharing (exclusive)
    // On Windows, this will fail if any other process (like Battle.net or Agent) has it open
    match fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(&path) 
    {
        Ok(_) => Ok(()),
        Err(e) => Err(map_io_error(e, &path)),
    }
}

fn get_bnet_config_path() -> Result<PathBuf, FileSwapError> {
    let program_data = env::var("ProgramData").map_err(|_| FileSwapError::EnvError)?;
    let path = Path::new(&program_data)
        // Correct path: %ProgramData%\Battle.net\Agent\product.db
        .join("Battle.net")
        .join("Agent")
        .join("product.db");
    Ok(path)
}

fn get_snapshot_dir(app: &AppHandle) -> Result<PathBuf, FileSwapError> {
    Ok(crate::modules::data_root::get_data_root(app).join("snapshots"))
}

fn get_snapshot_path(app: &AppHandle, account_id: &str) -> Result<PathBuf, FileSwapError> {
    get_snapshot_dir(app).map(|p| p.join(format!("product_{}.db", account_id)))
}

/// Save current DB to specified account's snapshot
pub fn rotate_save(app: &AppHandle, last_account_id: &str) -> Result<(), FileSwapError> {
    let current_db = get_bnet_config_path()?;
    if !current_db.exists() {
        tracing::warn!("Backup skipped: Config not found at {:?}", current_db);
        return Ok(());
    }

    let snapshot_path = get_snapshot_path(app, last_account_id)?;
    let tmp_snapshot = snapshot_path.with_extension("tmp");

    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent).map_err(|e| map_io_error(e, parent))?;
    }

    // INDUSTRIAL ATOMICITY: Copy to .tmp first, then rename
    fs::copy(&current_db, &tmp_snapshot).map_err(|e| map_io_error(e, &current_db))?;
    fs::rename(&tmp_snapshot, &snapshot_path).map_err(|e| map_io_error(e, &snapshot_path))?;

    tracing::info!("Backup successful (Atomic): {:?} -> {:?}", current_db, snapshot_path);
    Ok(())
}

/// Forcefully delete the current Battle.net product.db
pub fn delete_config() -> Result<(), FileSwapError> {
    // Audit before operation
    verify_config_writable()?;

    let target_db = get_bnet_config_path()?;
    if target_db.exists() {
        match fs::remove_file(&target_db) {
            Ok(_) => {
                tracing::info!("Config deleted successfully: {:?}", target_db);
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to delete config: {:?} (Error: {})", target_db, e);
                Err(FileSwapError::FileDeletionFailed(e.to_string()))
            }
        }
    } else {
        tracing::info!("Config deletion skipped (Not Found): {:?}", target_db);
        Ok(())
    }
}

/// Restore a specific account's snapshot to the active position
/// Returns Ok(true) if restored, Ok(false) if snapshot not found (skipped)
pub fn restore_snapshot(app: &AppHandle, account_id: &str) -> Result<bool, FileSwapError> {
    // Critical pre-flight check
    verify_config_writable()?;

    let target_db = get_bnet_config_path()?;
    let snapshot_path = get_snapshot_path(app, account_id)?;

    if !snapshot_path.exists() {
        tracing::info!("Restore skipped: Snapshot not found at {:?}", snapshot_path);
        return Ok(false);
    }

    if let Some(parent) = target_db.parent() {
        fs::create_dir_all(parent).map_err(|e| map_io_error(e, parent))?;
    }

    // INDUSTRIAL ATOMICITY: Restore to .tmp first, then rename to replace target_db
    // This prevents leaving the system with NO config if copy fails.
    let tmp_restore = target_db.with_extension("tmp");
    fs::copy(&snapshot_path, &tmp_restore).map_err(|e| map_io_error(e, &snapshot_path))?;
    fs::rename(&tmp_restore, &target_db).map_err(|e| map_io_error(e, &target_db))?;

    tracing::debug!("Restored snapshot (Atomic): {:?}", snapshot_path);
    Ok(true)
}

/// Delete a specific account's snapshot file
pub fn delete_snapshot(app: &AppHandle, account_id: &str) -> Result<(), FileSwapError> {
    let snapshot_path = get_snapshot_path(app, account_id)?;
    if snapshot_path.exists() {
        fs::remove_file(snapshot_path)?;
    }
    Ok(())
}

pub fn clear_all_snapshots(app: &AppHandle) -> Result<(), FileSwapError> {
    let snapshot_dir = get_snapshot_dir(app)?;
    if snapshot_dir.exists() {
        fs::remove_dir_all(&snapshot_dir)?;
        fs::create_dir_all(&snapshot_dir)?;
    }
    Ok(())
}

/// Cleanup Battle.net archive files and cache
pub fn cleanup_bnet_archives() -> Result<String, FileSwapError> {
    let program_data = env::var("ProgramData").map_err(|_| FileSwapError::EnvError)?;
    let bnet_agent_dir = Path::new(&program_data).join("Battle.net").join("Agent");

    let mut cleaned_count = 0;

    // Files to remove
    let targets = ["product.db", "Agent.db", "Agent.log"];

    for target in targets {
        let path = bnet_agent_dir.join(target);
        if path.exists() {
            if fs::remove_file(&path).is_ok() {
                cleaned_count += 1;
            }
        }
    }

    // Also try to remove Logs folder
    let logs_dir = bnet_agent_dir.join("Logs");
    if logs_dir.exists() {
        let _ = fs::remove_dir_all(logs_dir);
    }

    Ok(format!("logs.file_swap.cleaned_count|{{\"count\":{}}}", cleaned_count))
}
