# SPEC: Frontend Architecture & Client-State Logic

This document specifies the implementation of the React 19 frontend layer and its high-fidelity orchestration of the Rust backend commands.

---

## 1. Hook-Driven Logic Decoupling

The frontend maintains a strict "Thin Component" policy, where all business logic is encapsulated in custom hooks to ensure modularity and ease of auditing.

### 1.1 `useAppCore.tsx` (Global Orchestrator)
The central hub for data synchronization and lifecycle management.
- **Boot Sequence**: 
    1. Calls `getConfig()` to populate local `config` state.
    2. Calls `checkAdmin()` to set the UI's privileged mode context.
    3. Calls `getWindowsUsers()` to perform a delta-audit against the account registry.
- **Event Binding**: Registers a `listen` callback for `config-updated`. This ensures that if the disk configuration is modified (e.g., via a manual file edit or secondary process), the UI automatically re-synchronizes its state.

### 1.2 `useLaunchSequence.ts` (Transactional Controller)
Encapsulates the asynchronous launch state machine.
- **Retry Paradigm**: Implements the **Conflict Resolution Loop**. If the backend returns a `CONFLICT` error, the hook uses `showBlocking` to inject a decision modal.
- **Decision Pathways**:
    - `resolveLaunchConflict(account.id, 'delete')`: Triggers a clean bnet environment.
    - `resolveLaunchConflict(account.id, 'reset')`: Triggers a full cache purge before retry.
- **State Cleanup**: Ensures that `isLaunching` is always reset via `finally` blocks or `onClose` callbacks to prevent UI lockup on failure.

---

## 2. API Communication Layer (`lib/api.ts`)

The API layer acts as a strict **Type-Safe Contract** using standard TypeScript interfaces that mirror the Rust `serde` structs.

### 2.1 Interface Definition (Partial Mapping)
```typescript
export interface AppConfig {
    accounts: Account[];
    game_path: string;
    advanced_launch_mode?: boolean;
    active_sequence?: {
        preset_index: number;
        queue: string[];
    };
}
```

### 2.2 Command Facade
All commands are abstracted into clear, async functions:
- `launchGame(...)`: Calls the `launch_game` command.
- `saveConfig(...)`: Calls the `save_config` command (Triggering the backend Atomic Swap).

---

## 3. Client-Side Persistent Stores (Zustand)

While the backend is the "Source of Truth" for configuration, transient UI state is managed via specialized Zustand stores.

### 3.1 Console & Diagnostic Store (`useLogs.ts`)
- **Capacity**: Manages a rolling buffer of 1,000 log entries.
- **Schema**: `{ message, level, category, timestamp }`.
- **Mirroring**: Automatically listens to the `launch-log` event and pushes payloads into the global log stream.

### 3.2 Notification & Modal Store (`useBlockingNotification.ts`)
- **Purpose**: Controls the visibility and content of application-level blocking alerts.
- **Architecture**: Supports dynamic button injection, allowing the `useLaunchSequence` hook to pass complex async callbacks (like "Delete and Retry") directly into the UI layer.

---

**Technical Compliance**: `src/hooks/`, `src/lib/api.ts`, `src/store/`  
**Quality Level**: Industrial State Decoupling
