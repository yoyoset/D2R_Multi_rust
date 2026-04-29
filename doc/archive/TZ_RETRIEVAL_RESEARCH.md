# D2R 恐怖地带 (TZ) 自动获取技术调研总结

本文件详细记录了针对暗黑破坏神 2 重制版（D2R）恐怖地带（Terror Zone，简称 TZ）自动获取方案的调研结果，特别针对**国服（CN Server）**缺少公开 API 的现状。

## 1. 调研背景
*   **目标**：实现在启动器中实时显示当前和下一个恐怖地带及其剩余时间。
*   **挑战**：国服目前没有公开维护的 TZ API，全球通用 API（如 D2Runewizard）无法完全覆盖国服变动。

## 2. 核心调研发现
*   **轮转频率**：目前 D2R 的 TZ 轮转频率已更新为 **每 30 分钟** 一次。
*   **内置逻辑**：客户端通过 `data\hd\global\excel\desecratedzones.json` 文件定义所有区域及其对应的 `LevelID`。
*   **在线机制**：在线模式下，服务器通过数据包下发当前的 `DesecratedLevelID`。客户端在切换前的 **5-10 分钟** 通常会提前收到下一个区域的预载信息。

## 3. 技术路径分析

### 路径 A：内存特征码扫描 (AOB Memory Reading) —— **推荐自主方案**
*   **原理**：利用 Rust 的 `PROCESS_VM_READ` 权限读取 `D2R.exe` 内存。
*   **技术细节**：使用特征码（AOB Signature）搜索指令指纹，定位 `CurrentDesecratedLevelID` 和 `NextDesecratedLevelID` 的内存地址。
*   **安全性**：只读访问，不改写游戏内存，不挂载调试器，风险较低。

### 路径 B：聊天缓冲区拦截 (Chat Buffer Interception)
*   **原理**：模拟发送 `/terrorized` 指令，并直接在内存中读取聊天栏反馈的文字。
*   **优缺点**：逻辑简单，但不够“静默”，依赖 UI 渲染。

### 路径 C：算法模拟 (Algorithm Simulation) —— **仅单机**
*   **原理**：复刻 D2R 内部的随机数生成器。仅适用于单机，无法同步在线模式。

## 4. 如何获取“下一个区域” (Next Zone)
*   **单机模式**：基于系统时间（UTC）和固定种子计算，完全确定。
*   **在线模式**：监控内存中紧邻 `CurrentDesecratedLevelID` 的预载字段。服务器通常会在小时的 25/55 分钟左右下发。

## 5. 后续开发建议
1.  **实现 `probing.rs` 模块**：封装基于特征码扫描的内存读取逻辑。
2.  **映射 LevelID**：建立 `LevelID -> 区域中文名` 的静态映射表。
3.  **UI 整合**：将探测结果整合进 `ManualTools` 或主仪表盘。

---
**调研人**：Antigravity
**日期**：2026-03-27
