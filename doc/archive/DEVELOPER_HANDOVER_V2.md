# Developer Handover: D2R Multiplay v2.6.0

## 1. Core Architecture (Safe Rotation)
The primary function of this app is to swap `product.db` (Battle.net persistent data) to switch accounts without actually knowing the account credentials.

### File Swap Logic (`src-tauri/src/modules/account.rs`)
- **Mutex Handle**: The app scans for and closes `DiabloII Check For Other Instances` handles to allow multiple instances.
- **Strict Deletion**: Before swapping, the current `product.db` **MUST** be deleted to prevent data corruption. If the file is locked, the launch sequence aborts.
- **Atomicity**: If a swap fails midway, a rollback is attempted (restoring the previous backup).

## 2. Frontend State & UI (`src/`)
- **State Management**: Root level state in `App.tsx` (using `useState` and `useEffect`). Config is fetched from the Rust backend via Tauri commands.
- **UI Components**: Primarily vanilla React + Tailwind CSS. 3rd party UI libraries like `shadcn` are not used to keep the "Imperial Gold" custom aesthetic pure.
- **Drag-and-Drop**: Implemented using `@dnd-kit`. Reordering logic is centralized in `App.tsx` and persisted to `config.json` via Rust.

## 3. Data Model Changes (v2.6)
- **Removed**: `region` (String).
- **Added**: `avatar` (Option<String>). 
    - Internal library IDs (e.g., "Ama", "Sor") are stored as short strings.
    - Custom uploads are stored as full **Base64** strings.

## 4. Internationalization
- Handled via `i18n-next`.
- Translation files are located in `src/i18n.ts` (currently an inline object for simplicity).

## 5. Build Pipeline
- **Command**: `npm run tauri build`
- **Output**: Pure portable binary. 
- **Icons**: Handled by Tauri (located in `src-tauri/icons`).

## 6. Critical Warnings
- **DO NOT** use command line arguments for the game (detected by Blizzard).
- **DO NOT** use DLL injection (detected by Blizzard).
- **DO NOT** kill the Game Client process automatically (bad UX). Only kill the Launcher/Agent.
