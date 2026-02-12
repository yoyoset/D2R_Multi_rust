use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize, Debug, Clone)]
pub struct InfraHealthReport {
    pub is_bnet_all_users: bool,
    pub agent_config_writable: bool,
    pub bnet_path_valid: bool,
    pub sandbox_profiles_ready: Vec<(String, bool)>,
}

pub fn get_infra_health(accounts: &[crate::modules::account::Account]) -> InfraHealthReport {
    let bnet_path = crate::modules::account::get_bnet_path();
    let is_bnet_all_users = if let Some(path) = &bnet_path {
        path.to_string_lossy()
            .to_lowercase()
            .contains("program files")
    } else {
        false
    };

    // Check Agent config directory (Usually C:\ProgramData\Battle.net)
    let agent_dir = PathBuf::from("C:\\ProgramData\\Battle.net");
    let agent_config_writable = is_dir_writable(&agent_dir);

    // Check each account's sandbox root
    let mut sandbox_profiles_ready = Vec::new();
    for acc in accounts {
        let ready = if let Ok(profile_path) =
            crate::modules::os::windows::user::get_user_profile_path(&acc.win_user)
        {
            profile_path.join("AppData").join("Local").exists()
        } else {
            false
        };
        sandbox_profiles_ready.push((acc.win_user.clone(), ready));
    }

    InfraHealthReport {
        is_bnet_all_users,
        agent_config_writable,
        bnet_path_valid: bnet_path.is_some(),
        sandbox_profiles_ready,
    }
}

fn is_dir_writable(path: &PathBuf) -> bool {
    if !path.exists() {
        return false;
    }
    // Simplistic check for write permission by trying to create a temp file
    let temp_file = path.join(".health_check_probe");
    match std::fs::File::create(&temp_file) {
        Ok(_) => {
            let _ = std::fs::remove_file(temp_file);
            true
        }
        Err(_) => false,
    }
}
