use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};
use crate::modules::os::windows::process::try_graceful_close;
use std::thread;
use std::time::Duration;

pub fn kill_all_related_processes_with_sys(system: &mut System) -> usize {
    let targets = [
        "Battle.net.exe",
        "Agent.exe",
        "crashpad_handler.exe",
        "Blizzard Error.exe",
        "Uninstaller.exe",
        "D2R.exe",
    ];
    kill_group_with_sys(system, &targets)
}

pub fn kill_bnet_processes_except_game_with_sys(system: &mut System) -> usize {
    let targets = [
        "Battle.net.exe",
        "Agent.exe",
        "crashpad_handler.exe",
        "Blizzard Error.exe",
    ];
    kill_group_with_sys(system, &targets)
}

pub fn kill_battle_net_processes_with_sys(system: &mut System) -> usize {
    let targets = [
        "Battle.net.exe",
        "Agent.exe",
        "crashpad_handler.exe",
        "Blizzard Error.exe",
        "Uninstaller.exe",
    ];
    kill_group_with_sys(system, &targets)
}

/// (Industrial Grade) Soft-close followed by Force-kill logic
fn kill_group_with_sys(system: &mut System, targets: &[&str]) -> usize {
    let mut target_pids = Vec::new();
    for process in system.processes().values() {
        let p_name = process.name().to_string_lossy();
        if targets.iter().any(|&t| p_name.eq_ignore_ascii_case(t)) {
            target_pids.push(process.pid());
        }
    }

    if target_pids.is_empty() { return 0; }

    // Phase 1: Try Graceful Close
    for pid in &target_pids {
        let _ = try_graceful_close(pid.as_u32());
    }

    // Phase 2: Poll until processes exit (max 1500ms, check every 100ms)
    for _ in 0..15 {
        thread::sleep(Duration::from_millis(100));
        system.refresh_processes_specifics(
            ProcessesToUpdate::Some(&target_pids),
            true,
            ProcessRefreshKind::nothing()
        );
        if target_pids.iter().all(|pid| system.process(*pid).is_none()) {
            break;
        }
    }

    // Phase 3: Force Kill remaining (if any survived the grace period)
    system.refresh_processes_specifics(
        ProcessesToUpdate::Some(&target_pids),
        true,
        ProcessRefreshKind::nothing()
    );

    let mut killed_count = 0;
    for pid in target_pids {
        if let Some(process) = system.process(pid) {
            let p_name = process.name().to_string_lossy();
            if process.kill() {
                killed_count += 1;
                tracing::info!("Force killed process: {} (PID: {})", p_name, process.pid());
            }
        }
    }
    killed_count
}

// --- Public Wrappers for Tauri Commands & Legacy Support ---


pub fn kill_all_related_processes() -> usize {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
    );
    kill_all_related_processes_with_sys(&mut system)
}

pub fn kill_bnet_processes_except_game() -> usize {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
    );
    kill_bnet_processes_except_game_with_sys(&mut system)
}

pub fn is_any_related_process_running_with_sys(system: &System) -> bool {
    let targets = ["Battle.net.exe", "D2R.exe", "Agent.exe"];
    system.processes().values().any(|p| {
        let name = p.name().to_string_lossy();
        targets.iter().any(|&t| name.eq_ignore_ascii_case(t))
    })
}

pub fn is_any_related_process_running() -> bool {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::nothing()),
    );
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
    );
    is_any_related_process_running_with_sys(&system)
}
