use serde::Serialize;
use std::ffi::c_void;
use std::mem::size_of;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

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

#[derive(Serialize, Debug, Clone)]
pub struct HandleInfo {
    pub handle_value: usize,
    pub name: String,
    pub type_name: String,
}

pub fn list_process_handles(
    app: &tauri::AppHandle,
    pid: u32,
) -> Result<Vec<HandleInfo>, anyhow::Error> {
    if !crate::modules::win_admin::enable_debug_privilege() {
        crate::modules::logger::log(app, "warn", "无法启用调试权限，句柄枚举可能不完整");
    }

    unsafe {
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

        let mut handle_results = Vec::new();

        for i in 0..info.number_of_handles {
            let entry = *handles_ptr.add(i);
            if entry.unique_process_id as u32 == pid {
                if let Some(handle_info) = get_handle_name_detailed(app, pid, entry.handle_value) {
                    handle_results.push(handle_info);
                }
            }
        }

        Ok(handle_results)
    }
}

pub fn close_specific_handle(pid: u32, handle_val: usize) -> Result<(), anyhow::Error> {
    unsafe {
        if close_remote_handle(pid, handle_val) {
            Ok(())
        } else {
            Err(anyhow::anyhow!(
                "Failed to close handle 0x{:X} for PID {}",
                handle_val,
                pid
            ))
        }
    }
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

unsafe fn get_handle_name_detailed(
    _app: &tauri::AppHandle,
    pid: u32,
    handle_val: usize,
) -> Option<HandleInfo> {
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
        DUPLICATE_SAME_ACCESS,
    );

    let _ = CloseHandle(h_process);
    if res.is_err() {
        return None;
    }

    // 1. Type
    let mut type_buf = vec![0u8; 512];
    let mut ret_len = 0;
    let status = NtQueryObject(
        h_dup,
        OBJECT_TYPE_INFORMATION,
        type_buf.as_mut_ptr() as *mut c_void,
        type_buf.len() as u32,
        &mut ret_len,
    );

    let mut type_name = String::from("Unknown");
    if status == STATUS_SUCCESS {
        let type_info = &*(type_buf.as_ptr() as *const UNICODE_STRING);
        if type_info.length > 0 && !type_info.buffer.is_null() {
            type_name = String::from_utf16_lossy(std::slice::from_raw_parts(
                type_info.buffer,
                (type_info.length / 2) as usize,
            ));
        }
    }

    // 2. Name
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

    let name = rx
        .recv_timeout(Duration::from_millis(200)) // Use fixed short timeout for explorer
        .unwrap_or(None)
        .unwrap_or_default();

    let _ = CloseHandle(h_dup);

    Some(HandleInfo {
        handle_value: handle_val,
        name,
        type_name,
    })
}
