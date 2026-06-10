# D2R Multi — 暗黑破坏神 II: 重制版 多开管理器

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.6.6-orange)
![Backend](https://img.shields.io/badge/backend-Rust-red)
![Framework](https://img.shields.io/badge/framework-Tauri_v2-blue)

[English](./README.md) | **简体中文**

</div>

D2R Multi 是一个安全、高性能的 *Diablo II: Resurrected* **多开 / 多账号管理工具**。基于 **Rust + Tauri v2** 构建，通过 Windows 原生 API 实现进程级隔离与自动化管理。

![主界面](doc/images/01-overview.jpg)

> 📖 完整图文教程见 [**使用手册 User_Guide.md**](./User_Guide.md)（中英双语）。

---

## 它能做什么

- **同机多开**：一台电脑同时运行多个 D2R 实例。
- **多账号一键切换**：每个战网账号登录一次，之后一键启动、长期免登录、互不串号。
- **序列自动启动**：保存启动顺序为预设，一键依次拉起全部账号。
- **干净隔离**：每个账号绑定一个独立 Windows 用户，登录态 / 配置 / 缓存彼此隔离。

### 一键启动与状态总览

仪表盘集中管理所有账号：卡片 / 列表两种视图，蓝点 = 战网在线、绿点 = D2R 在线；检测到冲突时按钮自动切换为「强制」模式。

![列表视图](doc/images/08-dashboard-list.jpg)

![启动按钮](doc/images/09-launch-buttons.jpg)

### 序列自动启动

把常用的启动顺序存成预设（P1–P3），点一下播放，按队列依次切换账号启动；置顶迷你窗显示进度，全部完成后一键「完成并备份」收尾最后一个账号的快照。

![序列预设](doc/images/10-sequence-presets.jpg)

![完成并备份](doc/images/20-sequencer-save.jpg)

### 完备的手动工具箱

自动化覆盖不到的边际情况（句柄残留、权限损坏、进程卡死），用工具箱手动解决：句柄级进程查看器、互斥锁清理、目录权限修复、环境诊断等。

![工具箱](doc/images/13-tools-overview.jpg)

---

## 快速开始

1. **准备**：Windows 10/11 x64；战网安装在默认路径 `C:\Program Files (x86)\Battle.net` 且勾选「为所有用户安装」。
2. **运行**：右键 `d2r-rust.exe` →「以管理员身份运行」。
3. **添加账号**：「账号管理」→「添加账号」，绑定（或新建）一个本地 Windows 用户、填好密码。
4. **启动**：回仪表盘选中账号 →「启动游戏」。首次启动在战网里登录一次，之后免登录。
5. **多开**：选另一个账号再点启动即可；实例锁由程序自动清理。

> ⚠️ **最后启动的账号需手动「保存快照」**（自动备份在"下次启动"才发生，最后一个没有下次）。详见手册 [§4.5](./User_Guide.md)。

![账号管理](doc/images/05-account-manage.jpg)

---

## 工作原理（简版）

### 1. 登录凭证 — Windows 多用户隔离

Battle.net 的登录凭证跟随 Windows 用户配置文件存储。本工具为每个多开位绑定一个本地用户，用 `CreateProcessWithLogonW` 以目标用户身份拉起战网——凭证天然隔离、长期记忆。

### 2. 为什么只支持本地账户

跨用户启动 API 基于本地 SAM 认证：**本地账户 ✅**；微软账户 ❌（云端认证不兼容）；域账户 ❌（家用环境无域控）。

### 3. 多开两板斧

- **实例锁清理**：D2R 启动时创建名为 `DiabloII Check For Other Instances` 的内核对象（**Event 类型**）阻止多开；程序在拉起新实例前自动关闭它。
- **product.db 快照轮转**：该文件是**全机共享**的（战网 Agent 实时读取），不跟随用户。启动序列：`备份当前快照 → 杀战网+Agent → 注入目标账号快照 → 以目标用户拉起战网`，确保路径配置互不串号。

### 4. 数据持久化与重定向

数据根目录可重定向到非系统盘（`data_path.txt` 或设置面板迁移），内置 DPAPI 凭据重加密迁移引擎与 Vault 健康监控——应对网吧类 C 盘还原环境。

> 更深入的机制说明（双在位、托管/高级模式、诊断等）见 [使用手册第 4 章](./User_Guide.md)。

---

## 环境要求

- Windows 10/11 (x64)
- **管理员权限**（创建用户与跨用户启动所需）
- Battle.net 安装在默认路径，且「为所有用户安装」
- 多开位使用**标准本地 Windows 账户**（不支持微软账户 / 域账户）

---

## 🛠️ 技术清单 (Technical Manifest)

对于开发者和 AI 代理，本仓库包含系统架构和操作协议的完整**数字孪生 (Digital Twin)** 级存档。

详细技术规范见 [**技术状态清单 (doc/state/MANIFEST.md)**](./doc/state/MANIFEST.md)：架构设计（并发模型与 Win32 抽象）、安全性（DPAPI 硬加密与内存脱敏）、协议核心（原子交换与锁清除算法）、编排逻辑（启动状态机与环境自学习）。

## 技术栈

- **后端**: Rust — 原生 Win32 API (windows-rs)
- **前端**: React 19 + TypeScript + TailwindCSS
- **框架**: Tauri v2
- **核心能力**: 跨用户进程桥、实例锁探针、配置快照轮转

## 免责声明

本工具仅供学习与个人便利使用。

- 请始终遵守游戏发行商的服务条款 (ToS)。
- 使用风险自负，作者不对任何后果承担责任。

## 更新日志

详见 [**CHANGELOG.md**](./CHANGELOG.md)

## 许可证

MIT License.
