# D2R Multiplay (Rust Edition)

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.3.6-orange)
![Backend](https://img.shields.io/badge/backend-Rust-red)
![Framework](https://img.shields.io/badge/framework-Tauri_v2-blue)

**English** | [简体中文](./README_CN.md)

</div>

**D2R Multiplay** is a secure, high-performance multi-boxing manager for *Diablo II: Resurrected*.

This project is a lightweight **Rust rewrite** of the original C# version. It significantly reduces the application size and resource footprint while maintaining robust functionality.

## 🚀 Key Features

- **🛡️ Isolation Engine**: Launches game clients using Windows User sandboxing.
- **⚡ Zero-Latency Capture**: Uses Win32 Mutex manipulation to bypass multi-instance restrictions.
- **LIGHTWEIGHT**: Rebuilt with Rust and Tauri to replace the heavy .NET runtime of the original C# version.
- **🔧 Config Swapping**: Intelligent `product.db` rotation ensures each account saves its own login token.
- **🌍 Internationalization (i18n)**:
  - Full UI support for Chinese (Simplified/Traditional), English, Japanese, and Korean.
  - System Tray menu automatically syncs with app language.
- **🎨 Minimalist UI**: Modern, efficient interface focused on core interaction.
- **📂 Portable**: Single executable "Green" release. No installation required.

## 🛠️ Technology Stack

- **Backend**: Rust (Win32 API, Windows crate, Serde)
- **Frontend**: React 19, TypeScript, TailwindCSS, ShadCN
- **Capabilities**: Tauri v2, System Tray, Process Management, **Blocking Notification System**, **Atomic Log Tracing**

## 📦 Installation & Usage

### Method 1: Portable (Recommended)

1. Download `d2r-rust.exe` from the Releases page.
2. Place it anywhere (e.g., desktop).
3. Run as **Administrator** (Required for process isolation).

### Method 2: Build from Source

Ensure you have [Rust](https://rustup.rs/) and [Node.js](https://nodejs.org/) installed.

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/d2r-rust.git
cd d2r-rust

# 2. Install dependencies
npm install

# 3. Development Mode (Hot Reload)
npm run tauri dev

# 4. Build Release (Portable EXE & MSI)
npm run tauri build
```

The output executables will be in `src-tauri/target/release/`.

## ⚙️ Configuration

- Application Config: `%APPDATA%/com.d2rmultiplay.ui/config.json`
- Account Snapshots: `%APPDATA%/com.d2rmultiplay.ui/snapshots/`

## ⚠️ Disclaimer

This tool interacts with the operating system's process management and file system to facilitate multi-instance gaming.

- Use at your own risk.
- Always comply with the terms of service of the game publisher.

## 📝 License

MIT License.
