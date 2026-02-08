# Protocol: Expert Review & Governance (专家审查与治理)

本协议定义了项目代码审查与治理的核心原则，重点在于**熵减 (Entropy Reduction)** 与 **代码膨胀治理 (Code Bloat Prevention)**。

## 1. 核心原则：熵减 (Entropy Reduction)

> [!IMPORTANT]
> **软件系统的自然倾向是熵增（变得无序）。主要治理目标是逆向做功，保持系统简洁。**

- **Subtraction > Addition**: 删除代码比增加代码更有价值。
- **Structural Clarity**: 模块职责必须单一且清晰。
- **Zero Legacy**: 发现无用代码必须立即删除，禁止 "TODO later"。

## 2. 代码膨胀治理 (Code Bloat Prevention)

> [!CAUTION]
> **风险点**：单文件超过 500 行会导致认知负荷指数级上升，且极易引发 Git 冲突与意外副作用 (Side Effects)。

- **专家建议**：实施严格的 **"300-500 规则"**。
- **实施细节**：
  - **Soft Limit (300行)**：达到此时应发出警告，考虑拆分辅助函数或子组件。
  - **Hard Limit (500行)**：**禁止**提交。必须重构为多个 `Sub-Manager` 或 Helper。
  - **CSS 模块化**：禁止 `module.css` 超过 300 行。必须按组件视觉区域拆分 (e.g., `header.module.css`, `list.module.css`).
  - **SRP 强制**：UI 渲染 (Renderer) 与 业务逻辑 (Manager) 必须分离。

## 3. 专家审查流程 (Expert Review Process)

在进行重大架构变更或引入新依赖时，必须触发专家审查：

1. **Self-Audit**: 开发者自查是否违反 300-500 规则。
2. **Impact Analysis**: 分析变更对现有依赖和架构的影响。
3. **Refactoring Plan**: 如果变更导致文件过大，必须先行重构。

## 4. 依赖管理

- **Unified Stack**: 严禁随意引入新库。优先复用现有工具链。
- **Version Lock**: 核心依赖版本必须锁定。
