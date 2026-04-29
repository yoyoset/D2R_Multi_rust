use crate::modules::win_admin;
use crate::modules::account::types::DiagnosticResult;

pub async fn get_system_env_diagnostics() -> Result<Vec<DiagnosticResult>, String> {
    let mut results = Vec::new();

    // --- 1. Admin Rights (Core prerequisite for multi-instance) ---
    let is_admin = win_admin::is_admin();
    results.push(DiagnosticResult {
        category: "diag.category.permission".into(),
        name: "diag.name.admin_rights".into(),
        status: if is_admin { "status_pass".into() } else { "status_fail".into() },
        message: if is_admin {
            "diag.msg.admin_ok".into()
        } else {
            "diag.msg.admin_fail".into()
        },
    });

    // --- 2. Secondary Logon Service (seclogon) ---
    let seclogon_status = check_service_running("seclogon");
    results.push(DiagnosticResult {
        category: "diag.category.service".into(),
        name: "diag.name.seclogon".into(),
        status: match seclogon_status {
            ServiceStatus::Running => "status_pass".into(),
            ServiceStatus::Stopped => "status_fail".into(),
            ServiceStatus::NotFound => "status_fail".into(),
            ServiceStatus::Unknown => "status_warning".into(),
        },
        message: match seclogon_status {
            ServiceStatus::Running => "diag.msg.seclogon_running".into(),
            ServiceStatus::Stopped => "diag.msg.seclogon_stopped".into(),
            ServiceStatus::NotFound => "diag.msg.seclogon_not_found".into(),
            ServiceStatus::Unknown => "diag.msg.seclogon_unknown".into(),
        },
    });

    // --- 3. SAM User Database Access Capability ---
    let sam_ok = check_sam_accessible();
    results.push(DiagnosticResult {
        category: "diag.category.sys_component".into(),
        name: "diag.name.sam".into(),
        status: if sam_ok { "status_pass".into() } else { "status_fail".into() },
        message: if sam_ok {
            "diag.msg.sam_ok".into()
        } else {
            "diag.msg.sam_fail".into()
        },
    });

    // --- 4. Interactive Logon Capability (LogonUser) ---
    let logon_type_ok = check_interactive_logon_policy();
    results.push(DiagnosticResult {
        category: "diag.category.security_policy".into(),
        name: "diag.name.interactive_logon".into(),
        status: match logon_type_ok {
            LogonCheckResult::Ok => "status_pass".into(),
            LogonCheckResult::DomainDetected => "status_warning".into(),
            LogonCheckResult::Unknown => "status_warning".into(),
        },
        message: match logon_type_ok {
            LogonCheckResult::Ok => "diag.msg.logon_ok".into(),
            LogonCheckResult::DomainDetected => "diag.msg.logon_domain".into(),
            LogonCheckResult::Unknown => "diag.msg.logon_unknown".into(),
        },
    });

    // --- 5. NTFS Junction/Symbolic Link Support ---
    let junction_ok = check_junction_support();
    results.push(DiagnosticResult {
        category: "diag.category.filesystem".into(),
        name: "diag.name.junction".into(),
        status: if junction_ok { "status_pass".into() } else { "status_warning".into() },
        message: if junction_ok {
            "diag.msg.junction_ok".into()
        } else {
            "diag.msg.junction_fail".into()
        },
    });

    Ok(results)
}

// --- Helper: Service Status Detection ---

enum ServiceStatus {
    Running,
    Stopped,
    NotFound,
    Unknown,
}

