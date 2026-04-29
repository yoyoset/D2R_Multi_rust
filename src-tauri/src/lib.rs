use tauri::{Manager, Emitter};

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
            commands::os::verify_windows_password,
            commands::os::open_lusrmgr,
            commands::os::open_netplwiz,
            commands::os::open_user_switch,
            commands::os::check_user_initialization,
            commands::os::check_microsoft_account,
            commands::os::set_password_full_policy,
            // Game Commands
            commands::game::kill_mutexes,
            commands::game::kill_processes,
            commands::game::launch_game,
            commands::game::stop_bnet_processes,
            commands::game::is_user_process_active,
            commands::game::fix_game_permissions,
            commands::game::get_detected_d2r_path,
            commands::game::get_detected_bnet_path,
            commands::game::check_active_processes,
            // Config Commands
            commands::config::get_config,
            commands::config::save_config,
            commands::config::run_migration,
            commands::config::get_account_password,
            commands::config::update_tray_language,
            commands::config::check_vault_integrity,
            // Maintenance Commands
            commands::maintenance::clear_logs,
            commands::maintenance::nuke_reset,
            commands::maintenance::cleanup_archives,
            commands::maintenance::manual_backup_save,
            commands::maintenance::manual_delete_config,
            commands::maintenance::manual_restore_config,
            commands::maintenance::manual_launch_process,
            commands::maintenance::get_latest_changelog,
            commands::maintenance::open_log_file,
            // Inspector Commands
            commands::inspector::get_process_list,
            commands::inspector::get_process_handles,
            commands::inspector::close_specific_handle,
            commands::inspector::get_infra_health,
            // Module Commands
            modules::account::get_accounts_process_status,
            modules::account::save_account_snapshot,
            modules::account::resolve_launch_conflict,
            modules::account::get_running_game_paths,
            modules::account::get_system_env_diagnostics,
            modules::account::get_game_path_diagnostics,
            modules::account::sequence::save_sequence_preset,
            modules::account::sequence::validate_sequence,
            modules::account::sequence::start_sequence,
            modules::account::sequence::next_sequence_step,
            modules::account::sequence::interrupt_sequence,
            modules::account::sequence::request_sequence_sync,
            modules::mirror::create_mirror_junction,
        ])
        .setup(|app| {
            // 0. Initialize i18n translations
            crate::modules::i18n::init();
            
            let app_handle = app.handle().clone();
            // 1. Initial Config Load & Cache (Industrial Optimization)
            let config = modules::config::AppConfig::load(&app_handle)
                .unwrap_or_else(|_| modules::config::AppConfig::default());
            
            // 2. Migration Check
            if modules::config::AppConfig::is_migration_needed(app.handle()) {
                let _ = app.emit("migration-required", ());
            }
            
            {
                let app_state = app.state::<crate::state::AppState>();
                let mut cached_config = app_state.config_lock();
                *cached_config = config.clone();

                // Sync backend language (Industrial Hardening)
                if let Some(lang) = &config.language {
                    crate::modules::i18n::set_language(lang);
                }

                // Sequence Resumption Check (Blind Spot A)
                if let Some(active) = &config.active_sequence {
                    let mut current = app_state.sequence_lock();
                    *current = Some(active.clone());
                    let _ = app.emit("sequence-resumption-ready", ());
                }
            }

            modules::logger::init_global_handle(app.handle().clone());
            tray::setup_tray(app.handle())?;
            
            let handle = app.handle().clone();
            
            // 5. Get shutdown transmitter from AppState
            let state = app.state::<crate::state::AppState>();
            let shutdown_tx = state.shutdown_tx.clone();
            
            // 6. Initialize background tasks with shutdown signal
            let handle1 = handle.clone();
            let rx1 = shutdown_tx.subscribe();
            tauri::async_runtime::spawn(async move {
                modules::account::window::maintain_window_titles(handle1, rx1).await;
            });
            
            let handle2 = handle.clone();
            let rx2 = shutdown_tx.subscribe();
            tauri::async_runtime::spawn(async move {
                modules::account::status::maintain_account_statuses(handle2, rx2).await;
            });
            
            let handle3 = handle.clone();
            let rx3 = shutdown_tx.subscribe();
            tauri::async_runtime::spawn(async move {
                modules::os::windows::maintenance::maintain_memory_footprint(handle3, rx3).await;
            });

            // 保存 shutdown_tx 以便在退出时使用
            // 由于无法直接存储在 AppState 中，我们需要通过其他方式处理
            // 这里使用一个简单的方案：通过 tauri 的 manage 存储共享的 Arc
            
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                let app = window.app_handle();
                let state = app.state::<crate::state::AppState>();
                
                // If we are explicitly quitting via tray, don't prevent close
                if state.is_quitting.load(std::sync::atomic::Ordering::SeqCst) {
                    return;
                }

                let close_to_tray = {
                    let config = state.config_lock();
                    config.close_to_tray.unwrap_or(true)
                };

                if close_to_tray {
                    let _ = window.hide();
                    api.prevent_close();
                } else {
                    // Actual quitting - trigger graceful exit
                    state.is_quitting.store(true, std::sync::atomic::Ordering::SeqCst);
                    let _ = state.shutdown_tx.send(());
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
