use crate::modules;

#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<modules::config::AppConfig, String> {
    let config = modules::config::AppConfig::load(&app).map_err(|e| e.to_string())?;
    Ok(config.redacted())
}

#[tauri::command]
pub fn save_config(
    app: tauri::AppHandle,
    config: modules::config::AppConfig,
) -> Result<(), String> {
    // 1. Load full config from disk
    let full_config = modules::config::AppConfig::load(&app).map_err(|e| e.to_string())?;

    // 2. Patch sensitive fields back from full_config to the incoming redacted config
    let mut updated_config = config;
    for account in &mut updated_config.accounts {
        if let Some(pass) = &account.win_pass {
            if pass == "********" {
                // If it's redacted, restore from disk
                if let Some(original) = full_config.accounts.iter().find(|a| a.id == account.id) {
                    account.win_pass = original.win_pass.clone();
                } else {
                    // New account with redacted placeholder? Should not happen normally via UI
                    account.win_pass = None;
                }
            }
        }
    }

    // 3. Save the merged config
    updated_config.save(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_tray_language(app: tauri::AppHandle, lang: String) -> Result<(), String> {
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
        let _ = tray.set_tooltip(Some(show_text.to_string()));

        let show_i = tauri::menu::MenuItem::with_id(&app, "show", show_text, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let quit_i = tauri::menu::MenuItem::with_id(&app, "quit", quit_text, true, None::<&str>)
            .map_err(|e| e.to_string())?;
        let menu =
            tauri::menu::Menu::with_items(&app, &[&show_i, &quit_i]).map_err(|e| e.to_string())?;
        let _ = tray.set_menu(Some(menu));
    }
    Ok(())
}
