use tauri::Manager;

mod commands;
mod modules;
mod state;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            // OS Commands
            commands::os::get_whoami,
            commands::os::check_admin,
            commands::os::get_windows_users,
            commands::os::create_windows_user,
            commands::os::set_password_never_expires,
            commands::os::open_lusrmgr,
            commands::os::open_netplwiz,
            commands::os::open_user_switch,
            commands::os::check_user_initialization,
            // Game Commands
            commands::game::kill_mutexes,
            commands::game::kill_processes,
            commands::game::launch_game,
            commands::game::stop_bnet_processes,
            commands::game::is_user_process_active,
            commands::game::fix_game_permissions,
            // Config Commands
            commands::config::get_config,
            commands::config::save_config,
            commands::config::update_tray_language,
            // Maintenance Commands
            commands::maintenance::clear_logs,
            commands::maintenance::nuke_reset,
            commands::maintenance::cleanup_archives,
            commands::maintenance::manual_backup_save,
            commands::maintenance::manual_delete_config,
            commands::maintenance::manual_restore_config,
            commands::maintenance::manual_launch_process,
            commands::maintenance::get_latest_changelog,
            // Module Commands
            modules::account::get_accounts_process_status,
            modules::account::resolve_launch_conflict,
            modules::mirror::create_mirror_junction,
        ])
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let app = window.app_handle();
                let config = modules::config::AppConfig::load(app)
                    .unwrap_or_else(|_| modules::config::AppConfig::default());
                if config.close_to_tray.unwrap_or(true) {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
