# Changelog

All notable changes to this project will be documented in this file.

## [0.5.1] - 2026-02-23

### Added

- **Inline Password Validation**: Real-time feedback for Windows password matching with clear visual error cues.
  **即时密码校验**: 实现 Windows 密码实时比对反馈，配合显式的红色状态异常提示。
- **Verification Loading State**: Integrated async loading spinner within the password visibility toggle during verification.
  **校验载入反馈**: 在密码显示切换按钮中集成异步载入动画，明确反馈后台校验进度。

### Fixed & Optimized

- **Modal Stacking Order**: Resolved z-index layering where blocking notifications could be partially hidden by other modals.
  **Modal 层级修复**: 修复了阻断式通知可能被其他窗口遮挡的层级问题。
- **Global Localization Sync**: Fully synchronized password validation and interaction keys across all 5 supported languages.
  **全球语言对齐**: 全面同步了五国语言包中的密码校验与交互文案，确保体验一致。

## [0.5.0] - 2026-02-12

### Added

- **Infrastructure Health Check**: Real-time pre-flight verification for Battle.net installation, config writability, and sandbox profile readiness.
  **基础设施健康检查**: 实时预检战网安装路径、配置目录写入权限以及沙箱账户配置文件就绪状态。
- **Manual Process Explorer**: Embedded tool for manually terminating stubborn game handles when automation fails.
  **手动进程查看器**: 内置工具，支持在自动化清理失效时，手动定位并强制关除残留的游戏句柄。

### Optimized & Refined

- **Progressive Launch UI**: Introduced 3-tier color states for launch buttons (Emerald for Ready, Yellow for Bnet-Active, Orange for D2R-Active) for granular status awareness.
  **渐进式启动 UI**: 引入三阶颜色逻辑（翡翠绿：就绪；明黄：战网运行；琥珀橙：游戏运行），实现更深度的启动状态感知。
- **Quiet Status Polling**: Refactored polling logic to eliminate UI flickering. Manual refresh icon now only animates on demand while background sync remains silent.
  **静默状态同步**: 重构轮询逻辑，消除了 UI 动画抖动。刷新图标仅在手动触发时旋转，后台同步转为静默模式。
- **Enhanced Refresh Feedback**: Redesigned refresh button with explicit status text ("Refreshing...") and improved hit area.
  **增强型刷新反馈**: 重新设计了刷新按钮，增加了显式的状态文字（“正在刷新...”）并优化了交互热区。

### Fixed

- **Rust Backend Robustness**: Resolved PathBuf scope issues and corrected Result handling in system-level Windows user providers.
  **Rust 后端加固**: 修复了 PathBuf 作用域错误，并修正了系统级 Windows 用户适配器中的 Result 处理逻辑。
- **TypeScript Build Errors**: Fixed unused effect imports in ManualTools component.
  **TS 构建修复**: 修复了工具组件中未使用的 Effect 引用导致的构建中断。

## [0.4.8] - 2026-02-12 [STABLE]

### Added

- **Global Mutant Scan (BAT-Mode)**: The scanning engine now covers all Windows sessions to ensure cross-user multi-instance capability, matching the logic of advanced community scripts.
  **全球逻辑锁全扫 (BAT 模式)**: 扫描引擎现在覆盖所有 Windows 会话，确保跨用户多开能力，逻辑深度与社区进阶脚本对齐。

### Fixed & Improved

- **Single Engine-Lock Strategy (Safety First)**: After technical verification, we decided to exclusively clean the global engine mutex (`DiabloII Check For Other Instances`) and related variants.
  - **Why not Path-Locks?**: Closing the CASC path lock (`data/data`) can cause state-desync in the game engine, leading to "Not Responding" hangs during game exit.
  - **Mirror Compatibility**: For users using mirrored/separated directories, the engine-level lock is the only blocker. By keeping the path lock intact, we ensure 100% stability and cleaner exits.
  **单引擎锁策略 (安全至上)**: 经过技术验证，我们决定仅清理全局引擎互斥锁 (`DiabloII Check For Other Instances`)。
  - **为何不清理路径锁？**: 强制关闭 CASC 路径锁 (`data/data`) 会导致游戏状态机脱节，引起退款时“程序未响应”或卡死。
  - **镜像兼容性**: 对于使用镜像目录的用户，引擎锁是唯一的阻碍。保留路径锁能确保 100% 的运行稳定性和正常的进程退出流程。
- **Surgical Lock Closing**: Refined the cleanup logic to use surgical name matching, ensuring absolutely zero interference with physical file handles.
  **外科手术式关闭逻辑**: 精炼了清理逻辑，采用精准名称匹配，确保对物理文件句柄零干扰。

