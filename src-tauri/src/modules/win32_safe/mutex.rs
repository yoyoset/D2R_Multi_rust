use std::ffi::c_void;
use std::mem::size_of;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use windows::Win32::Foundation::{
    CloseHandle, DuplicateHandle, DUPLICATE_CLOSE_SOURCE, DUPLICATE_SAME_ACCESS, HANDLE, NTSTATUS,
    STATUS_BUFFER_OVERFLOW, STATUS_INFO_LENGTH_MISMATCH, STATUS_SUCCESS,
};
use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcess, PROCESS_DUP_HANDLE};

#[link(name = "ntdll")]
extern "system" {
    fn NtQuerySystemInformation(
        SystemInformationClass: i32,
        SystemInformation: *mut c_void,
        SystemInformationLength: u32,
        ReturnLength: *mut u32,
    ) -> NTSTATUS;

    fn NtQueryObject(
        Handle: HANDLE,
        ObjectInformationClass: i32,
        ObjectInformation: *mut c_void,
        ObjectInformationLength: u32,
        ReturnLength: *mut u32,
    ) -> NTSTATUS;
}

const SYSTEM_EXTENDED_HANDLE_INFORMATION: i32 = 64;
const OBJECT_NAME_INFORMATION: i32 = 1;
const OBJECT_TYPE_INFORMATION: i32 = 2;
const D2R_MUTEX_NAME: &str = "DiabloII Check For Other Instances";
const D2R_MUTEX_NAME_ALT: &str = "Diablo II Check For Other Instances";

#[repr(C)]
#[derive(Copy, Clone, Debug)]
struct SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX {
    object: *mut c_void,
    unique_process_id: usize,
    handle_value: usize,
    granted_access: u32,
    creator_back_trace_index: u16,
    object_type_index: u16,
    handle_attributes: u32,
    reserved: u32,
}

#[repr(C)]
struct SYSTEM_HANDLE_INFORMATION_EX {
    number_of_handles: usize,
    reserved: usize,
}

#[repr(C)]
struct UNICODE_STRING {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

/// Standalone entry (manual "kill mutexes" button): discovers D2R PIDs itself
/// via a process scan, then closes their instance mutexes.
pub fn close_d2r_mutexes(app: &tauri::AppHandle) -> Result<usize, anyhow::Error> {
    // 1. Identify target PIDs
    let mut sys = System::new();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::Always),
    );

    let mut pids = Vec::new();
    for (pid, process) in sys.processes() {
        if let Some(exe_path) = process.exe() {
            if let Some(exe_name) = exe_path.file_name() {
                let name = exe_name.to_string_lossy().to_lowercase();
                if name == "d2r.exe" || name == "diabloii.exe" {
                    pids.push(pid.as_u32());
                }
            }
        }
    }

    close_d2r_mutexes_with_pids(app, &pids)
}

