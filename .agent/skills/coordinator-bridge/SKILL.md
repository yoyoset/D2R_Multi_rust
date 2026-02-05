---
name: coordinator-bridge
description: >
  Enables cross-project coordination, memory export, and bootstrapping.
  Used by the Universal Coordinator to bridge development logs with content sinks.
---

# 🌉 Coordinator Bridge (协调员桥接)

## 🎯 Purpose (目的)

本技能支持协调员在不同项目间进行“知识迁移”和“生命周期管理”。它确保开发过程中产生的技术共识（Memory）能无缝转化为其他项目的输入（如博客素材、审计报告）。

## 🛠️ Operating Mode (运行模式)

- **Context Mining (上下文挖掘)**：扫描源项目的 `DECISION_LOG.md` 或 `audit_reports/`。
- **Memory Distillation (记忆提炼)**：将冗长的工程讨论提炼为结构化的“讨论纪要”或“素材草案”。
- **Memory Migration (记忆迁移)**：将提炼后的素材注入目标项目的 `knowledge-sink/` 或 `drafts/`。**一旦迁移完成，协调员任务即告结束。**

## 📝 Workflow (工作流)

### 1. Project Bootstrapping (项目冷启动)

当启动新项目时：

- 执行脑暴（Brainstorming）。
- 建立标准结构（`.agent/skills`, `DECISION_LOG.md`）。
- 在主库的 `PROJECT_REGISTRY.md` 中注册该项目。

### 2. Cross-Project Export (跨项目迁移)

- **命令语法**：`Sync Memory for [Sub-Project]`
- **动作**：
    1. **提取对谈记录**：将记录存入 `[Sub-Project]/DISCUSSION_LOG.md`。
    2. **提炼工程感悟 (Realization)**：识别人机协作中的局限性或领域最优解。
    3. **迁移至 SUBLOG**：将感悟注入 `SUBLOG/knowledge-sink/memory/`。
    4. **命名强制标准**：必须使用 `[年份]_[项目名]_[描述性命名].md` (例如 `2026_HyperLens_Coordinator_Pivot.md`)。

## 🏗️ Standard Storage (标准存储位置)

- **主库注册表**：[PROJECT_REGISTRY.md](file:///f:/mycode/antigravity-awesome-skills-main/PROJECT_REGISTRY.md)
- **源项目日志**：`[ProjectRoot]/DECISION_LOG.md`
- **目标项目仓库**：`[ProjectRoot]/knowledge-sink/`

## 🛡️ Exit Criteria (退出标准)

- 目标项目成功收到提炼后的知识文件。
- 注册表已更新项目状态。
