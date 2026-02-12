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

pub fn close_d2r_mutexes(app: &tauri::AppHandle) -> Result<usize, anyhow::Error> {
    // 0. Enable SeDebugPrivilege
    if !crate::modules::win_admin::enable_debug_privilege() {
        crate::modules::logger::log(app, "warn", "无法启用调试权限，探测过程可能受限");
    }

    // 1. Identify target PIDs
    let mut sys = System::new_all();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::Always),
    );

    let mut target_pids = std::collections::HashSet::new();
    for (pid, process) in sys.processes() {
        if let Some(exe_path) = process.exe() {
            if let Some(exe_name) = exe_path.file_name() {
                let name = exe_name.to_string_lossy().to_lowercase();
                if name == "d2r.exe" || name == "diabloii.exe" {
                    target_pids.insert(pid.as_u32());
                }
            }
        }
    }

    if target_pids.is_empty() {
        crate::modules::logger::log(app, "info", "未发现 D2R 进程，跳过互斥锁清理");
        return Ok(0);
    }

    unsafe {
        // 2. Get Extended System Handles
        let mut size: u32 = 0x100000;
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
                size = return_length.max(size * 2);
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

        let info = &*(buffer.as_ptr() as *const SYSTEM_HANDLE_INFORMATION_EX);
        let handles_ptr = buffer
            .as_ptr()
            .add(size_of::<SYSTEM_HANDLE_INFORMATION_EX>())
            as *const SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX;

        crate::modules::logger::log(
            app,
            "debug",
            &format!("正在扫描系统 {} 个句柄...", info.number_of_handles),
        );

        let mut closed_count = 0;
        let mut target_handle_count = 0;

        // 3. System-Wide Sweep (BAT-style)
        // We look for any "Mutant" object matching our D2R patterns, regardless of PID.
        let mut mutant_type_index = 0u16;
        let mut found_mutant_type = false;

        // Pass 1: Targeted Scan (PID based - Fast)
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

                    if check_and_close_if_match(
                        app,
                        &name,
                        pid,
                        entry.handle_value,
                        &mut closed_count,
                    ) {
                        continue;
                    }
                }
            }
        }

        // Pass 2: Global Scan (Type based - BAT style)
        // If we found the mutant type index, scan the WHOLE system for our specific heavy-duty names.
        if found_mutant_type {
            crate::modules::logger::log(
                app,
                "debug",
                "正在执行全系统逻辑锁扫描 (Cross-Session)...",
            );
            for i in 0..info.number_of_handles {
                let entry = *handles_ptr.add(i);
                if entry.object_type_index == mutant_type_index {
                    let pid = entry.unique_process_id as u32;
                    // Skip if we just checked this in Pass 1 to avoid double-logging
                    if target_pids.contains(&pid) {
                        continue;
                    }

                    if let Some(name) = get_handle_name_safe(app, pid, entry.handle_value, false) {
                        check_and_close_if_match(
                            app,
                            &name,
                            pid,
                            entry.handle_value,
                            &mut closed_count,
                        );
                    }
                }
            }
        }

        if closed_count == 0 {
            crate::modules::logger::log(
                app,
                "info",
                &format!(
                    "全量扫描完成，未命中任何 D2R 互斥锁 (Checked {} handles)",
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

    // 1. Type Pre-filter (Must be Mutant)
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

    // Remove strict Mutant filtering to support all lock types (Event, Section, etc.)
    // Stability is maintained via surgical name matching in the caller.

    // 2. Name Query with RELAXED timeout (1500ms) for diagnostics
    let (tx, rx) = mpsc::channel();
    let handle_to_query = h_dup.0 as usize;

    thread::spawn(move || {
        let mut name_buf = vec![0u8; 1024];
        let mut r_len = 0;
        let status = NtQueryObject(
            HANDLE(handle_to_query as *mut c_void),
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
    });

    let result = rx
        .recv_timeout(Duration::from_millis(1500))
        .unwrap_or_else(|_| {
            crate::modules::logger::log(
                app,
                "debug",
                &format!("⚠️ 句柄探测超时 (PID: {}, Handle: 0x{:X})", pid, handle_val),
            );
            None
        });

    let _ = CloseHandle(h_dup);
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
    let is_engine_lock = name.contains(D2R_MUTEX_NAME)
        || name.contains(D2R_MUTEX_NAME_ALT)
        || name_lc.contains("d2r store mutex");

    // 2. Path-based Directory Lock (Limited to BaseNamedObjects logic space)
    // We ONLY close this if it's in the logical object namespace to avoid hanging file IO.
    let is_path_lock = name_lc.contains("basenamedobjects")
        && (name_lc.ends_with("data/data")
            || name_lc.ends_with("data\\data")
            || name_lc.ends_with("data/data/")
            || name_lc.ends_with("data\\data\\"));

    if is_engine_lock || is_path_lock {
        crate::modules::logger::log(
            app,
            "success",
            &format!("🎯 发现并清理 D2R 互斥锁: {}", name),
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
