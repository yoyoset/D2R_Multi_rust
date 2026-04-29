use crate::modules;
use crate::state;
use std::os::windows::process::CommandExt;

#[tauri::command]
pub fn kill_mutexes(app: tauri::AppHandle) -> Result<String, String> {
    match modules::win32_safe::mutex::close_d2r_mutexes(&app) {
        Ok(count) => Ok(format!("logs.game.mutex_killed|{{\"count\":{}}}", count)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn kill_processes() -> Result<String, String> {
    let count = modules::process_killer::kill_all_related_processes();
    Ok(format!("logs.game.process_killed|{{\"count\":{}}}", count))
}

#[tauri::command]
pub fn check_active_processes() -> bool {
    modules::process_killer::is_any_related_process_running()
}

#[tauri::command]
pub fn get_detected_d2r_path() -> Result<String, String> {
    match modules::account::get_d2r_path() {
        Some(path) => Ok(path.to_string_lossy().into_owned()),
        None => Err("error.game.not_found".into()),
    }
}

#[tauri::command]
pub fn get_detected_bnet_path() -> Result<String, String> {
    match modules::account::get_bnet_path() {
        Some(path) => Ok(path.to_string_lossy().to_string()),
        None => Err("error.game.bnet_not_found".into()),
    }
}

#[tauri::command]
pub fn launch_game(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
    account: modules::account::Account,
    bnet_only: bool,
    force: bool,
    advanced_mode: bool,
) -> Result<String, String> {
    // [INDUSTRIAL AUTO-HEALING]
    if let Some(pass) = &account.win_pass {
        if pass != "********" {
            let mut config = state.config_lock();
            if let Some(cached_account) = config.accounts.iter_mut().find(|a| a.id == account.id) {
                if cached_account.win_pass.as_ref().map(|p| p == "********").unwrap_or(true) || 
                   cached_account.win_pass.as_ref() != Some(pass) {
                    
                    cached_account.win_pass = Some(pass.clone());
                    let _ = config.save(&app);
                }
            }
        }
    }

    match modules::account::launch_game(
        state.os.as_ref(),
        &app,
        &account,
        bnet_only,
        force,
        advanced_mode,
    ) {
        Ok(pid) => Ok(format!("logs.game.launch_done|{{\"pid\":{}}}", pid)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn stop_bnet_processes() -> Result<String, String> {
    let count = modules::process_killer::kill_bnet_processes_except_game();
    Ok(format!("logs.game.bnet_stop_done|{{\"count\":{}}}", count))
}

#[tauri::command]
pub fn is_user_process_active(
    state: tauri::State<'_, state::AppState>,
    username: String,
) -> Result<bool, String> {
    let sys = state.sys_lock();
    state
        .os
        .is_process_running_for_user(&sys, &username, &["D2R.exe", "Battle.net.exe"])
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
        return Err("error.game.path_invalid".to_string());
    }

    let mut target_dir = if game_dir.is_file() {
        game_dir.parent().ok_or("error.game.path_invalid")?
    } else {
        game_dir
    }
    .to_string_lossy()
    .to_string();

    if target_dir.ends_with('\\') && target_dir.len() > 3 {
        target_dir.pop();
    }

    let _ = window.emit("fix-permissions-log", format!("logs.game.permission_fix_start|{{\"path\":\"{}\"}}", target_dir));

    let mut child = std::process::Command::new("icacls")
        .args([&target_dir, "/grant", "*S-1-5-32-545:(OI)(CI)F", "/T", "/C"])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("error.game.icacls_spawn_fail|{{\"error\":\"{}\"}}", e))?;

    let stdout = child.stdout.take().ok_or("error.game.stdout_fail")?;
    let stderr = child.stderr.take().ok_or("error.game.stderr_fail")?;

    let has_errors = Arc::new(Mutex::new(false));
    let has_errors_stdout = Arc::clone(&has_errors);
    let has_errors_stderr = Arc::clone(&has_errors);

    let window_stdout = window.clone();
    let thread_stdout = std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        let mut line_bytes = Vec::new();
        let mut last_emit = Instant::now();
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
                let _ = window_stdout.emit("fix-permissions-log", format!("logs.game.icacls_summary|{{\"msg\":\"{}\"}}", trimmed));
                continue;
            }

            // Priority 2: Summary messages
            if trimmed.contains("Successfully processed") || trimmed.contains("已成功处理") {
                let _ = window_stdout.emit("fix-permissions-log", format!("logs.game.icacls_summary|{{\"msg\":\"{}\"}}", trimmed));
                continue;
            }

            // Throttled: File paths (the "Busy" indicator)
            if last_emit.elapsed() > throttle_duration {
                let display_line = if let Some(pos) = trimmed.find(":\\") {
                    if pos > 0 {
                        trimmed[pos - 1..].to_string()
                    } else {
                        trimmed.to_string()
                    }
                } else {
                    trimmed.to_string()
                };

                let _ = window_stdout.emit("fix-permissions-log", format!("logs.game.icacls_busy|{{\"path\":\"{}\"}}", display_line));
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
        .map_err(|e| format!("error.game.icacls_wait_fail|{{\"error\":\"{}\"}}", e))?;

    let _ = thread_stdout.join();
    let _ = thread_stderr.join();

    let saw_errors = has_errors.lock().map(|h| *h).unwrap_or(true);

    if status.success() && !saw_errors {
        Ok(format!("logs.game.permission_fix_done|{{\"path\":\"{}\"}}", target_dir))
    } else {
        Err(format!("logs.game.permission_fix_error|{{\"path\":\"{}\"}}", target_dir))
    }
}
