use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use anyhow::{Result, anyhow};
use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN,
};
use windows::Win32::Foundation::{HLOCAL, LocalFree};
use windows::core::PCWSTR;

/// Credentials Vault: Responsible for physical encrypted storage for each account
pub struct Vault;

impl Vault {
    /// Get account-specific storage path: %APPDATA%/userData/accounts/{id}/
    pub fn get_account_dir(app: &AppHandle, account_id: &str) -> Result<PathBuf> {
        let path = app.path().app_data_dir()?
            .join("accounts")
            .join(account_id);
        
        if !path.exists() {
            fs::create_dir_all(&path)?;
        }
        Ok(path)
    }

    /// Encrypt password and redirect to independent file
    pub fn save_password(app: &AppHandle, account_id: &str, password: &str) -> Result<()> {
        let encrypted = Self::encrypt_dpapi(password.as_bytes())?;
        let path = Self::get_account_dir(app, account_id)?.join("secret.bin");
        fs::write(path, encrypted)?;
        Ok(())
    }

    /// Read and decrypt password from vault
    pub fn load_password(app: &AppHandle, account_id: &str) -> Result<String> {
        let path = Self::get_account_dir(app, account_id)?.join("secret.bin");
        if !path.exists() {
            return Err(anyhow!("Vault entry not found for {}", account_id));
        }
        
        let encrypted = fs::read(path)?;
        let decrypted = Self::decrypt_dpapi(&encrypted)?;
        
        String::from_utf8(decrypted).map_err(|e| anyhow!("Invalid UTF-8 in vault: {}", e))
    }

    /// Check if vault entry (secret.bin) exists for account
    pub fn exists(app: &AppHandle, account_id: &str) -> bool {
        Self::get_account_dir(app, account_id)
            .map(|p| p.join("secret.bin").exists())
            .unwrap_or(false)
    }

    /// Physically destroy vault data
    #[allow(dead_code)]
    pub fn delete_vault(app: &AppHandle, account_id: &str) -> Result<()> {
        let path = Self::get_account_dir(app, account_id)?;
        if path.exists() {
            fs::remove_dir_all(path)?;
        }
        Ok(())
    }

    /// Windows DPAPI Encryption (Data bound to current Windows user)
    fn encrypt_dpapi(data: &[u8]) -> Result<Vec<u8>> {
        let data_in = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_ptr() as *mut u8,
        };
        let mut data_out = CRYPT_INTEGER_BLOB::default();

        unsafe {
            if CryptProtectData(
                &data_in,
                PCWSTR::null(),
                None, // entropy
                None, // reserved
                None, // prompt
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut data_out,
            ).is_ok() {
                let result = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec();
                let _ = LocalFree(Some(HLOCAL(data_out.pbData as _)));
                Ok(result)
            } else {
                Err(anyhow!("DPAPI Encryption Failed: {}", windows::Win32::Foundation::GetLastError().0))
            }
        }
    }

    /// Windows DPAPI Decryption
    fn decrypt_dpapi(data: &[u8]) -> Result<Vec<u8>> {
        let data_in = CRYPT_INTEGER_BLOB {
            cbData: data.len() as u32,
            pbData: data.as_ptr() as *mut u8,
        };
        let mut data_out = CRYPT_INTEGER_BLOB::default();

        unsafe {
            if CryptUnprotectData(
                &data_in,
                None, // description
                None, // entropy
                None, // reserved
                None, // prompt
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut data_out,
            ).is_ok() {
                let result = std::slice::from_raw_parts(data_out.pbData, data_out.cbData as usize).to_vec();
                let _ = LocalFree(Some(HLOCAL(data_out.pbData as _)));
                Ok(result)
            } else {
                Err(anyhow!("DPAPI Decryption Failed: {}", windows::Win32::Foundation::GetLastError().0))
            }
        }
    }
}
