use anyhow::{anyhow, Result};
use windows::core::PCWSTR;
use windows::Win32::Security::{
    LogonUserW, LOGON32_LOGON_INTERACTIVE, LOGON32_LOGON_NETWORK, LOGON32_PROVIDER_DEFAULT,
};
use crate::modules::os::windows::utils::to_pcwstr;
use crate::modules::logger;

pub fn verify_password(username: &str, password: &str) -> Result<bool> {
    let (domain, user) = if let Some(pos) = username.find('\\') {
        (Some(&username[..pos]), &username[pos + 1..])
    } else {
        (None, username)
    };

    let user_u16 = to_pcwstr(user);
    let password_u16 = to_pcwstr(password);
    let domain_u16 = domain.map(to_pcwstr);
    let dot_domain = to_pcwstr(".");
    let domain_pcwstr = domain_u16
        .as_ref()
        .map(|d| PCWSTR(d.as_ptr()))
        .unwrap_or(PCWSTR(dot_domain.as_ptr()));

    let mut token = windows::Win32::Foundation::HANDLE::default();

    unsafe {
        // ATTEMPT 1: LOGON_INTERACTIVE (Standard check)
        let mut status = LogonUserW(
            PCWSTR(user_u16.as_ptr()),
            domain_pcwstr, // Typically "."
            PCWSTR(password_u16.as_ptr()),
            LOGON32_LOGON_INTERACTIVE,
            LOGON32_PROVIDER_DEFAULT,
            &mut token,
        );

        // ATTEMPT 2: Fallback to NULL domain if "." fails (Standard Local Auth fallback)
        if status.is_err() && domain.is_none() {
            status = LogonUserW(
                PCWSTR(user_u16.as_ptr()),
                PCWSTR::null(),
                PCWSTR(password_u16.as_ptr()),
                LOGON32_LOGON_INTERACTIVE,
                LOGON32_PROVIDER_DEFAULT,
                &mut token,
            );
        }

        // ATTEMPT 2: Fallback to LOGON_NETWORK if Interactive fails for non-auth reasons
        // LOGON32_LOGON_NETWORK is often more permissive for pure credential validation on restricted accounts.
        if status.is_err() {
            let last_error = windows::Win32::Foundation::GetLastError();
            
            // If it's a lockout (1909), stop immediately.
            if last_error.0 == 1909 {
                return Err(anyhow!("error.auth.locked_out"));
            }

            // Only retry if it's NOT a clear "Bad Password" (1326) and NOT a "Lockout" (1909).
            // This prevents double-counting failed attempts while allowing fallback for "Access Denied" or "Logon restricted".
            if last_error.0 != 1326 {
                status = LogonUserW(
                    PCWSTR(user_u16.as_ptr()),
                    domain_pcwstr,
                    PCWSTR(password_u16.as_ptr()),
                    LOGON32_LOGON_NETWORK,
                    LOGON32_PROVIDER_DEFAULT,
                    &mut token,
                );
            }
        }

        if status.is_ok() {
            let _ = windows::Win32::Foundation::CloseHandle(token);
            logger::success_key(None, "logs.auth.verification_success", Some(serde_json::json!({ "username": username })));
            Ok(true)
        } else {
            let err = windows::Win32::Foundation::GetLastError();
            logger::warn_key(None, "logs.auth.verification_failed", Some(serde_json::json!({ "username": username, "error": err.0 })));
            
            match err.0 {
                1326 => Ok(false), // ERROR_LOGON_FAILURE
                1909 => Err(anyhow!("error.auth.locked_out")),
                _ => Err(anyhow!("error.auth.system_error|{{\"code\":{}}}", err.0)),
            }
        }
    }
}
