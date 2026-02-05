---
name: engineering-sync-protocol
description: >
  Mandatory communication framework for technical decision-making.
  Ensures transparency by requiring Problem-Goal-Conflict-Solutions-Tradeoffs-Conclusion reporting.
---

# 🛠️ Engineering Sync Protocol (工程同步协议)

## 🎯 Purpose (目的)

本技能旨在消除 AI 开发过程中的“黑盒决策”。它强制 AI 在实施任何非琐碎（Non-trivial）或可能产生多种技术路径的功能前，必须与用户同步工程逻辑和权衡。

## 🛠️ Operating Mode (运行模式)

- **Stop & Sync (先同步，后动手)**：在进入 `EXECUTION` 模式前，如果涉及架构选择、核心逻辑变更或复杂系统交互，必须输出《工程同步书》。
- **No Silent Assumptions (拒绝隐性假设)**：禁止擅自假设用户的技术偏好（如 DPI 处理方式）。如果存在多个实现路径，必须全数列出。
- **Trade-off Oriented (权重导向)**：每一个方案必须附带利弊分析（性能、扩展性、用户体验、实现成本）。

## 📝 The Framework: Six-Step Sync (六步同步法)

每当需要进行技术同步时，必须严格遵循以下结构：

1. **Problem (问题描述)**：
   - 当前遇到了什么技术障碍、Bug 或系统限制？
2. **Goal (目标定义)**：
   - 我们期望达到的最终用户体验或技术指标是什么？
3. **Conflicts (技术难点/冲突)**：
   - 在实现目标的过程中，哪些因素相互制约？（例如：高性能 vs 低内存，跨 DPI 兼容性 vs 代码复杂度）。
4. **Solutions (备选方案集)**：
   - **方案 A**：详细说明实现逻辑及核心工程决策。
   - **方案 B**：提供一个具备显著差异性的替代路径。
5. **Trade-offs (利弊权衡)**：
   - 制作对比表格或列表，量化说明各方案在不同维度（性能、UX、维护性）的表现。
6. **AI Conclusion (AI 建议结论)**：
   - 基于当前上下文，AI 推荐哪个方案，并给出关键理由。

## 🏗️ Implementation Guidelines (实施准则)

### 1. 触发时机

- 修改系统级 API 调用逻辑时。
- 引入新的数据持久化或通信模式时。
- 发现当前代码存在严重架构缺陷（如单任务阻塞、轮询低效）时。

### 2. 决策记录 (Decision Log)

- 经用户确认后的结论必须记录到项目的 `DESIGN_GUIDES.md` 或 `DECISION_LOG.md` 中，作为项目的“永久记忆”。

### 3. 透明度审计 (Transparency Audit)

- 诚实地指出 AI 自身的局限性（如：无法同时处理多个并发指令，记忆窗口限制等）。

## 🛡️ Exit Criteria (退出标准)

- 用户对提议方案中的某一路径表示“确认”或给出明确修改建议。
- 决策已同步至项目文档。
