# D2R Multiplay - AI Development Handover (v4.0)

> This document is the primary source of truth for an AI agent taking over the project.

---

## 🏗️ Core Design Philosophy

1. **Extreme Component Decoupling**:
    - **Principle**: Components should be "Dumb" and "Atomic".
    - `account.rs`：这里是业务的剧场，别去碰底层的螺丝钉。
    - **Constraint**: If a UI component exceeds 150 lines, it MUST be decomposed.
    - **Logic**: All business logic (polling, async sequences) must live in **Hooks**.
2. **Performance & Resource Strategy**:
    - **Caching**: The `AppState` (Rust) caches `System` and user info. Do not re-instantiate high-cost OS objects frequently.
    - **Refresh Protocol**: `sysinfo` refreshes must be surgical. Use the `refresh_nothing()` kind and specify only needed fields (PID, status).
3. **The "Golden" Launch Protocol**:
    - Workflow order: `Cleanup` -> `Backup` -> `Clear` -> `Restore` -> `Spawn`.
    - **Identity Swapping**: The "Bnet Only" mode is a subset of this protocol that skips the Mutex killing stage.

## ✍️ Development Aesthetics

- **Rust**: Error messages are user-facing. Return descriptive `anyhow::Result` strings. Log extensively with `tracing::info/warn`.
- **React**: Use `tailwind-merge` and `clsx` (via `cn` utility) for all conditional styling. Use CSS variables for colors (success, info, primary) to support theming.
- **I18n**: ZERO hardcoded strings in the UI. Everything must go through `i18next`.

## ⚠️ Critical Avoidance (Anti-Patterns)

- **Avoid Prop Drilling**: If you're passing a prop through 3+ layers, use a custom hook or reconsider component boundaries.
- **Avoid Registry Bloat**: Do not add unnecessary keys to the Windows Registry. Stick to the filesystem for configuration.
- **Avoid State Rot**: Ensure all intervals/listeners are cleared in hook cleanup functions.

---

**Certified by**: Antigravity AI (2026-02-11)
