use crate::modules;
use crate::state;
use std::os::windows::process::CommandExt;

#[tauri::command]
pub fn kill_mutexes(app: tauri::AppHandle) -> Result<String, String> {
    match modules::win32_safe::mutex::close_d2r_mutexes(&app) {
        Ok(count) => Ok(format!("Killed {} mutexes", count)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn kill_processes() -> Result<String, String> {
    let count = modules::process_killer::kill_battle_net_processes();
    Ok(format!("Killed {} processes", count))
}

#[tauri::command]
pub fn launch_game(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
    account: modules::account::Account,
    game_path: String,
    bnet_only: bool,
) -> Result<String, String> {
    match modules::account::launch_game(state.os.as_ref(), &app, &account, &game_path, bnet_only) {
        Ok(pid) => Ok(format!("Game launched (PID: {})", pid)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn stop_bnet_processes() -> Result<String, String> {
    let count = modules::process_killer::kill_bnet_processes_except_game();
    Ok(format!("Killed {} Battle.net processes", count))
}

#[tauri::command]
pub fn is_user_process_active(
    state: tauri::State<'_, state::AppState>,
    username: String,
) -> Result<bool, String> {
    state
        .os
        .is_process_running_for_user(&username, &["D2R.exe", "Battle.net.exe"])
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fix_game_permissions(window: tauri::Window, path: String) -> Result<String, String> {
    use std::io::{BufRead, BufReader};
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};
    use tauri::Emitter;

    let game_dir = std::path::Path::new(&path);
    if !game_dir.exists() {
        return Err("Path does not exist".to_string());
    }

    let mut target_dir = if game_dir.is_file() {
        game_dir.parent().ok_or("Invalid path")?
    } else {
        game_dir
    }
    .to_string_lossy()
    .to_string();

    if target_dir.ends_with('\\') && target_dir.len() > 3 {
        target_dir.pop();
    }

    let mut child = std::process::Command::new("icacls")
        .args([&target_dir, "/grant", "*S-1-5-32-545:(OI)(CI)F", "/T", "/C"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn icacls: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    let has_errors = Arc::new(Mutex::new(false));
    let has_errors_stdout = Arc::clone(&has_errors);
    let has_errors_stderr = Arc::clone(&has_errors);

    let window_stdout = window.clone();
    let thread_stdout = std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut line_bytes = Vec::new();
        let mut last_emit = Instant::now();
        // Emit roughly every 100ms to keep the UI "busy" without flooding
        let throttle_duration = Duration::from_millis(100);

        while let Ok(n) = reader.read_until(b'\n', &mut line_bytes) {
            if n == 0 {
                break;
            }

            let l = String::from_utf8_lossy(&line_bytes).to_string();
            line_bytes.clear();

            let trimmed = l.trim();
            if trimmed.is_empty() {
                continue;
            }

            // Priority 1: Check for failure messages
            if trimmed.contains("Failed processing") || trimmed.contains("失败") {
                if let Ok(mut lock) = has_errors_stdout.lock() {
                    *lock = true;
                }
                let _ = window_stdout.emit("fix-permissions-log", trimmed.to_string());
                continue;
            }

            // Priority 2: Summary messages
            if trimmed.contains("Successfully processed") || trimmed.contains("已成功处理") {
                let _ = window_stdout.emit("fix-permissions-log", trimmed.to_string());
                continue;
            }

            // Throttled: File paths (the "Busy" indicator)
            if last_emit.elapsed() > throttle_duration {
                // CLEANUP: If the line contains a path (e.g., "C:\"), only show the path part
                // to avoid showing garbled localized prefixes like "processed file:"
                let display_line = if let Some(pos) = trimmed.find(":\\") {
                    if pos > 0 {
                        // Extract from the drive letter (e.g., "C:\...")
                        trimmed[pos - 1..].to_string()
                    } else {
                        trimmed.to_string()
                    }
                } else {
                    trimmed.to_string()
                };

                let _ = window_stdout.emit("fix-permissions-log", display_line);
                last_emit = Instant::now();
            }
        }
    });

    let window_stderr = window.clone();
    let thread_stderr = std::thread::spawn(move || {
        let mut reader = BufReader::new(stderr);
        let mut line_bytes = Vec::new();
        while let Ok(n) = reader.read_until(b'\n', &mut line_bytes) {
            if n == 0 {
                break;
            }
            let l = String::from_utf8_lossy(&line_bytes).to_string();
            line_bytes.clear();

            if !l.trim().is_empty() {
                if let Ok(mut lock) = has_errors_stderr.lock() {
                    *lock = true;
                }
                let _ = window_stderr.emit("fix-permissions-log", format!("ERR: {}", l.trim()));
            }
        }
    });

    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for icacls: {}", e))?;

    let _ = thread_stdout.join();
    let _ = thread_stderr.join();

    let saw_errors = *has_errors.lock().unwrap();

    if status.success() && !saw_errors {
        Ok(format!(
            "Successfully finished permission fix for: {}",
            target_dir
        ))
    } else {
        Err(format!(
            "Permission fix failed for: {}. Check logs.",
            target_dir
        ))
    }
}
