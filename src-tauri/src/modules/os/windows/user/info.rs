use anyhow::{anyhow, Result};
use std::ptr;
use std::path::PathBuf;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::HLOCAL;
use windows::Win32::NetworkManagement::NetManagement::{
    NetApiBufferFree, NetUserEnum, NetUserGetInfo, FILTER_NORMAL_ACCOUNT,
    USER_INFO_0, USER_INFO_24,
};
use crate::modules::os::windows::utils::{get_sid_from_name, to_pcwstr};
use super::types::WindowsUser;

pub fn list_local_users() -> Result<Vec<WindowsUser>> {
    let mut names = Vec::new();
    let mut resume_handle = 0;

    // 1. Collect names
    loop {
        let mut buffer: *mut u8 = ptr::null_mut();
        let mut entries_read = 0;
        let mut total_entries = 0;

        unsafe {
            let status = NetUserEnum(
                PCWSTR::null(),
                0,
                FILTER_NORMAL_ACCOUNT,
                &mut buffer,
                0xFFFF_FFFF,
                &mut entries_read,
                &mut total_entries,
                Some(&mut resume_handle),
            );

            if (status == 0 || status == 234) && !buffer.is_null() {
                let info_ptr = buffer as *mut USER_INFO_0;
                for i in 0..entries_read {
                    let info = *info_ptr.add(i as usize);
                    if let Ok(name) = info.usri0_name.to_string() {
                        let lower = name.to_lowercase();
                        // Filter system accounts
                        if !["guest", "wdagutilityaccount", "defaultaccount", "administrator"].contains(&lower.as_str())
                           && !lower.starts_with("defaultuser") 
                           && !lower.starts_with("wdagutility")
                        {
                            names.push(name);
                        }
                    }
                }
            }

            if !buffer.is_null() {
                NetApiBufferFree(Some(buffer as *const _));
            }
            if status != 234 { break; }
        }
    }

    let current_user = whoami::username().unwrap_or_default().to_lowercase();
    let mut result = Vec::new();

    for name in names {
        let is_current = name.to_lowercase() == current_user;
        let is_initialized = is_user_initialized(&name);
        let is_ms_account = is_microsoft_account(&name);
        
        result.push(WindowsUser {
            name,
            is_current,
            is_initialized,
            is_ms_account,
        });
    }

    Ok(result)
}

pub fn get_user_profile_path(username: &str) -> Result<PathBuf> {
    use windows::Win32::Foundation::LocalFree;
    use windows::Win32::Security::Authorization::ConvertSidToStringSidW;
    use windows::Win32::System::Environment::ExpandEnvironmentStringsW;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
    };
    use windows::Win32::Security::PSID;

    let sid_bytes: Vec<u8> =
        get_sid_from_name(username).map_err(|e| anyhow!("Failed to get SID: {}", e))?;

    let mut sid_string_ptr = PWSTR::null();
    let sid_string = unsafe {
        if ConvertSidToStringSidW(PSID(sid_bytes.as_ptr() as *mut _), &mut sid_string_ptr).is_ok() {
            let s = sid_string_ptr.to_string().unwrap_or_default();
            let _ = LocalFree(Some(HLOCAL(sid_string_ptr.0 as _)));
            s
        } else {
            return Err(anyhow!("ConvertSidToStringSidW failed"));
        }
    };

    if sid_string.is_empty() {
        return Err(anyhow!("Empty SID string"));
    }

    let sub_key = format!(
        "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\{}",
        sid_string
    );
    let sub_key_u16 = to_pcwstr(&sub_key);
    let value_name_u16 = to_pcwstr("ProfileImagePath");

    let mut hkey = windows::Win32::System::Registry::HKEY::default();
    unsafe {
        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(sub_key_u16.as_ptr()),
            Some(0),
            KEY_READ,
            &mut hkey,
        )
        .is_err()
        {
            return Err(anyhow!("Profile registry key not found for SID: {}", sid_string));
        }

        let mut data_type = windows::Win32::System::Registry::REG_VALUE_TYPE::default();
        let mut data_len = 0u32;
        let _ = RegQueryValueExW(hkey, PCWSTR(value_name_u16.as_ptr()), None, Some(&mut data_type), None, Some(&mut data_len));

        if data_len == 0 {
            let _ = RegCloseKey(hkey);
            return Err(anyhow!("ProfileImagePath length is 0"));
        }

        let mut data = vec![0u8; data_len as usize];
        if RegQueryValueExW(hkey, PCWSTR(value_name_u16.as_ptr()), None, Some(&mut data_type), Some(data.as_mut_ptr()), Some(&mut data_len)).is_err() {
            let _ = RegCloseKey(hkey);
            return Err(anyhow!("RegQueryValueExW failed"));
        }
        let _ = RegCloseKey(hkey);

        let data_u16: Vec<u16> = data
            .chunks_exact(2)
            .map(|chunk| u16::from_ne_bytes([chunk[0], chunk[1]]))
            .collect();

        let mut expanded = vec![0u16; 1024];
        let res_len = ExpandEnvironmentStringsW(PCWSTR(data_u16.as_ptr()), Some(&mut expanded));

        if res_len == 0 {
            return Err(anyhow!("ExpandEnvironmentStringsW failed"));
        }

        if res_len > expanded.len() as u32 {
            expanded = vec![0u16; res_len as usize];
            ExpandEnvironmentStringsW(PCWSTR(data_u16.as_ptr()), Some(&mut expanded));
        }

        let path_str = String::from_utf16_lossy(&expanded[..(res_len as usize).saturating_sub(1)]);
        Ok(PathBuf::from(path_str))
    }
}

pub fn is_user_initialized(username: &str) -> bool {
    if let Ok(path) = get_user_profile_path(username) {
        path.join("AppData").join("Local").exists()
    } else {
        false
    }
}

pub fn is_microsoft_account(username: &str) -> bool {
    let username_u16 = to_pcwstr(username);
    let mut buffer: *mut u8 = ptr::null_mut();

    unsafe {
        let status = NetUserGetInfo(
            PCWSTR::null(),
            PCWSTR(username_u16.as_ptr()),
            24,
            &mut buffer,
        );

        if status == 0 && !buffer.is_null() {
            let info = *(buffer as *const USER_INFO_24);
            let is_ms = info.usri24_internet_identity.0 != 0;
            NetApiBufferFree(Some(buffer as *const _));
            is_ms
        } else {
            if !buffer.is_null() {
                NetApiBufferFree(Some(buffer as *const _));
            }
            false
        }
    }
}
