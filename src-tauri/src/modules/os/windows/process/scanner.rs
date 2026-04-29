use crate::modules::os::windows::utils::get_sid_from_name;
use anyhow::{anyhow, Result};
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Security::{
    EqualSid, PSID, TOKEN_QUERY, TOKEN_USER, LookupAccountSidW,
};
use windows::Win32::System::Threading::{
    OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION, OpenProcessToken,
};
use windows::Win32::System::ProcessStatus::EnumProcesses;
use windows::Win32::System::RemoteDesktop::{
    WTSEnumerateProcessesExW, WTSFreeMemoryExW, WTSTypeProcessInfoLevel1,
    WTS_CURRENT_SERVER_HANDLE, WTS_PROCESS_INFO_EXW,
};
use windows::Win32::Foundation::{CloseHandle, HANDLE};

#[allow(dead_code)]
static SID_CACHE: OnceLock<Mutex<HashMap<String, Vec<u8>>>> = OnceLock::new();
static PID_OWNER_CACHE: OnceLock<Mutex<HashMap<u32, String>>> = OnceLock::new();

#[allow(dead_code)]
fn get_sid_cache() -> &'static Mutex<HashMap<String, Vec<u8>>> {
    SID_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

fn get_pid_owner_cache() -> &'static Mutex<HashMap<u32, String>> {
    PID_OWNER_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

