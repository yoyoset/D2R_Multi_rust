use super::{OSProvider, ProcessLaunchResult};
use anyhow::Result;

pub mod process;
pub mod user;
pub mod utils;

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
        user::list_local_users(include_registry)
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

    fn is_process_running_for_user(&self, username: &str, process_names: &[&str]) -> Result<bool> {
        process::is_process_running_for_user(username, process_names)
    }

    fn is_user_initialized(&self, username: &str) -> bool {
        user::is_user_initialized(username)
    }
}
