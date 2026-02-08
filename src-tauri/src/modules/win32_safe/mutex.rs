use std::ffi::c_void;
use std::mem::size_of;

// use windows::core::{PCWSTR, PSTR, HSTRING}; // Unused
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};
use windows::Win32::Foundation::{
    CloseHandle, DuplicateHandle, DUPLICATE_CLOSE_SOURCE, DUPLICATE_HANDLE_OPTIONS, HANDLE,
    NTSTATUS, STATUS_INFO_LENGTH_MISMATCH, STATUS_SUCCESS,
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

const SYSTEM_HANDLE_INFORMATION: i32 = 16;
const OBJECT_NAME_INFORMATION: i32 = 1;
const D2R_MUTEX_NAME: &str = "DiabloII Check For Other Instances";

// Low-level struct definitions for NtQuerySystemInformation
#[repr(C)]
#[derive(Copy, Clone, Debug)]
struct SYSTEM_HANDLE_ENTRY {
    unique_process_id: u16,
    creator_back_trace_index: u16,
    object_type_index: u8,
    handle_attributes: u8,
    handle_value: u16,
    object: *mut c_void,
    granted_access: u32,
}

#[repr(C)]
struct UNICODE_STRING {
    length: u16,
    maximum_length: u16,
    buffer: *mut u16,
}

pub fn close_d2r_mutexes(app: &tauri::AppHandle) -> Result<usize, anyhow::Error> {
    // 1. Identify target PIDs (D2R.exe) using sysinfo
    let mut sys = System::new_all();
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet),
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
                        &format!("发现 D2R 进程: {} (PID: {})", name, pid_u32),
                    );
                }
            }
        }
    }

    if target_pids.is_empty() {
        crate::modules::logger::log(app, "debug", "未发现任何 D2R 进程");
        return Ok(0);
    }

    unsafe {
        // 2. Get ALL system handles
        let mut size: u32 = 0x10000;
        let mut buffer: Vec<u8> = vec![0; size as usize];
        let mut return_length: u32 = 0;

        loop {
            let status = NtQuerySystemInformation(
                SYSTEM_HANDLE_INFORMATION,
                buffer.as_mut_ptr() as *mut c_void,
                size,
                &mut return_length,
            );

            if status == STATUS_INFO_LENGTH_MISMATCH {
                size = if return_length == 0 {
                    size * 2
                } else {
                    return_length
                };
                buffer.resize(size as usize, 0);
            } else if status == STATUS_SUCCESS {
                break;
            } else {
                let err_msg = format!(
                    "NtQuerySystemInformation failed with status: 0x{:X}",
                    status.0
                );
                crate::modules::logger::log(app, "error", &err_msg);
                return Err(anyhow::anyhow!(err_msg));
            }
        }

        // 3. Iterate handles
        // Layout: [ULONG NumberOfHandles] [SYSTEM_HANDLE_ENTRY * NumberOfHandles]
        let handle_count = *(buffer.as_ptr() as *const u32) as usize;
        crate::modules::logger::log(app, "debug", &format!("系统总句柄数: {}", handle_count));

        let entry_size = size_of::<SYSTEM_HANDLE_ENTRY>();
        // Offset on x64 is usually 8 bytes due to alignment padding after u32??
        // Actually, let's treat it as C struct logic. if first member is u32, next is pointer aligned.
        let base_ptr = buffer.as_ptr().add(8); // Assuming 8-byte alignment for 64-bit

        let mut closed_count = 0;

        for i in 0..handle_count {
            let offset = i * entry_size;
            if offset + entry_size > buffer.len() - 8 {
                break;
            } // Safety check

            let entry_ptr = base_ptr.add(offset) as *const SYSTEM_HANDLE_ENTRY;
            let entry = *entry_ptr;
            let pid = entry.unique_process_id as u32;

            // 4. Filter by PID
            if target_pids.contains(&pid) {
                // 5. Check Name
                if let Some(name) = get_handle_name(app, pid, entry.handle_value as u32) {
                    if name.contains(D2R_MUTEX_NAME) {
                        crate::modules::logger::log(
                            app,
                            "info",
                            &format!(
                                "在 PID {} 中发现互斥锁: {} (Handle: 0x{:X})",
                                pid, name, entry.handle_value
                            ),
                        );
                        if close_remote_handle(pid, entry.handle_value as u32) {
                            closed_count += 1;
                            crate::modules::logger::log(
                                app,
                                "debug",
                                &format!(
                                    "已成功关闭 PID {} 的句柄 0x{:X}",
                                    pid, entry.handle_value
                                ),
                            );
                        } else {
                            crate::modules::logger::log(
                                app,
                                "error",
                                &format!("无法关闭 PID {} 的句柄 0x{:X}", pid, entry.handle_value),
                            );
                        }
                    }
                }
            }
        }

        Ok(closed_count)
    }
}

