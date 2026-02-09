use crate::modules::account::Account;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
pub struct AppConfig {
    pub accounts: Vec<Account>,
    pub game_path: String,
    pub last_active_account: Option<String>,
    pub theme_color: Option<String>,
    pub close_to_tray: Option<bool>,
    pub language: Option<String>,
    pub enable_logging: Option<bool>,
    pub has_shown_guide: Option<bool>,
    pub dashboard_view_mode: Option<String>,
}

#[derive(thiserror::Error, Debug)]
pub enum ConfigError {
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization Error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Path Error")]
    Path,
}

impl AppConfig {
    fn get_config_path(app: &AppHandle) -> Option<PathBuf> {
        // Resolve app data dir: e.g. %APPDATA%/com.d2rmultiplay.ui/config.json
        app.path()
            .app_data_dir()
            .ok()
            .map(|p| p.join("config.json"))
    }

    pub fn load(app: &AppHandle) -> Result<Self, ConfigError> {
        let path = Self::get_config_path(app).ok_or(ConfigError::Path)?;

        if !path.exists() {
            // Create default config if not exists
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(ConfigError::Io)?;
            }
            let default_config = AppConfig::default();
            default_config.save(app)?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(path).map_err(ConfigError::Io)?;
        let config = serde_json::from_str(&content).map_err(ConfigError::Json)?;
        Ok(config)
    }

    pub fn save(&self, app: &AppHandle) -> Result<(), ConfigError> {
        let path = Self::get_config_path(app).ok_or(ConfigError::Path)?;
        let content = serde_json::to_string_pretty(self).map_err(ConfigError::Json)?;
        fs::write(path, content).map_err(ConfigError::Io)?;
        Ok(())
    }
}
