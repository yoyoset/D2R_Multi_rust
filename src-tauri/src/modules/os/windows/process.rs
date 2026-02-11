use super::super::ProcessLaunchResult;
use super::utils::to_pcwstr;
use anyhow::{anyhow, Result};
use std::os::windows::process::CommandExt;
use std::process::Command;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::Security::{LogonUserW, LOGON32_LOGON_INTERACTIVE, LOGON32_PROVIDER_DEFAULT};
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
    let normalized_user = username.to_lowercase();

    for &p_name in process_names {
        let base_name = p_name.replace(".exe", "");

        let ps_cmd = format!(
            "Get-Process -Name {} -IncludeUserName -ErrorAction SilentlyContinue | Select-Object -ExpandProperty UserName",
            base_name
        );

        let output = Command::new("powershell")
            .args(["-NoProfile", "-Command", &ps_cmd])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output()
            .map_err(|e| anyhow!("Failed to execute powershell: {}", e))?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.to_lowercase().contains(&normalized_user) {
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}
