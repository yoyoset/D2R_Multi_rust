use serde::Serialize;
use std::sync::{Mutex, OnceLock};
use tauri::Emitter;

#[derive(Serialize, Clone, Debug)]
pub struct LogEntry {
    pub time: String,
    pub level: String,
    pub message: String,
}

fn log_buffer() -> &'static Mutex<Vec<LogEntry>> {
    static BUFFER: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();
    BUFFER.get_or_init(|| Mutex::new(Vec::new()))
}

use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

fn get_log_path() -> Option<PathBuf> {
    if let Ok(mut exe_path) = std::env::current_exe() {
        exe_path.pop();
        exe_path.push("d2r-multiplay.log");
        return Some(exe_path);
    }
    None
}

pub fn log(app: &tauri::AppHandle, level: &str, message: &str) {
    let now = chrono::Local::now();
    let time_str = now.format("%H:%M:%S").to_string();
    let date_time_str = now.format("%Y-%m-%d %H:%M:%S").to_string();

    let entry = LogEntry {
        time: time_str,
        level: level.to_string(),
        message: message.to_string(),
    };

    // Emit to frontend regardless of persistence for real-time visualization
    let _ = app.emit("launch-log", entry.clone());

    // Optional: Buffer for persistent retrieval if history needed
    if let Ok(mut buffer) = log_buffer().lock() {
        buffer.push(entry);
        if buffer.len() > 1000 {
            buffer.remove(0);
        }
    }

    // Write to file (best effort)
    if let Some(log_path) = get_log_path() {
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
            let log_line = format!(
                "[{}] [{}] {}\n",
                date_time_str,
                level.to_uppercase(),
                message
            );
            let _ = file.write_all(log_line.as_bytes());
        }
    }
}

pub fn clear_logs() {
    if let Ok(mut buffer) = log_buffer().lock() {
        buffer.clear();
    }
}
