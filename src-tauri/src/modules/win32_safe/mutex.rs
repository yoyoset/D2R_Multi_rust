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
    // 0. Enable SeDebugPrivilege (CRITICAL for cross-user/elevated access)
    if !crate::modules::win_admin::enable_debug_privilege() {
        crate::modules::logger::log(app, "warn", "无法启用 SeDebugPrivilege，跨用户清理可能受限");
    }

    // 1. Identify target PIDs (D2R.exe)
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
                    let pid_u32 = pid.as_u32();
                    target_pids.insert(pid_u32);
                    crate::modules::logger::log(
                        app,
                        "debug",
                        &format!("发现目标 D2R 进程 PID: {}", pid_u32),
                    );
                }
            }
        }
    }

    if target_pids.is_empty() {
        crate::modules::logger::log(app, "debug", "未发现运行中的 D2R 进程，无需清理");
        return Ok(0);
    }

    unsafe {
        // 2. Get Extended System Handles (Class 64)
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
                    "NtQuerySystemInformation(64) 接口调用失败: 0x{:X}",
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
            &format!("正在枚举系统总计 {} 个句柄...", info.number_of_handles),
        );

        let mut closed_count = 0;

        for i in 0..info.number_of_handles {
            let entry = *handles_ptr.add(i);
            let pid = entry.unique_process_id as u32;

            if target_pids.contains(&pid) {
                if let Some(name) = get_handle_name_safe(app, pid, entry.handle_value) {
                    if name.contains(D2R_MUTEX_NAME) {
                        if close_remote_handle(pid, entry.handle_value) {
                            closed_count += 1;
                            crate::modules::logger::log(
                                app,
                                "success",
                                &format!(
                                    "已成功清理 PID {} 下的互斥体句柄 (0x{:X})",
                                    pid, entry.handle_value
                                ),
                            );
                        }
                    }
                }
            }
        }

        Ok(closed_count)
    }
}

/// Query handle name with 100ms timeout and type pre-filtering to prevent HANGS
unsafe fn get_handle_name_safe(
    app: &tauri::AppHandle,
    pid: u32,
    handle_val: usize,
) -> Option<String> {
    let h_process = match OpenProcess(PROCESS_DUP_HANDLE, false, pid) {
        Ok(h) => h,
        Err(_) => return None,
    };

    let mut h_dup: HANDLE = HANDLE::default();
    let res = DuplicateHandle(
        h_process,
        HANDLE(handle_val as *mut c_void),
        GetCurrentProcess(),
        &mut h_dup,
        0,
        false,
        DUPLICATE_SAME_ACCESS, // 关键修复：必须使用 SAME_ACCESS 才能拥有查询权限
    );

    let _ = CloseHandle(h_process);
    if res.is_err() {
        return None;
    }

    // 1. Type Pre-filter (Safe & Fast)
    let mut type_buf = vec![0u8; 1024];
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

    if type_name != "Mutant" {
        let _ = CloseHandle(h_dup);
        return None;
    }

    // 2. Name Query with Timeout (Final Safety)
    let (tx, rx) = mpsc::channel();
    let handle_to_query = h_dup.0 as usize;

    thread::spawn(move || {
        let mut name_buf = vec![0u8; 2048];
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

    let result = rx.recv_timeout(Duration::from_millis(100)).unwrap_or(None);
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
            DUPLICATE_CLOSE_SOURCE | DUPLICATE_SAME_ACCESS, // 这里的权限也应保持一致，确保操作成功
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
