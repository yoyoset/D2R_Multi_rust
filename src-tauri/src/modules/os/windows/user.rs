use crate::modules::os::windows::utils::{
    get_localized_users_group_name, get_name_from_sid_string, get_sid_from_name, to_pcwstr,
};
use anyhow::{anyhow, Result};
use std::path::PathBuf;
use std::ptr;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::HLOCAL;
use windows::Win32::NetworkManagement::NetManagement::{
    NetApiBufferFree, NetLocalGroupAddMembers, NetUserAdd, NetUserEnum, NetUserSetInfo,
    FILTER_NORMAL_ACCOUNT, LOCALGROUP_MEMBERS_INFO_3, USER_ACCOUNT_FLAGS, USER_INFO_0, USER_INFO_1,
    USER_INFO_1003, USER_INFO_1008, USER_PRIV,
};
use windows::Win32::Security::PSID;
use windows::Win32::System::Registry::{
    RegCloseKey, RegEnumKeyExW, RegOpenKeyExW, HKEY_LOCAL_MACHINE, KEY_READ,
};

pub fn list_local_users(include_registry: bool) -> Result<Vec<String>> {
    let mut users = Vec::new();
    let mut resume_handle = 0;

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

            if status == 0 || status == 234 {
                if !buffer.is_null() {
                    let info_ptr = buffer as *mut USER_INFO_0;
                    for i in 0..entries_read {
                        let info = *info_ptr.add(i as usize);
                        if let Ok(name) = info.usri0_name.to_string() {
                            let lower_name = name.to_lowercase();
                            if !["guest", "wdagutilityaccount", "defaultaccount"]
                                .contains(&lower_name.as_str())
                            {
                                users.push(name);
                            }
                        }
                    }
                }
            }

            if !buffer.is_null() {
                NetApiBufferFree(Some(buffer as *const _));
            }

            if status != 234 {
                break;
            }
        }
    }

    if include_registry {
        unsafe {
            let hklm_u16 = to_pcwstr(r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList");
            let mut hkey = windows::Win32::System::Registry::HKEY::default();
            if RegOpenKeyExW(
                HKEY_LOCAL_MACHINE,
                PCWSTR(hklm_u16.as_ptr()),
                Some(0),
                KEY_READ,
                &mut hkey,
            )
            .is_ok()
            {
                let mut index = 0;
                loop {
                    let mut name = [0u16; 256];
                    let mut name_len = name.len() as u32;
                    let res = RegEnumKeyExW(
                        hkey,
                        index,
                        Some(PWSTR(name.as_mut_ptr())),
                        &mut name_len,
                        None,
                        None,
                        None,
                        None,
                    );

                    if res.is_ok() {
                        let sid_str = String::from_utf16_lossy(&name[..name_len as usize]);
                        if sid_str.starts_with("S-1-5-21") {
                            if let Ok(user_with_domain) = get_name_from_sid_string(&sid_str) {
                                let exists = users
                                    .iter()
                                    .any(|u| u.to_lowercase() == user_with_domain.to_lowercase());
                                if !exists {
                                    users.push(user_with_domain);
                                }
                            }
                        }
                        index += 1;
                    } else {
                        break;
                    }
                }
                let _ = RegCloseKey(hkey);
            }
        }
    }

    Ok(users)
}

