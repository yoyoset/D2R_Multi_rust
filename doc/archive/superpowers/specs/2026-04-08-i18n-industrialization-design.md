# Design Spec: I18n 工业化加固 (I18n Industrialization)

**Date**: 2026-04-08
**Topic**: 全面梳理并解决项目中的硬编码字符串问题，建立商业级国际化通讯协议。

## 1. 目标 (Goals)

- **根除硬编码**：确保后端 Rust 代码和前端组件中不再出现任何硬编码的用户可见字符串。
- **结构化通讯**：建立 Rust 与 React 之间的结构化翻译协议。
- **动态托盘**：实现系统托盘语言随前端设置实时动态切换。

## 2. 核心架构 (Architecture)

### 2.1. 后端日志通讯协议 (Structured Log Protocol)

修改 `LogEntry` 结构体，从“纯文本发送”升级为“语义化发送”。

```rust
// src-tauri/src/modules/logger.rs
#[derive(Serialize, Clone, Debug)]
pub struct LogEntry {
    pub time: String,
    pub level: String,
    pub key: Option<String>,       // 翻译键 (如 logs.launch.success)
    pub args: Option<serde_json::Value>, // 动态参数 (如 { "pid": 1234 })
    pub raw: String,               // 回退显示文本
}
```

### 2.2. 命令响应协议 (Command Response)

所有的命令错误返回不再通过 `.map_err(|e| e.to_string())` 转换为模糊字符串，而是使用结构化错误处理器。

### 2.3. 系统托盘架构 (Tray Management)

- **维护点**：在 `lib.rs` 中注册语言变更监听。
- **动态重建**：增加 `update_tray_language` 命令，由前端切换语言时调用，直接在 Rust 侧重新生成 `TrayIcon` 菜单。

## 3. 详细设计 (Detailed Design)

### 3.1. 翻译 Key 命名空间 (Namespaces)

采用 `domain.feature.key` 格式：

- `logs.*`: 后端执行过程中的所有日志。
- `errors.*`: 后端命令执行失败时的错误原因。
- `tray.*`: 系统托盘菜单文字。
- `ui.*`: 页面组件上的按钮、提示等。

### 3.2. 前端日志解释器 (Frontend Interpreter)

在 `LogConsole.tsx` 或相关 Hook 中：
```typescript
const renderLog = (entry: LogEntry) => {
    if (entry.key) {
        return t(entry.key, entry.args);
    }
    return entry.raw;
};
```

## 4. 实施阶段 (Implementation Phases)

### 阶段 1：协议基础设施
- 修改 `logger.rs` 结构。
- 在 `locales/` 中增加初步的 `en.ts` 和 `zh-CN.ts` 命名空间。

### 阶段 2：后端清理 (P0)
- 扫描并重构 `launcher.rs`。
- 扫描并重构 `os.rs` 和 `diag.rs`。
- 将原本的硬编码中文移入 `zh-CN.ts`，并为 `en.ts` 编写对应的英文。

### 阶段 3：托盘动态化
- 修改 `tray.rs` 支持运行时更新。
- 联动 `config.rs` 的设置保存逻辑。

### 阶段 4：前端 UI 补漏
- 扫描 `TitleBar.tsx` 等基础组件。
- 统一所有 Modal 的标题国际化。

## 5. 自我评审 (Self-Review)

1.  **Placeholder Scan**: 无待定项。
2.  **Internal Consistency**: 采用全项目通用的 `t()` 理念，协议前后端对齐。
3.  **Ambiguity Check**: 明确实行“Key 优先”策略，若 Key 不存在则显示 `raw` 内容作为保底。

---

> [!IMPORTANT]
> 此设计符合工业级商业软件对跨国分发、无损更新和高可维护性的要求。
