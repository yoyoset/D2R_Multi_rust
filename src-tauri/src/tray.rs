use tauri::Manager;
use std::sync::atomic::Ordering;

pub fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // Load config to determine initial language
    // Use cached config from AppState (Industrial Optimization)
    let state = app.state::<crate::state::AppState>();
    let config = state.config_lock();
    let lang = config.language.clone().unwrap_or_else(|| "zh-CN".to_string());
    drop(config);

    let (show_text, quit_text) = match lang.as_str() {
        "zh-CN" | "zh-TW" => ("显示主界面", "退出"),
        "ja" => ("表示", "終了"),
        "ko" => ("보기", "종료"),
        _ => ("Show", "Quit"),
    };

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
}

pub fn update_tray_lang(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let state = app.state::<crate::state::AppState>();
    let config = state.config_lock();
    let lang = config.language.clone().unwrap_or_else(|| "zh-CN".to_string());
    drop(config);

    let (show_text, quit_text) = match lang.as_str() {
        "zh-CN" | "zh-TW" => ("显示主界面", "退出"),
        "ja" => ("表示", "終了"),
        "ko" => ("보기", "종료"),
        _ => ("Show", "Quit"),
    };

    if let Some(tray) = app.tray_by_id("main") {
        let quit_i = tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
        let show_i = tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
        let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;
        let _ = tray.set_menu(Some(menu));
    }

    Ok(())
}
