# SPEC: Persistence Integrity & Atomic Alignment Protocol

This document defines the computational logic for data persistence and environment alignment within the `d2r-rust` project. It provides the exact state transitions for the **Atomic Swap Protocol** and the **Rescue Engine**.

---

## 1. Atomic Swap Protocol (Stability Standard)

To ensure that a system crash or power loss never results in a corrupted or empty configuration file, every write operation follows a 5-step transactional pattern.

### 1.1 Commit State Machine (`AppConfig::save`)

The following logic is executed sequentially. If any step fails, the operation is retried up to **5 times** with an **Exponential Backoff** ($100 * 2^n \text{ ms}$).

| Step | Operation | Technical Detail | Purpose |
| :--- | :--- | :--- | :--- |
| **1** | **Prepare** | `serde_json::to_string_pretty(&self)` | Serialize current memory state to a buffer. |
| **2** | **Lock** | `fd_lock::RwLock::try_write()` | Acquire an advisory lock on `config.lock`. |
| **3** | **Stage** | `fs::write("config.json.tmp", content)` | Write payload to a temporary staging file. |
| **4** | **Archive** | `fs::copy("config.json", "config.json.bak")` | Create a redundant fallback of the *known good* state. |
| **5** | **Commit** | `fs::rename("config.json.tmp", "config.json")` | Atomic OS-level move (POSIX/Win32 guarantee). |

### 1.2 Resource Alignment (`file_swap.rs`)
The system manages the Battle.net registry (`product.db`) using the same **Stage-Archive-Commit** cycle to ensure that the game client always sees a valid, account-specific login session.

---

## 2. Automated Snapshot Rescue Engine

The **Rescue Engine** is a heuristic-based logic patch implemented in v0.6.0 to handle migration scenarios where account SIDs may have changed (e.g., OS reinstall or ID generation shift).

### 2.1 Technical Heuristics
Located in `AppConfig::run_snapshot_migration`, the algorithm follows this extraction logic:

1. **Source Discovery**: 
    - Loads `config.json.bak` (The "Historical Record").
    - Extracts the `win_user` -> `old_id` mapping.
2. **Entropy Matching**: 
    - Maps `win_user` from the historical record to the *current* active `id` in `config.json`.
3. **Physical Migration**:
    - Scans `snapshots/product_{old_id}.db`.
    - If found and `product_{current_id}.db` is missing, executes a copy operation.
    - Emits `logs.config.rescue_success` with a JSON payload for diagnostic tracking.

---

## 3. Advisory Locking & Conflict Resolution

### 3.1 Persistence Safety Probes
Before any alignment operation, the **Pre-flight Auditor** executes the following:

```rust
pub fn verify_config_writable() -> Result<(), FileSwapError> {
    // Attempt to open with exclusive access
    fs::OpenOptions::new().read(true).write(true).open(path)
}
```

### 3.2 Conflict Matrix (Code 32)
If `fs::OpenOptions` returns an error containing string "32" or "sharing", the logic enters a **Blocked State**:
1. **Frontend Hook**: `useLaunchSequence` detects the `CONFLICT` error string.
2. **User Intervention**: Displays a blocking modal with "Kill and Continue" (Process termination) or "Manual" options.
3. **Resolution**: Backend triggers `process_killer::kill_battle_net_processes` before re-attempting the Swap Protocol.

---

**Technical Compliance**: `src-tauri/src/modules/config.rs`, `src-tauri/src/modules/file_swap.rs`  
**Quality Level**: Transactional Integrity (ACID-lite)
