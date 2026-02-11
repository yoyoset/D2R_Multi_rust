# Technical Archive: Launch Sequence Logic Details

This document provides a detailed breakdown of the launch sequence logic used in D2R Multiplay. It covers both "One-click Start (Green)" and "Bnet Client Only (Blue)" modes.

## 1. Shared Foundation

Since Battle.net stores user login states in a global path (`%ProgramData%\Battle.net\Agent\product.db`), any "Account Swapping" logic must follow these core steps to ensure success:

1. **Environment Cleanup**: Terminate all `Battle.net.exe` and `Agent.exe` processes. This is mandatory to unlock the configuration file for replacement.
2. **Identity Rotation (File Swap)**:
    - Backup the current `product.db` to the snapshot folder of the previous account.
    - Restore the `product.db` snapshot for the target account into the global ProgramData directory.
3. **Identity Repair (Fix 0x80070532)**:
    - **Policy Refresh**: Force the Windows user account "Password never expires" flag.
    - **Password Reset**: Reset the password to the recorded value. This clears the "User must change password on next logon" flag that Windows might trigger after long periods of inactivity.

---

## 2. Mode Comparison

### 🟢 One-click Start (Green Mode)

**Goal**: Swap identity AND clear all obstacles for multi-boxing.

| Step | Operation | Purpose |
| :--- | :--- | :--- |
| 1 | Terminate Bnet Processes | Unlocks the configuration file. |
| 2 | **Clear Mutexes** | **Critical**: Closes the `\BaseNamedObjects\DiabloII Check For Other Instances` handle in existing `D2R.exe` processes. This allows a new instance to start WITHOUT killing existing ones. |
| 3 | Backup/Restore Config | Implements the login token swap. |
| 4 | Policy Refresh/Reset | Ensures Windows credentials pass verification without prompts. |
| 5 | Create Isolated Process | Spawns Battle.net under the target Windows User's identity. |

### 🔵 Bnet Client Only (Blue Mode)

**Goal**: Rapidly swap identity with minimal system interference.

| Step | Operation | Purpose |
| :--- | :--- | :--- |
| 1 | Terminate Bnet Processes | Unlocks the configuration file. |
| 2 | **Skip Mutex Clearing** | Saves time and avoids unnecessary process scanning. |
| 3 | Backup/Restore Config | Implements the login token swap. |
| 4 | Policy Refresh/Reset | Ensures a robust logon environment. |
| 5 | Create Isolated Process | Spawns Battle.net under the target Windows User's identity. |

---

## 3. Q&A

- **Why must Battle.net be terminated?**
    If left running, the `product.db` file is locked, and replacement will fail. You would open Battle.net only to find the previous user still logged in.
- **Why can the Green button multi-box without killing games?**
    The game checks for a specific "Mutex" when starting. We use a handle-closing technique to "trick" the new game instance into thinking no other instances are running.
- **What is the performance overhead?**
    The main overhead is running multiple Battle.net clients (~200MB RAM each) and the game itself. The identity swap logic is calculated in milliseconds.
