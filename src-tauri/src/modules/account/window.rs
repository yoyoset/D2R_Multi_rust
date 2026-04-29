use std::time::Duration;
use tauri::{AppHandle, Manager};
use windows::Win32::Foundation::{HWND, LPARAM};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, SetWindowTextW, GetWindowTextW,
};
use windows::core::PCWSTR;
// Removed unused sysinfo::System import as we're reusing the state
use std::collections::HashMap;

#[repr(C)]
struct RenameMapContext<'a> {
    map: &'a HashMap<u32, String>,
}

pub async fn maintain_window_titles(app: AppHandle, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    let check_interval = Duration::from_secs(5);
    
    loop {
        if shutdown_rx.try_recv().is_ok() {
            break;
        }
        
        tokio::time::sleep(check_interval).await;

        let state = app.state::<crate::state::AppState>();
        let pid_to_title = {
            let mut name_map = HashMap::new();
            let config = state.config_lock();
            
            if !config.enable_window_rename.unwrap_or(false) {
                continue;
            }

            let format = config.window_rename_format.as_deref().unwrap_or("note");
            for acc in &config.accounts {
                let display_name = match format {
                    "username" => acc.win_user.clone(),
                    "bnet" => acc.bnet_account.clone(),
                    "note" => acc.note.clone().unwrap_or_else(|| acc.bnet_account.clone()),
                    "full" => format!("{} | {} | {}", acc.win_user, acc.bnet_account, acc.note.as_deref().unwrap_or("-")),
                    _ => acc.note.clone().unwrap_or_else(|| acc.bnet_account.clone()),
                };
                if !display_name.is_empty() {
                    name_map.insert(acc.win_user.to_lowercase(), display_name);
                }
            }

            // INDUSTRIAL OPTIMIZATION: Read PIDs from existing Status Cache (Zero Scanning Overhead)
            let mut mapping = HashMap::new();
            let status_cache = state.status_lock();
            for (win_user, status) in status_cache.iter() {
                if let Some(pid) = status.d2r_pid {
                    if let Some(display_name) = name_map.get(&win_user.to_lowercase()) {
                        mapping.insert(pid, display_name.clone());
                    }
                }
            }
            mapping
        };

        if !pid_to_title.is_empty() {
            rename_windows(&pid_to_title);
        }
    }
}

fn rename_windows(map: &HashMap<u32, String>) {
    let context = RenameMapContext { map };
    unsafe {
        let callback_raw: unsafe extern "system" fn(HWND, LPARAM) -> i32 = enum_window_callback;
        let _ = EnumWindows(Some(std::mem::transmute(callback_raw)), LPARAM(&context as *const RenameMapContext as isize));
    }
}

unsafe extern "system" fn enum_window_callback(hwnd: HWND, lparam: LPARAM) -> i32 {
    let context_ptr = lparam.0 as *const RenameMapContext;
    if context_ptr.is_null() { return 1; }
    
    let context = &*context_ptr;
    let mut process_id = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut process_id));

    if let Some(account_name) = context.map.get(&process_id) {
        let mut title_buf = [0u16; 512];
        let len = GetWindowTextW(hwnd, &mut title_buf);
        if len > 0 {
            let current_title = String::from_utf16_lossy(&title_buf[..len as usize]);
            let lower_title = current_title.to_lowercase();
            
            // INDUSTRIAL ROBUSTNESS: Prefix matching (Detects versioned or modded titles)
            if lower_title.starts_with("diablo ii") {
                let suffix = format!(" - [{}]", account_name);
                if !current_title.contains(&suffix) {
                    let new_title = format!("{} - [{}]", current_title, account_name);
                    let new_title_u16: Vec<u16> = new_title.encode_utf16().chain(std::iter::once(0)).collect();
                    let _ = SetWindowTextW(hwnd, PCWSTR(new_title_u16.as_ptr()));
                }
            }
        }
    }
    1
}
