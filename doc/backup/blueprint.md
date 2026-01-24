# D2RMultiplay Project Blueprint
> **Role**: Source of Truth | **Status**: Active | **Enforcement**: Strict

## 1. Project Identity
- **Name**: D2RMultiplay (Rust Rewrite)
- **Core Philosophy**: **Safety First** (No Injections, No Args, No Monitoring).
- **Architecture**:
    - **Backend**: Rust (Tauri v2) - [Safe Logic Core]
    - **Frontend**: React + TypeScript + TailwindCSS - [Interaction Layer]
    - **Persistence**: `config.json` for settings & account pointers, `product.db` Rotation (File Swap).
- **v2.6 Data Model**: Removed `region`. Added `avatar` (Base64 string or ID).

## 2. Critical Logic: "Safe Rotation"
**DO NOT MODIFY WITHOUT USER APPROVAL.**
The application relies on a strict "Delete-First" strategy to switch accounts safely.

### The Flow
1.  **Launch Request** (User clicks Play).
2.  **Process Cleanup**:
    - **Terminates**: `Battle.net.exe`, `Agent.exe`, `crashpad_handler.exe` (D2R Game Client is **NOT** killed).
    - **Handle Closure**: Scans for and closes the specific mutex `DiabloII Check For Other Instances` in any lingering processes.
3.  **Backup**: If a `last_active_account` exists in config, back up the *current* `product.db` to that account's snapshot.
4.  **Strict Delete**: The application **deletes** `C:\ProgramData\Blizzard Entertainment\Battle.net\product.db`.
    - *Failure Condition*: If deletion fails (file locked by Agent/Bnet), the launch **ABORTS**.
5.  **Restore**: Copy the target account's snapshot (if exists) to `product.db`.
6.  **Launch**: execute `Battle.net.exe`.
    - **Arg Constraint**: MUST be launched with `None` (No arguments).
    - **Injection**: NONE. No DLLs, no hooks.

## 3. Directory Structure & Key Files
```text
f:/mycode/D2Rmutiplay/d2r-rust/
├── doc/
│   └── blueprint.md    <-- YOU ARE HERE. READ THIS FIRST.
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs              # Command Registry (launch_game, get_config)
│   │   ├── modules/
│   │   │   ├── account.rs      # Coordination of Logic (The Launch Flow)
│   │   │   ├── file_swap.rs    # The Safe Rotation Implementation (fs::remove_file)
│   └── tauri.conf.json         # Tauri Config
├── src/
│   ├── App.tsx                 # Main UI (Grid, Modals, Logs)
│   ├── i18n.ts                 # Localization Config (CN/TW/EN/JP/KR)
│   ├── components/             # UI Components (Imperial Gold Design)
```

## 4. Internationalization (i18n)
The project is strictly multi-lingual. Use `t('key')` for all UI text.
- **Default**: `zh-CN` (Simplified Chinese)
- **Supported**: `zh-TW`, `en`, `ja`, `ko`.

## 5. Build & Delivery
- **Output**: Portable ZIP only. No Installers.
- **Command**: `npm run tauri build`
- **Post-Process**: Compress `d2r-rust.exe` and `resources` to `d2r-rust_portable_vX.zip`.

## 6. Design Code (Imperial Gold)
- **Primary Color**: Gold (`#d4af37`), Void Black (`#09090b`).
- **Style**: Glassmorphism, Sharp Edges, High Contrast.
- **v2.6 UX**: Bento Grid (3-columns), Horizontal Density (Single-line row), DnD Reordering.
- **Rule**: No "Ugly" interfaces. Must look premium.
