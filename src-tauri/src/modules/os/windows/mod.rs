use super::{OSProvider, ProcessLaunchResult};
use anyhow::Result;

pub mod process;
pub mod user;
pub mod utils;
pub mod maintenance;

pub struct WindowsProvider;

impl OSProvider for WindowsProvider {
    fn get_whoami(&self) -> String {
        whoami::username().unwrap_or_else(|_| std::env::var("USERNAME").unwrap_or_else(|_| "unknown".into()))
    }

    fn list_local_users(&self) -> Result<Vec<user::WindowsUser>> {
        user::list_local_users()
    }

    fn create_user(&self, username: &str, password: &str, never_expires: bool) -> Result<()> {
        user::create_user(username, password, never_expires)
    }

    fn set_password_never_expires(&self, username: &str, never_expires: bool) -> Result<()> {
        user::set_password_never_expires(username, never_expires)
    }

    fn reset_password(&self, username: &str, password: &str) -> Result<()> {
        user::reset_password(username, password)
    }

    fn verify_password(&self, username: &str, password: &str) -> Result<bool> {
        user::verify_password(username, password)
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
        process::create_process_with_logon(
            username,
            domain,
            password,
            application_path,
            command_line,
            current_directory,
        )
    }

    fn is_process_running_for_user(&self, sys: &sysinfo::System, username: &str, process_names: &[&str]) -> Result<bool> {
        process::is_process_running_for_user(sys, username, process_names)
    }

    fn get_multiple_process_status(
        &self, 
        sys: &sysinfo::System,
        usernames: &[String], 
        bnet_names: &[&str], 
        d2r_names: &[&str]
    ) -> Result<std::collections::HashMap<String, crate::modules::account::types::AccountStatus>> {
        process::get_multiple_process_status(sys, usernames, bnet_names, d2r_names)
    }

    fn is_user_initialized(&self, username: &str) -> bool {
        user::is_user_initialized(username)
    }
}
