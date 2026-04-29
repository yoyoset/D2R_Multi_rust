# SPEC: Launch Orchestration & Operational State Machine

This document specifies the chronological execution model and the "Anchor" verification system used to orchestrate isolated game sessions in the `d2r-rust` project.

---

## 1. The "Anchor" Auto-Learning System

The system uses a "Passive Fingerprinting" logic to automatically learn and verify account configurations without requiring manual user input for every path.

### 1.1 Discovery Heuristics
During the pre-launch environment scan, the system executes the following validation:
1. **User Matching**: Finds all processes named `D2R.exe` and resolves their owner SID.
2. **Path Capture**: If a process belongs to a managed user but the `game_path` in `config.json` is null or different, the system **captures** the full physical path from the process execution block.
3. **Commit**: Updates the account registry immediately. This ensures that even if a user moves their game folder, the application "Self-Heals" by observing the next manual launch.

---

## 2. 4-Phase Chronological Execution (`launcher.rs`)

The `launch_game` function implements a strict transactional sequence to prevent profile cross-contamination.

### Phase 1: Pre-flight Audit & Snapshot Protect
- **Logic**: Iterates all accounts in the registry.
- **Action**: If an account is currently "Online" (PID exists for its user), the system triggers an immediate **Rotation Save** (`file_swap::rotate_save`) to ensure the latest progress is backed up before any environment changes occur.

### Phase 2: Environment Neutralization (The Cleanse)
- **Action 1 (Process)**: Terminates all running instances of `Battle.net.exe` and `Agent.exe` using `TerminateProcess`.
- **Action 2 (Hardware)**: Executes the **Mutex Sanitizer** to clear kernel instance locks.
- **Action 3 (Permissions)**: Invokes the **Permission Fixer** (via `icacls`) to ensure the target guest user has full read/write access to the game directory.

### Phase 3: Alignment & Data Injection
- **Logic (Atomic cleanup)**: Deletes the active `%ProgramData%\Battle.net\Agent\product.db`.
- **Logic (Injection)**: Copies the selected account's snapshot (`product_{id}.db`) to the active position.
- **Validation**: Performs the `verify_config_writable` probe to ensure the injection succeeded and is not locked by the OS.

### Phase 4: Guest Session Spawning
- **Strategy Selection**:
    - **Current User**: Standard `spawn()`.
    - **Guest User**: Win32 `CreateProcessWithLogonW`.
- **Logon Profile**: Uses `LOGON_WITH_PROFILE` to ensure Windows loads the user's specific environment variables and registry hives, which are critical for the game's shader cache and settings.

---

## 3. Conflict Resolution Matrix

The system maps Win32 error codes to high-level UI resolution flows in `useLaunchSequence.ts`:

| Technical State | Root Cause | Resolution Pathway |
| :--- | :--- | :--- |
| `ERROR_SHARING_VIOLATION` | Battle.net Agent file lock | Trigger "Kill Active Bnet" modal. |
| `Vault entry not found` | DPAPI missing `secret.bin` | Redirect to Account Editor for Re-Auth. |
| `USER_UNINITIALIZED` | Target guest user profile missing | Trigger "Switch User" guide. |
| `BNET_NOT_FOUND` | Registry path invalid | Trigger "Manual Select" browser. |

---

**Technical Compliance**: `src-tauri/src/modules/account/launcher.rs`, `src-tauri/src/modules/os/windows/utils.rs`  
**Quality Level**: Multi-Tenant Execution Management
