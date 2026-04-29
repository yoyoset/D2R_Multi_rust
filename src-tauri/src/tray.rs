use tauri::Manager;
use std::sync::atomic::Ordering;

pub fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Load config to determine initial language
    // Use cached config from AppState (Industrial Optimization)
    let state = app.state::<crate::state::AppState>();
    let config = state.config_lock();
    let lang = config.language.clone().unwrap_or_else(|| "zh-CN".to_string());
    drop(config);

    let lang_key = if lang.starts_with("zh") { "zh" } else { &lang };
    let show_text = crate::modules::i18n::translate("tray.menu.show", lang_key, &None);
    let quit_text = crate::modules::i18n::translate("tray.menu.quit", lang_key, &None);

    let quit_i = tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
    let show_i = tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
    let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

    let mut builder = tauri::tray::TrayIconBuilder::with_id("main")
        .menu(&menu);
        
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    
    let _tray = builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => {
                let state = app.state::<crate::state::AppState>();
                state.is_quitting.store(true, Ordering::SeqCst);
                // 发送优雅退出信号
                let _ = state.shutdown_tx.send(());
                
                // 给后台任务一点点时间（50ms）来响应
                let app_clone = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    app_clone.exit(0);
                });
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
}

pub fn update_tray_lang(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<crate::state::AppState>();
    let config = state.config_lock();
    let lang = config.language.clone().unwrap_or_else(|| "zh-CN".to_string());
    drop(config);

    let lang_key = if lang.starts_with("zh") { "zh" } else { &lang };
    let show_text = crate::modules::i18n::translate("tray.menu.show", lang_key, &None);
    let quit_text = crate::modules::i18n::translate("tray.menu.quit", lang_key, &None);

    if let Some(tray) = app.tray_by_id("main") {
        let quit_i = tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
        let show_i = tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
        let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;
        let _ = tray.set_menu(Some(menu));
    }

    Ok(())
}
