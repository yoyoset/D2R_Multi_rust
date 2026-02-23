# D2R Multiplay (Rust Edition)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.5.0-orange)
![Backend](https://img.shields.io/badge/backend-Rust-red)
![Framework](https://img.shields.io/badge/framework-Tauri_v2-blue)

**English** | [简体中文](./README_CN.md)

</div>

**D2R Multiplay** is a secure, high-performance multi-boxing manager for *Diablo II: Resurrected*.

This project is an industrial-grade **Rust rewrite** of the original C# tool, delivering extreme performance and robust system stability.

## 🚀 Key Features

- **🛡️ Isolation Engine**: Launches game clients using Windows User sandboxing for absolute environment and config separation.
- **⚡ Surgical Mutex Cleanup**: Zero-latency global mutex manipulation (`DiabloII Check For Other Instances`) to bypass multi-instance restrictions.
- **🏥 Infrastructure Health Check**: Proactive verification of Battle.net paths, directory permissions, and sandbox profiles to eliminate 90% of launch errors.
- **🎨 Progressive UI**: 3-tier color states (Green/Yellow/Orange) providing granular feedback on the execution depth of Battle.net and Game processes.
- **🔧 Intelligent Config Rotation**: Manages `product.db` rotation to ensure each account retains its own login token without password re-entry.
- **📂 Portable & Lightweight**: Single executable release with zero dependencies. Rebuilt with Rust/Tauri to replace the heavy .NET runtime.

## 📸 Screenshots

<div align="center">

### 1. Account Sanctum (Main Dashboard)

![Account Sanctum](./assets/d2r-desboard.jpg)
*3-tier color feedback: Green (Ready), Yellow (Bnet Active), Orange (Game Active)*

### 2. Interactive Tools

![Toolbox](./assets/tools.jpg)
*Built-in Infrastructure Health Check and Advanced Process Explorer*

</div>

## 🛠️ Logic Integrity & Manual Intervention

To ensure 100% availability in complex Windows environments, MDM incorporates advanced error-compensation logic:

1. **Automated Cycle**: The engine automatically attempts to fix permissions, clean up orphaned processes, and clear dormant mutexes.
2. **Manual Override Points**: When automation hits OS edge cases (e.g., handles locked by kernel), the built-in **"Manual Process Explorer"** and **"Quick Fix Tools"** allow users to intervene with zero technical barrier.
3. **Silent Background Sync**: Refined polling ensures real-time status updates with a silent UI refresh that never interrupts your workflow.

## 📦 Quick Start

### Requirements

- Windows 10/11 (x64)
- **Administrator Privileges** (Required for UAC delegation)

### Installation

1. Download the latest release from the [Releases](./CHANGELOG.md) page (or see [Changelog](./CHANGELOG.md)).
2. Run `d2r-rust.exe` to begin configuration.

## 🛠️ Technology Stack

- **Backend**: Rust (Native Win32 API, windows-rs crate)
- **Frontend**: React 19, TypeScript, TailwindCSS (v4 logic), ShadCN/ui
- **Capabilities**: Tauri v2, Cross-user Process Bridge, Handle Probe Engine

## ⚠️ Disclaimer

This tool is for educational and personal convenience purposes only.

- Always comply with the Terms of Service (ToS) of the game publisher.
- Use at your own risk. The authors are not responsible for any consequences.

## 📝 Update History

For detailed iteration notes, please see: [**CHANGELOG.md**](./CHANGELOG.md)

## 📝 License

MIT License.
