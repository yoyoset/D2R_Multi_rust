---
name: tauri-patterns
version: 1.0.0
description: >
  Tauri 桌面应用开发模式，包括前后端通信、窗口管理、系统 API 调用。
---

# 🖥️ Tauri Patterns

## 1. 项目结构

```
project/
├── src/              # React 前端
├── src-tauri/        # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/ # Tauri commands
│   │   └── services/ # 业务逻辑
│   └── tauri.conf.json
```

---

## 2. 前后端通信

### Rust → JS (Event)

```rust
// Rust 端
window.emit("event-name", payload)?;

// JS 端
import { listen } from '@tauri-apps/api/event';
await listen('event-name', (event) => {
    console.log(event.payload);
});
```

### JS → Rust (Command)

```typescript
// JS 端
import { invoke } from '@tauri-apps/api/tauri';
const result = await invoke('command_name', { arg1: 'value' });

// Rust 端
#[tauri::command]
fn command_name(arg1: String) -> Result<String, String> {
    Ok(format!("Received: {}", arg1))
}
```

---

## 3. 窗口管理

### 创建新窗口

```rust
tauri::WindowBuilder::new(
    app,
    "label",
    tauri::WindowUrl::App("index.html".into())
)
.title("Window Title")
.inner_size(800.0, 600.0)
.build()?;
```

### 窗口属性

```rust
window.set_always_on_top(true)?;
window.set_decorations(false)?;
window.set_transparent(true)?;
```

---

## 4. 状态管理

```rust
// 定义状态
struct AppState {
    db: Mutex<Database>,
}

// 注册状态
fn main() {
    tauri::Builder::default()
        .manage(AppState { db: Mutex::new(db) })
        .run()?;
}

// 在 command 中使用
#[tauri::command]
fn query(state: State<'_, AppState>) -> Result<Vec<Data>, String> {
    let db = state.db.lock().unwrap();
    // ...
}
```

---

## 5. 系统 API

### 截图 (Windows Graphics Capture)

```rust
use windows::Graphics::Capture::*;

// 创建 capture session
let item = GraphicsCaptureItem::CreateFromMonitor(monitor)?;
let session = Direct3D11CaptureFramePool::Create(...)?;
```

### 全局快捷键

```rust
use tauri::GlobalShortcutManager;

app.global_shortcut_manager()
    .register("CmdOrCtrl+Shift+S", || {
        // 处理快捷键
    })?;
```

---

## 6. 构建优化

### tauri.conf.json

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../dist"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "nsis"]
    }
  }
}
```

---

## 7. Tauri v2 常见坑点 (Pitfalls)

### 插件配置: unit 类型错误

- **问题**: `tauri-plugin-notification` v2 等插件期望配置为 `null` 或省略，而不是 `{}`。
- **报错**: `expected unit` (Rust 反序列化错误)。
- **修复**: 在 `tauri.conf.json` 中使用 `"notification": null` 或直接在 `plugins` 中删除该键。

### 路径解析: v1 vs v2 混淆

- **frontendDist**: v2 中应使用 `frontendDist` 而不是 v1 的 `distDir`。
- **相对路径**: 始终通过 `tauri::path::BaseDirectory` 解析路径，避免手动拼接 `../` 等相对路径，尤其是跨驱动器环境。

### 窗口坐标: 物理 vs 逻辑

- **逻辑像素**: Tauri 的 `inner_size` 通常使用逻辑像素。
- **物理像素**: 截图 (WGC) 或底层 Win32 API 往往返回物理像素。
- **转换**: 必须通过 `window.scale_factor()` 进行转换，否则在不同 DPI 下选区会偏移。

---

## 8. 模型行为约束 (针对 Flash/Haiku 模型)

Flash 模型（如 Gemini Flash, Claude Haiku）在长上下文或复杂逻辑下容易失效。遵循以下约束：

1. **窄域任务 (Narrow Scope)**: 单次任务步数控制在 3-5 步内。不要试图一个指令完成整个重构。
2. **上下文隔离 (Context Hygiene)**:
    - **20% 阈值**: 当对话内容达到上下文窗口的 20% 时，模型细节记忆开始显著衰减，容易产生幻觉。
    - **消息限制**: 连续对话超过 20-30 条消息后，或多日志干扰严重时，应强制开启**新会话**或总结关键状态后重置，防止指令漂移。
3. **绝对路径优先**: 即使在同一目录下，也优先确认绝对路径（尤其是技能库加载），Flash 模型容易臆造相对路径。
4. **确定性验证**: 不要询问模型“代码写好了吗”，而是运行 `cargo check` 或 `npm run build`。依赖确定性的工具反馈而非模型自我感觉。
5. **幻觉防御 (Hallucination Defense)**:
    - **API 臆造**: Flash 模型极易臆造不存在的库函数或 Tauri 插件配置项。对于不确定的 API，必须先通过 `grep` 或 `view_file` 确认。
    - **反谄媚 (Anti-Sycophancy)**: 明确告诉 Flash 模型“如果路径不存在或配置不符合 v2 规范，请直接报错而非尝试猜测”。
6. **任务幂等性**: 确保原子操作。Gemini 3 Flash 在长历史下常会破坏已有功能，每次改动后必须回归测试核心逻辑。
