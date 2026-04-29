use anyhow::{anyhow, Result};
use std::ptr;
use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Security::{
    CreateWellKnownSid, LookupAccountNameW, LookupAccountSidW, WinBuiltinUsersSid, PSID,
    SID_NAME_USE,
};

pub fn to_pcwstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}

pub fn get_sid_from_name(username: &str) -> Result<Vec<u8>> {
    let name_u16 = to_pcwstr(username);
    let mut sid_size = 0u32;
    let mut domain_size = 0u32;
    let mut snu = SID_NAME_USE::default();

    unsafe {
        let _ = LookupAccountNameW(
            PCWSTR::null(),
            PCWSTR(name_u16.as_ptr()),
            None,
            &mut sid_size,
            None,
            &mut domain_size,
            &mut snu,
        );

        if sid_size == 0 {
            tracing::error!("[SID] LookupAccountNameW failed for username '{}', last error: {:?}", username, windows::Win32::Foundation::GetLastError());
            return Err(anyhow!("LookupAccountNameW failed to get SID size for {}", username));
        }

        let mut sid = vec![0u8; sid_size as usize];
        let mut domain = vec![0u16; domain_size as usize];

        LookupAccountNameW(
            PCWSTR::null(),
            PCWSTR(name_u16.as_ptr()),
            Some(PSID(sid.as_mut_ptr() as *mut _)),
            &mut sid_size,
            Some(PWSTR(domain.as_mut_ptr())),
            &mut domain_size,
            &mut snu,
        )
        .map_err(|e| anyhow!("LookupAccountNameW failed for {}: {}", username, e))?;

        Ok(sid)
    }
}

pub fn get_localized_users_group_name() -> String {
    unsafe {
        let mut sid_size = 0;
        let _ = CreateWellKnownSid(
            WinBuiltinUsersSid,
            None,
            Some(PSID(ptr::null_mut())),
            &mut sid_size,
        );

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
                &mut snu,
            )
            .is_ok()
            {
                return String::from_utf16_lossy(&name[..name_size as usize]);
            }
        }
    }
    "Users".to_string()
}
