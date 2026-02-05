use super::{OSProvider, ProcessLaunchResult};
use anyhow::{Result, anyhow};
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::{CloseHandle, LocalFree, HLOCAL};
use windows::Win32::NetworkManagement::NetManagement::{
    NetUserEnum, NetUserAdd, NetGroupAddUser, 
    USER_INFO_0, USER_INFO_1,
    FILTER_NORMAL_ACCOUNT, NetApiBufferFree,
    USER_PRIV, USER_ACCOUNT_FLAGS,
};
use windows::Win32::Security::{
    CreateWellKnownSid, WinBuiltinUsersSid, LookupAccountSidW, SID_NAME_USE, PSID,
};
use windows::Win32::Security::Authorization::ConvertStringSidToSidW;
use windows::Win32::System::Threading::{
    CreateProcessWithLogonW, LOGON_WITH_PROFILE, 
    STARTUPINFOW, PROCESS_INFORMATION, 
    CREATE_UNICODE_ENVIRONMENT, CREATE_NEW_CONSOLE
};
use std::ptr;
use std::process::Command;

pub struct WindowsProvider;

impl OSProvider for WindowsProvider {
    fn get_whoami(&self) -> String {
        let username = std::env::var("USERNAME").unwrap_or_default();
        let domain = std::env::var("USERDOMAIN").unwrap_or_default();
        if domain.is_empty() {
            username
        } else {
            format!("{}\\{}", domain, username)
        }
    }

    fn list_local_users(&self, include_registry: bool) -> Result<Vec<String>> {
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
                                if !["guest", "wdagutilityaccount", "defaultaccount"].contains(&lower_name.as_str()) {
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
                                 if let Ok(user_with_domain) = self.get_name_from_sid_string(sid_str) {
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

        let current = self.get_whoami();
        if !users.contains(&current) {
            users.push(current);
        }

        Ok(users)
    }

    fn create_user(&self, username: &str, password: &str) -> Result<()> {
        let username_u16 = to_pcwstr(username);
        let password_u16 = to_pcwstr(password);
        
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
                return Err(anyhow!("NetUserAdd failed with status: {}", status));
            }

            let group_name = self.get_localized_users_group_name();
            let group_name_u16 = to_pcwstr(&group_name);
            
            let _ = NetGroupAddUser(
                PCWSTR::null(),
                PCWSTR(group_name_u16.as_ptr()),
                PCWSTR(username_u16.as_ptr()),
            );

            Ok(())
        }
    }

    fn create_process_with_logon(
        &self,
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
            CreateProcessWithLogonW(
                PCWSTR(user_utf16.as_ptr()),
                match domain_utf16 {
                    Some(ref d) => PCWSTR(d.as_ptr()),
                    None => PCWSTR::null(),
                },
                PCWSTR(pass_utf16.as_ptr()),
                LOGON_WITH_PROFILE,
                PCWSTR(app_utf16.as_ptr()),
                if cmd_utf16.is_empty() { None } else { Some(PWSTR(cmd_utf16.as_mut_ptr())) },
                creation_flags,
                None, 
                match dir_utf16 {
                    Some(ref d) => PCWSTR(d.as_ptr()),
                    None => PCWSTR::null(),
                },
                &startup_info,
                &mut process_info,
            ).map_err(|e| anyhow!("CreateProcessWithLogonW failed: {}", e))?;

            let _ = CloseHandle(process_info.hProcess);
            let _ = CloseHandle(process_info.hThread);
            
            Ok(ProcessLaunchResult {
                process_id: process_info.dwProcessId,
                thread_id: process_info.dwThreadId,
            })
        }
    }
}

impl WindowsProvider {
    fn get_name_from_sid_string(&self, sid_str: &str) -> Result<String> {
        let sid_u16 = to_pcwstr(sid_str);
        let mut psid = PSID(ptr::null_mut());
        
        unsafe {
            ConvertStringSidToSidW(PCWSTR(sid_u16.as_ptr()), &mut psid)
                .map_err(|e| anyhow!("ConvertStringSidToSidW failed: {}", e))?;
                
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
                Err(anyhow!("LookupAccountSidW failed"))
            };

            let _ = LocalFree(Some(HLOCAL(psid.0)));
            res
        }
    }

    fn get_localized_users_group_name(&self) -> String {
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
}

fn to_pcwstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}
