# SPEC: Data Schemas & Serialization Registry

This document defines the canonical data structures and serialization contracts used to bridge the Rust core and the React frontend.

---

## 1. Domain Entities (Rust)

Located in `src-tauri/src/modules/account/types.rs` and `config.rs`.

### 1.1 `Account` Struct (The Core Identity)
```rust
pub struct Account {
    pub id: String,               // UUID v4
    pub win_user: String,         // Host Windows Username
    #[serde(skip_serializing)]    // NEVER sent to UI
    pub win_pass: Option<String>,
    pub bnet_account: String,     // Display alias
    pub note: Option<String>,     // User remarks
    pub avatar: Option<String>,   // Icon identifier
    #[serde(default = "default_true")]
    pub auto_fix_password: bool,  // Logic flag for policy sync
    pub game_path: Option<String>,// Execution override
    #[serde(default = "default_false")]
    pub skip_config_sync: bool,   // Atomic swap exclusion flag
}
```

### 1.2 `AppConfig` (Global Registry)
- **`accounts`**: `Vec<Account>`
- **`sequence_presets`**: `[Option<SequencePreset>; 3]` (Fixed-size array for deterministic UI slots).
- **`active_sequence`**: `Option<ActiveSequenceState>` (Transient persistent queue).

---

## 2. API Communication Objects

### 2.1 `AccountStatus` (Polling Payload)
Matches the real-time kernel scan results:
- `bnet_active`: `bool`
- `bnet_pid`: `Option<u32>`
- `d2r_active`: `bool`
- `d2r_pid`: `Option<u32>`

### 2.2 `LaunchLogPayload` (Event Stream)
```typescript
{
    account_id: string;
    message: string;      // i18n key or reified string
    level: "info" | "success" | "warn" | "error";
}
```

---

## 3. Error Enums & Mapping

### 3.1 `AccountError` (ThisError mapping)
| Variant | Code/Message | Protocol Meaning |
| :--- | :--- | :--- |
| `InvalidPath` | `BNET_NOT_FOUND` | Registry lookup failed or path invalid. |
| `FileSwap` | `FS_LOCK_ERROR` | Code 32 Sharing Violation detected. |
| `UserUninitialized` | `USER_UNINIT` | Target Windows profile has no hives loaded. |

---

**Technical Compliance**: `src-tauri/src/modules/account/types.rs`, `src-tauri/src/modules/config.rs`  
**Quality Level**: Strict Schema Contract
