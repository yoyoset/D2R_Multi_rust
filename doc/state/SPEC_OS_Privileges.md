# SPEC: OS Privileges & Security Context Handling

This document specifies the technical implementation of Windows privilege escalation and account context management required for industrial instance isolation.

---

## 1. Privilege Escalation (`win_admin.rs`)

The system requires specific kernel-level privileges to perform surgical handle closure across multiple user sessions.

### 1.1 `SE_DEBUG_NAME` Escalation
- **Logic**: Calls `OpenProcessToken` for the current process.
- **Action**: Uses `LookupPrivilegeValueW` for `SeDebugPrivilege` and matches it with `AdjustTokenPrivileges`.
- **Requirement**: This privilege allows the application to duplicate handles owned by processes running under a different Security Identifier (SID).

---

## 2. Windows Account Context

### 2.1 Password Policy Sync
To prevent launch failures due to expired passwords in guest accounts, the system implements an automated policy sync:
- **Algorithm**: Invokes `NetUserGetInfo` (Level 1) to retrieve the `USER_INFO_1` struct.
- **Modification**: Bitwise OR the `usri1_flags` with `UF_DONT_EXPIRE_PASSWD`.
- **Commit**: Calls `NetUserSetInfo` to persist the "Never Expires" policy.

### 2.2 Permissions Fixer (`icacls`)
Deep folder alignment requires the game directory to be accessible by guest users.
- **Technique**: Spawns `icacls` with `/grant:r *S-1-1-0:(OI)(CI)(F)` (Everyone/Full Control) or specific account SID grants.
- **Rationale**: This bypasses "Access Denied" errors when the guest account attempts to create file logs in the host user's game directory.

---

## 3. Account ID & Registry Binding

### 3.1 ID Generation
- **Logic**: Uses `uuid::Uuid::new_v4()` for account IDs.
- **Binding**: The ID serves as the unique key in the snapshot directory (`product_{id}.db`) and the secret vault. 

---

**Technical Compliance**: `src-tauri/src/modules/win_admin.rs`, `src-tauri/src/modules/os/windows/utils.rs`  
**Quality Level**: Kernel-Compliant Process Management
