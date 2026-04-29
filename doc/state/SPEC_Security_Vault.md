# SPEC: Security Vault & Hardware-Bound Protection

This document specifies the technical implementation of credential security and sensitive data isolation within the `d2r-rust` project. It defines the physical storage layout and the memory-resident lifecycle of secrets.

---

## 1. Hardware-Bound Encryption (Win32 DPAPI)

The system utilizes the Windows **Data Protection API** (DPAPI) to ensure that credentials are cryptographically bound to the specific OS installation and user profile.

### 1.1 Encryption Parameters (`modules/vault.rs`)
The `Vault::encrypt_dpapi` logic utilizes the following parameters for `CryptProtectData`:
- **Flag**: `CRYPTPROTECT_UI_FORBIDDEN`. Disables any OS-level UI prompts, ensuring a seamless background service experience.
- **Description**: None (Null PCWSTR).
- **Entropy**: None (managed solely by the OS user master key).
- **Binding**: The resulting blob can *only* be decrypted on the same PC by the same Windows user.

### 1.2 Binary Storage Mapping
Credentials are physically isolated from the application registry to prevent accidental exposure during config backups.
- **Root Path**: `%APPDATA%/userData/accounts/{id}/`
- **Payload**: `secret.bin` (Encrypted binary blob).

---

## 2. Zero-Trust Memory Lifecycle

To minimize the "Attack Surface" in memory, the system enforces a strict **Load-Execute-Drop** lifecycle for decrypted passwords.

### 2.1 The "Spawn" Window
Passwords exist in plaintext memory for the shortest possible duration:
1. **Trigger**: `launcher::launch_game` is called via Tauri IPC.
2. **Decryption**: `Vault::load_password` decrypts the blob into a `String`.
3. **Execution**: The `String` is passed to the `create_process_with_logon` Win32 wrapper.
4. **Eviction**: The `String` is dropped immediately after the successful (or failed) `CreateProcessWithLogonW` call.

### 2.2 Redaction Filter (`AppConfig::redacted`)
The system uses a **Serialization Proxy** to ensure that sensitive data never escapes the Rust backend.
- **Logic**: The `redacted()` method clones the `AppConfig` and replaces all `win_pass` fields with the literal string `********`.
- **Enforcement**: This redacted clone is used for all UI updates and non-critical logging.

---

## 3. Security Boundary Diagnostics

### 3.1 Vault Integrity Audit (`checkVaultIntegrity`)
The system performs a "Pulse Check" on the physical vault state during every application boot:
- **Verification**: Checks for the existence of `secret.bin` for every account in the registry.
- **Feedback**: If an account is missing its vault entry (common after manual migration), the UI updates its status to "Invalid/Re-auth Required".

### 3.2 Privilege Sanitation (`win_admin.rs`)
- The system checks for "Admin" status to ensure it can enable `SE_DEBUG_NAME`.
- If running as a standard user, the system prompts for elevation only when "Industrial" features (like kernel handle closure) are requested.

---

**Technical Compliance**: `src-tauri/src/modules/vault.rs`, `src-tauri/src/modules/win_admin.rs`  
**Quality Level**: Commercial Grade Data Privacy
