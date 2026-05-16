use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager};
use serde::Serialize;
use crate::modules::os::windows::utils::to_pcwstr;

#[derive(Serialize, Clone, Debug)]
pub struct DataLocationInfo {
    pub path: String,
    pub is_custom: bool,
    pub free_space_mb: u64,
    pub exe_on_c_drive: bool,
}

/// Single Source of Truth for data root directory.
/// Priority: 
/// 1. data_path.txt next to exe (Manual Redirect)
/// 2. config.json next to exe (Portable Mode)
/// 3. Tauri default %APPDATA%
pub fn get_data_root(app: &AppHandle) -> PathBuf {
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            // 1. Manual Redirect
            let marker = exe_dir.join("data_path.txt");
            if marker.exists() {
                if let Ok(content) = fs::read_to_string(&marker) {
                    let custom = PathBuf::from(content.trim());
                    if custom.exists() || fs::create_dir_all(&custom).is_ok() {
                        return custom;
                    }
                }
            }

            // 2. Portable Mode: If config.json exists in the same folder as the exe
            let portable_config = exe_dir.join("config.json");
            if portable_config.exists() {
                return exe_dir.to_path_buf();
            }
        }
    }
    // 3. Standard AppData
    app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."))
}

/// Check if exe is on C drive
fn is_exe_on_c_drive() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.to_str().map(|s| s.to_uppercase().starts_with("C:")))
        .unwrap_or(false)
}

/// Get free space in MB for a given path
fn get_free_space_mb(path: &std::path::Path) -> u64 {
    // Use Windows API GetDiskFreeSpaceExW
    use windows::core::PCWSTR;
    
    let path_str = path.to_string_lossy();
    // Extract drive root like "D:\"
    let root = if path_str.len() >= 3 && path_str.chars().nth(1) == Some(':') {
        format!("{}\\", &path_str[..2])
    } else {
        path_str.to_string()
    };
    let wide = to_pcwstr(&root);
    let mut free_bytes: u64 = 0;
    unsafe {
        let _ = windows::Win32::Storage::FileSystem::GetDiskFreeSpaceExW(
            PCWSTR(wide.as_ptr()),
            None,
            None,
            Some(&mut free_bytes),
        );
    }
    free_bytes / (1024 * 1024)
}

/// Get data location info for frontend display
pub fn get_location_info(app: &AppHandle) -> DataLocationInfo {
    let data_root = get_data_root(app);
    let is_custom = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|d| d.join("data_path.txt").exists()))
        .unwrap_or(false);
    DataLocationInfo {
        path: data_root.to_string_lossy().to_string(),
        is_custom,
        free_space_mb: get_free_space_mb(&data_root),
        exe_on_c_drive: is_exe_on_c_drive(),
    }
}

/// Validate a target path is writable and has enough space
pub fn validate_target_path(path: &str) -> Result<(), String> {
    let target = PathBuf::from(path);
    if let Err(e) = fs::create_dir_all(&target) {
        return Err(format!("Cannot create directory: {}", e));
    }
    let test_file = target.join(".write_test");
    if let Err(e) = fs::write(&test_file, "test") {
        return Err(format!("Directory not writable: {}", e));
    }
    let _ = fs::remove_file(test_file);
    let free = get_free_space_mb(&target);
    if free < 100 {
        return Err(format!("Insufficient disk space: {}MB (need 100MB+)", free));
    }
    Ok(())
}

/// Write data_path.txt next to exe
pub fn set_data_path(new_path: &str) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let marker = exe.parent().ok_or("Cannot find exe dir")?.join("data_path.txt");
    fs::write(marker, new_path).map_err(|e| format!("Failed to write data_path.txt: {}", e))
}
