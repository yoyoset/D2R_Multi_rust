use anyhow::{anyhow, Result};
use std::time::Duration;
use windows::Win32::Foundation::{CloseHandle, LPARAM, HWND, WPARAM};
use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
use windows::Win32::UI::WindowsAndMessaging::{
    EnumWindows, GetWindowThreadProcessId, PostMessageW, WM_CLOSE,
};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate};

pub fn force_terminate(pid: u32) -> Result<()> {
    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, false, pid)
            .map_err(|e| anyhow!("error.os.open_process_fail|{{\"pid\":{},\"error\":\"{}\"}}", pid, e))?;
        
        let result = TerminateProcess(handle, 1);
        let _ = CloseHandle(handle);
        
        result.map_err(|e| anyhow!("error.os.terminate_fail|{{\"pid\":{},\"error\":\"{}\"}}", pid, e))?;
        Ok(())
    }
}

pub fn try_graceful_close(pid: u32) -> Result<()> {
    unsafe {
        let _ = EnumWindows(
            Some(std::mem::transmute(close_window_callback as unsafe extern "system" fn(HWND, LPARAM) -> i32)),
            LPARAM(pid as isize),
        );
    }

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_secs(5)).await;
        
        let mut sys = sysinfo::System::new();
        sys.refresh_processes_specifics(
            ProcessesToUpdate::Some(&[sysinfo::Pid::from_u32(pid)]),
            true,
            ProcessRefreshKind::nothing()
        );

        if sys.process(sysinfo::Pid::from_u32(pid)).is_some() {
            tracing::warn!("Process (PID: {}) failed to close gracefully within 5s. Triggering force terminate...", pid);
            let _ = force_terminate(pid);
        }
    });

    Ok(())
}

unsafe extern "system" fn close_window_callback(hwnd: HWND, lparam: LPARAM) -> i32 {
    let target_pid = lparam.0 as u32;
    let mut lp_process_id = 0u32;
    GetWindowThreadProcessId(hwnd, Some(&mut lp_process_id));
    let process_id = lp_process_id;

    if process_id == target_pid {
        let _ = PostMessageW(Some(hwnd), WM_CLOSE, WPARAM(0), LPARAM(0));
    }
    1
}
