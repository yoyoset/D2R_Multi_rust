# Changelog

All notable changes to this project will be documented in this file.

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
