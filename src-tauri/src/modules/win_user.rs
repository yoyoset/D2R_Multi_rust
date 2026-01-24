use windows::Win32::NetworkManagement::NetManagement::{
    NetUserEnum, NetUserAdd, NetGroupAddUser, 
    USER_INFO_0, USER_INFO_1,
    FILTER_NORMAL_ACCOUNT,
    NetApiBufferFree,
    USER_PRIV, USER_ACCOUNT_FLAGS,
};
use windows::Win32::Security::{
    CreateWellKnownSid, WinBuiltinUsersSid, LookupAccountSidW, SID_NAME_USE, PSID,
};
use windows::core::{PCWSTR, PWSTR};
use std::ptr;
use std::process::Command;

pub fn get_whoami() -> String {
    let username = std::env::var("USERNAME").unwrap_or_default();
    let domain = std::env::var("USERDOMAIN").unwrap_or_default();
    if domain.is_empty() {
        username
    } else {
        format!("{}\\{}", domain, username)
    }
}

pub fn list_local_users(include_registry: bool) -> Result<Vec<String>, String> {
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
                            if !vec!["guest", "wdagutilityaccount", "defaultaccount"].contains(&lower_name.as_str()) {
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
            .args(["query", "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\ProfileList"])
            .output() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if let Some(sid_str) = line.trim().split('\\').last() {
                        if sid_str.starts_with("S-1-5-21") {
                             // Use robust SID lookup instead of path hint
                             if let Ok(user_with_domain) = get_name_from_sid_string(sid_str) {
                                 // Check if we already have this user (case-insensitive)
                                 let exists = users.iter().any(|u| u.to_lowercase() == user_with_domain.to_lowercase());
                                 if !exists {
                                     users.push(user_with_domain);
                                 }
                             }
                        }
                    }
                }
            }
    }

    let current = get_whoami();
    if !users.contains(&current) {
        users.push(current);
    }

    Ok(users)
}

fn get_name_from_sid_string(sid_str: &str) -> Result<String, String> {
    use windows::Win32::Security::Authorization::ConvertStringSidToSidW;
    
    let sid_u16: Vec<u16> = sid_str.encode_utf16().chain(Some(0)).collect();
    let mut psid = PSID(ptr::null_mut());
    
    unsafe {
        if ConvertStringSidToSidW(PCWSTR(sid_u16.as_ptr()), &mut psid).is_ok() {
            let mut name = [0u16; 256];
            let mut name_size = name.len() as u32;
            let mut dom = [0u16; 256];
            let mut dom_size = dom.len() as u32;
            let mut snu = SID_NAME_USE::default();

            let res = if LookupAccountSidW(
                PCWSTR::null(),
                psid,
                Some(PWSTR(name.as_mut_ptr())),
                &mut name_size,
                Some(PWSTR(dom.as_mut_ptr())),
                &mut dom_size,
                &mut snu
            ).is_ok() {
                let user_name = String::from_utf16_lossy(&name[..name_size as usize]);
                let domain_name = String::from_utf16_lossy(&dom[..dom_size as usize]);
                if domain_name.is_empty() {
                    Ok(user_name)
                } else {
                    Ok(format!("{}\\{}", domain_name, user_name))
                }
            } else {
                Err("Lookup failed".to_string())
            };

            // psid allocated by ConvertStringSidToSidW must be freed with LocalFree
            use windows::Win32::Foundation::{LocalFree, HLOCAL};
            let _ = LocalFree(Some(HLOCAL(psid.0)));
            
            res
        } else {
            Err("Invalid SID string".to_string())
        }
    }
}

fn get_localized_users_group_name() -> String {
    unsafe {
        let mut sid_size = 0;
        let _ = CreateWellKnownSid(WinBuiltinUsersSid, None, Some(PSID(ptr::null_mut())), &mut sid_size);

        let mut sid = vec![0u8; sid_size as usize];
        let psid = PSID(sid.as_mut_ptr() as *mut _);

        if CreateWellKnownSid(WinBuiltinUsersSid, None, Some(psid), &mut sid_size).is_ok() {
            let mut name = [0u16; 256];
            let mut name_size = name.len() as u32;
            let mut dom = [0u16; 256];
            let mut dom_size = dom.len() as u32;
            let mut snu = SID_NAME_USE::default();

            if LookupAccountSidW(
                PCWSTR::null(),
                psid,
                Some(PWSTR(name.as_mut_ptr())),
                &mut name_size,
                Some(PWSTR(dom.as_mut_ptr())),
                &mut dom_size,
                &mut snu
            ).is_ok() {
                return String::from_utf16_lossy(&name[..name_size as usize]);
            }
        }
    }
    "Users".to_string()
}

pub fn create_user(username: &str, password: &str) -> Result<(), String> {
    let username_u16: Vec<u16> = username.encode_utf16().chain(Some(0)).collect();
    let password_u16: Vec<u16> = password.encode_utf16().chain(Some(0)).collect();
    
    let mut user_info = USER_INFO_1::default();
    user_info.usri1_name = PWSTR(username_u16.as_ptr() as *mut _);
    user_info.usri1_password = PWSTR(password_u16.as_ptr() as *mut _);
    user_info.usri1_priv = USER_PRIV(1); 
    user_info.usri1_flags = USER_ACCOUNT_FLAGS(0x0001 | 0x10000); 

    unsafe {
        let status = NetUserAdd(
            PCWSTR::null(),
            1,
            &user_info as *const _ as *const _,
            None,
        );

        if status != 0 {
            return Err(format!("NetUserAdd failed with status: {}", status));
        }

        let group_name = get_localized_users_group_name();
        let group_name_u16: Vec<u16> = group_name.encode_utf16().chain(Some(0)).collect();
        
        let _ = NetGroupAddUser(
            PCWSTR::null(),
            PCWSTR(group_name_u16.as_ptr()),
            PCWSTR(username_u16.as_ptr()),
        );

        Ok(())
    }
}
