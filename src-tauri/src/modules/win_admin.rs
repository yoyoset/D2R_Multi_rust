#[cfg(target_os = "windows")]
pub fn is_admin() -> bool {
    use windows::Win32::Security::{
        CheckTokenMembership, CreateWellKnownSid, WinBuiltinAdministratorsSid, PSID,
    };

    unsafe {
        let mut sid_size = 0u32;
        // First call to get required size
        let _ = CreateWellKnownSid(WinBuiltinAdministratorsSid, None, None, &mut sid_size);

        if sid_size == 0 {
            return false;
        }

        let mut sid_buffer = vec![0u8; sid_size as usize];
        let sid = PSID(sid_buffer.as_mut_ptr() as *mut _);

        // CreateWellKnownSid result_sid is Option<PSID>
        if CreateWellKnownSid(WinBuiltinAdministratorsSid, None, Some(sid), &mut sid_size).is_ok() {
            let mut is_member = 0i32;
            // CheckTokenMembership sidToCheck is PSID (not Option)
            let res = CheckTokenMembership(None, sid, &mut is_member as *mut i32 as *mut _);
            if res.is_ok() {
                return is_member != 0;
            }
        }
        false
    }
}

#[cfg(target_os = "windows")]
pub fn enable_debug_privilege() -> bool {
    use windows::Win32::Foundation::{CloseHandle, LUID};
    use windows::Win32::Security::{
        AdjustTokenPrivileges, LookupPrivilegeValueW, LUID_AND_ATTRIBUTES, SE_DEBUG_NAME,
        SE_PRIVILEGE_ENABLED, TOKEN_ADJUST_PRIVILEGES, TOKEN_PRIVILEGES, TOKEN_QUERY,
    };
    use windows::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

    unsafe {
        let mut h_token = Default::default();
        if OpenProcessToken(
            GetCurrentProcess(),
            TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY,
            &mut h_token,
        )
        .is_err()
        {
            return false;
        }

        let mut luid = LUID::default();
        if LookupPrivilegeValueW(None, SE_DEBUG_NAME, &mut luid).is_err() {
            let _ = CloseHandle(h_token);
            return false;
        }

        let tkp = TOKEN_PRIVILEGES {
            PrivilegeCount: 1,
            Privileges: [LUID_AND_ATTRIBUTES {
                Luid: luid,
                Attributes: SE_PRIVILEGE_ENABLED,
            }],
        };

        let result = AdjustTokenPrivileges(h_token, false, Some(&tkp), 0, None, None);
        let _ = CloseHandle(h_token);

        result.is_ok()
    }
}

#[cfg(not(target_os = "windows"))]
pub fn enable_debug_privilege() -> bool {
    true
}

#[cfg(not(target_os = "windows"))]
pub fn is_admin() -> bool {
    false
}
