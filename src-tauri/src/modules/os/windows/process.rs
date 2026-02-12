use super::super::ProcessLaunchResult;
use crate::modules::os::windows::utils::{get_sid_from_name, to_pcwstr};
use anyhow::{anyhow, Result};
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::Security::{
    EqualSid, LogonUserW, LOGON32_LOGON_INTERACTIVE, LOGON32_PROVIDER_DEFAULT, PSID,
};
use windows::Win32::System::RemoteDesktop::{
    WTSEnumerateProcessesExW, WTSFreeMemoryExW, WTSTypeProcessInfoLevel1,
    WTS_CURRENT_SERVER_HANDLE, WTS_PROCESS_INFO_EXW,
};
use windows::Win32::System::Threading::{
    CreateProcessAsUserW, CreateProcessWithLogonW, CREATE_NEW_CONSOLE, CREATE_UNICODE_ENVIRONMENT,
    LOGON_WITH_PROFILE, PROCESS_INFORMATION, STARTUPINFOW,
};

pub fn create_process_with_logon(
    username: &str,
    domain: Option<&str>,
    password: &str,
    application_path: &str,
    command_line: Option<&str>,
    current_directory: Option<&str>,
) -> Result<ProcessLaunchResult> {
    let user_utf16 = to_pcwstr(username);
    let pass_utf16 = to_pcwstr(password);
    let domain_utf16 = domain.map(to_pcwstr);
    let app_utf16 = to_pcwstr(application_path);

    let mut cmd_utf16 = if let Some(cmd) = command_line {
        to_pcwstr(cmd)
    } else {
        Vec::new()
    };

    let dir_utf16 = current_directory.map(to_pcwstr);

    let mut startup_info = STARTUPINFOW::default();
    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;

    let mut process_info = PROCESS_INFORMATION::default();
    let creation_flags = CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_CONSOLE;

    unsafe {
        let result = CreateProcessWithLogonW(
            PCWSTR(user_utf16.as_ptr()),
            match domain_utf16 {
                Some(ref d) => PCWSTR(d.as_ptr()),
                None => PCWSTR::null(),
            },
            PCWSTR(pass_utf16.as_ptr()),
            LOGON_WITH_PROFILE,
            PCWSTR(app_utf16.as_ptr()),
            if cmd_utf16.is_empty() {
                None
            } else {
                Some(PWSTR(cmd_utf16.as_mut_ptr()))
            },
            creation_flags,
            None,
            match dir_utf16 {
                Some(ref d) => PCWSTR(d.as_ptr()),
                None => PCWSTR::null(),
            },
            &startup_info,
            &mut process_info,
        );

        if result.is_ok() {
            let _ = CloseHandle(process_info.hProcess);
            let _ = CloseHandle(process_info.hThread);

            return Ok(ProcessLaunchResult {
                process_id: process_info.dwProcessId,
                thread_id: process_info.dwThreadId,
            });
        }

        tracing::warn!("CreateProcessWithLogonW failed, trying LogonUser + CreateProcessAsUser");

        let mut token = HANDLE::default();

        LogonUserW(
            PCWSTR(user_utf16.as_ptr()),
            match domain_utf16 {
                Some(ref d) => PCWSTR(d.as_ptr()),
                None => PCWSTR::null(),
            },
            PCWSTR(pass_utf16.as_ptr()),
            LOGON32_LOGON_INTERACTIVE,
            LOGON32_PROVIDER_DEFAULT,
            &mut token,
        )
        .map_err(|e| anyhow!("LogonUserW failed: {}", e))?;

        let mut startup_info2 = STARTUPINFOW::default();
        startup_info2.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        let mut process_info2 = PROCESS_INFORMATION::default();

        let create_result = CreateProcessAsUserW(
            Some(token),
            PCWSTR(app_utf16.as_ptr()),
            if cmd_utf16.is_empty() {
                None
            } else {
                Some(PWSTR(cmd_utf16.as_mut_ptr()))
            },
            None,
            None,
            false,
            creation_flags,
            None,
            match dir_utf16 {
                Some(ref d) => PCWSTR(d.as_ptr()),
                None => PCWSTR::null(),
            },
            &startup_info2,
            &mut process_info2,
        );

        let _ = CloseHandle(token);

        create_result.map_err(|e| anyhow!("CreateProcessAsUserW failed: {}", e))?;

        let _ = CloseHandle(process_info2.hProcess);
        let _ = CloseHandle(process_info2.hThread);

        Ok(ProcessLaunchResult {
            process_id: process_info2.dwProcessId,
            thread_id: process_info2.dwThreadId,
        })
    }
}

pub fn is_process_running_for_user(username: &str, process_names: &[&str]) -> Result<bool> {
    let target_sid_bytes = get_sid_from_name(username)?;
    let target_sid = PSID(target_sid_bytes.as_ptr() as *mut _);

    unsafe {
        let mut buffer: *mut WTS_PROCESS_INFO_EXW = std::ptr::null_mut();
        let mut count = 0u32;
        let mut level = 1u32; // WTS_PROCESS_INFO_EXW

        if WTSEnumerateProcessesExW(
            Some(WTS_CURRENT_SERVER_HANDLE),
            &mut level,
            0,
            &mut buffer as *mut *mut _ as *mut _,
            &mut count,
        )
        .is_ok()
        {
            let info_slice = std::slice::from_raw_parts(buffer, count as usize);
            let mut found = false;

            for info in info_slice {
                let process_name = info
                    .pProcessName
                    .to_string()
                    .unwrap_or_default()
                    .to_lowercase();
                let matches_name = process_names.iter().any(|&n| {
                    process_name.eq_ignore_ascii_case(n)
                        || process_name.eq_ignore_ascii_case(&n.replace(".exe", ""))
                });

                if matches_name && !info.pUserSid.0.is_null() {
                    if EqualSid(target_sid, info.pUserSid).is_ok() {
                        found = true;
                        break;
                    }
                }
            }

            let _ = WTSFreeMemoryExW(WTSTypeProcessInfoLevel1, buffer as *const _, count);
            return Ok(found);
        }
    }

    Ok(false)
}
