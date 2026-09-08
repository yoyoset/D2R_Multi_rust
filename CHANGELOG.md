# Changelog

All notable changes to this project will be documented in this file.

## [0.7.2] - 2026-09-08

### Fixed (修复)
- **序列启动器可能永久卡在"正在启动" / Sequencer could get stuck on "Launching…" forever**：序列迷你窗口关闭时其实只是隐藏到托盘、并未销毁，它的界面状态会跨多轮序列运行一直存活；一旦某次点击的响应未能正常落地（比如窗口正隐藏在托盘期间），"正在启动"这个标志就会永远留在界面上——哪怕之后关掉所有游戏、重新开一轮全新的序列，界面也会立即显示"正在启动"，即使实际上并没有任何请求在等待。现在序列状态每次更新时都会强制清除这个标志，不再信任窗口自己缓存的旧状态。 / The sequencer mini-window is only hidden (not destroyed) when closed, so its UI state persists across sequence runs. If any single click's response ever failed to land cleanly (e.g. while the window was hidden in the tray), the "Launching…" flag could stay stuck forever — even after closing every game and starting a brand-new sequence run, the window would show "Launching…" immediately with nothing actually pending. The flag is now force-cleared on every sequence state update instead of trusting stale cached state.
- **序列单步启动缺少超时，可能无限期卡死界面 / A single sequence step had no timeout and could hang the UI indefinitely**：负责用目标账号密码拉起战网的 Win32 调用（CreateProcessWithLogonW）本身没有超时；一旦系统层面卡住，序列窗口会无限期停在"正在启动"，除了强制退出整个程序别无他法。现在每一步都有 30 秒硬超时，超时后自动放弃等待、解除界面卡死并给出提示（底层调用可能仍在后台运行，稍后可能自行完成）。 / The Win32 call that logs on as the target account and launches Battle.net (CreateProcessWithLogonW) has no timeout of its own; if it ever stalls at the OS level, the sequence window would sit on "Launching…" forever with no recovery short of force-quitting the whole app. Every step now has a hard 30-second ceiling — past it, the app gives up waiting, unblocks the UI, and shows a notice (the underlying call may still be running in the background and could finish on its own).
- **跨用户启动前置校验：从未登录过的 Windows 账户会导致卡死 / Pre-flight check for never-logged-in Windows accounts**：目标账户若从未交互式登录过（没有本地资料/AppData），CreateProcessWithLogonW 会陷入 Windows 首次登录初始化流程，且不会返回，界面表现为无限期"正在启动"。现在启动前会先检查该账户是否已初始化，未初始化则立即返回明确错误（提示需先手动登录一次），不再无声卡死。 / If the target account has never logged in interactively before (no local profile/AppData), CreateProcessWithLogonW runs into Windows' first-login initialization flow and never returns, showing up as an indefinite "Launching…". Launches now check whether the account is initialized first and fail fast with a clear error (asking for one manual first login) instead of silently hanging.

### Changed (变更)
- **启动分阶段耗时日志常驻输出 / Phase-timing logs are always on now**：此前只有调试版才输出的 `[PERF]` 分阶段耗时日志（杀进程、清互斥锁、文件对齐、Win32 登录调用等各阶段耗时），正式发布版现在也会写入日志面板，便于排查启动卡死问题定位到具体阶段。 / The `[PERF]` phase-timing log lines (per-phase duration for killing processes, clearing mutexes, file alignment, the Win32 logon call, etc.) previously only appeared in debug builds. Release builds now log them too, so a stuck launch can be pinned to a specific phase from the Logs panel alone.

## [0.7.1] - 2026-09-08

