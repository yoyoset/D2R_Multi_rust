use anyhow::Result;
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct ProcessLaunchResult {
    pub process_id: u32,
    pub thread_id: u32,
}

pub trait OSProvider: Send + Sync {
    fn get_whoami(&self) -> String;
    fn list_local_users(&self, include_registry: bool) -> Result<Vec<String>>;
    fn create_user(&self, username: &str, password: &str, never_expires: bool) -> Result<()>;
    fn set_password_never_expires(&self, username: &str, never_expires: bool) -> Result<()>;
    fn reset_password(&self, username: &str, password: &str) -> Result<()>;
    fn create_process_with_logon(
        &self,
        username: &str,
        domain: Option<&str>,
        password: &str,
        application_path: &str,
        command_line: Option<&str>,
        current_directory: Option<&str>,
    ) -> Result<ProcessLaunchResult>;
}

pub mod windows_impl;
