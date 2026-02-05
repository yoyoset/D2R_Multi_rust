use tauri::Manager;
mod modules;
mod state;

// --- Commands ---

#[tauri::command]
fn kill_mutexes() -> Result<String, String> {
    match modules::win32_safe::mutex::close_d2r_mutexes() {
        Ok(count) => Ok(format!("Killed {} mutexes", count)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn kill_processes() -> Result<String, String> {
    let count = modules::process_killer::kill_battle_net_processes();
    Ok(format!("Killed {} processes", count))
}

#[tauri::command]
fn manual_backup_save(app: tauri::AppHandle, account_id: String) -> Result<String, String> {
    modules::file_swap::rotate_save(&app, &account_id).map_err(|e| e.to_string())?;
    Ok("Backup successful".to_string())
}

#[tauri::command]
fn manual_delete_config() -> Result<String, String> {
    modules::file_swap::delete_config().map_err(|e| e.to_string())?;
    Ok("Config deleted".to_string())
}

#[tauri::command]
fn manual_restore_config(app: tauri::AppHandle, account_id: String) -> Result<String, String> {
    modules::file_swap::restore_snapshot(&app, &account_id).map_err(|e| e.to_string())?;
    Ok("Restore successful".to_string())
}

#[tauri::command]
fn manual_launch_process(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
    let bnet_path = r"C:\Program Files (x86)\Battle.net\Battle.net.exe";
    let working_dir = std::path::Path::new(bnet_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string());

    let res = state
        .os
        .create_process_with_logon(
            &username,
            None,
            password.as_deref().unwrap_or(""),
            bnet_path,
            None,
            working_dir.as_deref(),
        )
        .map_err(|e| e.to_string())?;

    Ok(format!("Launched PID: {}", res.process_id))
}

#[tauri::command]
fn get_whoami(state: tauri::State<'_, state::AppState>) -> String {
    state.os.get_whoami()
}

#[tauri::command]
fn get_windows_users(
    state: tauri::State<'_, state::AppState>,
    deep_scan: Option<bool>,
) -> Result<Vec<String>, String> {
    state
        .os
        .list_local_users(deep_scan.unwrap_or(false))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_windows_user(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: String,
) -> Result<String, String> {
    state
        .os
        .create_user(&username, &password)
        .map_err(|e| e.to_string())?;
    Ok("User created successfully".to_string())
}

#[tauri::command]
fn launch_game(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
    account: modules::account::Account,
    game_path: String,
) -> Result<String, String> {
    match modules::account::launch_game(state.os.as_ref(), &app, &account, &game_path) {
        Ok(pid) => Ok(format!("Game launched (PID: {})", pid)),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_config(app: tauri::AppHandle) -> Result<modules::config::AppConfig, String> {
    modules::config::AppConfig::load(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: modules::config::AppConfig) -> Result<(), String> {
    config.save(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_tray_language(app: tauri::AppHandle, lang: String) -> Result<(), String> {
    let show_text = match lang.as_str() {
        "zh-CN" | "zh-TW" => "显示主界面",
        "ja" => "表示",
        "ko" => "보기",
        _ => "Show",
    };
    let quit_text = match lang.as_str() {
        "zh-CN" | "zh-TW" => "退出",
        "ja" => "終了",
        "ko" => "종료",
        _ => "Quit",
    };

    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(show_text)); // Optional: tooltip
                                                   // Note: Tauri v2 Tray Menu Item dynamic update is tricky if we don't hold references to items.
                                                   // However, we can rebuild the menu easily for v2.

        let show_i = tauri::menu::MenuItem::with_id(&app, "show", show_text, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let quit_i = tauri::menu::MenuItem::with_id(&app, "quit", quit_text, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let menu =
            tauri::menu::Menu::with_items(&app, &[&show_i, &quit_i]).map_err(|e| e.to_string())?;
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            kill_mutexes,
            launch_game,
            get_config,
            save_config,
            kill_processes,
            manual_backup_save,
            manual_delete_config,
            manual_restore_config,
            manual_launch_process,
            get_windows_users,
            create_windows_user,
            get_whoami,
            modules::account::get_accounts_process_status,
            modules::mirror::create_mirror_junction,
            update_tray_language
        ])
        .setup(|app| {
            // Load config to determine initial language
            let config = modules::config::AppConfig::load(app.handle())
                .unwrap_or_else(|_| modules::config::AppConfig::default());
            let lang = config.language.unwrap_or_else(|| "zh-CN".to_string());

            let (show_text, quit_text) = match lang.as_str() {
                "zh-CN" | "zh-TW" => ("显示主界面", "退出"),
                "ja" => ("表示", "終了"),
                "ko" => ("보기", "종료"),
                _ => ("Show", "Quit"),
            };

            let quit_i =
                tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
            let show_i =
                tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::with_id("main")
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

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