unsafe fn get_handle_name(app: &tauri::AppHandle, pid: u32, handle_val: u32) -> Option<String> {
    let h_process = match OpenProcess(PROCESS_DUP_HANDLE, false, pid) {
        Ok(h) => h,
        Err(e) => {
            // Only log errors for PIDs we are interested in (already filtered by caller)
            crate::modules::logger::log(
                app,
                "warn",
                &format!("PID {} OpenProcess 失败: {}", pid, e),
            );
            return None;
        }
    };

    if h_process.is_invalid() {
        return None;
    }

    let mut h_dup: HANDLE = HANDLE::default();
    let current_process = GetCurrentProcess(); // Pseudo handle

    // Duplicate handle to our process so we can query it
    let dup_result = DuplicateHandle(
        h_process,
        HANDLE(handle_val as *mut c_void),
        current_process,
        &mut h_dup,
        0,
        false,
        DUPLICATE_HANDLE_OPTIONS(0), // No close source yet
    );

    let _ = CloseHandle(h_process);

    if let Err(e) = dup_result {
        // ERROR_NOT_SUPPORTED (0x80070032) happens for some system handles (like ETW) which cannot be duplicated.
        // ACCESS_DENIED (0x80070005) happens for protected handles.
        // We can safely ignore these as they are not the Mutex we are looking for.
        if e.code().0 == -2147024846 {
            // 0x80070032: ERROR_NOT_SUPPORTED
            return None;
        }

        // Log other errors
        crate::modules::logger::log(
            app,
            "debug",
            &format!(
                "PID {} Handle 0x{:X} DuplicateHandle 失败: {} (0x{:X})",
                pid,
                handle_val,
                e,
                e.code().0
            ),
        );
        return None;
    }

    // Query Name
    let length: u32 = 0x2000;
    let mut buffer: Vec<u8> = vec![0; length as usize];
    let mut return_len: u32 = 0;

    let status = NtQueryObject(
        h_dup,
        OBJECT_NAME_INFORMATION,
        buffer.as_mut_ptr() as *mut c_void,
        length,
        &mut return_len,
    );

    let _ = CloseHandle(h_dup);

    if status == STATUS_SUCCESS {
        let info = &*(buffer.as_ptr() as *const UNICODE_STRING);
        if info.length > 0 && !info.buffer.is_null() {
            let name_slice = std::slice::from_raw_parts(info.buffer, (info.length / 2) as usize);
            return Some(String::from_utf16_lossy(name_slice));
        }
    } else {
        // crate::modules::logger::log(app, "debug", &format!("PID {} Handle 0x{:X} NtQueryObject 失败: 0x{:X}", pid, handle_val, status.0));
    }

    None
}

unsafe fn close_remote_handle(pid: u32, handle_val: u32) -> bool {
    if let Ok(h_process) = OpenProcess(PROCESS_DUP_HANDLE, false, pid) {
        let mut h_dup_dummy: HANDLE = HANDLE::default();
        let result = DuplicateHandle(
            h_process,
            HANDLE(handle_val as *mut c_void),
            GetCurrentProcess(),
            &mut h_dup_dummy,
            0,
            false,
            DUPLICATE_CLOSE_SOURCE,
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
