# Changelog

All notable changes to this project will be documented in this file.

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
