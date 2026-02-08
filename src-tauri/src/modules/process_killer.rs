use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, RefreshKind, System};

pub fn kill_battle_net_processes() -> usize {
    let mut system = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    system.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::everything(),
    );

    let targets = [
        "Battle.net.exe",
        "Agent.exe",
        "crashpad_handler.exe",
        "Blizzard Error.exe",
        "Uninstaller.exe",
    ];

    let mut killed_count = 0;

    for process in system.processes().values() {
        // Case-insensitive name match
        let p_name = process.name().to_string_lossy();
        if targets.iter().any(|&t| p_name.eq_ignore_ascii_case(t)) {
            if process.kill() {
                killed_count += 1;
                // Log via tracing if available
                println!("Killed process: {} (PID: {})", p_name, process.pid());
            }
        }
    }

    killed_count
}
