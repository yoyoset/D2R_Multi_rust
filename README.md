# D2R Multi — Diablo II: Resurrected Multi-Box Manager

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.6.0-orange)
![Backend](https://img.shields.io/badge/backend-Rust-red)
![Framework](https://img.shields.io/badge/framework-Tauri_v2-blue)

**English** | [简体中文](./README_CN.md)

</div>

D2R Multi is a secure, high-performance multi-boxing manager for *Diablo II: Resurrected*, built with **Rust + Tauri v2** using native Windows APIs for process-level isolation and automation.

---

## How It Works

### 1. Login Persistence — Windows Multi-User Isolation

Battle.net stores login credentials (tokens, cookies, etc.) within each Windows user's profile directory. Different Windows users naturally maintain completely independent Battle.net login states.

**This tool leverages that behavior:**

1. **Create Local Users** — A standard Windows local account is created for each multi-box slot.
2. **Cross-User Launch** — Battle.net is launched under the target user's identity via the Win32 API `CreateProcessWithLogonW`.
3. **Natural Isolation** — Battle.net automatically reads that user's own credential store. No extra handling needed.

> **Result**: Each account only needs to log into Battle.net once, then stays logged in long-term. Credentials are automatically protected by Windows user isolation — truly persistent, zero-maintenance memory.

---

### 2. Why Local Accounts Only

This tool uses `CreateProcessWithLogonW` / `LogonUserW` to launch processes under a different user identity. These APIs rely on Windows Local Security (SAM) and have strict account type requirements:

| Account Type | Supported | Reason |
|-------------|-----------|--------|
| **Local Account** | ✅ Fully supported | Password stored in Local SAM database, directly verifiable by the API |
| **Microsoft Account** | ❌ Not supported | Password managed in the cloud. Microsoft has confirmed known compatibility issues with `CreateProcessWithLogonW` for MSA |
| **Domain Account** | ❌ Not supported | Requires an online Domain Controller (DC) for Kerberos authentication, unavailable in home environments |

**In short**: Windows cross-user launch APIs are designed for local accounts only. Microsoft and domain account authentication flows are incompatible.

---

### 3. Multi-Boxing Mechanics

D2R restricts a single game instance per machine by default. This tool bypasses the restriction through two core operations:

#### 3.1 Mutex Cleanup

D2R creates a system-level mutex named `DiabloII Check For Other Instances` on launch. A second instance detects this lock and refuses to start.

**What we do**: Before each new launch, scan and close existing D2R mutex handles so the new instance believes it is the first.

#### 3.2 Game Config (product.db) Rotation

`product.db` is a Battle.net file that stores game installation paths and configuration. Unlike login credentials, **this file is globally shared** — it does not follow Windows user profiles. Without handling it, multiple instances would conflict.

**Launch sequence:**

```
1. Backup   → Snapshot the previous account's product.db
2. Clean    → Delete the current global product.db
3. Restore  → Restore the target account's snapshot to the global location
4. Launch   → Start Battle.net under the target Windows user identity
```

> Each account's `product.db` snapshot is managed independently. The tool auto-rotates on every switch, keeping game path configs isolated.

---

### 4. Toolbox — When Automation Hits Edge Cases

The automated launch sequence handles the vast majority of scenarios. However, in complex Windows environments, edge cases can arise (e.g., handles locked by kernel, orphaned processes, corrupted permissions). For these situations, the tool provides a complete set of standalone utilities:

#### Diagnostics (Pre-Launch Checks)

| Tool | Description |
|------|-------------|
| **Multi-User Env Eval** | Scans Windows user profiles, checks initialization status, and detects Microsoft account conflicts |
| **Permission Health Check** | Verifies game directory ACLs, Battle.net path accessibility, and sandbox readiness |

#### Standalone Tools

| Tool | Description |
|------|-------------|
| **Mutex Cleanup** | Manually scan and close D2R instance-lock handles |
| **Process Explorer** | Full handle-level inspector — browse all running processes, filter by D2R, and force-close specific handles |
| **Archive Cleanup** | Purge orphaned `product.db` snapshots |
| **Stop Battle.net** | Kill all Battle.net processes while preserving running game instances |
| **Fix Permissions** | Reset game directory ACLs to ensure all local users have proper access |
| **Mirror Manager** | Create directory junctions for client isolation in advanced multi-box setups |
| **Force Launch** | Bypass all safety checks and attempt a raw launch for debugging |
| **Nuke Reset** | Full factory reset — wipe all configs and snapshots |

#### Windows System Shortcuts

| Shortcut | Target |
|----------|--------|
| **Local Users** | Opens `lusrmgr.msc` — manage Windows local users and groups |
| **Advanced Users** | Opens `netplwiz` — configure auto-login and user-level permissions |
| **Switch User** | Triggers `tsdiscon` — fast-switch to another Windows session for account initialization |

> These tools are designed so that any edge case the automation cannot handle can be resolved manually, with zero technical barrier.

---

## Requirements

- Windows 10/11 (x64)
- **Administrator privileges** (required for user creation and cross-user launches)
- Battle.net must be installed at `C:\Program Files (x86)\Battle.net` with "Install for all users" enabled
- Multi-box slots must use **standard local Windows accounts** (Microsoft and domain accounts are not supported)

---

## 🛠️ Technical Manifest

For developers and AI agents, this repository contains a comprehensive **Digital Twin** of the system architecture and operational protocols.

Detail technical specifications can be found in the [**Technical State Manifest (doc/state/MANIFEST.md)**](./doc/state/MANIFEST.md), including:
- **Architecture**: Concurrency models and Win32 abstraction.
- **Security**: DPAPI encryption and memory redaction.
- **Protocols**: Atomic Swap (File Alignment) and Mutex Scavenging.
- **Orchestration**: Launch State Machine and Anchor Learning.

---

## Tech Stack

- **Backend**: Rust — native Win32 API (windows-rs)
- **Frontend**: React 19 + TypeScript + TailwindCSS
- **Framework**: Tauri v2
- **Core**: Cross-user process bridge, mutex probe engine, config snapshot rotation

## Disclaimer

This tool is for educational and personal convenience purposes only.

- Always comply with the game publisher's Terms of Service (ToS).
- Use at your own risk. The authors are not responsible for any consequences.

## Changelog

See [**CHANGELOG.md**](./CHANGELOG.md)

## License

MIT License.
