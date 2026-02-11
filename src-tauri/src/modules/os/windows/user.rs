use super::utils::{get_localized_users_group_name, get_name_from_sid_string, to_pcwstr};
use anyhow::{anyhow, Result};
use std::os::windows::process::CommandExt;
use std::process::Command;
use std::ptr;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::NetworkManagement::NetManagement::{
    NetApiBufferFree, NetLocalGroupAddMembers, NetUserAdd, NetUserEnum, FILTER_NORMAL_ACCOUNT,
    LOCALGROUP_MEMBERS_INFO_3, USER_ACCOUNT_FLAGS, USER_INFO_0, USER_INFO_1, USER_PRIV,
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
        if let Ok(output) = Command::new("reg")
            .args([
                "query",
                "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList",
            ])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if let Some(sid_str) = line.trim().split('\\').last() {
                    if sid_str.starts_with("S-1-5-21") {
                        if let Ok(user_with_domain) = get_name_from_sid_string(sid_str) {
                            let exists = users
                                .iter()
                                .any(|u| u.to_lowercase() == user_with_domain.to_lowercase());
                            if !exists {
                                users.push(user_with_domain);
                            }
                        }
                    }
                }
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
    let flag = if never_expires { "$true" } else { "$false" };

    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Set-LocalUser -Name '{}' -PasswordNeverExpires {}",
                username, flag
            ),
        ])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| anyhow!("Failed to execute PowerShell: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("PowerShell failed: {}", stderr.trim()));
    }

    Ok(())
}

pub fn reset_password(username: &str, password: &str) -> Result<()> {
    let output = Command::new("net")
        .args(["user", username, password])
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output()
        .map_err(|e| anyhow!("Failed to reset password: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!("net user password reset failed: {}", stderr.trim()));
    }

    Ok(())
}

pub fn is_user_initialized(username: &str) -> bool {
    let sid_output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "(New-Object System.Security.Principal.NTAccount('{}')).Translate([System.Security.Principal.SecurityIdentifier]).Value",
                username
            ),
        ])
        .creation_flags(0x08000000)
        .output();

    let sid = if let Ok(out) = sid_output {
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    } else {
        return false;
    };

    if sid.is_empty() {
        return false;
    }

    let reg_output = Command::new("reg")
        .args([
            "query",
            &format!(
                "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList\\{}",
                sid
            ),
            "/v",
            "ProfileImagePath",
        ])
        .creation_flags(0x08000000)
        .output();

    if let Ok(out) = reg_output {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
            if line.contains("ProfileImagePath") {
                let parts: Vec<&str> = line.split("REG_EXPAND_SZ").collect();
                if parts.len() > 1 {
                    let raw_path = parts[1].trim();
                    let resolved_path_output = Command::new("cmd")
                        .args(["/c", &format!("echo {}", raw_path)])
                        .creation_flags(0x08000000)
                        .output();

                    if let Ok(p_out) = resolved_path_output {
                        let path_str = String::from_utf8_lossy(&p_out.stdout).trim().to_string();
                        let path = std::path::Path::new(&path_str);
                        return path.join("AppData").join("Local").exists();
                    }
                }
            }
        }
    }

    false
}
