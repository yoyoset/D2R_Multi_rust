use serde::Serialize;
use std::sync::{Mutex, OnceLock, mpsc::{SyncSender, sync_channel}};
use std::thread;
use tauri::Emitter;

#[derive(Serialize, Clone, Debug)]
pub struct LogEntry {
    pub time: String,
    pub level: String,
    pub key: Option<String>,
    pub args: Option<serde_json::Value>,
    pub message: String,
}

static GLOBAL_APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();
static LOGGER_TX: OnceLock<SyncSender<LogEntry>> = OnceLock::new();

pub fn init_global_handle(app: tauri::AppHandle) {
    let _ = GLOBAL_APP_HANDLE.set(app);
    start_logger_thread();
}

fn start_logger_thread() {
    if LOGGER_TX.get().is_some() { return; }

    let (tx, rx) = sync_channel::<LogEntry>(1000);
    let _ = LOGGER_TX.set(tx);

    thread::spawn(move || {
        while let Ok(entry) = rx.recv() {
            if let Some(log_path) = get_log_path() {
                // Professional Log Rotation Check
                if let Ok(metadata) = std::fs::metadata(&log_path) {
                    if metadata.len() > MAX_LOG_SIZE {
                        let _ = rotate_logs(&log_path);
                    }
                }

                if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
                    let now = chrono::Local::now();
                    let date_time_str = now.format("%Y-%m-%d %H:%M:%S").to_string();
                    let log_line = format!(
                        "[{}] [{}] {}\n",
                        date_time_str,
                        entry.level.to_uppercase(),
                        entry.message
                    );
                    let _ = file.write_all(log_line.as_bytes());
                }
            }
        }
    });
}

fn rotate_logs(log_path: &std::path::Path) -> std::io::Result<()> {
    // Industrial Rotation: .log -> .log.1 -> .log.2
    let log1 = log_path.with_extension("log.1");
    let log2 = log_path.with_extension("log.2");

    if log1.exists() {
        let _ = std::fs::rename(&log1, &log2);
    }
    if log_path.exists() {
        let _ = std::fs::rename(log_path, &log1);
    }
    
    // Create new blank log with a rotation header
    let mut f = std::fs::File::create(log_path)?;
    f.write_all(b"--- Log Rotated ---\n")?;
    Ok(())
}

fn log_buffer() -> &'static Mutex<Vec<LogEntry>> {
    static BUFFER: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();
    BUFFER.get_or_init(|| Mutex::new(Vec::new()))
}

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

const LOG_FILENAME: &str = "d2r-multiplay.log";
const MAX_LOG_SIZE: u64 = 10 * 1024 * 1024; // 10MB

static RESOLVED_LOG_PATH: OnceLock<PathBuf> = OnceLock::new();

pub fn get_log_path() -> Option<PathBuf> {
    // Fast path: already resolved to the data directory.
    if let Some(p) = RESOLVED_LOG_PATH.get() {
        return Some(p.clone());
    }

    // Preferred: follow the configured data root (data_path.txt / portable /
    // %APPDATA%), same single-source-of-truth the rest of the app uses.
    // Logs live in `<data_root>\logs\` so rotation files stay tidy.
    if let Some(app) = GLOBAL_APP_HANDLE.get() {
        let dir = crate::modules::data_root::get_data_root(app).join("logs");
        if std::fs::create_dir_all(&dir).is_ok() {
            let path = dir.join(LOG_FILENAME);
            let _ = RESOLVED_LOG_PATH.set(path.clone());
            return Some(path);
        }
    }

    // Fallback (very early startup, before the global handle is set): next to
    // the exe. Intentionally NOT cached, so we upgrade to the data dir once
    // the handle becomes available.
    if let Ok(mut exe_path) = std::env::current_exe() {
        exe_path.pop();
        exe_path.push(LOG_FILENAME);
        return Some(exe_path);
    }
    None
}

pub fn log(app: Option<&tauri::AppHandle>, level: &str, key: Option<&str>, args: Option<serde_json::Value>, message: &str) {
    let now = chrono::Local::now();
    let time_str = now.format("%H:%M:%S").to_string();

    let entry = LogEntry {
        time: time_str,
        level: level.to_string(),
        key: key.map(|k| k.to_string()),
        args,
        message: message.to_string(),
    };

    // 1. Emit to frontend (Non-blocking)
    if let Some(h) = app {
        let _ = h.emit("launch-log", entry.clone());
    } else if let Some(h) = GLOBAL_APP_HANDLE.get() {
        let _ = h.emit("launch-log", entry.clone());
    }

    // 2. Buffer for history
    if let Ok(mut buffer) = log_buffer().lock() {
        buffer.push(entry.clone());
        if buffer.len() > 1000 {
            buffer.remove(0);
        }
    }

    // 3. Send to async logger thread (Non-blocking)
    if let Some(tx) = LOGGER_TX.get() {
        let _ = tx.try_send(entry);
    }
}

pub fn log_localized(app: Option<&tauri::AppHandle>, level: &str, key: &str, args: Option<serde_json::Value>, _fallback: &str) {
    // Use i18n translation instead of hardcoded fallback
    let message = crate::modules::i18n::translate_with_fallback(key, &args, _fallback);
    log(app, level, Some(key), args, &message);
}


pub fn success_key(app: Option<&tauri::AppHandle>, key: &str, args: Option<serde_json::Value>) {
    log_localized(app, "success", key, args, key);
}

pub fn info_key(app: Option<&tauri::AppHandle>, key: &str, args: Option<serde_json::Value>) {
    log_localized(app, "info", key, args, key);
}

pub fn error_key(app: Option<&tauri::AppHandle>, key: &str, args: Option<serde_json::Value>) {
    log_localized(app, "error", key, args, key);
}

pub fn warn_key(app: Option<&tauri::AppHandle>, key: &str, args: Option<serde_json::Value>) {
    log_localized(app, "warn", key, args, key);
}


pub fn clear_logs() {
    if let Ok(mut buffer) = log_buffer().lock() {
        buffer.clear();
    }
}