### Documentation (文档)
- **补充 MIT LICENSE 文件 / Added the MIT LICENSE file**：README 一直标注 MIT，但仓库里没有实际的 LICENSE 文件，现已补上。 / The README has always said MIT, but the repository never actually shipped a LICENSE file — it's added now.
- **新建 Windows 用户的首次登录建议 / First-login guidance for freshly created Windows users**：README 与手册（§5.3、常见问题）新增一条小建议——刚新建的本地 Windows 用户，最好自己手动切换过去登录一遍系统、并在里面登录一次战网，而不是完全交给工具的首次跨用户启动去处理；一个从没在本机登录过的全新账号，走跨用户桥接一次性完成"系统初始化 + 战网登录"偶尔会有点不确定，手动走一遍能完全绕开。纯文档澄清，不涉及代码逻辑变更。 / README and the guide (§5.3, Troubleshooting) now suggest that for a brand-new local Windows user, it's a bit more reliable to switch to it and log in yourself once — including logging into Battle.net there — rather than relying entirely on the tool's first cross-user launch to do both "system init" and "Battle.net login" at once; a profile that has never logged in locally can be a little unpredictable over that bridge, and a manual first login sidesteps it. Documentation-only clarification, no behavior change.

## [0.7.0] - 2026-07-19

> 📌 **升级须知 / Upgrade note**：升级后首次启动，程序会自动从各账号的现有快照同步「基准路径」，并弹出一次性报告；报告中“仍需手动标定”的账号，请到账号编辑里确认基准路径（或勾选「非 D2R 账户」）。 / On first launch after upgrading, baseline paths are seeded automatically from each account's existing snapshots and a one-time report is shown; for accounts listed as "needs manual confirmation", set the baseline in the account editor (or mark them Non-D2R).

