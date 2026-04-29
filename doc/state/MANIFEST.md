# D2R Multiplay: Technical State Manifest (Industrial 2026)

This manifest serves as the authoritative technical index for the `d2r-rust` project. It establishes a multi-file "Digital Twin" of the software's logic, designed for architectural auditing and **perfect logical reconstruction**.

---

## 🏭 System Foundation & OS Boundaries
Specifications for the environment setup and kernel interactions.

- **[ARCH_System_Design.md](file:///f:/my_ai/d2r-rust/doc/state/ARCH_System_Design.md)**: Lifecycle, `parking_lot` lock hierarchy, and `OSProvider` trait.
- **[SPEC_Dependency_Manifest.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Dependency_Manifest.md)**: Exact Rust/TS versions and critical `windows-rs` feature flags.
- **[SPEC_OS_Privileges.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_OS_Privileges.md)**: `SE_DEBUG_NAME` escalation, `icacls` fixes, and password policy sync.

## 🔒 Security & Data Integrity
Specifications for the project "DNA" and transactional safety.

- **[SPEC_Data_Schemas_Registry.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Data_Schemas_Registry.md)**: Canonical Rust Structs ($serde tagging) and TS Interfaces.
- **[SPEC_Security_Vault.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Security_Vault.md)**: **Win32 DPAPI** encryption, memory redaction, and hardware binding.
- **[SPEC_Persistence_Integrity.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Persistence_Integrity.md)**: **Atomic Swap Protocol** (Stage-Archive-Commit) and Rescue heuristics.

## 🚀 Operation & Orchestration
Specifications for process management and the launch state machine.

- **[SPEC_Instance_Isolation.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Instance_Isolation.md)**: Remote Mutex closure algorithm and Junction (Reparse) binary layout.
- **[SPEC_Launch_Orchestration.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Launch_Orchestration.md)**: The "Anchor" auto-learning algorithm and 4-phase launch sequence.
- **[SPEC_Maintenance_Operations.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Maintenance_Operations.md)**: **Nuke Reset**, Archive sanitation, and manual overrides.

## 🎨 Visual Engine & Logic Bridge
Specifications for the UI design and communication protocols.

- **[SPEC_UI_Design_System.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_UI_Design_System.md)**: Global CSS variables, design tokens, and Dark Mode logic.
- **[SPEC_Frontend_Architecture.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Frontend_Architecture.md)**: Hook-driven logic, Zustand Stores, and IPC facade.
- **[SPEC_Localization_i18n.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Localization_i18n.md)**: Cascading translation engine and string interpolation.
- **[SPEC_Diagnostic_Logging.md](file:///f:/my_ai/d2r-rust/doc/state/SPEC_Diagnostic_Logging.md)**: Multi-channel diagnostic streaming and log rotation.

---

> [!IMPORTANT]
> This documentation system is strictly synchronized with the source code of v0.6.0. It contains sufficient technical density to allow a qualified agent or developer to reconstruct the codebase from scratch.
