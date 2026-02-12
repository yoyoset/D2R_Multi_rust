use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(thiserror::Error, Debug)]
pub enum FileSwapError {
    #[error("无法清理档案 (可能战网未关闭)")]
    FileDeletionFailed(#[source] std::io::Error),
    #[error("Environment error: ProgramData not found")]
    EnvError,
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Conflict: product.db still exists")]
    Conflict,
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
    app.path()
        .app_data_dir()
        .map(|p| p.join("snapshots"))
        .map_err(|e| FileSwapError::Io(std::io::Error::new(std::io::ErrorKind::Other, e)))
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
    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent)?;
    }

    match fs::copy(&current_db, &snapshot_path) {
        Ok(_) => {
            tracing::info!("Backup successful: {:?} -> {:?}", current_db, snapshot_path);
            Ok(())
        }
        Err(e) => {
            tracing::error!(
                "Backup failed: {:?} -> {:?} (Error: {})",
                current_db,
                snapshot_path,
                e
            );
            Err(e.into())
        }
    }
}

/// Forcefully delete the current Battle.net product.db
pub fn delete_config() -> Result<(), FileSwapError> {
    let target_db = get_bnet_config_path()?;
    if target_db.exists() {
        match fs::remove_file(&target_db) {
            Ok(_) => {
                tracing::info!("Config deleted successfully: {:?}", target_db);
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to delete config: {:?} (Error: {})", target_db, e);
                Err(FileSwapError::FileDeletionFailed(e))
            }
        }
    } else {
        tracing::info!("Config deletion skipped (Not Found): {:?}", target_db);
        Ok(())
    }
}

/// Restore a specific account's snapshot to the active position
pub fn restore_snapshot(app: &AppHandle, account_id: &str) -> Result<(), FileSwapError> {
    let target_db = get_bnet_config_path()?;

    // Task 2: Critical check before restore
    if target_db.exists() {
        return Err(FileSwapError::Conflict);
    }

    let snapshot_path = get_snapshot_path(app, account_id)?;

    if snapshot_path.exists() {
        if let Some(parent) = target_db.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(&snapshot_path, &target_db)?;
        tracing::debug!("Restored snapshot: {:?}", snapshot_path);
        Ok(())
    } else {
        tracing::warn!("Snapshot not found: {:?}", snapshot_path);
        Ok(())
    }
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

    Ok(format!("Cleaned {} archive files", cleaned_count))
}