### Added (新增)
- **基准路径：自动备份的唯一判据 / Baseline path — the sole backup criterion**（从根源修复串路径 / fixes path cross-contamination at the root）：
  - **是什么**：战网客户端里配置的游戏目录（用镜像时为镜像路径），在账号编辑中用「浏览」或快照建议亲自确认；新建 D2R 账号必填（Windows 密码同为必填，仅当前登录用户可留空）。多开的路径不会自愈，必须由人拍板。 / **What it is**: the game directory configured inside Battle.net (the mirror path when using junctions), confirmed by you via Browse or snapshot suggestions in the account editor; required for new D2R accounts (so is the Windows password, waived only for the current logged-in user). Game paths never self-heal, so a human sets the anchor.
  - **无感轮巡**：每次启动开头，若机器上的 product.db 归属某账号（按程序自己的注入台账）且路径与其基准一致，即自动备份其快照——最后启动的账号也会在下次启动时被自动补上，隔重启生效、不依赖序列、不看进程状态。 / **Seamless rotation**: at the start of every launch, if the live product.db belongs to an account (per the app's own injection ledger) and its paths match that account's baseline, its snapshot is backed up automatically — including the last-launched account at the next launch, across reboots, no sequencer needed, regardless of running processes.
  - **不符 → 人工裁决**：争议文件先封存（启动永不阻塞），弹窗二选一「取消备份 / 更新基准并备份」；未处理的下次启动重弹。勾选「唯一基准」的账号不弹窗、静默取消并记日志。原则：错备份不可逆、漏备份可逆——存疑一律不落盘。 / **Mismatch → arbitration**: the disputed file is stashed first (launches are never blocked) and a dialog offers cancel / update-baseline-and-back-up; unresolved dialogs reappear next start. "Sole Baseline" accounts skip the dialog and cancel silently with a log entry. Principle: a wrong backup is irreversible, a missed one isn't — anything in doubt is never written.
- **非 D2R 账户类型 / Non-D2R account type**：服务只用 Windows 用户隔离做战网免登录切换、不玩 D2R 多开的用户。勾选后不要求基准路径，备份凭台账归属直接进行（此类账号共享同一套游戏安装、配置同质，串路径危害不存在；备份保住“已定位的游戏列表”，免得战网反复要求定位）。 / For users who only switch Battle.net accounts via Windows-user isolation and never multibox D2R: no baseline required, and backups run on ledger ownership alone (such accounts share the same machine-wide installs, so configs are homogeneous and crossing can't hurt them; the backup preserves the "games already located" state).
- **首次升级自动播种基准 / Baseline seeding on first upgrade**：老配置升级不再导致自动备份全停——首次启动从各账号快照播种基准（仅当快照恰好记录一条游戏路径；装有多个暴雪游戏无法判定时留待手动），并弹出顶部所述的升级报告，未点「知道了」前跨重启保留。 / Upgrading an old config no longer pauses all auto-backups — on first launch baselines are seeded from each account's snapshot (only when it records exactly one game path; ambiguous multi-game snapshots are left for manual confirmation) and the upgrade report above is shown, persisting across restarts until acknowledged.
- **基准配套防线 / Baseline guardrails**：保存账号时基准与快照不符三选一确认；每次恢复快照都用基准审计注入内容，不含基准立即警告“可能过期或被污染”；序列「完成并备份」保存前校验归属与内容；兼容“复制文件地址”的带引号路径；快照比对要求记录的每条路径都在场——第二个暴雪游戏无法再掩盖被串的 D2R 路径。 / Saving an account whose baseline differs from its snapshot asks to confirm (use mine / adopt snapshot / cancel); every snapshot restore is audited against the baseline (instant "stale or polluted" warning if absent); the sequencer's "Finish & Back Up" verifies ownership and content before saving; quoted "Copy as path" paths are normalized; snapshot comparisons require every recorded path to be present, so a second installed Blizzard game can no longer mask a swapped D2R path.

### Fixed (修复)
- **串路径（路径交叉污染）根修 / Path cross-contamination fixed at the root**：旧机制把「战网+游戏双在位」当作 product.db 属于该账号的证据；在工具外重开战网（双击图标、D2R 重认证）即可制造假双在位，把最后账号的路径备份进先前账号的快照、永久串号。新的“台账+基准”模型让身份来自工具自己的注入记录、有效性来自用户确认的路径，双在位彻底退出备份决策（仅保留路径学习）。配套加固：归属指向已删账号按无主处理；界面保存设置不再覆盖后端台账；快照不再继承“隐藏”文件属性。 / The old flow treated "Battle.net + D2R both online" as proof that the machine-global product.db belonged to that account; re-opening Battle.net outside the tool (double-click, or D2R re-authentication) forged that proof and backed the last account's paths into an earlier account's snapshot, permanently crossing it. Under the ledger + baseline model, identity comes from the app's own injection records and validity from the user-confirmed path; double-online is out of backup decisions entirely (kept only for path learning). Hardening: ownership pointing at a deleted account counts as unowned; UI settings saves no longer clobber the backend-maintained ledger; snapshots no longer inherit the Hidden file attribute.

### Removed (移除)
- **“最后账号需手动保存快照”提醒退役 / Last-account manual-save reminder retired**：基准轮巡已补上这个 v0.6.7 提醒所为的缺口——最后启动的账号会在下次启动时自动补备份，无需手动收尾。移除仪表盘/账号管理横幅（及设置开关）、账号编辑与序列编辑器的说明条、程序内指南对应区块；手册与 README 已按自动轮巡改写。「保存快照」与「完成并备份」保留为可选的即时备份。 / The baseline rotation closed the gap this v0.6.7 reminder existed for — the last-launched account now backs up automatically at the next launch. Removed the dashboard/account-manager banner (and its Settings toggle), the notes in the account editor and sequence editor, and the in-app guide section; the guide and READMEs were rewritten around the rotation. "Save Snapshot" and "Finish & Back Up" remain as optional instant backups.

### Documentation (文档)
- **手册围绕核心理念重写 / Guide rewritten around the core model**：第 4 章改为三大支柱——免登录 = Windows 多用户隔离（凭据与密码绑定，改密码即触发重新登录，故建议密码永不过期且不再改动）；多开 = 路径 + 句柄（路径由人设基准、程序核对，句柄清理已成熟）；系统依赖 = NTFS（目录镜像 Junction 仅 NTFS 可用）。新增 §4.6 镜像与 NTFS、§5.2 新字段（账户类型/基准路径/唯一基准/必填项）、升级报告与裁决弹窗的排错条目及术语表。 / Chapter 4 now leads with the three pillars — login-free = Windows multi-user isolation (credentials are keyed to the password; changing it forces a Battle.net re-login, hence "password never expires" and leave it alone); multi-boxing = paths + handles (a human sets the baseline, the app verifies; handle cleanup is mature); system dependency = NTFS (junction mirrors require it). Added §4.6 mirrors & NTFS, the new §5.2 fields (account type / baseline / sole-baseline / required fields), troubleshooting entries for the upgrade report and arbitration dialog, and new glossary terms.

---

## [0.6.8] - 2026-06-12

### Changed (变更)
- **Audit Vault Now Verifies Passwords / 审计凭据现在真实验证密码**: The Dashboard's "Audit Vault" button previously only checked that vault entries existed and could be decrypted — a wrong Windows password passed silently, and the button gave no feedback at all, appearing dead. It now performs a real Windows logon check (LogonUser) for every account's stored password, shows a spinner while auditing, and reports the result as a notification: success when all passwords verify, or a warning naming each account with a wrong password or missing credential. (仪表盘「审计凭据」此前只检查凭据条目是否存在、能否解密——Windows 密码错误也不会被发现，且点击后毫无反馈，看起来像没反应。现在会对每个账号存储的密码执行真实的 Windows 登录校验（LogonUser），审计期间按钮显示转圈，完成后弹出通知：全部通过报成功，否则点名列出密码错误或凭据缺失的账号)

### Fixed (修复)
- **Sequencer Launch Button Cool-down Removed / 移除序列启动按钮多余冷却**: After the backend finished launching an account, the mini-window's launch button stayed locked in "Launching..." for an extra hard-coded 3 seconds. The backend already serializes account switching safely (it kills the previous stack and waits for product.db to unlock before launching), so the button now unlocks the moment the launch call returns. (后端启动完成后，迷你窗的启动按钮还会额外硬等 3 秒才解锁。账号切换的安全性本就由后端保证——启动前会先杀掉上一账号的进程并等待 product.db 解锁——现在启动调用一返回按钮立即可用)

---

## [0.6.7] - 2026-06-10

### Added (新增)
- **Snapshot Reminder / 快照提醒**: A collapsible one-line banner on the Dashboard and Account Manager reminds you that the **last launched account must be snapshotted manually** (auto-backup only happens at the next launch). Expand for the full explanation; dismiss by typing "yes"; re-enable any time via Settings → "Show snapshot reminder banner". Contextual notes were also added to the Add/Edit Account modal and the Sequence editor. (仪表盘与账号管理顶部新增可折叠的一行提醒：最后启动的账号需手动保存快照——自动备份只在下次启动时发生。点击展开详情；输入 yes 关闭；可随时在「设置 → 显示快照提醒横幅」重新开启。账号编辑弹窗与序列编辑器也加入了对应说明)
- **Sequencer "Finish & Back Up" / 序列「完成并备份」**: When a sequence finishes, the mini-window button becomes a green **Finish & Back Up** — click it (once you're done adjusting settings) to save the last account's snapshot and close; clicking ✕ closes without backing up. Safety guard: if another account's Battle.net is detected running (path data already swapped), the backup is refused with a warning; failures keep the window open and show an error instead of closing silently. (序列完成后迷你窗按钮变为绿色「完成并备份」——调整好设置后点击即保存最后账号的快照并关窗；点 ✕ 则不备份仅关窗。安全防护：若检测到其他账号的战网已在运行（路径数据已被换走）会拒绝备份并警告；备份失败时保留窗口并报错，不再静默关闭)

### Fixed (修复)
- **Diagnostic Result Colors / 诊断结果配色**: PASS results showed a yellow warning icon and the raw key `STATUS_PASS`; status values are now matched and translated correctly, and the missing Tailwind 400/500/600 semantic-color shades were defined so diagnostic (and other) panels no longer render all-white. (诊断 PASS 项曾显示黄色叹号与原始键 STATUS_PASS；现已正确匹配并翻译状态值，并补全了 Tailwind 400/500/600 语义色阶——诊断等面板不再整体发白)
- **Sequencer Mini-Window Text / 序列迷你窗文案**: The finished state showed the untranslated "ALL_DONE", and the progress title contained a garbled "?" separator; both fixed across all five languages. (完成态曾显示未翻译的 ALL_DONE，进度标题分隔符为乱码“?”；五种语言均已修复)
- **Dashboard Spacing / 仪表盘间距**: The sticky section header no longer covers the banner above it; spacing between the section title, sequence presets, launch buttons, and account cards was tightened. (吸顶表头不再遮挡其上方的横幅；账号营地、序列预设、启动按钮与账号卡片之间的间距已收紧)

### Documentation (文档)
- **Illustrated User Guide / 图文使用手册**: `User_Guide.md` (bilingual) now ships with real screenshots in `doc/images/` and documents the new Save-Snapshot / Finish & Back Up flow; both READMEs were rewritten around the screenshots with a Quick Start; the in-app guide gained the snapshot-flow section with embedded images; a ready-to-post forum introduction draft was added (`doc/forum_post_kanezhijiao.md`). (双语手册配齐实拍截图并写入新的保存快照/完成并备份流程；中英 README 围绕截图重写并新增快速开始；程序内指南加入内嵌截图的快照流程区块；新增凯恩之角发帖稿)

---

## [0.6.6] - 2026-06-07

### Performance (性能)
- **Cross-User Launch ~8× Faster / 跨用户启动提速约 8 倍**: A cross-user (guest account) launch dropped from ~2.4s to ~0.3s. Per-phase profiling pinpointed the waste and removed it. (一次跨用户/访客账号启动从约 2.4 秒降到约 0.3 秒；通过对每个阶段埋点测量定位并消除了浪费)
- **Process Kill / 杀进程**: Replaced sysinfo's `kill()` — which blocks ~500ms per process waiting for exit — with a direct, non-blocking `TerminateProcess`, and removed the old fixed ~1.5s graceful-close poll. Kill is now an ordered force-kill (Battle.net before Agent, since Battle.net respawns Agent) that confirms completion by polling `product.db` writability instead of blind waiting. This phase went from ~2000ms to ~15ms. (用直接、非阻塞的 `TerminateProcess` 取代 sysinfo 的 `kill()`（后者每进程等退出约 500ms），并移除旧的固定约 1.5 秒优雅关闭轮询。改为有序强杀——先战网后 Agent，因战网会拉起 Agent——并以 `product.db` 是否可写为完成判据；该阶段从约 2000ms 降到约 15ms)
- **Mutex Sweep / 互斥锁清理**: The system-handle enumeration now starts with a large buffer (one pass instead of re-enumerating ~200k handles 4–5 times as a small buffer doubled); the cross-session global scan is gated and skipped on normal launches. (系统句柄枚举改为一次性大缓冲，不再因小缓冲翻倍而把约 20 万句柄重复枚举 4–5 次；跨会话全局扫描改为门控，正常启动时跳过)
- **Process Refresh / 进程刷新**: The pre-launch scan resolves owner/exe only for Battle.net/D2R processes instead of every process on the system. (启动前扫描只对战网/D2R 进程解析所有者与路径，不再遍历系统全部进程)

### Fixed (修复)
- **D2R Instance Lock Detection / D2R 实例锁识别**: The "DiabloII Check For Other Instances" lock is an **Event** object, not a Mutant; handle-type filtering now correctly includes Event so multi-boxing reliably clears it. (“DiabloII Check For Other Instances”锁是 **Event** 类型而非 Mutant；句柄类型过滤现已正确包含 Event，多开可稳定清除)
- **Log File Location / 日志文件位置**: The system log now follows the configured data directory (`<data>\logs\`) instead of being hard-coded next to the exe. (系统日志现跟随所设置的数据目录 `<data>\logs\`，不再硬编码写在 exe 旁)
- **Untranslated Tool Logs / 工具日志未翻译**: Standalone tools (clean mutex, force-kill, reset, cleanup, force-launch) now show translated messages instead of raw i18n keys like `LOGS.GAME.MUTEX_KILLED`. (独立工具——清理互斥锁、强制杀进程、复位、清理、强制启动——的日志现显示翻译文案，不再是 `LOGS.GAME.MUTEX_KILLED` 这样的原始键)

---

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