/// Hot-path entry: caller supplies the already-known D2R PIDs (e.g. from the
/// launch pre-flight audit), avoiding a redundant System + full with_exe refresh.
pub fn close_d2r_mutexes_with_pids(
    app: &tauri::AppHandle,
    pids: &[u32],
) -> Result<usize, anyhow::Error> {
    // 0. Enable SeDebugPrivilege
    if !crate::modules::win_admin::enable_debug_privilege() {
        crate::modules::logger::log_localized(Some(app), "warn", "logs.mutex.debug_priv_failed", None, "Failed to enable debug privilege, sensing process may be limited");
    }

    let target_pids: std::collections::HashSet<u32> = pids.iter().copied().collect();

    if target_pids.is_empty() {
        crate::modules::logger::log_localized(Some(app), "info", "logs.mutex.no_processes", None, "No D2R processes found, skipping mutex cleanup");
        return Ok(0);
    }

    unsafe {
        // [PERF] sub-phase timing inside the mutex sweep.
        let __mt_start = std::time::Instant::now();
        let mut __mt = __mt_start;
        macro_rules! mperf {
            ($l:expr) => {{
                let now = std::time::Instant::now();
                if cfg!(debug_assertions) {
                    crate::modules::logger::log(
                        Some(app), "info", None, None,
                        &format!("[PERF]   mutex.{:<8} {:>5} ms", $l, now.duration_since(__mt).as_millis()),
                    );
                }
                __mt = now;
            }};
        }

        // Single system-wide enumeration (start at 32 MB so a ~200k-handle
        // system completes in one call instead of re-enumerating 4-5 times as a
        // small buffer doubles — that was the real mutex cost).
        let mut size: u32 = 0x2000000; // 32 MB
        let mut buffer: Vec<u8> = vec![0; size as usize];
        let mut return_length: u32 = 0;
        loop {
            let status = NtQuerySystemInformation(
                SYSTEM_EXTENDED_HANDLE_INFORMATION,
                buffer.as_mut_ptr() as *mut c_void,
                size,
                &mut return_length,
            );
            if status == STATUS_INFO_LENGTH_MISMATCH || status == STATUS_BUFFER_OVERFLOW {
                let needed = return_length.saturating_add(return_length / 4);
                size = needed.max(size.saturating_mul(2));
                buffer.resize(size as usize, 0);
            } else if status == STATUS_SUCCESS {
                break;
            } else {
                return Err(anyhow::anyhow!(
                    "NtQuerySystemInformation(64) Failed: 0x{:X}",
                    status.0
                ));
            }
        }
        mperf!("enum");

        let info = &*(buffer.as_ptr() as *const SYSTEM_HANDLE_INFORMATION_EX);
        let handles_ptr = buffer
            .as_ptr()
            .add(size_of::<SYSTEM_HANDLE_INFORMATION_EX>())
            as *const SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX;

        crate::modules::logger::log_localized(
            Some(app),
            "debug",
            "logs.mutex.scanning_system_handles",
            Some(serde_json::json!({ "count": info.number_of_handles })),
            &format!("Scanning system {} handles...", info.number_of_handles),
        );

        let mut closed_count = 0;
        let mut target_handle_count = 0;
        let mut mutant_type_index = 0u16;
        let mut found_mutant_type = false;

        // Pass 1: Targeted scan — only handles owned by our D2R PIDs.
        for i in 0..info.number_of_handles {
            let entry = *handles_ptr.add(i);
            let pid = entry.unique_process_id as u32;
            if target_pids.contains(&pid) {
                target_handle_count += 1;
                if let Some(name) = get_handle_name_safe(app, pid, entry.handle_value, true) {
                    if !found_mutant_type {
                        mutant_type_index = entry.object_type_index;
                        found_mutant_type = true;
                    }
                    if check_and_close_if_match(app, &name, pid, entry.handle_value, &mut closed_count) {
                        continue;
                    }
                }
            }
        }
        mperf!("pass1");

        // Pass 2: Cross-session global scan (only when advanced/multi-account).
        let multi_account = {
            use tauri::Manager;
            let state = app.state::<crate::state::AppState>();
            let config = state.config_lock();
            config.advanced_launch_mode.unwrap_or(true)
        };

        if found_mutant_type && multi_account {
            crate::modules::logger::log_localized(
                Some(app),
                "debug",
                "logs.mutex.global_scan",
                None,
                "Performing global system logic lock scan (Cross-Session)...",
            );
            for i in 0..info.number_of_handles {
                let entry = *handles_ptr.add(i);
                if entry.object_type_index == mutant_type_index {
                    let pid = entry.unique_process_id as u32;
                    if target_pids.contains(&pid) {
                        continue;
                    }
                    if let Some(name) = get_handle_name_safe(app, pid, entry.handle_value, false) {
                        check_and_close_if_match(app, &name, pid, entry.handle_value, &mut closed_count);
                    }
                }
            }
        }
        mperf!("pass2");

        if closed_count == 0 {
            crate::modules::logger::log_localized(
                Some(app),
                "info",
                "logs.mutex.none_found",
                Some(serde_json::json!({ "count": target_handle_count })),
                &format!(
                    "System-wide scan complete, no D2R mutexes hit (Checked {} handles)",
                    target_handle_count
                ),
            );
        }

        Ok(closed_count)
    }
}

