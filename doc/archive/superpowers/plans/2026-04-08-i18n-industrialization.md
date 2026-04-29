# I18n 工业化加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立结构化的国际化通讯协议，根除后端与基础 UI 组件中的硬编码字符串。

**Architecture:** 后端通过 `{ key, args }` 发送语义化消息；前端 LogConsole 自动解析 Key 进行翻译；托盘菜单支持通过 Tauri 事件/命令动态重建。

**Tech Stack:** Rust (Tauri 2.0, serde), TypeScript (React, i18next).

---

### Task 1: 后端日志协议升级 (Logger Struct Update)

**Files:**
- Modify: `src-tauri/src/modules/logger.rs`

- [ ] **Step 1: 修改 LogEntry 结构体**
```rust
#[derive(serde::Serialize, Clone, Debug)]
pub struct LogEntry {
    pub time: String,
    pub level: String,
    pub key: Option<String>,       
    pub args: Option<serde_json::Value>, 
    pub message: String, // 保持向后兼容的原文显示
}
```

- [ ] **Step 2: 更新 log 辅助函数**
```rust
pub fn log_localized(app: Option<&tauri::AppHandle>, level: &str, key: &str, args: Option<serde_json::Value>, fallback: &str) {
    let now = chrono::Local::now();
    let time_str = now.format("%H:%M:%S").to_string();

    let entry = LogEntry {
        time: time_str,
        level: level.to_string(),
        key: Some(key.to_string()),
        args,
        message: fallback.to_string(),
    };
    // ... 发送逻辑保持不变 ...
}
```

- [ ] **Step 3: Commit**
`git commit -m "refactor(i18n): update LogEntry struct to support keys and args"`

---

### Task 2: 前端日志解析器 (Frontend Log Interpreter)

**Files:**
- Modify: `src/components/dashboard/LogConsole.tsx`

- [ ] **Step 1: 修改日志渲染逻辑**
```typescript
{logs.map((log, idx) => (
  <div key={idx} className="...">
    <span className="opacity-50 text-[10px] shrink-0">[{log.time}]</span>
    <span className={cn("font-medium break-all")}>
       {log.key ? t(log.key, log.args) : log.message}
    </span>
  </div>
))}
```

- [ ] **Step 2: Commit**
`git commit -m "feat(i18n): enable translation of backend logs in LogConsole"`

---

### Task 3: 后端核心业务逻辑清理 (Launcher P0 Cleanup)

**Files:**
- Modify: `src-tauri/src/modules/account/launcher.rs`
- Modify: `src/locales/zh-CN.ts`
- Modify: `src/locales/en.ts`

- [ ] **Step 1: 将 launcher.rs 中的硬编码文本改为 Key 模式**
查找 `logger::log` 调用并替换为基于 Key 的调用。
例如：`"正在扫描运行环境..."` -> `logs.launch.scanning_env`

- [ ] **Step 2: 更新语言文件**
```typescript
// zh-CN.ts
logs: {
  launch: {
    scanning_env: "正在扫描运行环境 (锚点校验)...",
    env_clearing: "环境归零中...",
    kill_count: "已强制终止 {{count}} 个相关进程"
  }
}
```

- [ ] **Step 3: Commit**
`git commit -m "refactor(i18n): clean up hardcoded strings in launcher.rs"`

---

### Task 4: 系统托盘动态化 (Dynamic Tray)

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/src/commands/config.rs`

- [ ] **Step 1: 实现 update_tray_lang 函数**
在 `tray.rs` 中增加一个根据当前配置语言重建菜单的逻辑。

- [ ] **Step 2: 在保存配置时触发托盘更新**
在 `update_tray_language` 命令中调用该逻辑。

- [ ] **Step 3: Commit**
`git commit -m "feat(i18n): implement dynamic tray menu updates on language change"`

---

### Task 5: 全局 UI 补漏 (UI Component Sweep)

**Files:**
- Modify: `src/components/ui/TitleBar.tsx`
- Modify: `src/components/layout/AppFooter.tsx`

- [ ] **Step 1: 替换 TitleBar 上的硬编码 title 属性**
使用 `t('ui.titlebar.minimize')` 等替代。

- [ ] **Step 2: Commit**
`git commit -m "fix(i18n): clean up remaining hardcoded strings in UI components"`
