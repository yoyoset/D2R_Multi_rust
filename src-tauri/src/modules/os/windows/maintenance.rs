use std::time::Duration;
use tauri::AppHandle;
use windows::Win32::System::Threading::{GetCurrentProcess, SetProcessWorkingSetSize};

/// Background task to periodically trim the application's working set (RAM footprint).
/// This is a common pattern for "System Tray" style utility apps to remain lean.
pub async fn maintain_memory_footprint(_app: AppHandle, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    let check_interval = Duration::from_secs(60); // Every minute
    
    loop {
        if shutdown_rx.try_recv().is_ok() {
            break;
        }
        
        tokio::time::sleep(check_interval).await;

        // Industrial Optimization: Force Windows to reclaim unused memory pages
        unsafe {
            let handle = GetCurrentProcess();
            // Passing -1 as size triggers a trim of the working set
            let _ = SetProcessWorkingSetSize(handle, usize::MAX, usize::MAX);
        }

        // Adaptive: If we see many game instances running, we might trim more aggressively
        // but for now 60s is a safe "Low-Noise" interval.
    }
}