## [0.4.7] - 2026-02-12

### Fixed

- **Surgical Mutex Cleaning**: Implemented broad-type name matching to bypass D2R multi-instance checks across all kernel object types while maintaining system stability.
  **外科手术式互斥锁清理**: 实现了广谱类型名字匹配技术，在保持系统稳定性的前提下，完美绕过 D2R 的各类内核对象多开校验。
- **Path-Based Lock Support**: Added specific targeting for folder-level path mutants used by newer game versions.
  **路径型锁支持**: 增加对新版游戏采用的目录级路径锁的专项清理支持。

## [0.4.4] - 2026-02-12

### Fixed

- **Mutex Matching Robustness**: Switched to substring matching for mutex names to support session-specific prefixes (e.g., `\Sessions\1\...`).
  **互斥锁匹配加固**: 改用子字符串匹配模式，完美支持不同会话下的互斥锁前缀（如沙盒或多用户环境）。
- **Detection Reliability**: Increased asynchronous probing timeout to 200ms to handle high system loads.
  **探测可靠性**: 将异步探测超时增加至 200ms，确保在系统高负载（20w+ 句柄枚举）时仍能准确捕捉目标。
- **Diagnostic Trace**: Improved backend logging to show matched object names.
  **诊断追踪**: 增强了后端日志，可实时显示命中的对象名称。

## [0.4.2] - 2026-02-12

### Fixed

- **Clean Build**: Fixed unused variable warning in `mutex.rs`.
  **构建清理**: 修复了 `mutex.rs` 中未引用变量导致的编译警告。

## [0.4.1] - 2026-02-12

### Fixed

- **Handle Access Rights**: Corrected `DuplicateHandle` access flags to preserve query rights, fixing the "Close Handle Failed" issue.
  **句柄访问权限**: 修正了 `DuplicateHandle` 的访问标志以保留查询权，解决了“关闭句柄失败”的问题。
- **Real-time Diagnostics**: Added detailed kernel-level trace logs in the atomic logs panel.
  **实时诊断提示**: 在原子操作日志面板中增加了详尽的内核级追踪日志。

## [0.4.0] - 2026-02-12

### Added

- **Industrial-Grade Mutex Engine**: Completely refactored the handle cleanup engine using `SystemExtendedHandleInformation` (64-bit class) to handle PIDs greater than 65535, preventing truncation bugs.
  **工业级互斥体引擎**: 彻底重构了句柄清理核心，采用 `SystemExtendedHandleInformation` (64位类) 解决 PID 超过 65535 时的截断问题。
- **Anti-Hang Probing (Async/Timeout)**: Implemented an asynchronous handle probing mechanism with a 100ms hard timeout per identification. The application will never hang, even when encountering blocked Named Pipes or network files.
  **异步探测引擎 (防卡死)**: 引入了子线程异步探测与 100ms 硬超时机制，即便遇到顽固的阻塞管道或网络文件，程序也绝不会无响应。
- **Type-Level Fast Filtering**: Optimized scanning performance by pre-filtering kernel objects by type before querying names, reducing kernel-mode transitions.
  **类型级快速过滤**: 在查询名称前先对内核对象类型进行预检，非关键对象直接跳过，显著提升扫描速度。
- **Self-Elevated Cleaning**: Integrated kernel-level `SeDebugPrivilege` activation within the cleaning function to ensure 100% success rate in cross-user (Sandbox) scenarios.
  **指令级提权闭环**: 句柄清理内置 `SeDebugPrivilege` 激活逻辑，确保在跨 Windows 用户启动场景下拥有 100% 的清理权限。

### Fixed

- **Memory Layout Alignment**: Corrected FFI structure alignments for modern Windows kernel versions to ensure absolute stability during high-load handle enumeration.
  **内存布局对齐**: 针对现代 Windows 内核修正了 FFI 结构对齐细节，确保在高负荷句柄枚举时的绝对稳定性。

## [0.3.9] - 2026-02-12

### Added

- **Native Win32 Engine**: Completely refactored core logic to use native Win32 APIs (Process, User, Registry) instead of legacy Shell commands for 100% path and language compatibility.
  **原生 Win32 引擎**: 彻底重构了核心逻辑，使用原生 Win32 API（进程、用户、注册表）替代旧版 Shell 指令，实现了 100% 的路径与语言兼容性。
- **Unicode Path Support**: Implemented full UTF-16 routing in the backend to ensure non-ASCII usernames (Korean, Chinese, etc.) are handled without corruption.
  **Unicode 路径支持**: 后端全面应用 UTF-16 路由，确保韩文、中文等非 ASCII 用户名和目录在全流程中零乱码。
