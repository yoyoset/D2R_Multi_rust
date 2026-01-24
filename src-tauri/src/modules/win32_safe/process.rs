use windows::core::{PCWSTR, PWSTR};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Threading::{
    CreateProcessWithLogonW, LOGON_WITH_PROFILE, 
    STARTUPINFOW, PROCESS_INFORMATION, 
    CREATE_UNICODE_ENVIRONMENT, CREATE_NEW_CONSOLE
};

#[derive(Debug)]
pub struct ProcessLaunchResult {
    pub process_id: u32,
    #[allow(dead_code)]
    pub thread_id: u32,
}

pub fn create_process_with_logon(
    username: &str,
    domain: Option<&str>,
    password: &str,
    application_path: &str,
    command_line: Option<&str>,
    current_directory: Option<&str>,
) -> Result<ProcessLaunchResult, anyhow::Error> {
    
    // Convert Rust strings to null-terminated UTF-16 vectors
    let user_utf16 = to_pcwstr(username);
    let pass_utf16 = to_pcwstr(password);
    let domain_utf16 = domain.map(|d| to_pcwstr(d));
    let app_utf16 = to_pcwstr(application_path);
    
    // Command line typically must be mutable for CreateProcess.
    // CreateProcessWithLogonW docs say: "The system adds a null character to the command line string if necessary? No."
    // It takes `lpCommandLine` as `[in, out, optional] PWSTR`. So it must be mutable buffer.
    
    let mut cmd_utf16 = if let Some(cmd) = command_line {
        to_utf16_vec(cmd) // We need a vector we can mutate/pass as pointer
    } else {
        Vec::new()
    };
    
    let dir_utf16 = current_directory.map(|d| to_pcwstr(d));

    let mut startup_info = STARTUPINFOW::default();
    startup_info.cb = std::mem::size_of::<STARTUPINFOW>() as u32;

    let mut process_info = PROCESS_INFORMATION::default();

    // Flags: LOGON_WITH_PROFILE is standard.
    // CreationFlags: CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_CONSOLE
    let creation_flags = CREATE_UNICODE_ENVIRONMENT | CREATE_NEW_CONSOLE;

    unsafe {
        if let Ok(_) = CreateProcessWithLogonW(
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
            None, // Environment
            match dir_utf16 {
                Some(ref d) => PCWSTR(d.as_ptr()),
                None => PCWSTR::null(),
            },
            &startup_info,
            &mut process_info,
        ) {
            // Success logic ...
            // We must close the handles returned in PROCESS_INFORMATION
            let _ = CloseHandle(process_info.hProcess);
            let _ = CloseHandle(process_info.hThread);
            
            Ok(ProcessLaunchResult {
                process_id: process_info.dwProcessId,
                thread_id: process_info.dwThreadId,
            })
        } else {
             Err(anyhow::anyhow!("CreateProcessWithLogonW failed"))
        }
    }
}

// Helper to convert to basic vector for PCWSTR ref usage
fn to_pcwstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}

// Helper for mutable PWSTR
fn to_utf16_vec(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(Some(0)).collect()
}
