# SPEC: Dependency Manifest & Environment Configuration

This document specifies the exact dependency tree and feature flags required to build the `d2r-rust` execution environment.

---

## 1. Rust Backend (Cargo.toml)

The backend utilizes **Tauri v2** with a heavy reliance on surgical Win32 bindings.

### 1.1 Core System Dependencies
| Crate | Version | Key Features | Purpose |
| :--- | :--- | :--- | :--- |
| `tauri` | `^2.10.3` | `tray-icon`, `image` | Main application framework. |
| `windows` | `0.60` | *See 1.2 below* | Direct Win32 API access. |
| `tokio` | `1.x` | `time`, `rt`, `sync` | Asynchronous runtime. |
| `parking_lot` | `0.12` | Default | High-perf Mutex/RwLock. |
| `sysinfo` | `0.33` | Default | Process and User discovery. |
| `fd-lock` | `4.0` | Default | Advisory file locking. |

### 1.2 Windows-RS Feature Flags
The following `windows` crate features must be enabled for successful compilation of the logic-locks and privilege subsystems:
- `Win32_System_Threading`, `Win32_Security`, `Win32_Security_Authorization`
- `Win32_System_Diagnostics_ToolHelp`, `Win32_System_Memory`
- `Win32_UI_WindowsAndMessaging`, `Win32_Storage_FileSystem`
- `Win32_System_RemoteDesktop`, `Win32_System_Ioctl`
- `Win32_System_SystemInformation`, `Win32_Security_Cryptography`
- `Win32_System_ProcessStatus`

---

## 2. Frontend Layer (package.json)

The frontend is a **React 19** application built on **Vite** and **TailwindCSS**.

### 2.1 UI Framework & State
- **React**: `^19.1.0` (Utilizing the latest concurrent rendering features).
- **Zustand**: `^5.0.10` (Transient UI state management).
- **i18next**: `^25.8.0` (Client-side translation bridge).
- **Lucide React**: `^0.562.0` (Iconography system).

### 2.2 Orchestration Libraries
- **@dnd-kit**: `^6.3.1` (Orchestrates the account reordering and drag-and-drop logic).
- **clsx** & **tailwind-merge**: Used for dynamic, conflict-free CSS class synthesis.

---

## 3. Build & Profile Specification

- **Release Profile**:
    - `panic = "abort"`: Ensures smaller binary size and predictable crash behavior.
    - `codegen-units = 16`: Balances build speed and optimization.
    - `strip = false`: Debug symbols are retained in the current industrial version for telemetry.

---

**Technical Compliance**: `Cargo.toml`, `package.json`  
**Quality Level**: Reproducible Build System