pub fn is_process_running_for_user(_sys: &sysinfo::System, username: &str, process_names: &[&str]) -> Result<bool> {
    let target_sid_bytes = get_sid_from_name(username)?;
    let target_psid = PSID(target_sid_bytes.as_ptr() as *mut _);

    unsafe {
        let mut buffer: *mut WTS_PROCESS_INFO_EXW = std::ptr::null_mut();
        let mut count = 0u32;
        let mut level = 1u32;

        if WTSEnumerateProcessesExW(
            Some(WTS_CURRENT_SERVER_HANDLE),
            &mut level,
            0,
            &mut buffer as *mut *mut _ as *mut _,
            &mut count,
        ).is_ok() {
            let info_slice = std::slice::from_raw_parts(buffer, count as usize);
            let mut found = false;

            for info in info_slice {
                let p_name = info.pProcessName.to_string().unwrap_or_default().to_lowercase();
                let matches = process_names.iter().any(|&n| p_name == n.to_lowercase() || p_name == n.to_lowercase().replace(".exe", ""));
                
                if matches && !info.pUserSid.0.is_null() {
                    if EqualSid(target_psid, info.pUserSid).is_ok() {
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

pub fn get_multiple_process_status(
    _sys: &sysinfo::System,
    usernames: &[String],
    bnet_names: &[&str],
    d2r_names: &[&str],
) -> Result<HashMap<String, crate::modules::account::types::AccountStatus>> {
    use crate::modules::account::types::AccountStatus;

    let mut status_map = HashMap::new();
    for username in usernames {
        status_map.insert(username.clone(), AccountStatus::default());
    }

    unsafe {
        let mut pids = [0u32; 4096];
        let mut bytes_returned = 0u32;
        if EnumProcesses(pids.as_mut_ptr(), pids.len() as u32 * 4, &mut bytes_returned).is_err() {
            return Err(anyhow!("EnumProcesses failed"));
        }
        let count = bytes_returned as usize / 4;
        let current_pids: HashSet<u32> = pids[..count].iter().cloned().collect();

        if let Ok(mut cache) = get_pid_owner_cache().lock() {
            cache.retain(|pid, _| current_pids.contains(pid));
        }

        for &pid in &pids[..count] {
            if pid == 0 { continue; }

            let owner_name = if let Ok(cache) = get_pid_owner_cache().lock() {
                cache.get(&pid).cloned()
            } else {
                None
            };

            if let Some(cached_owner) = owner_name {
                for username in usernames {
                    if cached_owner.contains(&username.to_lowercase()) {
                        if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                            let mut path_buf = [0u16; 1024];
                            let mut size = path_buf.len() as u32;
                            if windows::Win32::System::Threading::QueryFullProcessImageNameW(
                                handle,
                                windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                                PWSTR(path_buf.as_mut_ptr()),
                                &mut size
                            ).is_ok() {
                                let path = String::from_utf16_lossy(&path_buf[..size as usize]).to_lowercase();
                                let is_bnet = bnet_names.iter().any(|&n| path.ends_with(&n.to_lowercase()));
                                let is_d2r = d2r_names.iter().any(|&n| path.ends_with(&n.to_lowercase()));

                                if is_bnet || is_d2r {
                                    if let Some(status) = status_map.get_mut(username) {
                                        if is_bnet { status.bnet_active = true; status.bnet_pid = Some(pid); }
                                        if is_d2r { status.d2r_active = true; status.d2r_pid = Some(pid); }
                                    }
                                }
                            }
                            let _ = CloseHandle(handle);
                        }
                    }
                }
            } else {
                if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut path_buf = [0u16; 1024];
                    let mut size = path_buf.len() as u32;
                    if windows::Win32::System::Threading::QueryFullProcessImageNameW(
                        handle,
                        windows::Win32::System::Threading::PROCESS_NAME_FORMAT(0),
                        PWSTR(path_buf.as_mut_ptr()),
                        &mut size
                    ).is_ok() {
                        let path = String::from_utf16_lossy(&path_buf[..size as usize]).to_lowercase();
                        let is_bnet = bnet_names.iter().any(|&n| path.ends_with(&n.to_lowercase()));
                        let is_d2r = d2r_names.iter().any(|&n| path.ends_with(&n.to_lowercase()));

                        if is_bnet || is_d2r {
                            let mut token = HANDLE::default();
                            if OpenProcessToken(handle, TOKEN_QUERY, &mut token).is_ok() {
                                let mut len = 0;
                                let _ = windows::Win32::Security::GetTokenInformation(token, windows::Win32::Security::TokenUser, None, 0, &mut len);
                                let mut buffer = vec![0u8; len as usize];
                                if windows::Win32::Security::GetTokenInformation(
                                    token,
                                    windows::Win32::Security::TokenUser,
                                    Some(buffer.as_mut_ptr() as *mut _),
                                    len,
                                    &mut len
                                ).is_ok() {
                                    let token_user = &*(buffer.as_ptr() as *const TOKEN_USER);
                                    let mut name_buf = [0u16; 256];
                                    let mut dom_buf = [0u16; 256];
                                    let mut n_size = name_buf.len() as u32;
                                    let mut d_size = dom_buf.len() as u32;
                                    let mut snu = windows::Win32::Security::SID_NAME_USE::default();

                                    if LookupAccountSidW(
                                        PCWSTR::null(),
                                        token_user.User.Sid,
                                        Some(PWSTR(name_buf.as_mut_ptr())),
                                        &mut n_size,
                                        Some(PWSTR(dom_buf.as_mut_ptr())),
                                        &mut d_size,
                                        &mut snu
                                    ).is_ok() {
                                        let name = String::from_utf16_lossy(&name_buf[..n_size as usize]).to_lowercase();
                                        let domain = String::from_utf16_lossy(&dom_buf[..d_size as usize]).to_lowercase();
                                        let full_owner = format!("{}\\{}", domain, name);

                                        if let Ok(mut cache) = get_pid_owner_cache().lock() {
                                            cache.insert(pid, full_owner.clone());
                                        }

                                        for username in usernames {
                                            if full_owner.contains(&username.to_lowercase()) {
                                                if let Some(status) = status_map.get_mut(username) {
                                                    if is_bnet { status.bnet_active = true; status.bnet_pid = Some(pid); }
                                                    if is_d2r { status.d2r_active = true; status.d2r_pid = Some(pid); }
                                                }
                                            }
                                        }
                                    }
                                }
                                let _ = CloseHandle(token);
                            }
                        }
                    }
                    let _ = CloseHandle(handle);
                }
            }
        }
    }
    Ok(status_map)
}

#[allow(dead_code)]
pub fn get_user_pids(
    _sys: &sysinfo::System,
    usernames: &[String],
    target_processes: &[&str],
) -> Result<HashMap<u32, String>> {
    let mut user_sids = Vec::new();
    if let Ok(mut cache) = get_sid_cache().lock() {
        for username in usernames {
            if let Some(sid) = cache.get(username) {
                user_sids.push((username.clone(), sid.clone()));
                continue;
            }
            if let Ok(sid_bytes) = get_sid_from_name(username) {
                user_sids.push((username.clone(), sid_bytes.clone()));
                cache.insert(username.clone(), sid_bytes);
            }
        }
    }

    let mut result = HashMap::new();
    unsafe {
        let mut buffer: *mut WTS_PROCESS_INFO_EXW = std::ptr::null_mut();
        let mut count = 0u32;
        let mut level = 1u32;

        if WTSEnumerateProcessesExW(
            Some(WTS_CURRENT_SERVER_HANDLE),
            &mut level,
            0,
            &mut buffer as *mut *mut _ as *mut _,
            &mut count,
        ).is_ok() {
            let info_slice = std::slice::from_raw_parts(buffer, count as usize);

            for info in info_slice {
                let p_name = info.pProcessName.to_string().unwrap_or_default().to_lowercase();
                let is_target = target_processes.iter().any(|&n| p_name == n.to_lowercase() || p_name == n.to_lowercase().replace(".exe", ""));
                
                if !is_target || info.pUserSid.0.is_null() { continue; }

                for (username, target_sid_bytes) in &user_sids {
                    let target_psid = PSID(target_sid_bytes.as_ptr() as *mut _);
                    if EqualSid(target_psid, info.pUserSid).is_ok() {
                        result.insert(info.ProcessId, username.clone());
                        break;
                    }
                }
            }
            let _ = WTSFreeMemoryExW(WTSTypeProcessInfoLevel1, buffer as *const _, count);
        }
    }
    Ok(result)
}