pub fn create_user(username: &str, password: &str, never_expires: bool) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let password_u16 = to_pcwstr(password);

    let mut user_info = USER_INFO_1::default();
    user_info.usri1_name = PWSTR(username_u16.as_ptr() as *mut _);
    user_info.usri1_password = PWSTR(password_u16.as_ptr() as *mut _);
    user_info.usri1_priv = USER_PRIV(1);

    // UF_SCRIPT (0x0001) | UF_DONT_EXPIRE_PASSWD (0x10000)
    let mut flags = 0x0001;
    if never_expires {
        flags |= 0x10000;
    }
    user_info.usri1_flags = USER_ACCOUNT_FLAGS(flags);

    unsafe {
        let status = NetUserAdd(PCWSTR::null(), 1, &user_info as *const _ as *const _, None);

        if status != 0 {
            if status == 2224 {
                tracing::info!("User {} already exists in system", username);
            } else {
                return Err(anyhow!(
                    "NetUserAdd failed with status: {} (Win32 Error)",
                    status
                ));
            }
        }

        let group_name = get_localized_users_group_name();
        let group_name_u16 = to_pcwstr(&group_name);

        let mut member_info = LOCALGROUP_MEMBERS_INFO_3::default();
        member_info.lgrmi3_domainandname = PWSTR(username_u16.as_ptr() as *mut _);

        let group_status = NetLocalGroupAddMembers(
            PCWSTR::null(),
            PCWSTR(group_name_u16.as_ptr()),
            3,
            &member_info as *const _ as *const _,
            1,
        );

        if group_status != 0 && group_status != 1320 {
            tracing::warn!(
                "NetLocalGroupAddMembers failed with status: {}",
                group_status
            );
        }

        Ok(())
    }
}

pub fn set_password_never_expires(username: &str, never_expires: bool) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let mut info = USER_INFO_1008::default();

    // UF_DONT_EXPIRE_PASSWD = 0x10000
    // UF_SCRIPT = 0x01
    info.usri1008_flags = if never_expires {
        USER_ACCOUNT_FLAGS(0x10000 | 0x01)
    } else {
        USER_ACCOUNT_FLAGS(0x01)
    };

    unsafe {
        let status = NetUserSetInfo(
            PCWSTR::null(),
            PCWSTR(username_u16.as_ptr()),
            1008,
            &info as *const _ as *const _,
            None,
        );

        if status != 0 {
            return Err(anyhow!("NetUserSetInfo (1008) failed: {}", status));
        }
    }

    Ok(())
}

pub fn reset_password(username: &str, password: &str) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let password_u16 = to_pcwstr(password);
    let mut info = USER_INFO_1003::default();
    info.usri1003_password = PWSTR(password_u16.as_ptr() as *mut _);

    unsafe {
        let status = NetUserSetInfo(
            PCWSTR::null(),
            PCWSTR(username_u16.as_ptr()),
            1003,
            &info as *const _ as *const _,
            None,
        );

        if status != 0 {
            return Err(anyhow!("NetUserSetInfo (1003) failed: {}", status));
        }
    }

    Ok(())
}

pub fn get_user_profile_path(username: &str) -> Result<PathBuf> {
    use windows::Win32::Foundation::LocalFree;
    use windows::Win32::Security::Authorization::ConvertSidToStringSidW;
    use windows::Win32::System::Environment::ExpandEnvironmentStringsW;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
    };

    // 1. 获取 SID 并转为字符串
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

    // 2. 从注册表读取 ProfileImagePath
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
            return Err(anyhow!(
                "Profile registry key not found for SID: {}",
                sid_string
            ));
        }

        let mut data_type = windows::Win32::System::Registry::REG_VALUE_TYPE::default();
        let mut data_len = 0u32;
        let _ = RegQueryValueExW(
            hkey,
            PCWSTR(value_name_u16.as_ptr()),
            None,
            Some(&mut data_type),
            None,
            Some(&mut data_len),
        );

        if data_len == 0 {
            let _ = RegCloseKey(hkey);
            return Err(anyhow!("ProfileImagePath length is 0"));
        }

        let mut data = vec![0u8; data_len as usize];
        if RegQueryValueExW(
            hkey,
            PCWSTR(value_name_u16.as_ptr()),
            None,
            Some(&mut data_type),
            Some(data.as_mut_ptr()),
            Some(&mut data_len),
        )
        .is_err()
        {
            let _ = RegCloseKey(hkey);
            return Err(anyhow!("RegQueryValueExW failed"));
        }
        let _ = RegCloseKey(hkey);

        // 3. 解析环境变量 (ExpandEnvironmentStringsW)
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
