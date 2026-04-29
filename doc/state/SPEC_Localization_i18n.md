# SPEC: Localization & i18n Translation Engine

This document specifies the implementation of the backend translation engine within the `d2r-rust` project, defining key resolution, asynchronous fallback, and UI bridging.

---

## 1. Engine Architecture (`i18n.rs`)

The system utilizes a thread-safe, memory-resident translation hashmap to provide real-time localized feedback for OS-level events.

### 1.1 Data Primitives
- **`TRANSLATIONS`**: `LazyLock<RwLock<HashMap<String, Map<String, Value>>>>`. Stores the multi-lingual dictionary (Default: `zh`, `en`, `tw`, `ja`, `ko`).
- **`CURRENT_LANG`**: Global atomic reference to the user's selected locale.

### 1.2 Translation Algorithm
The `translate` function implements a **Cascading Resolution** strategy:

1. **Locale Match**: Search for the key in the `CURRENT_LANG` dictionary.
2. **Global Fallback**: If missing, search for the key in the `en` (English) dictionary.
3. **Identity Return**: If still missing, return the raw key string as a fail-safe identifier.

---

## 2. Dynamic Interpolation Logic

The engine supports run-time variable injection using the `{variable}` placeholder syntax.

### 2.1 Displacement Mapping
```rust
for (k, v) in obj {
    let placeholder = format!("{{{}}}", k);
    let replacement = match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        _ => v.to_string(),
    };
    result = result.replace(&placeholder, &replacement);
}
```
- **Inputs**: Supports strings, numbers, and boolean values via `serde_json::Value`.
- **Usage**: Typically used for PIDs (e.g., `logs.launcher.launch_success|{"pid": 1234}`) and pathnames.

---

## 3. UI Bridging & Synchronization

- **State Sync**: When the user changes language in the React UI, the `set_language` command updates the `CURRENT_LANG` atomic in Rust.
- **IPC Protocol**: Commands like `log_localized` emit translated strings to the `launch-log` bus, ensuring the UI remains "Display-Only" while the Backend owns the "Logic-of-Meaning".

---

**Technical Compliance**: `src-tauri/src/modules/i18n.rs`  
**Quality Level**: Multi-Lingual Enterprise Standard
