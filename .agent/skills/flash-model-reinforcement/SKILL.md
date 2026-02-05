---
name: flash-model-reinforcement
description: Behavioral reinforcement for lightweight models (Gemini Flash, Claude Haiku) to ensure logical consistency and reliability.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Flash Model Reinforcement (v1.0)

> Gemini 3 Flash / Haiku 专用逻辑强化协议。

---

## 1. 上下文刷新协议 (Context Refresh)

**问题**：Flash 模型在 Turn > 5 或 Token 占用 > 20% 后，对文件细节的记忆会发生严重漂移。

**强制动作**：

- **Turn 5 规则**：如果当前对话轮次距离上次 `view_file` 目标文件已超过 5 轮，在执行 `Edit` 之前必须重新执行 `view_file`。
- **锚点校验**：在修改代码前，必须在 `thought` 块中摘录一段目标代码的原始行作为“定位锚点”，防止行号偏移导致的错误修改。

---

## 2. 状态审计协议 (State Audit)

**问题**：Flash 模型容易丢失中间状态（Loading, Error, Active tab 等）。

**强制动作**：

- **Audit Buffer**：在发送 `Edit` 指令前，必须在 `thought` 中列出以下对比：

  ```markdown
  [CURRENT_STATE]: { variable_a: true, variable_b: "raw" }
  [TARGET_STATE]:  { variable_a: false, variable_b: "processed" }
  [SIDE_EFFECTS]:  List any listeners or effects triggered.
  ```

---

## 3. 微循环验证 (Atomic Feedback)

**问题**：Flash 模型倾向于“一口气改完”，导致报错堆叠。

**强制动作**：

- **单点提交**：每次 `replace_file_content` 只能针对**一个**逻辑点。
- **原子化 Check**：每一处实质性改动后，必须立即执行验证命令：
  - **Rust**: `cargo check` (禁带 `build`)
  - **React/TS**: `npx tsc --noEmit`
  - **Tauri**: `cargo tauri dev` (仅在修改配置后)
- **报错优先**：如果验证报错，**禁止**继续修改其他文件，必须先原地修复。

---

## 4. 路径与 API 锚点 (API Safety)

**问题**：Flash 模型极易臆造不存在的相对路径或库 API。

**强制动作**：

- **No-Guessing 准则**：禁止使用“I assume the path is...”或“Based on my knowledge...”。
- **强制探测**：
  - 引用新文件前：执行 `ls` 确认存在。
  - 调用新 API 前：执行 `grep` 或 `view_file` 库源码确认签名。
  - 配置文件项：必须参考 `tauri.conf.json` 或 `package.json` 的真实内容。

---

## 5. 指令锚定 (Instruction Anchoring)

**执行任务前，务必复述**：

- “当前子任务是：[描述任务]”
- “涉及文件路径：[绝对路径]”
- “期望验证命令：[命令]”

---

> **核心目标**：用“笨办法”换取“高确定性”。不要信任你的瞬时记忆，要信任工具的实时反馈。
