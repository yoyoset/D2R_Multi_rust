# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2026-02-05

### Added

- **Supplier Pattern (OSProvider Abstraction)**: Introduced a trait-based `OSProvider` abstraction layer to decouple business logic from OS-specific APIs.
- **Windows implementation**: Added `WindowsProvider` utilizing `windows-rs` 0.62.2 for secure user management and process isolation.
- **Dependency Injection**: Integrated `OSProvider` into the global `AppState` for cleaner resource management and improved testability.

### Changed

- **Upgrade windows-rs**: Successfully upgraded the project's primary Windows API dependency to version 0.62.2.
- **Tauri Command Refactoring**: Updated all core commands in `lib.rs` and `account.rs` to consume the `OSProvider` via dependency injection.

### Removed

- **Legacy Modules**: Deleted redundant `win_user.rs` and `win32_safe/process.rs` modules after successful migration.

## [0.1.1] - 2026-01-26

### Added

- **Standardized Modal System**: Unified `Modal`, `ModalContent`, `ModalHeader`, `ModalBody`, and `ModalFooter` components across the entire application.
- **Enhanced Glassmorphism**: High-intensity frosted glass effect (`backdrop-blur-xl`, `bg-black/40`) applied to all popups for a premium "Imperial Glass" aesthetic.
- **Depth Hierarchy Optimization**: Increased modal Z-Index to 100 to ensure proper layering over the navigation header and full-screen backdrop blur.

### Fixed

- **Donate Page Refactor**: Resolved layout "messiness" by redesigning the blessing card into a modern flex-based profile layout.
- **Button Alignment Consistency**: Uniformly adopted right-aligned action buttons (`justify-end`) for all modal footers to match the "Directory Mirror" interaction logic.
- **Build & Conflict Resolution**: Fixed TypeScript errors related to `open` dialog naming conflicts and resolved UI occlusion issues between the header and popups.

### Changed

- **Visual Polish**: Improved typography tracking and avatar display with better scaling and a new active status indicator.