- **Force Launch Fallback**: Added a specialized bypass option to ignore blocking notifications for edge-case environments.
  **强制启动回退**: 增加了专门的跳过选项，支持在特殊环境下强制绕过阻断式通知。

### Fixed

- **UI State Persistence**: Resolved a persistent bug where `PermissionsModal` and `MirrorModal` would retain "Finished" status when reopened.
  **UI 状态残留修复**: 修复了权限修复与镜像克隆窗口在关闭后重新打开时，仍残留上次“任务完成”状态的 Bug。
- **SID-Based Detection**: Enhanced process owner identification using robust SID equality comparison.
  **基于 SID 的检测**: 增强了进程所有者识别逻辑，采用更稳健的 SID 等值比对技术。

## [0.3.8] - 2026-02-12

### Added

- **System Log Access**: Added a "View System Logs" button in the Settings modal for easier diagnostics.
  **系统日志访问**: 在设置面板中新增“查看系统日志”按钮，方便用户快速获取诊断信息。

### Optimized

- **Log Management**: Implemented a 5MB size limit for the log file with automatic truncation to prevent excessive disk usage.
  **日志管理优化**: 为日志文件引入了 5MB 的容量限制及自动截断机制，有效防止长期运行导致的磁盘空间损耗。
- **Update Dialog UI**: Redesigned the "Check Update" dialog buttons with a two-line layout for better clarity and premium look.
  **更新弹窗 UI**: 为“检查更新”弹窗设计了垂直双行排版，主从分明，视觉效果更精致。
- **Dashboard Visuals**: Reverted dashboard buttons to a single-line layout for better proportion, while maintaining premium gradients and shadows.
  **仪表盘视觉优化**: 将启动按钮重构回紧凑的单行布局，并保留了极致的渐变与阴影特效，让界面重点更明确。

### Fixed

- **Launch Sequence Deadlock**: Resolved a bug where closing a blocking notification (like uninitialized user) would leave the launch button stuck in "Starting..." state.
  **启动序列卡死修复**: 解决了在关闭阻断式通知（如用户未初始化提示）后，启动按钮进入无限期卡死在“正在启动...”状态的问题。

## [0.3.7] - 2026-02-11

### Added

- **What's New Notification System**: Automatically highlights new features and version notes on the first launch after an update.
  **新特性发布系统**: 自动检测版本更新，并在首次启动时呈现精致的版本变动预览弹窗。
- **Startup Account Validation**: Proactive system-level check for configured accounts on launch.
  **合法性自检**: 启动时自动校验配置账户，识别并预警已被系统删除或未完全完成初始化的 Windows 用户。
- **Multi-Account Dual-Mode**: Introduced a specialized mode for power users, providing separate "Full Launch" vs "Bnet Only" start options.
  **多账户双启动模式**: 为进阶用户新增专用模式，支持“全量直启”与“仅开战网”的独立控制。
- **Interactive Permission Delegation**: Added a user-friendly tool to grant directory permissions for game updates with manual path selection.
  **交互式权限下放**: 新增图形化工具，支持手动选择目录并下放读写权限，解决更新授权难题。
- **Changelog Retrieval Command**: Added a backend command to bridge the `CHANGELOG.md` content directly to the UI.
  **后端日志透传**: 新增 Rust 后端指令，将项目变更日志实时对齐到前端交互界面。
- **Manual Changelog View**: Added a "Detailed Changelog" button in the Settings -> About section for manual review.
  **手动查看变更**: 在“设置-关于”区域新增入口，支持随时手动唤起版本更新说明。

### Fixed & Optimized

- **Responsive Permission Fixer**: Refactored the directory permission tool to be fully asynchronous and non-blocking, eliminating UI freezes ("Not Responding").
  **响应式权限修复**: 将目录权限修复指令彻底异步化，执行耗时任务时界面始终保持丝滑流畅，告别“程序未响应”。
- **Log Stream Purification**: Implemented byte-level parsing to extract clean file paths from `icacls`, hiding OS-level encoding corruption.
  **日志流净化**: 引入字节级解析逻辑，自动提取纯净路径，完美解决了特定 Windows 语言环境下路径乱码的问题。
- **Tactile Drag Experience**: Optimized the drag-and-drop logic for smoother performance; cards now follow the cursor with zero input lag.
  **极致拖动反馈**: 深度优化了 DND 拖拽引擎，移除了冗余的实时变换计算，卡片跟随指尖反馈瞬间直达。
