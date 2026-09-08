use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use crate::modules::account::types::{Account, AccountError, LaunchLogPayload};
use crate::modules::{file_swap, logger, process_killer, win_admin};
use crate::modules::os::OSProvider;
use crate::modules::win32_safe::mutex;
use crate::modules::vault::Vault;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate};

pub fn launch_game(
    os: &dyn OSProvider,
    app: &AppHandle,
    account: &Account,
    bnet_only: bool,
    force: bool,
    advanced_mode: bool,
) -> Result<u32, AccountError> {
    // [PERF] Phase-level instrumentation. Grep "[PERF]" in logs to see the
    // per-phase breakdown of a cross-user launch. Baseline before optimization.
    let __perf_start = std::time::Instant::now();
    let mut __perf_mark = __perf_start;
    // Temporarily always-on (not debug-gated): there's an open report of
    // launches hanging indefinitely with no visible cause, and the phase
    // breakdown is the only way to see which stage it's actually stuck in
    // from a release build's Logs panel. Re-gate behind cfg!(debug_assertions)
    // once that's root-caused.
    macro_rules! perf {
        ($label:expr) => {{
            let now = std::time::Instant::now();
            crate::modules::logger::log(
                Some(app),
                "info",
                None,
                None,
                &format!("[PERF] {:<16} {:>6} ms", $label, now.duration_since(__perf_mark).as_millis()),
            );
            __perf_mark = now;
        }};
    }

    // 0. Pre-Maintenance Audit: Look for "Double-Online" accounts to backup
    if !advanced_mode {
        logger::log_localized(Some(app), "info", "logs.launcher.scanning_env", None, "Scanning environment (Anchor verification)...");
    }
    
    let state = app.state::<crate::state::AppState>();

    // Soft launch pacing (NOT a multi-account block).
    //
    // Multi-account is the core purpose of this tool, so we never block on
    // "another account is running". The only real hazard is a timing race:
    // every launch kills Battle.net globally, so launching a *second* account
    // before the *previous* one's Battle.net has come up can abort it. We guard
    // only that window, and softly:
    //   - `force == true` bypasses it entirely (the dashboard's amber 强制
    //     button and the sequencer both pass force=true).
    //   - It only applies across *different* accounts, never to re-launching
    //     the same one.
    //   - It releases the instant the previous account's Battle.net (or D2R)
    //     is visible in the status cache, or after a safety cap — so it can
    //     never strand a launch indefinitely.
    if !force {
        const PACING_CAP: std::time::Duration = std::time::Duration::from_secs(60);
        let cur_user = account.win_user.to_lowercase();
        let pending_prev = {
            let last = state.last_launch_lock();
            last.as_ref().and_then(|(prev_user, when)| {
                if prev_user != &cur_user && when.elapsed() < PACING_CAP {
                    Some(prev_user.clone())
                } else {
                    None
                }
            })
        };

        if let Some(prev_user) = pending_prev {
            let prev_up = {
                let status_cache = state.status_lock();
                status_cache.iter().any(|(user, status)| {
                    user.to_lowercase() == prev_user
                        && (status.bnet_pid.is_some() || status.d2r_pid.is_some())
                })
            };

            if !prev_up {
                logger::log_localized(Some(app), "warn", "error.game.launch_too_soon",
                    Some(serde_json::json!({ "user": prev_user })),
                    "Launch pacing: previous account's Battle.net is still starting up; wait or force");
                return Err(AccountError::SysInfo("LAUNCH_TOO_SOON".to_string()));
            }
        }
    }

    // Record this launch so the next one is paced against it.
    {
        let mut last = state.last_launch_lock();
        *last = Some((account.win_user.to_lowercase(), std::time::Instant::now()));
    }

    state.refresh_game_processes();
    perf!("P1.refresh");

    let sys = state.sys_lock();
    let users = state.users_lock();

    // Map: Username -> (HasBnet, HasD2R, D2RPath)
    let mut user_states: std::collections::HashMap<String, (bool, bool, Option<PathBuf>)> = std::collections::HashMap::new();
    // D2R PIDs discovered here are reused by the mutex phase, so it doesn't need
    // to spin up its own System + full with_exe refresh again.
    let mut d2r_pids: Vec<u32> = Vec::new();

    for (pid, process) in sys.processes() {
        let name_os = process.name();
        let name = name_os.to_string_lossy().to_lowercase();
        if name == "d2r.exe" || name == "battle.net.exe" || name == "d2r" || name == "battle.net" {
            if name.contains("d2r") {
                d2r_pids.push(pid.as_u32());
            }
            if let Some(user_id) = process.user_id() {
                if let Some(user) = users.get_user_by_id(user_id) {
                    let username = user.name().to_string().to_lowercase();
                    let state = user_states.entry(username).or_insert((false, false, None));

                    if name.contains("battle.net") {
                        state.0 = true;
                    } else if name.contains("d2r") {
                        state.1 = true;
                        // Record D2R path
                        if let Some(exe_path) = process.exe() {
                            state.2 = Some(exe_path.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    // 1. Snapshot Saving & Path Learning
    // 释放 sys 和 users 锁以避免死锁（status.rs 的锁顺序是 config -> sys）
    drop(sys);
    drop(users);

    if !advanced_mode {
        let mut current_config = state.config_lock();
        let mut config_changed = false;

        // A. Path Auto-Learning (display/diagnostics only). The double-online
        // process scan feeds ONLY this — it plays no role in backup decisions
        // anymore.
        for acc in &mut current_config.accounts {
            let normalized_win_user = if let Some(pos) = acc.win_user.find('\\') {
                acc.win_user[pos+1..].to_lowercase()
            } else {
                acc.win_user.to_lowercase()
            };

            if let Some((has_bnet, has_d2r, d2r_path)) = user_states.get(&normalized_win_user) {
                if *has_bnet && *has_d2r {
                    if let Some(path) = d2r_path {
                        let path_str = path.to_string_lossy().to_string();
                        logger::log_localized(Some(app), "info", "logs.launcher.anchor_found", Some(serde_json::json!({ "user": acc.win_user, "path": path_str })),
                            &format!("Account {} active, anchor path: {}", acc.win_user, path_str));

                        if acc.game_path != Some(path_str.clone()) {
                            acc.game_path = Some(path_str.clone());
                            config_changed = true;
                            logger::log_localized(Some(app), "success", "logs.launcher.path_captured", Some(serde_json::json!({ "user": acc.win_user, "path": path_str })),
                                &format!("Captured latest game path for {}: {}", acc.win_user, path_str));
                        }
                    }
                }
            }
        }

        // B. Unified backup rule — the baseline path is THE sole criterion.
        //
        //   live product.db exists AND the ledger names an existing account?
        //     ├─ account has a baseline and live records it → back up (无感轮巡,
        //     │  no process evidence needed: identity = ledger, validity = the
        //     │  game path, the only field of product.db that does not self-
        //     │  heal online once Battle.net logs in with valid credentials)
        //     ├─ mismatch → strict_baseline (唯一基准): silently cancel + log;
        //     │  otherwise: stash the DISPUTED live file to pending_{id}.db
        //     │  (the injection below destroys the original before the user
        //     │  can rule) and emit "baseline-conflict" for arbitration in the
        //     │  main window (cancel backup / adopt as new baseline & back up)
        //     ├─ no baseline → skip + hint (set a baseline to enable rotation)
        //     └─ undetermined (no extractable path) → skip (never risk a bad
        //        capture; a missed backup is recoverable, a wrong one is not)
        //
        // The ledger is ignored when it names a deleted account (orphan id
        // from deletion/migration/hand-edits); the next injection rewrites it.
        let live_owner = current_config.live_db_owner.clone().filter(|owner_id| {
            current_config.accounts.iter().any(|a| a.id == *owner_id)
        });

        if let Some(owner_id) = live_owner.as_deref() {
            let owner_acc = current_config.accounts.iter().find(|a| a.id == owner_id)
                .cloned()
                .expect("live_owner filtered against accounts above");

            if !owner_acc.skip_config_sync {
                if !owner_acc.is_d2r {
                    // Pure Battle.net login-switching account (no D2R multibox):
                    // such accounts share the same machine-wide game installs, so
                    // product.db contents are homogeneous between them and path
                    // cross-contamination cannot harm them. Ledger ownership
                    // alone authorizes the backup — it preserves the "games
                    // already located" state so Battle.net doesn't keep asking.
                    logger::log_localized(Some(app), "info", "logs.launcher.backing_up_owner_plain", Some(serde_json::json!({ "user": owner_acc.win_user })),
                        &format!("Ledger ownership confirmed — backing up previous account {}'s snapshot (non-D2R account)", owner_acc.win_user));
                    if let Err(e) = file_swap::rotate_save(app, owner_id) {
                        tracing::warn!("Rotation backup failed for {}: {}", owner_acc.win_user, e);
                    }
                } else {
                match owner_acc.baseline_path.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                    None => {
                        logger::log_localized(Some(app), "info", "logs.launcher.backup_skipped_no_baseline", Some(serde_json::json!({ "user": owner_acc.win_user })),
                            &format!("No baseline path set for {} — auto-backup skipped. Confirm a baseline in the account editor to enable seamless rotation backups.", owner_acc.win_user));
                    }
                    Some(baseline) => match file_swap::live_config_contains_path(baseline) {
                        Some(true) => {
                            logger::log_localized(Some(app), "info", "logs.launcher.backing_up_owner", Some(serde_json::json!({ "user": owner_acc.win_user })),
                                &format!("Ledger + baseline verified — backing up previous account {}'s snapshot (seamless rotation)", owner_acc.win_user));
                            if let Err(e) = file_swap::rotate_save(app, owner_id) {
                                tracing::warn!("Rotation backup failed for {}: {}", owner_acc.win_user, e);
                            }
                        }
                        Some(false) => {
                            logger::log_localized(Some(app), "warn", "logs.launcher.backup_skipped_mismatch", Some(serde_json::json!({ "user": owner_acc.win_user })),
                                &format!("Skipped auto-backup for {}: live Battle.net config does not match this account's baseline path (path cross-contamination guard)", owner_acc.win_user));
                            if !owner_acc.strict_baseline {
                                // Stash the disputed live file NOW — the wipe
                                // below destroys it long before the user can
                                // answer the arbitration dialog.
                                match file_swap::stash_pending(app, owner_id) {
                                    Ok(()) => {
                                        let live_paths = file_swap::pending_game_paths(app, owner_id);
                                        let _ = app.emit("baseline-conflict", serde_json::json!({
                                            "account_id": owner_id,
                                            "user": owner_acc.win_user,
                                            "baseline": baseline,
                                            "live_paths": live_paths,
                                        }));
                                    }
                                    Err(e) => tracing::warn!("Failed to stash pending conflict copy for {}: {}", owner_acc.win_user, e),
                                }
                            }
                            // strict_baseline (唯一基准): no prompt of any kind —
                            // the baseline is immutable truth, mismatches are
                            // cancelled outright (log above is the only trace).
                        }
                        // Live file missing or no recognizable paths — fresh
                        // initial state or mid-write; nothing safe to capture.
                        None => {}
                    },
                }
                }
            }
        }

        if config_changed {
            let _ = current_config.save(app);
        }
    }

    perf!("P1.audit_save");

    // 2. Cleanup (Kill Bnet/D2R, Mutexes)
    logger::log_localized(Some(app), "info", "logs.launcher.clearing_env", None, "Clearing environment...");

    let __kill_t = std::time::Instant::now();
    let killed = {
        let mut sys_lock = state.sys_lock();
        // Name-based kill: no with_exe/with_user needed (matches on process name),
        // which makes this refresh meaningfully cheaper than the old with_exe scan.
        sys_lock.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing()
        );
        process_killer::force_kill_bnet_stack(&mut sys_lock)
    };
    crate::modules::logger::log(Some(app), "info", None, None,
        &format!("[PERF]   kill.force   {:>5} ms (killed {})", __kill_t.elapsed().as_millis(), killed));

    if killed > 0 {
        logger::log_localized(Some(app), "success", "logs.launcher.killed_processes", Some(serde_json::json!({ "count": killed })),
            &format!("Terminated {} related processes", killed));
    }

    // Confirm product.db is actually writable before we overwrite it. This
    // replaces the old blind ~1500ms graceful-poll: TerminateProcess releases
    // the file handle near-instantly, so we just spin briefly with a short
    // backoff. Respawn insurance: since Battle.net.exe is Agent's resurrector,
    // if the lock is somehow still held we re-scan Agent/BN by name once and
    // kill again. We never hold sys_lock across the sleep (avoids starving the
    // background status poller).
    {
        use std::time::{Duration, Instant};
        let __verify_t = Instant::now();
        let deadline = Instant::now() + Duration::from_millis(1000);
        let mut rescued = false;
        let mut iters = 0u32;
        while file_swap::verify_config_writable().is_err() {
            if Instant::now() >= deadline {
                break;
            }
            iters += 1;
            if !rescued {
                let mut s = state.sys_lock();
                s.refresh_processes_specifics(
                    ProcessesToUpdate::All,
                    true,
                    ProcessRefreshKind::nothing(),
                );
                let _ = process_killer::force_kill_names(&mut s, &["Battle.net.exe", "Agent.exe"]);
                rescued = true;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        let final_writable = file_swap::verify_config_writable().is_ok();
        crate::modules::logger::log(Some(app), "info", None, None,
            &format!("[PERF]   kill.verify  {:>5} ms (iters {}, rescued {}, writable {})",
                __verify_t.elapsed().as_millis(), iters, rescued, final_writable));
    }
    perf!("P2.kill");

    if !bnet_only && !advanced_mode {
        if win_admin::enable_debug_privilege() {
            // Reuse the D2R PIDs found during the pre-flight audit instead of
            // letting the mutex phase do its own System + full with_exe refresh.
            match mutex::close_d2r_mutexes_with_pids(app, &d2r_pids) {
                Ok(count) if count > 0 => {
                    logger::log_localized(Some(app), "success", "logs.launcher.closed_mutexes", Some(serde_json::json!({ "count": count })),
                        &format!("Closed {} kernel mutexes", count));
                }
                _ => {}
            }
        }
    }

    perf!("P2.mutex");

    // 3. Environment Injection (Restore Target Snapshot)
    logger::log_localized(Some(app), "info", "logs.launcher.verifying_permissions", None, "Verifying file access permissions (Atomic lock)...");
    if let Err(e) = file_swap::verify_config_writable() {
         logger::log_localized(Some(app), "error", "logs.launcher.file_occupied_error", Some(serde_json::json!({ "error": e.to_string() })),
             &format!("Security Interception: Battle.net config file still in use. Reason: {}", e));
         return Err(AccountError::FileSwap(e));
    }

    logger::log_localized(Some(app), "info", "logs.launcher.aligning_files", None, "Aligning files...");
    
    // 3.1. Ensure we start with a clean Slate (Atomic Cleanup)
    file_swap::delete_config().map_err(|e| {
        logger::log_localized(Some(app), "error", "logs.launcher.cleanup_error", Some(serde_json::json!({ "error": e.to_string() })),
            &format!("Alignment failed: Unable to clean old files. {}", e));
        AccountError::FileSwap(e)
    })?;

    // 3.2. Inject target snapshot
    match file_swap::restore_snapshot(app, &account.id) {
        Ok(true) => {
            logger::log_localized(Some(app), "success", "logs.launcher.align_success", None, "Environment file alignment complete");
            // Pollution detector: the snapshot just became the live config, so
            // if the account has a user-confirmed baseline path and the
            // restored content doesn't record it, the snapshot itself is bad
            // (e.g. poisoned before the ownership guard existed). Warn loudly
            // now instead of letting the user discover a wrong path in-game.
            if let Some(baseline) = account.baseline_path.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
                if file_swap::live_config_contains_path(baseline) == Some(false) {
                    logger::log_localized(Some(app), "warn", "logs.launcher.snapshot_baseline_mismatch",
                        Some(serde_json::json!({ "user": account.win_user, "path": baseline })),
                        &format!("Restored snapshot for {} does not record its baseline path {} — the snapshot may be stale or polluted; re-locate the game in Battle.net and save the snapshot again", account.win_user, baseline));
                    let _ = app.emit("baseline-mismatch", serde_json::json!({ "user": account.win_user, "kind": "snapshot" }));
                }
            }
        }
        Ok(false) => {
            logger::log_localized(Some(app), "info", "logs.launcher.no_snapshot", None, "No history snapshot found for target account, using clean Battle.net environment");
        }
        Err(e) => {
            logger::log_localized(Some(app), "error", "logs.launcher.align_critical_error", Some(serde_json::json!({ "error": e.to_string() })),
                &format!("Critical error during file alignment: {}", e));
            // The old config was already deleted above, so the live slot no
            // longer belongs to anyone.
            state.set_live_db_owner(app, None);
            return Err(AccountError::FileSwap(e));
        }
    }

    // The live product.db (restored snapshot, or the clean slate Battle.net is
    // about to populate) now belongs to the target account. Recording this is
    // what authorizes future auto-backups for it — see the audit gate above.
    state.set_live_db_owner(app, Some(account.id.clone()));

    perf!("P3.fileswap");

    // 4. Execution
    let bnet_path_buf = get_bnet_path().ok_or(AccountError::InvalidPath)?;
    let bnet_path = bnet_path_buf.to_string_lossy().to_string();
    let working_dir = bnet_path_buf.parent().map(|p| p.to_string_lossy().to_string());

    let current_user = os.get_whoami().to_lowercase();
    let target_user = account.win_user.to_lowercase();

    logger::log_localized(Some(app), "info", "logs.launcher.bnet_path", Some(serde_json::json!({ "path": bnet_path })),
        &format!("Battle.net path: {}", bnet_path));

    if target_user == current_user || target_user == std::env::var("USERNAME").unwrap_or_default().to_lowercase() {
        logger::log_localized(Some(app), "info", "logs.launcher.host_user_detected", None, "Host user detected, starting Battle.net directly...");
        let mut cmd = std::process::Command::new(bnet_path);
        if let Some(wd) = working_dir { cmd.current_dir(wd); }
        let child = cmd.spawn().map_err(|e| anyhow::anyhow!("Failed to spawn: {}", e))?;
        logger::log_localized(Some(app), "success", "logs.launcher.launch_success", Some(serde_json::json!({ "pid": child.id() })),
            &format!("Launched Battle.net (PID: {})", child.id()));
        perf!("P4.spawn_host");
        crate::modules::logger::log(Some(app), "info", None, None,
            &format!("[PERF] {:<16} {:>6} ms", "TOTAL", __perf_start.elapsed().as_millis()));
        Ok(child.id())
    } else {
        // Sandbox launch with credentials
        let (domain, user) = if let Some(pos) = account.win_user.rfind('\\') {
            (Some(&account.win_user[..pos]), &account.win_user[pos + 1..])
        } else {
            (None, account.win_user.as_str())
        };

        // 1. 安全预检 (Industrial-grade Security Shims) - 已移除（会导致部分环境认证回退）

        // Pre-flight: CreateProcessWithLogonW with LOGON_WITH_PROFILE will
        // silently hang if the target user has never logged in interactively
        // before (Windows runs its first-login profile setup, which needs a
        // manual click to complete — indistinguishable from a frozen launch
        // to both the caller and the "正在启动..." UI). Catch it here instead
        // of blocking on the Win32 call.
        if !os.is_user_initialized(user) {
            logger::log_localized(Some(app), "warn", "logs.launcher.user_uninitialized", Some(serde_json::json!({ "user": account.win_user })),
                &format!("Target user {} has no initialized profile — first interactive login required", account.win_user));
            return Err(AccountError::UserUninitialized);
        }

        let physical_password = match Vault::load_password(app, &account.id) {
            Ok(p) => p,
            Err(e) => {
                logger::log_localized(Some(app), "error", "logs.launcher.vault_error", Some(serde_json::json!({ "error": e.to_string() })),
                    &format!("Launch failed: Could not retrieve credentials from vault. {}", e));
                return Err(AccountError::SysInfo(format!("Vault Retrieval Error: {}", e)));
            }
        };

        // Checkpoint: everything up to here is bounded (kill, ~1s file-writable
        // poll, mutex scan). If a launch hangs, this is the last line seen
        // before the hang unless it's inside the Win32 call itself below —
        // that call has no internal timeout and can block indefinitely.
        crate::modules::logger::log(Some(app), "info", None, None,
            &format!("[PERF]   logon.begin  (user={})", user));

        let result = os.create_process_with_logon(
            user,
            domain,
            &physical_password,
            &bnet_path,
            None,
            working_dir.as_deref(),
        )?;
        perf!("P4.logon_spawn");
        crate::modules::logger::log(Some(app), "info", None, None,
            &format!("[PERF] {:<16} {:>6} ms", "TOTAL", __perf_start.elapsed().as_millis()));

        let _ = app.emit(
            "launch-log",
            LaunchLogPayload {
                account_id: account.id.clone(),
                message: format!("logs.launcher.launch_success|{{\"pid\":{}}}", result.process_id),
                level: "success".into(),
            },
        );
        Ok(result.process_id)
    }
}

pub fn get_bnet_path() -> Option<PathBuf> {
    // 1. Try standard hardcoded path
    let standard = PathBuf::from(r"C:\Program Files (x86)\Battle.net\Battle.net.exe");
    if standard.exists() {
        return Some(standard);
    }

    // 2. Try Registry Lookup (Auto-detect)
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
        KEY_WOW64_32KEY, REG_VALUE_TYPE,
    };

    unsafe {
        let key_path = to_pcwstr(r"SOFTWARE\Blizzard Entertainment\Battle.net\Capabilities");
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(key_path.as_ptr()),
            Some(0),
            KEY_READ | KEY_WOW64_32KEY,
            &mut hkey,
        )
        .is_ok()
        {
            let value_name = to_pcwstr("ApplicationIcon");
            let mut val_type = REG_VALUE_TYPE::default();
            let mut data_size = 0u32;

            let _ = RegQueryValueExW(
                hkey,
                PCWSTR(value_name.as_ptr()),
                None,
                Some(&mut val_type),
                None,
                Some(&mut data_size),
            );

            if data_size > 0 {
                let mut data = vec![0u8; data_size as usize];
                if RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(data.as_mut_ptr()),
                    Some(&mut data_size),
                )
                .is_ok()
                {
                    let data_u16 =
                        std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2);
                    let mut path_str = String::from_utf16_lossy(data_u16);

                    if let Some(pos) = path_str.find('\0') {
                        path_str.truncate(pos);
                    }

                    let clean_path = if let Some(start) = path_str.find('"') {
                        if let Some(end) = path_str[start + 1..].find('"') {
                            &path_str[start + 1..start + 1 + end]
                        } else {
                            &path_str[start + 1..]
                        }
                    } else {
                        path_str.split(',').next().unwrap_or(&path_str).trim()
                    };

                    let p = PathBuf::from(clean_path);
                    if p.exists() {
                        let _ = RegCloseKey(hkey);
                        return Some(p);
                    }
                }
            }
            let _ = RegCloseKey(hkey);
        }
    }

    None
}

pub fn get_d2r_path() -> Option<PathBuf> {
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
        KEY_WOW64_32KEY, REG_VALUE_TYPE,
    };

    unsafe {
        // Diablo II: Resurrected uninstall key usually contains the path
        let key_path = to_pcwstr(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Diablo II: Resurrected");
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(key_path.as_ptr()),
            Some(0),
            KEY_READ | KEY_WOW64_32KEY,
            &mut hkey,
        )
        .is_ok()
        {
            let value_name = to_pcwstr("InstallLocation");
            let mut val_type = REG_VALUE_TYPE::default();
            let mut data_size = 0u32;

            let _ = RegQueryValueExW(
                hkey,
                PCWSTR(value_name.as_ptr()),
                None,
                Some(&mut val_type),
                None,
                Some(&mut data_size),
            );

            if data_size > 0 {
                let mut data = vec![0u8; data_size as usize];
                if RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(data.as_mut_ptr()),
                    Some(&mut data_size),
                )
                .is_ok()
                {
                    let data_u16 =
                        std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2);
                    let mut path_str = String::from_utf16_lossy(data_u16);

                    if let Some(pos) = path_str.find('\0') {
                        path_str.truncate(pos);
                    }

                    let p = PathBuf::from(path_str.trim());
                    if p.exists() {
                        let _ = RegCloseKey(hkey);
                        return Some(p);
                    }
                }
            }
            let _ = RegCloseKey(hkey);
        }
    }

    None
}

