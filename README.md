# D2R Multi — Diablo II: Resurrected Multi-Box Manager

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.6.6-orange)
![Backend](https://img.shields.io/badge/backend-Rust-red)
![Framework](https://img.shields.io/badge/framework-Tauri_v2-blue)

**English** | [简体中文](./README_CN.md)

</div>

D2R Multi is a secure, high-performance **multi-boxing / multi-account manager** for *Diablo II: Resurrected*, built with **Rust + Tauri v2** using native Windows APIs for process-level isolation and automation.

![Dashboard](doc/images/01-overview.jpg)

> 📖 Full illustrated guide: [**User_Guide.md**](./User_Guide.md) (bilingual, EN/CN).

---

## What It Does

- **Multi-box on one PC**: run several D2R instances simultaneously.
- **One-click account switching**: log into each Battle.net account once, then launch on demand — persistent logins, zero cross-contamination.
- **Sequenced auto-launch**: save a launch order as a preset and bring up all accounts in one click.
- **Clean isolation**: each account is bound to its own Windows user; login state, config, and cache stay separate.

### Launch & status at a glance

The dashboard manages every account in card or list view. Blue dot = Battle.net online, green dot = D2R online; when a conflict is detected the buttons switch to an amber **Force** mode.

![List view](doc/images/08-dashboard-list.jpg)

![Launch buttons](doc/images/09-launch-buttons.jpg)

### Sequenced auto-launch

Store your usual order as a preset (P1–P3) and hit play: accounts launch in queue order while an always-on-top mini window tracks progress. When everything is up, one click on **Finish & Back Up** snapshots the last account.

![Sequence presets](doc/images/10-sequence-presets.jpg)

![Finish & Back Up](doc/images/20-sequencer-save.jpg)

### A complete manual toolbox

For the edge cases automation can't reach (leftover handles, broken ACLs, stuck processes): a handle-level process explorer, instance-lock cleanup, folder-permission repair, environment diagnostics, and more.

![Tools](doc/images/13-tools-overview.jpg)

---

## Quick Start

1. **Prepare**: Windows 10/11 x64; Battle.net installed at the default `C:\Program Files (x86)\Battle.net` with "install for all users" checked.
2. **Run**: right-click `d2r-rust.exe` → "Run as administrator".
3. **Add accounts**: Accounts → Add; bind (or create) a local Windows user and enter its password.
4. **Launch**: back on the dashboard, select an account → "Launch Game". Log into Battle.net once on first launch; it persists afterwards.
5. **Multi-box**: select another account and launch again — the instance lock is cleared automatically.

> ⚠️ **The last account you launch needs a manual "Save Snapshot"** (auto-backup only happens at the *next* launch, and the last one has none). See the guide's [§4.5](./User_Guide.md).

![Account manager](doc/images/05-account-manage.jpg)

---

## How It Works (Short Version)

### 1. Login persistence — Windows multi-user isolation

Battle.net stores credentials inside each Windows user's profile. The tool binds each slot to a local user and starts Battle.net as that user via `CreateProcessWithLogonW` — credentials stay isolated and persistent by construction.

### 2. Why local accounts only

Cross-user launch APIs authenticate against the local SAM: **local accounts ✅**; Microsoft accounts ❌ (cloud auth is incompatible); domain accounts ❌ (no domain controller at home).

### 3. The two multi-boxing moves

- **Instance-lock cleanup**: on launch D2R creates a kernel object named `DiabloII Check For Other Instances` (an **Event**) to block second instances; the tool closes it before each new launch.
- **product.db snapshot rotation**: that file is **machine-global** (read live by Battle.net's Agent) and does not follow users. Launch sequence: `back up current snapshot → kill Battle.net + Agent → inject the target account's snapshot → start Battle.net as the target user`, keeping path configs from cross-contaminating.

### 4. Data persistence & redirection

The data root can be redirected off the system drive (`data_path.txt` or via Settings), with a DPAPI credential re-encryption migration engine and Vault health monitoring — built for cybercafé-style C-drive-reset environments.

> Deeper mechanics (double-online, managed vs advanced mode, diagnostics) are in [Chapter 4 of the guide](./User_Guide.md).

---

## Requirements

- Windows 10/11 (x64)
- **Administrator privileges** (user creation and cross-user launches)
- Battle.net at the default path, installed "for all users"
- Multi-box slots must use **standard local Windows accounts** (no Microsoft/domain accounts)

---

## 🛠️ Technical Manifest

For developers and AI agents, this repository contains a comprehensive **Digital Twin** of the system architecture and operational protocols.

Detailed specifications live in the [**Technical State Manifest (doc/state/MANIFEST.md)**](./doc/state/MANIFEST.md): architecture (concurrency models and Win32 abstraction), security (DPAPI encryption and memory redaction), protocols (Atomic Swap and lock scavenging), and orchestration (launch state machine and anchor learning).

## Tech Stack

- **Backend**: Rust — native Win32 API (windows-rs)
- **Frontend**: React 19 + TypeScript + TailwindCSS
- **Framework**: Tauri v2
- **Core**: cross-user process bridge, instance-lock probe, config snapshot rotation

## Disclaimer

This tool is for educational and personal convenience purposes only.

- Always comply with the game publisher's Terms of Service (ToS).
- Use at your own risk. The authors are not responsible for any consequences.

## Changelog

See [**CHANGELOG.md**](./CHANGELOG.md)

## License

MIT License.