- **Ghost Icon Refinement**: Integrated the "Invalid Account" ghost icon inside the avatar with a premium backdrop blur and corrected layering.
  **失效状态重构**: 将“失效账号”的小鬼标识重构集成至头像内部，配合背景模糊特效，修复了 UI 层级重叠问题。
- **Avatar Precision**: Improved avatar centering and sizing constraints across all view modes for a consistent look.
  **头像对齐优化**: 统一了全模式下的头像尺寸与对齐算法，确保在卡片与列表模式下皆表现完美。

### Internal

- **Core Modularization**: Decoupled `lib.rs` and Windows OS providers into domain-driven modules for better maintainability.
  **底层模块化重构**: 深度解耦了 Rust 后端核心与 Windows OS 适配器，按领域划分子模块，显著提升系统稳定性。
- **Custom Installer Icons**: Configured NSIS installer to utilize project-specific branding instead of default placeholders.
  **自定义安装器图标**: 配置 NSIS 安装程序使用项目专属图标，替代默认的通用占位符。

### Fixed

- **Cross-Language key Missing**: Fully synchronized all 5 localization files (CN, TW, EN, KO, JA) to ensure no translation keys are missing in any supported locale.
  **多语言 Key 缺失**: 全面同步了五国语言包，解决了部分语言环境下新功能 translation key 缺失的问题。

## [0.3.6] - 2026-02-11

### Added

- **Archive Conflict Resolution**: Interactive dialog to handle `product.db` conflicts with "Delete", "Reset", and "Cancel" options.
  **存档冲突解决**: 新增交互式对话框，支持通过“删除”、“重置”和“取消”选项处理 `product.db` 冲突。
- **Modular Launch Hook**: Introduced `useLaunchSequence` to centralize and decouple launch business logic from UI components.
  **模块化启动钩子**: 引入 `useLaunchSequence` 以集中并解耦启动业务逻辑与 UI 组件。

### Changed

- **UI Simplification**: Optimized "Independent Launch" layout in Tools view to prevent text overflow when a game is running.
  **UI 简化**: 优化了工具视图中的“独立启动”布局，防止游戏运行时出现文本溢出。
- **I18n Modernization**: Complete audit and removal of hardcoded strings in frontend logs and errors, syncing all 5 localization files.
  **国际化现代化**: 完成对前端日志和错误中硬编码字符串的全面审计与移除，并同步了所有 5 个语言文件。
- **Process Monitoring**: Switched to aggressive status refresh in the backend to ensure real-time UI response when Battle.net closes.
  **进程监控**: 后端切换到激进的状态更新机制，确保战网关闭时 UI 能实时响应。

### Fixed

- **Battle.net Status Bug**: Resolved the issue where the "Launch" button remained disabled after Battle.net was closed.
  **战网状态修复**: 解决了战网关闭后“启动”按钮仍处于禁用状态的问题。
- **Snapshot Robustness**: Enhanced file swap logic to handle edge cases where restore paths might be partially corrupted or occupied.
  **快照稳健性**: 增强了文件交换逻辑，以处理还原路径可能部分损坏或被占用的边缘情况。

## [0.3.5] - 2026-02-10

### Added

- **Native Title Bar**: Implementation of custom window title bar with theme-consistent controls.
- **Improved Nuke Flow**: Professional system reset modal with "yes" validation requirement.
- **Enhanced UI Aesthetics**: Swapped theme colors for better semantic clarity (Cleanup is now Red, System Tools Blue).

### Changed

- **Layout Optimization**: Realigned all tool buttons to consistent heights (h-11) and fixed spacing inconsistencies.
- **Scrolling Behavior**: Refined Dashboard scrolling priority to keep the "Launch" footer visible at all times.
- **Dimension Reversion**: Set default and minimum window size back to 800x600 for better compatibility.

### Fixed

- **Language Selector**: Resolved z-index conflicts and click-through issues with the native title bar.
- **I18n Keys**: Added missing localization strings for the advanced reset confirmation flow.

## [0.3.2] - 2026-02-10

### Added

- **Manual Tool: Language Expansion**: Enabled full support for Traditional Chinese (TW), Japanese (JA), and Korean (KO) in the UI.
- **Custom Language Selector**: Implemented a dark-mode styled custom dropdown to replace browser defaults for better UX.
- **User Guide Persistence**: Added "Don't show again" option to the User Guide modal with default checked state.
- **Process Feedback Enhancement**: "Launch" button now correctly disables if Battle.net or D2R is already active for the selected account.
- **Visual Running Indicator**: Added RUNNING status badge when an account is active (Battle.net or Game detected).
- **Nuke Tool**: Added a total system reset button in the System Tools card to terminate all processes and wipe login credentials with a "yes" confirmation.

