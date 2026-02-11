use crate::modules;
use tauri::Manager;

pub fn setup_tray(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
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

    let quit_i = tauri::menu::MenuItem::with_id(app, "quit", quit_text, true, None::<&str>)?;
    let show_i = tauri::menu::MenuItem::with_id(app, "show", show_text, true, None::<&str>)?;
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
}