fn check_service_running(service_name: &str) -> ServiceStatus {
    use windows::core::PCWSTR;
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::Win32::System::Services::{
        OpenSCManagerW, OpenServiceW, QueryServiceStatus, CloseServiceHandle,
        SC_MANAGER_CONNECT, SERVICE_QUERY_STATUS, SERVICE_STATUS, SERVICE_RUNNING,
    };

    unsafe {
        let sc_manager = OpenSCManagerW(PCWSTR::null(), PCWSTR::null(), SC_MANAGER_CONNECT);
        let sc_manager = match sc_manager {
            Ok(h) => h,
            Err(_) => return ServiceStatus::Unknown,
        };

        let name_u16 = to_pcwstr(service_name);
        let service = OpenServiceW(sc_manager, PCWSTR(name_u16.as_ptr()), SERVICE_QUERY_STATUS);
        let service = match service {
            Ok(h) => h,
            Err(_) => {
                let _ = CloseServiceHandle(sc_manager);
                return ServiceStatus::NotFound;
            }
        };

        let mut status = SERVICE_STATUS::default();
        let result = if QueryServiceStatus(service, &mut status).is_ok() {
            if status.dwCurrentState == SERVICE_RUNNING {
                ServiceStatus::Running
            } else {
                ServiceStatus::Stopped
            }
        } else {
            ServiceStatus::Unknown
        };

        let _ = CloseServiceHandle(service);
        let _ = CloseServiceHandle(sc_manager);
        result
    }
}

// --- Helper: SAM Database Accessibility ---

fn check_sam_accessible() -> bool {
    use windows::core::PCWSTR;
    use windows::Win32::NetworkManagement::NetManagement::{
        NetUserEnum, NetApiBufferFree, FILTER_NORMAL_ACCOUNT,
    };
    use std::ptr;

    unsafe {
        let mut buffer: *mut u8 = ptr::null_mut();
        let mut entries_read = 0u32;
        let mut total_entries = 0u32;

        let status = NetUserEnum(
            PCWSTR::null(),
            0,
            FILTER_NORMAL_ACCOUNT,
            &mut buffer,
            1, // Request only 1 entry for minimal overhead
            &mut entries_read,
            &mut total_entries,
            None,
        );

        if !buffer.is_null() {
            NetApiBufferFree(Some(buffer as *const _));
        }

        // status 0 = NERR_Success, 234 = ERROR_MORE_DATA (Both indicate accessibility)
        status == 0 || status == 234
    }
}

// --- Helper: Domain Environment Detection ---

enum LogonCheckResult {
    Ok,
    DomainDetected,
    Unknown,
}

fn check_interactive_logon_policy() -> LogonCheckResult {
    use windows::Win32::System::SystemInformation::GetComputerNameExW;
    use windows::Win32::System::SystemInformation::ComputerNameDnsDomain;

    unsafe {
        let mut size = 0u32;
        let _ = GetComputerNameExW(ComputerNameDnsDomain, None, &mut size);

        if size <= 1 {
            // Empty domain = Workgroup environment, local logon is fine
            return LogonCheckResult::Ok;
        }

        let mut buf = vec![0u16; size as usize];
        if GetComputerNameExW(
            ComputerNameDnsDomain,
            Some(windows::core::PWSTR(buf.as_mut_ptr())),
            &mut size,
        ).is_ok() {
            let domain = String::from_utf16_lossy(&buf[..size as usize]);
            if domain.trim().is_empty() {
                LogonCheckResult::Ok
            } else {
                LogonCheckResult::DomainDetected
            }
        } else {
            LogonCheckResult::Unknown
        }
    }
}

// --- Helper: Junction Support Detection ---

fn check_junction_support() -> bool {
    let test_dir = std::env::temp_dir().join("d2r_junction_test_target");
    let test_link = std::env::temp_dir().join("d2r_junction_test_link");

    // Clean up old residuals
    let _ = std::fs::remove_dir(&test_link);
    let _ = std::fs::remove_dir_all(&test_dir);

    if std::fs::create_dir_all(&test_dir).is_err() {
        return false;
    }

    // Attempt to create junction
    let result = std::process::Command::new("cmd")
        .args(["/C", "mklink", "/J", &test_link.to_string_lossy(), &test_dir.to_string_lossy()])
        .output();

    let ok = match result {
        Ok(output) => output.status.success() && test_link.exists(),
        Err(_) => false,
    };

    // Cleanup
    let _ = std::fs::remove_dir(&test_link);
    let _ = std::fs::remove_dir_all(&test_dir);

    ok
}

