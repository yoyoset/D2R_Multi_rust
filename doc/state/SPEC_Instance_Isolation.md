# SPEC: Instance Isolation & Resource Sanitation

This document specifies the technical implementation of multi-instance isolation and kernel-level resource sanitation within the `d2r-rust` project.

---

## 1. Mutex Sanitizer (Handle Scavenging)

To support multiple concurrent game instances, the system implements a "Surgical Closure" algorithm to remove global kernel logic locks.

### 1.1 Technical Background
The game client utilizes a global named Mutex (e.g., `DiabloII Check For Other Instances`) to prevent multiple processes from running simultaneously. The **Sanitizer** removes this lock without terminating the process.

### 1.2 The Scavenging Algorithm (`modules/account/scanner.rs` / `modules/win32_safe/mutex.rs`)
The logic involves a sequence of high-privilege Win32 kernel calls:

1. **Privilege Elevation**: Enables `SE_DEBUG_NAME` to allow handle duplication across different user accounts.
2. **System Enumeration**: Calls `NtQuerySystemInformation` with the `SystemHandleInformation` class (Code 16) to retrieve a binary blob containing all open handles in the OS.
3. **PID Filtering**: 
    - Iterates through the handle list.
    - Matches the `ProcessId` in the handle record against known active `D2R.exe` PIDs.
4. **Handle Inspection**:
    - Calls `DuplicateHandle` to bring the remote handle into the application's address space.
    - Calls `NtQueryObject` to retrieve the **Object Name** and **Type**.
5. **Signature Match**: If the Object Name contains the string `DiabloII Check For Other Instances`, the signature is verified.
6. **Surgical Closure**: Calls `DuplicateHandle` again with the **`DUPLICATE_CLOSE_SOURCE`** flag (Code 1). This causes the kernel to close the handle in the target process immediately.

---

## 2. Resource Mirroring (Reparse Point Logic)

For mod folder isolation, the system uses **Windows Junctions** (Reparse Points) to bind disparate directories into a unified structure without physical duplication.

### 2.1 Reparse Data Architecture (`modules/mirror.rs`)
The system manually constructs the Win32 `REPARSE_DATA_BUFFER` in memory:

```rust
#[repr(C)]
struct ReparseDataBufferMountPoint {
    reparse_tag: u32,       // IO_REPARSE_TAG_MOUNT_POINT (0xA0000003)
    reparse_data_length: u16,
    reserved: u16,
    substitute_name_offset: u16,
    substitute_name_length: u16,
    print_name_offset: u16,
    print_name_length: u16,
    path_buffer: [u16; 16384],
}
```

### 2.2 Alignment Protocol
1. **Target Preparation**: Creates the target directory and opens it with `FILE_FLAG_OPEN_REPARSE_POINT`.
2. **Buffer Preparation**: Calculates the NT-style path (e.g., `\??\C:\Games\D2R\Data`).
3. **Execution**: Calls `DeviceIoControl` with `FSCTL_SET_REPARSE_POINT` to commit the cross-link.

---

## 3. High-Performance Status Polling

To maintain UI responsiveness during high-frequency status updates, the system implements an optimized monitoring loop.

### 3.1 PID Owner Caching
Resolving SIDs (Security Identifiers) for every process is too expensive for a 5s polling interval.
- **Algorithm**: The system maintains a `PID_OWNER_CACHE` (`Mutex<HashMap<u32, String>>`).
- **Heuristics**: If a PID has been resolved once and is still active (`EnumProcesses` verification), the system bypasses the expensive `OpenProcessToken` and `LookupAccountSidW` chain.

---

**Technical Compliance**: `src-tauri/src/modules/os/windows/process/scanner.rs`, `src-tauri/src/modules/mirror.rs`  
**Quality Level**: Kernel-Level Resource Control
