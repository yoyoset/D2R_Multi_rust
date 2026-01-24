# D2RMultiplay (Rust Edition)

Next-generation multi-boxing tool for Diablo II: Resurrected, powered by Rust & Tauri.

## Features
- **Zero-Dependency**: No .NET Runtime required.
- **Isolation Engine**: Robust mutex handling via direct Win32 API calls.
- **Modern UI**: Imperial Gold theme built with React + TailwindCSS.

## Development

### Prerequisites
- Rust (latest stable)
- Node.js (v20+)

### Setup
```bash
npm install
```

### Run
```bash
# Development Mode (Hot Reload)
npm run tauri dev

# Build for Production
npm run tauri build
```

## Architecture
- `src-tauri/src/modules/win32_safe`: Core Win32 API integration.
- `src/components`: React UI components.
