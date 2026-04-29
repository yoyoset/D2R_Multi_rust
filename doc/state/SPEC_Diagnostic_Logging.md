# SPEC: Diagnostic Logging & Multi-Channel Streaming

This document specifies the implementation of the diagnostic logging engine, defining its thread-safe buffering, file rotation, and IPC streaming protocols.

---

## 1. Multi-Channel Output Strategy (`logger.rs`)

The system enforces a "Non-Blocking" logging policy to ensure that long-latency file I/O never impacts the game launch sequence or UI responsiveness.

### 1.1 Channel Distribution
| Channel | Mechanism | Capacity | Purpose |
| :--- | :--- | :--- | :--- |
| **WebView** | `tauri::Emitter` | Real-time | Live status updates in the "Console" view. |
| **History** | `Mutex<Vec<LogEntry>>` | 1,000 lines | Session-level diagnostics for UI persistence. |
| **Disk** | `std::thread` + `mpsc` | 10MB | Long-term forensic analysis. |

---

## 2. Physical Storage & Rotation Protocol

### 2.1 Industrial File Rotation
To prevent infinite disk consumption, the logger implements a **Shifting Archive** logic:
- **Trigger**: File size > 10MB.
- **Rotation Sequence**:
    1. `log_path.1` -> `log_path.2` (Eviction/Overwritten).
    2. `log_path` -> `log_path.1` (Archive).
    3. `log_path` created as a new file with a `--- Log Rotated ---` header.

### 2.2 Asynchronous Commit Logic
Logs are sent to an isolated background thread via a `sync_channel(1000)`. This thread manages the `OpenOptions::new().append(true)` operations, abstracting file system performance variances from the business logic.

---

## 3. Log Entry Schema
Each log contains a structured metadata block for precise filtering:
- **`time`**: Local time (`%H:%M:%S`).
- **`level`**: `info` | `success` | `warn` | `error`.
- **`key`**: Optional i18n key for localization auditing.
- **`message`**: Reified string (translated and dynamic args applied).

---

**Technical Compliance**: `src-tauri/src/modules/logger.rs`  
**Quality Level**: Forensic-Grade Diagnostics
