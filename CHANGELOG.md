# Changelog

All notable changes to this project will be documented in this file.

## [0.6.5] - 2026-06-05

### Fixed (修复)
- **Multi-Account Launch Unblocked / 解除多开拦截**: Removed an over-aggressive guard that blocked launching a new account whenever another account's game was already running (`multi_account_blocked`) — it defeated the tool's core multi-boxing purpose and broke the sequencer. (移除了一个过度严格的拦截：只要有其他账号的游戏正在运行就禁止启动新账号——它违背了工具多开的核心用途，并会中断序列自动启动)

### Changed (调整)
- **Soft Launch Pacing / 软性启动节流**: Replaced the hard block with a soft, bypassable guard that only protects the real race window — launching a second account before the previous one's Battle.net has come up. It releases the instant the previous account's Battle.net appears (or after a 60s cap) and never blocks re-launching the same account. (用软性可绕过的保护取代硬拦截：只防护真正的竞态窗口——在上一个账号的战网起来之前就启动下一个；一旦上个账号战网出现即放行（最多 60 秒），且永不拦截重开同一账号)
- **Real Force Launch / 强制启动落地**: The Force flag now works end-to-end. When Battle.net or the game is already active, both launch buttons turn amber with a red “(强制)” suffix and bypass the pacing guard; a too-early manual launch shows a soft “wait or force” dialog. The sequencer always bypasses pacing. (强制标志现已端到端生效：当战网或游戏已在运行时，两个启动按钮变为琥珀色并带红色「(强制)」后缀、直接绕过节流；过早的手动启动会弹出「稍候或强制」对话框；序列自动启动始终绕过节流)
- **Bnet-Only Label / 仅战网标注**: The Battle.net-only button now notes that it performs no handle cleanup (无句柄查杀). (仅战网按钮现标注其不执行句柄查杀)

### Internal (内部)
- i18n coverage: added the missing `bnet_chat` string for zh-TW/ja/ko and new `force` / `launch_too_soon` strings across all five locales. (i18n 覆盖：补齐 zh-TW/ja/ko 的 bnet_chat，并为五种语言新增 force / launch_too_soon 文案)

---

## [0.6.3] - 2026-06-04

### Fixed (修复)
- **List Selection & Polish / 列表选中与细节**: Account-row action buttons no longer stay pinned over the status dots when a row is selected (they show on hover only); unified the account-manager selected-row highlight with the dashboard (gold tick + gradient); fixed card aliases whose descenders (y/g) were clipped. (修复了列表选中行时编辑/快照按钮常驻遮挡状态点的问题——改为仅悬停显示；统一了账号管理与仪表盘的选中行高亮（金色竖条+渐变）；修复了卡片别名下伸笔画 y/g 被裁切的问题)

---

## [0.6.2] - 2026-06-04

### Changed (调整)
- **UI Re-architecture & Review with Claude Code / 使用 Claude Code 重新设置与审查**: Reworked and reviewed the interface end-to-end — migrated the whole UI onto a unified, token-driven "Dark Forge" design system (single source of truth for colors via CSS variables), tightened the type scale and layout density, restored the compact 3-column tool grid, and made the account list/cards and management table more legible. (使用 Claude Code 对界面进行了端到端的重新设置与审查：将整个 UI 迁移到统一的令牌化「暗夜熔炉」设计系统——颜色由 CSS 变量统一管理，收敛字号与排版密度，恢复紧凑的三列工具栅格，并优化了账号列表/卡片与管理表格的可读性)
- **Theme Support / 主题支持**: Added selectable themes (Forge / Obsidian / Daylight) in Settings, applied instantly and persisted. (设置中新增可切换主题：熔炉 / 曜石 / 日光，即点即换并持久保存)
- **Unified Theming / 统一调色**: Consolidated to a single theme system. Removed the legacy "Accent Color" picker (which after the migration only affected a few leftover modals); all colors now flow through the theme tokens. (收口为单一主题系统：移除了旧的「强调色」选择器——迁移后它仅还能影响个别残留弹窗——所有颜色现统一由主题令牌驱动)
- **Settings Cleanup / 设置精简**: Removed the non-functional "Advanced Launch Control" toggle and the unused Vault status chip from the status bar. (移除了已失效的「高级启动控制」开关，以及状态栏中无用的 Vault 状态标签)

### Fixed (修复)
- **Handle Race Condition / 句柄竞态**: Eliminated a Win32 handle race in mutex/process inspection that could close a handle still in use. (修复了互斥锁/进程句柄检查中可能关闭仍在使用句柄的 Win32 竞态问题)

---

## [0.6.1] - 2026-05-16

### Added (新增)
- **Data Persistence Redirection / 数据存储重定向**: Introduced `data_path.txt` side-by-side redirection and Portable Mode (prioritize `config.json` next to exe) to solve portability issues. (支持 `data_path.txt` 同级重定向引导与便携模式：优先寻找程序同级 `config.json` 以满足便携化需求)
- **Password Reveal / 密码明文查看**: Added support for decrypting and viewing saved passwords in the account edit modal via Vault integration. (支持在编辑账号时通过 Vault 加密仓实时解密并查看明文密码)
- **Vault Audit Tool / 凭据审计工具**: Added a manual audit button in the dashboard to verify the integrity and decryptability of all stored credentials. (仪表盘新增手动“审计凭据”按钮，支持全量校验并刷新账号凭据的健康状态)
- **Storage Settings UI / 存储管理界面**: New dedicated UI in Settings for managing data location and viewing disk space. (设置界面新增专用的存储位置管理与磁盘空间展示面板)

### Fixed (修复)
- **UI & Logic Fixes / 界面与逻辑修复**: Refined the "Save" button to show "Confirm and Sync" (Danger style) when verification fails, and corrected various localization/label issues. (优化了密码验证失败时保存按钮的视觉反馈与强制同步逻辑，修复了设置界面标签错误等多项 BUG)
- **Restart Prompt Optimization / 重启提示优化**: Added distinct messages for data relocation vs configuration loading in the restart modal. (优化了重启提示弹窗，能够根据“转移数据”或“加载配置”显示不同的成功提示)

---

## [0.6.0] - 2026-04-13

### Added (新增)
- **Sequence Launching / 序列启动**: Added support for launching multiple accounts in a controlled sequence.
- **Window Auto-Rename / 窗口自动命名**: Automatically adds account name or note as a suffix to the D2R window title. (支持为从不同用户启动的 D2R 窗口标题添加账号名或备注小尾巴)
- **Snapshot Logic Optimization / 账号快照优化**: Optimized Battle.net account snapshot logic to prevent account path cross-over. (优化战网账号快照逻辑，避免串路径)

### Changed (调整)
- **Removed Domain/Microsoft Account Support / 移除域与微软账号支持**: Removed the ability to add Domain or Microsoft accounts, as cross-user Battle.net launching is restricted by Windows credential management. (由于密码管理无法支持跨用户拉起战网，已移除域用户与微软账号的添加支持)

### Fixed (修复)
- **General Bug Fixes / 其他 BUG 修复**: Fixed various stability and synchronization issues, including empty password handling. (修复了包括空密码处理在内的各项稳定性与同步问题)

---

## [0.5.1] - 2026-02-23

### Fixed
- Fixed high CPU usage in background monitoring loop.
- Optimized window rename timing.
- Added preliminary support for custom save paths.
