# Changelog

All notable changes to this project will be documented in this file.

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