### Changed

- **Settings UI Refinement**: Removed the descriptive text under the "Minimize to Tray" toggle for a cleaner layout.
- **Aesthetics Upgrade**: Improved Glassmorphism effect for all modals and UI panels with higher-fidelity borders and blurs.
- **Status Polling**: Increased process status polling frequency to 2 seconds for snappier UI feedback.
- **I18n Cleanup**: Synchronized and cleaned up redundant localization keys across all languages.
- **Build System**: Resolved various TypeScript linter errors and redundant imports causing CI failures.

## [0.3.1] - 2026-02-10 (Failed CI)

- Incremental version with UI optimizations.

## [0.3.0] - 2026-02-10

### Added

- **Ghost Detector**: Visual ghost icon (👻) and pulse effect for accounts in config but missing from Windows system.
- **Flame Portal Icon**: New dark-style portal icon for both installer and taskbar.
- **CI/CD Optimization**: Restored signing password to GitHub Actions and mapped R2 artifacts to `.update` suffix.

---

## [0.2.0] - 2026-02-07

### Added

- **Unified Notification System**: Introduced `NotificationManager` for centralized, blocking UI interaction.
- **Full-Chain Logging**: Complete integration of backend logs into frontend "Atomic Logs" with category filtering.
- **Dashboard Persistence**: Dashboard view mode (Grid/List) now persists in local configuration.
- **Compact Account Modal**: Re-designed account editing with inline labels to maximize vertical space.
- **Multi-Language Refresh**: Added precise labels (`label_password`, etc.) for all supported languages.

### Changed

- **UI Performance**: Removed layout-shifting (ring/scale) effects during dashboard selection for a smoother experience.
- **Hit-Area Optimization**: Enlarged dashboard list buttons (`h-9`) and improved hit-targets to prevent background click-through.
- **Account Manager Refresh**: Synchronized action button styles across all list views.

### Fixed

- **Mutex Logic**: Optimized Mutex cleaning to ignore harmless `0x80070032` (Not Supported) errors, reducing log noise.
- **Password Labels**: Corrected missing or ambiguous labels in the account edit modal.

---

## [0.1.2] - 2026-02-07

### Added

- **Admin Elevation**: Program now requests Administrator privileges via embedded UAC Manifest.
- **Admin Status Display**: Frontend shows real-time "Admin Mode" indicator.
- **Single Instance**: Added `tauri-plugin-single-instance` to prevent multiple instances and auto-focus existing window.
- **Cross-User Launch Fallback**: When `CreateProcessWithLogonW` fails due to Admin restrictions (0x8007052f), automatically falls back to `LogonUser` + `CreateProcessAsUser`.

### Changed

- **Build System**: Switched to `tauri-build::WindowsAttributes::app_manifest()` for Manifest injection, avoiding resource compiler conflicts (LNK1123).
- **OSProvider Enhancement**: `windows_impl.rs` now implements robust dual-path process creation strategy.
- **Documentation**: Updated `TECHNICAL_SPEC.md` to v3.0 reflecting the decoupled architecture.

### Fixed

- **Vite Warning**: Resolved dynamic import warning in `i18n.ts` by converting to static import.
- **LNK1123 Error**: Fixed "COFF conversion failed" by removing `embed-resource` and using native Tauri manifest injection.

---

## [0.1.2-alpha] - 2026-02-05

### Added

- **OSProvider Abstraction**: Introduced trait-based `OSProvider` layer to decouple business logic from OS-specific APIs.
- **Windows Implementation**: Added `WindowsProvider` utilizing `windows-rs` 0.62.2 for secure user management and process isolation.
- **Dependency Injection**: Integrated `OSProvider` into global `AppState`.

### Changed

- **Upgrade windows-rs**: Successfully upgraded to version 0.62.2.
- **Tauri Command Refactoring**: All core commands now consume `OSProvider` via dependency injection.

### Removed

- **Legacy Modules**: Deleted `win_user.rs` and `win32_safe/process.rs` after migration.

---

## [0.1.1] - 2026-01-26

### Added

- **Standardized Modal System**: Unified modal components across the application.
- **Enhanced Glassmorphism**: High-intensity frosted glass effect for premium aesthetic.

### Fixed

- **Donate Page Refactor**: Resolved layout issues with modern flex-based design.
- **Button Alignment**: Adopted right-aligned action buttons for all modal footers.

### Changed

- **Visual Polish**: Improved typography and avatar display.
