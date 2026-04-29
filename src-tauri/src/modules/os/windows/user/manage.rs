use anyhow::{anyhow, Result};
use std::ptr;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::NetworkManagement::NetManagement::{
    NetApiBufferFree, NetLocalGroupAddMembers, NetUserAdd, NetUserGetInfo, NetUserSetInfo,
    LOCALGROUP_MEMBERS_INFO_3, USER_ACCOUNT_FLAGS, USER_INFO_1,
    UF_NORMAL_ACCOUNT, UF_SCRIPT, UF_DONT_EXPIRE_PASSWD, USER_PRIV,
};
use crate::modules::logger;
use crate::modules::os::windows::utils::{get_localized_users_group_name, to_pcwstr};
use super::types::{USER_INFO_1003_INTERNAL, USER_INFO_1008_INTERNAL};

pub fn create_user(username: &str, password: &str, never_expires: bool) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let password_u16 = to_pcwstr(password);

    let mut user_info = USER_INFO_1::default();
    user_info.usri1_name = PWSTR(username_u16.as_ptr() as *mut _);
    user_info.usri1_password = PWSTR(password_u16.as_ptr() as *mut _);
    user_info.usri1_priv = USER_PRIV(1); // USER_PRIV_USER
    let mut flags = UF_NORMAL_ACCOUNT | UF_SCRIPT.0;
    if never_expires {
        flags |= UF_DONT_EXPIRE_PASSWD.0;
    }
    user_info.usri1_flags = USER_ACCOUNT_FLAGS(flags);

    unsafe {
        let status = NetUserAdd(PCWSTR::null(), 1, &user_info as *const _ as *const _, None);

        if status != 0 {
            if status == 2224 {
                logger::info_key(None, "logs.user.already_exists", Some(serde_json::json!({ "username": username })));
            } else {
                return Err(anyhow!("NetUserAdd failed with status: {} (Win32 Error)", status));
            }
        } else {
            logger::success_key(None, "logs.user.created_successfully", Some(serde_json::json!({ "username": username })));
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
            logger::warn_key(None, "logs.user.get_info_failed", Some(serde_json::json!({ "username": username, "status": group_status })));
        } else if group_status == 0 {
            logger::success_key(None, "logs.user.added_to_group", Some(serde_json::json!({ "username": username })));
        }

        Ok(())
    }
}

pub fn set_password_never_expires(username: &str, never_expires: bool) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let mut error_index = 0u32;
    let mut buffer: *mut u8 = ptr::null_mut();

    unsafe {
        let get_status = NetUserGetInfo(PCWSTR::null(), PCWSTR(username_u16.as_ptr()), 1, &mut buffer);

        if get_status != 0 || buffer.is_null() {
            logger::error_key(None, "logs.user.get_info_failed", Some(serde_json::json!({ "username": username, "status": get_status })));
            return Err(anyhow!("error.user.get_info_failed|{{\"username\":\"{}\",\"status\":{}}}", username, get_status));
        }

        let info = *(buffer as *const USER_INFO_1);
        let mut current_flags = info.usri1_flags.0;

        if never_expires {
            current_flags |= UF_DONT_EXPIRE_PASSWD.0;
        } else {
            current_flags &= !UF_DONT_EXPIRE_PASSWD.0;
        }

        let info_1008 = USER_INFO_1008_INTERNAL {
            usri1008_flags: current_flags,
        };
        
        let set_status = NetUserSetInfo(PCWSTR::null(), PCWSTR(username_u16.as_ptr()), 1008, &info_1008 as *const _ as *const u8, Some(&mut error_index));

        NetApiBufferFree(Some(buffer as *const _));

        if set_status != 0 {
            return Err(anyhow!("NetUserSetInfo (1008) failed for {}: {}. ErrIndex: {}", username, set_status, error_index));
        }

        logger::success_key(None, "logs.user.policy_synced", Some(serde_json::json!({ "username": username })));
    }

    Ok(())
}

pub fn reset_password(username: &str, password: &str) -> Result<()> {
    let username_u16 = to_pcwstr(username);
    let password_u16 = to_pcwstr(password);
    let info = USER_INFO_1003_INTERNAL {
        usri1003_password: PWSTR(password_u16.as_ptr() as *mut _),
    };

    unsafe {
        let mut error_index = 0u32;
        let status = NetUserSetInfo(PCWSTR::null(), PCWSTR(username_u16.as_ptr()), 1003, &info as *const _ as *const u8, Some(&mut error_index));

        if status != 0 {
            return Err(anyhow!("NetUserSetInfo (1003) failed for {}: {}. ErrIndex: {}", username, status, error_index));
        } else {
            logger::success_key(None, "logs.user.password_reset_success", Some(serde_json::json!({ "username": username })));
        }
    }

    Ok(())
}

