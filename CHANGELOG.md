# Changelog

All notable changes to this project will be documented in this file.

## [0.3.6] - 2026-02-11

### Added

- **Archive Conflict Resolution**: Interactive dialog to handle `product.db` conflicts with "Delete", "Reset", and "Cancel" options.
- **Modular Launch Hook**: Introduced `useLaunchSequence` to centralize and decouple launch business logic from UI components.

### Changed

- **UI Simplification**: Optimized "Independent Launch" layout in Tools view to prevent text overflow when a game is running.
- **I18n Modernization**: Complete audit and removal of hardcoded strings in frontend logs and errors, syncing all 5 localization files.
- **Process Monitoring**: Switched to aggressive status refesh in the backend to ensure real-time UI response when Battle.net closes.

### Fixed

- **Battle.net Status Bug**: Resolved the issue where the "Launch" button remained disabled after Battle.net was closed.
- **Snapshot Robustness**: Enhanced file swap logic to handle edge cases where restore paths might be partially corrupted or occupied.

## [0.3.5] - 2026-02-10

### Added

- **Native Title Bar**: Implementation of custom window title bar with theme-consistent controls.
- **Improved Nuke Flow**: Professional system reset modal with "yes" validation requirement.
- **Enhanced UI Aesthetics**: Swapped theme colors for better semantic clarity (Cleanup is now Red, System Tools Blue).

### Changed

- **Layout Optimization**: Realigned all tool buttons to consistent heights (h-11) and fixed spacing inconsistencies.
- **Scrolling Behavior**: Refined Dashboard scrolling priority to keep the "Launch" footer visible at all times.
- **Dimension Reversion**: Set default and minimum window size back to 800x600 for better compatibility.

### Fixed

- **Language Selector**: Resolved z-index conflicts and click-through issues with the native title bar.
- **I18n Keys**: Added missing localization strings for the advanced reset confirmation flow.

## [0.3.2] - 2026-02-10

### Added

- **Manual Tool: Language Expansion**: Enabled full support for Traditional Chinese (TW), Japanese (JA), and Korean (KO) in the UI.
- **Custom Language Selector**: Implemented a dark-mode styled custom dropdown to replace browser defaults for better UX.
- **User Guide Persistence**: Added "Don't show again" option to the User Guide modal with default checked state.
- **Process Feedback Enhancement**: "Launch" button now correctly disables if Battle.net or D2R is already active for the selected account.
- **Visual Running Indicator**: Added RUNNING status badge when an account is active (Battle.net or Game detected).
- **Nuke Tool**: Added a total system reset button in the System Tools card to terminate all processes and wipe login credentials with a "yes" confirmation.

### Changed

- **Settings UI Refinement**: Removed the descriptive text under the "Minimize to Tray" toggle for a cleaner layout.
- **Aesthetics Upgrade**: Improved Glassmorphism effect for all modals and UI panels with higher-fidelity borders and blurs.
- **Status Polling**: Increased process status polling frequency to 2 seconds for snappier UI feedback.
- **I18n Cleanup**: Synchronized and cleaned up redundant localization keys across all languages.
- **Build System**: Resolved various TypeScript linter errors and redundant imports causing CI failures.

## [0.3.1] - 2026-02-10 (Failed CI)

- Incremental version with UI optimizations.

## [0.3.0] - 2026-02-10

### Added

- **Ghost Detector**: Visual ghost icon (👻) and pulse effect for accounts in config but missing from Windows system.
- **Flame Portal Icon**: New dark-style portal icon for both installer and taskbar.
- **CI/CD Optimization**: Restored signing password to GitHub Actions and mapped R2 artifacts to `.update` suffix.

---

## [0.2.0] - 2026-02-07

### Added

- **Unified Notification System**: Introduced `NotificationManager` for centralized, blocking UI interaction.
- **Full-Chain Logging**: Complete integration of backend logs into frontend "Atomic Logs" with category filtering.
- **Dashboard Persistence**: Dashboard view mode (Grid/List) now persists in local configuration.
- **Compact Account Modal**: Re-designed account editing with inline labels to maximize vertical space.
- **Multi-Language Refresh**: Added precise labels (`label_password`, etc.) for all supported languages.

### Changed

- **UI Performance**: Removed layout-shifting (ring/scale) effects during dashboard selection for a smoother experience.
- **Hit-Area Optimization**: Enlarged dashboard list buttons (`h-9`) and improved hit-targets to prevent background click-through.
- **Account Manager Refresh**: Synchronized action button styles across all list views.

### Fixed

- **Mutex Logic**: Optimized Mutex cleaning to ignore harmless `0x80070032` (Not Supported) errors, reducing log noise.
- **Password Labels**: Corrected missing or ambiguous labels in the account edit modal.

---

## [0.1.2] - 2026-02-07

### Added

- **Admin Elevation**: Program now requests Administrator privileges via embedded UAC Manifest.
- **Admin Status Display**: Frontend shows real-time "Admin Mode" indicator.
- **Single Instance**: Added `tauri-plugin-single-instance` to prevent multiple instances and auto-focus existing window.
- **Cross-User Launch Fallback**: When `CreateProcessWithLogonW` fails due to Admin restrictions (0x8007052f), automatically falls back to `LogonUser` + `CreateProcessAsUser`.

### Changed

- **Build System**: Switched to `tauri-build::WindowsAttributes::app_manifest()` for Manifest injection, avoiding resource compiler conflicts (LNK1123).
- **OSProvider Enhancement**: `windows_impl.rs` now implements robust dual-path process creation strategy.
- **Documentation**: Updated `TECHNICAL_SPEC.md` to v3.0 reflecting the decoupled architecture.

### Fixed

- **Vite Warning**: Resolved dynamic import warning in `i18n.ts` by converting to static import.
- **LNK1123 Error**: Fixed "COFF conversion failed" by removing `embed-resource` and using native Tauri manifest injection.

---

## [0.1.2-alpha] - 2026-02-05

### Added

- **OSProvider Abstraction**: Introduced trait-based `OSProvider` layer to decouple business logic from OS-specific APIs.
- **Windows Implementation**: Added `WindowsProvider` utilizing `windows-rs` 0.62.2 for secure user management and process isolation.
- **Dependency Injection**: Integrated `OSProvider` into global `AppState`.

### Changed

- **Upgrade windows-rs**: Successfully upgraded to version 0.62.2.
- **Tauri Command Refactoring**: All core commands now consume `OSProvider` via dependency injection.

### Removed

- **Legacy Modules**: Deleted `win_user.rs` and `win32_safe/process.rs` after migration.

---

## [0.1.1] - 2026-01-26

### Added

- **Standardized Modal System**: Unified modal components across the application.
- **Enhanced Glassmorphism**: High-intensity frosted glass effect for premium aesthetic.

### Fixed

- **Donate Page Refactor**: Resolved layout issues with modern flex-based design.
- **Button Alignment**: Adopted right-aligned action buttons for all modal footers.

### Changed

- **Visual Polish**: Improved typography and avatar display.