pub async fn get_game_path_diagnostics(game_path: String) -> Result<Vec<DiagnosticResult>, String> {
    let mut results = Vec::new();
    let path = std::path::Path::new(&game_path);

    // --- 1. Path and Core Component Validation ---
    let exe_path = if path.is_file() {
        path.to_path_buf()
    } else {
        path.join("D2R.exe")
    };
    let has_exe = exe_path.exists();
    
    results.push(DiagnosticResult {
        category: "diag.category.env".into(),
        name: "diag.name.game_exe".into(),
        status: if has_exe { "status_pass".into() } else { "status_fail".into() },
        message: if has_exe {
            "diag.msg.game_exe_ok".into()
        } else {
            "diag.msg.game_exe_fail".into()
        },
    });

    if !has_exe {
        return Ok(results);
    }

    // --- 3. Users Group ACL Permissions (Core Detection) ---
    let acl_path = if path.is_file() {
        path.parent().unwrap_or(path)
    } else {
        path
    };
    let acl_result = check_users_group_acl(&acl_path.to_string_lossy());
    results.push(DiagnosticResult {
        category: "diag.category.permission".into(),
        name: "diag.name.users_acl".into(),
        status: match &acl_result {
            AclCheckResult::FullControl => "status_pass".into(),
            AclCheckResult::ReadOnly => "status_warning".into(),
            AclCheckResult::NoAccess => "status_fail".into(),
            AclCheckResult::CheckFailed(_) => "status_warning".into(),
        },
        message: match &acl_result {
            AclCheckResult::FullControl => "diag.msg.acl_full".into(),
            AclCheckResult::ReadOnly => "diag.msg.acl_readonly".into(),
            AclCheckResult::NoAccess => "diag.msg.acl_none".into(),
            AclCheckResult::CheckFailed(reason) => reason.clone(),
        },
    });

    Ok(results)
}

// --- Helper: Users Group ACL Detection ---

enum AclCheckResult {
    FullControl,
    ReadOnly,
    NoAccess,
    CheckFailed(String),
}

fn check_users_group_acl(path: &str) -> AclCheckResult {
    use std::os::windows::process::CommandExt;
    // Query directory permissions using icacls
    let output = std::process::Command::new("icacls")
        .arg(path)
        .creation_flags(0x08000000) // CREATE_NO_WINDOW
        .output();

    let output = match output {
        Ok(o) => o,
        Err(e) => return AclCheckResult::CheckFailed(e.to_string()),
    };

    if !output.status.success() {
        return AclCheckResult::CheckFailed("error.diag.icacls_failed|{\"error\":\"exit code\"}".into());
    }

    // icacls output may be mixed GBK/UTF-8; use lossy parsing
    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();

    // Search for lines matching Users group
    // Possible formats:
    //   BUILTIN\Users:(OI)(CI)(F)      — Full Control
    //   BUILTIN\Users:(OI)(CI)(RX)     — Read & Execute
    //   *S-1-5-32-545:(OI)(CI)(F)      — Users group represented by SID
    //   Localized names like BUILTIN\用户:...
    let users_patterns = [
        "\\users:",
        "s-1-5-32-545",
        "\\用户:",       // Chinese Windows localization
    ];

    let mut found_users_line = false;
    let mut has_full_control = false;
    let mut has_any_access = false;

    for line in stdout.lines() {
        let line_lower = line.trim().to_lowercase();

        let is_users_line = users_patterns.iter().any(|p| line_lower.contains(p));
        if !is_users_line {
            continue;
        }

        found_users_line = true;
        has_any_access = true;

        // Check permission levels
        // (F) = Full Control
        // (M) = Modify
        // (W) = Write
        // (R) = Read
        // (RX) = Read & Execute
        if line_lower.contains("(f)") || line_lower.contains("(oi)(ci)(f)") {
            has_full_control = true;
        }
    }

    if has_full_control {
        AclCheckResult::FullControl
    } else if has_any_access {
        AclCheckResult::ReadOnly
    } else if found_users_line {
        AclCheckResult::NoAccess
    } else {
        AclCheckResult::NoAccess
    }
}

