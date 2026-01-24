use std::ffi::c_void;
use std::mem::size_of;

// use windows::core::{PCWSTR, PSTR, HSTRING}; // Unused
use windows::Win32::Foundation::{CloseHandle, DUPLICATE_CLOSE_SOURCE, HANDLE, STATUS_INFO_LENGTH_MISMATCH, STATUS_SUCCESS, NTSTATUS, DuplicateHandle, DUPLICATE_HANDLE_OPTIONS};
use windows::Win32::System::Threading::{OpenProcess, GetCurrentProcess, PROCESS_DUP_HANDLE};
use sysinfo::{System, ProcessRefreshKind, UpdateKind, ProcessesToUpdate};

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

pub fn close_d2r_mutexes() -> Result<usize, anyhow::Error> {
    // 1. Identify target PIDs (D2R.exe) using sysinfo
    let mut sys = System::new_all();
    sys.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet));
    
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
                size = if return_length == 0 { size * 2 } else { return_length };
                buffer.resize(size as usize, 0);
            } else if status == STATUS_SUCCESS {
                break;
            } else {
                return Err(anyhow::anyhow!("NtQuerySystemInformation failed with status: 0x{:X}", status.0));
            }
        }

        // 3. Iterate handles
        // Layout: [ULONG NumberOfHandles] [SYSTEM_HANDLE_ENTRY * NumberOfHandles]
        let handle_count = *(buffer.as_ptr() as *const u32) as usize;
        let entry_size = size_of::<SYSTEM_HANDLE_ENTRY>();
        // Offset on x64 is usually 8 bytes due to alignment padding after u32?? 
        // Actually, let's treat it as C struct logic. if first member is u32, next is pointer aligned.
        let base_ptr = buffer.as_ptr().add(8); // Assuming 8-byte alignment for 64-bit

        let mut closed_count = 0;

        for i in 0..handle_count {
            let offset = i * entry_size;
            if offset + entry_size > buffer.len() - 8 { break; } // Safety check

            let entry_ptr = base_ptr.add(offset) as *const SYSTEM_HANDLE_ENTRY;
            let entry = *entry_ptr;
            let pid = entry.unique_process_id as u32;

            // 4. Filter by PID
            if target_pids.contains(&pid) {
                // 5. Check Name
                if let Some(name) = get_handle_name(pid, entry.handle_value as u32) {
                    if name.contains(D2R_MUTEX_NAME) {
                        tracing::info!("Found D2R Mutex in PID {}, Handle 0x{:X}", pid, entry.handle_value);
                        if close_remote_handle(pid, entry.handle_value as u32) {
                            closed_count += 1;
                        }
                    }
                }
            }
        }

        Ok(closed_count)
    }
}

unsafe fn get_handle_name(pid: u32, handle_val: u32) -> Option<String> {
    let h_process = OpenProcess(PROCESS_DUP_HANDLE, false, pid).ok()?;
    if h_process.is_invalid() { return None; }

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
        DUPLICATE_HANDLE_OPTIONS(0) // No close source yet
    );

    let _ = CloseHandle(h_process);

    if dup_result.is_err() { return None; }

    // Query Name
    let length: u32 = 0x2000;
    let mut buffer: Vec<u8> = vec![0; length as usize];
    let mut return_len: u32 = 0;

    let status = NtQueryObject(
        h_dup, 
        OBJECT_NAME_INFORMATION, 
        buffer.as_mut_ptr() as *mut c_void, 
        length, 
        &mut return_len
    );

    let _ = CloseHandle(h_dup);

    if status == STATUS_SUCCESS {
        let info = &*(buffer.as_ptr() as *const UNICODE_STRING);
        if info.length > 0 && !info.buffer.is_null() {
             let name_slice = std::slice::from_raw_parts(info.buffer, (info.length / 2) as usize);
             return Some(String::from_utf16_lossy(name_slice));
        }
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
            DUPLICATE_CLOSE_SOURCE
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