/// Query handle name with Extended timeout and diagnostic logging
unsafe fn get_handle_name_safe(
    app: &tauri::AppHandle,
    pid: u32,
    handle_val: usize,
    debug: bool,
) -> Option<String> {
    let h_process = match OpenProcess(PROCESS_DUP_HANDLE, false, pid) {
        Ok(h) => h,
        Err(_) => {
            if debug { /* Silent for individual fails to avoid log spam */ }
            return None;
        }
    };

    let mut h_dup: HANDLE = HANDLE::default();
    let res = DuplicateHandle(
        h_process,
        HANDLE(handle_val as *mut c_void),
        GetCurrentProcess(),
        &mut h_dup,
        0,
        false,
        DUPLICATE_SAME_ACCESS,
    );

    let _ = CloseHandle(h_process);
    if res.is_err() {
        return None;
    }

    // 1. Type Pre-filter (Must be Mutant) — Main thread, fast, no hang risk
    let mut type_buf = vec![0u8; 512];
    let mut ret_len = 0;
    let status = NtQueryObject(
        h_dup,
        OBJECT_TYPE_INFORMATION,
        type_buf.as_mut_ptr() as *mut c_void,
        type_buf.len() as u32,
        &mut ret_len,
    );

    if status != STATUS_SUCCESS {
        let _ = CloseHandle(h_dup);
        return None;
    }

    let type_info = &*(type_buf.as_ptr() as *const UNICODE_STRING);
    if type_info.length == 0 || type_info.buffer.is_null() {
        let _ = CloseHandle(h_dup);
        return None;
    }

    let type_name = String::from_utf16_lossy(std::slice::from_raw_parts(
        type_info.buffer,
        (type_info.length / 2) as usize,
    ));

    // IMPORTANT: the D2R instance lock "DiabloII Check For Other Instances" is an
    // EVENT, not a Mutant (verified via the in-app handle explorer). "D2R Store
    // Mutex" is a Mutant. So we must allow Event (and Mutant, and Section for the
    // store lock variants). We still exclude every other type — that both avoids
    // the types whose NtQueryObject(NAME) can hang (sync file/pipe handles) and
    // skips the bulk of a process's handles.
    if type_name != "Mutant" && type_name != "Event" && type_name != "Section" {
        let _ = CloseHandle(h_dup);
        return None;
    }

    // 2. Name Query with RELAXED timeout (1500ms) for diagnostics
    // Move h_dup ownership to worker thread via HandleGuard to prevent UAF
    let (tx, rx) = mpsc::channel();
    let handle_guard = crate::modules::win32_safe::handle::HandleGuard::new(h_dup);

    thread::spawn(move || {
        let mut name_buf = vec![0u8; 1024];
        let mut r_len = 0;
        let status = NtQueryObject(
            handle_guard.raw(),
            OBJECT_NAME_INFORMATION,
            name_buf.as_mut_ptr() as *mut c_void,
            name_buf.len() as u32,
            &mut r_len,
        );

        if status == STATUS_SUCCESS {
            let name_info = &*(name_buf.as_ptr() as *const UNICODE_STRING);
            if name_info.length > 0 && !name_info.buffer.is_null() {
                let s = String::from_utf16_lossy(std::slice::from_raw_parts(
                    name_info.buffer,
                    (name_info.length / 2) as usize,
                ));
                let _ = tx.send(Some(s));
                return;
            }
        }
        let _ = tx.send(None);
        drop(handle_guard); // Explicitly drop to ensure ownership, though compiler will do this at scope end
    });

    let result = rx
        .recv_timeout(Duration::from_millis(1500))
        .unwrap_or_else(|_| {
            crate::modules::logger::log_localized(
                Some(app),
                "debug",
                "logs.mutex.probe_timeout",
                Some(serde_json::json!({ "pid": pid, "handle": format!("0x{:X}", handle_val) })),
                &format!("⚠️ Handle probe timeout (PID: {}, Handle: 0x{:X})", pid, handle_val),
            );
            None
        });

    // Main thread no longer closes h_dup — worker thread's HandleGuard drop will do it
    result
}

unsafe fn close_remote_handle(pid: u32, handle_val: usize) -> bool {
    if let Ok(h_process) = OpenProcess(PROCESS_DUP_HANDLE, false, pid) {
        let mut h_dup_dummy: HANDLE = HANDLE::default();
        let result = DuplicateHandle(
            h_process,
            HANDLE(handle_val as *mut c_void),
            GetCurrentProcess(),
            &mut h_dup_dummy,
            0,
            false,
            DUPLICATE_CLOSE_SOURCE | DUPLICATE_SAME_ACCESS,
        );

        if result.is_ok() {
            let _ = CloseHandle(h_dup_dummy);
            let _ = CloseHandle(h_process);
            return true;
        }
        let _ = CloseHandle(h_process);
    }
    false
}

fn check_and_close_if_match(
    app: &tauri::AppHandle,
    name: &str,
    pid: u32,
    handle_val: usize,
    closed_count: &mut usize,
) -> bool {
    let name_lc = name.to_lowercase();

    // 1. Engine Lock (Global-safe, highest priority)
    // We strictly match only the legal engine mutexes to allow multiple instances.
    let is_engine_lock = name.contains(D2R_MUTEX_NAME)
        || name.contains(D2R_MUTEX_NAME_ALT)
        || name_lc.contains("d2r store mutex");

    if is_engine_lock {
        crate::modules::logger::log_localized(
            Some(app),
            "success",
            "logs.mutex.found_and_cleaned",
            Some(serde_json::json!({ "name": name })),
            &format!("🎯 Found and cleaned D2R mutex: {}", name),
        );
        unsafe {
            if close_remote_handle(pid, handle_val) {
                *closed_count += 1;
            }
        }
        return true;
    }
    false
}
