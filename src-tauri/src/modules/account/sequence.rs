use crate::modules::account::launcher::launch_game;
use crate::modules::account::types::LaunchLogPayload;
use crate::modules::config::{ActiveSequenceState, SequencePreset};
use crate::state::AppState;
use crate::modules::logger;
use anyhow::{anyhow, Result};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindowBuilder, Emitter};


#[tauri::command]
pub fn save_sequence_preset(
    state: State<'_, AppState>,
    app: AppHandle,
    index: usize,
    preset: SequencePreset,
) -> Result<(), String> {
    if index >= 3 {
        return Err("Invalid preset index".into());
    }

    let mut config = state.config_lock();
    config.sequence_presets[index] = Some(preset);
    config.save(&app).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn validate_sequence(
    state: State<'_, AppState>,
    account_ids: Vec<String>,
) -> Result<Vec<String>, String> {
    let config = state.config_lock();
    
    let users = state.users_lock();
    let windows_usernames: Vec<String> = users.iter().map(|u| u.name().to_lowercase()).collect();
    
    let mut invalid_users = Vec::new();
    
    // Check if account IDs exist and their mapped windows users are valid
    for id in account_ids {
        if let Some(acc) = config.accounts.iter().find(|a| a.id == id) {
            let target_user = acc.win_user.to_lowercase();
            if !windows_usernames.contains(&target_user) {
                invalid_users.push(acc.win_user.clone());
            }
        }
    }
    
    Ok(invalid_users)
}

#[tauri::command]
pub async fn request_sequence_sync(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ActiveSequenceState>, String> {
    let sequence_state = {
        let active = state.sequence_lock();
        active.clone()
    };
    
    // Industrial Push (Live Update)
    let _ = app.emit("sequence-state-changed", sequence_state.clone());
    
    // Return for immediate initialization pull (Industrial Reliability)
    Ok(sequence_state)
}

#[tauri::command]
pub async fn start_sequence(
    app: AppHandle,
    state: State<'_, AppState>,
    preset_index: usize,
) -> Result<(), String> {
    let preset = {
        let config = state.config_lock();
        config.sequence_presets[preset_index]
            .as_ref()
            .ok_or("Preset not found")?
            .clone()
    };

    let sequence_state = ActiveSequenceState {
        preset_index,
        preset_name: preset.name.clone(),
        current_index: 0,
        queue: preset.accounts.clone(),
    };

    // 1. Update runtime state
    {
        let mut active = state.sequence_lock();
        *active = Some(sequence_state.clone());
    }

    // 2. Persist to config for resumption (Blind Spot A)
    {
        let mut config = state.config_lock();
        config.active_sequence = Some(sequence_state.clone());
        config.save(&app).map_err(|e| e.to_string())?;
    }

    // 3. Create Mini Window
    let _ = create_sequencer_window(&app).map_err(|e| e.to_string())?;

    // 4. Broadcast state immediately (Industrial Push)
    let _ = app.emit("sequence-state-changed", Some(sequence_state.clone()));

    // 5. Trigger first step
    trigger_current_step(&app, &state, sequence_state).await?;

    Ok(())
}

#[tauri::command]
pub async fn next_sequence_step(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let mut sequence_state = {
        let active = state.sequence_lock();
        active.clone().ok_or("No active sequence")?
    };

    sequence_state.current_index += 1;

    if sequence_state.current_index >= sequence_state.queue.len() {
        // Sequence Finished
        let mut active = state.sequence_lock();
        *active = None;
        
        {
            let mut config = state.config_lock();
            config.active_sequence = None;
            config.save(&app).map_err(|e| e.to_string())?;
        }
        
        return Ok(true);
    }

    // Update state
    {
        let mut active = state.sequence_lock();
        *active = Some(sequence_state.clone());
    }
    
    {
        let mut config = state.config_lock();
        config.active_sequence = Some(sequence_state.clone());
        config.save(&app).map_err(|e| e.to_string())?;
    }

    // 3. Broadcast state (Industrial Push)
    let _ = app.emit("sequence-state-changed", Some(sequence_state.clone()));

    trigger_current_step(&app, &state, sequence_state).await?;
    
    Ok(false)
}

#[tauri::command]
pub async fn interrupt_sequence(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    logger::log_localized(Some(&app), "warn", "logs.sequence.interrupted", None, "序列自动化已由用户手动中断");

    // 1. Clear memory state
    {
        let mut active = state.sequence_lock();
        *active = None;
    }

    // 2. Clear config state (Persistence)
    {
        let mut config = state.config_lock();
        config.active_sequence = None;
        config.save(&app).map_err(|e| e.to_string())?;
    }

    // 3. Broadcast termination (Industrial Push)
    let _ = app.emit("sequence-state-changed", Option::<ActiveSequenceState>::None);

    Ok(())
}

pub async fn trigger_current_step(
    app: &AppHandle,
    state: &State<'_, AppState>,
    seq: ActiveSequenceState,
) -> Result<(), String> {
    let account_id = &seq.queue[seq.current_index];
    
    let account = {
        let config = state.config_lock();
        config.accounts.iter().find(|a| a.id == *account_id)
            .cloned()
            .ok_or_else(|| format!("Account {} not found", account_id))?
    };

    logger::log_localized(Some(app), "info", "logs.sequence.advancing", 
        Some(serde_json::json!({ "user": account.win_user, "current": seq.current_index + 1, "total": seq.queue.len() })),
        &format!("序列推进: 正在启动账号 {} ({}/{})", account.win_user, seq.current_index + 1, seq.queue.len()));

    // (Industrial Optimization) Offload blocking launch_game to background thread pool
    // This prevents the whole tokio runtime/command pool from starving during slow Win32 API calls.
    let os = state.os.clone();
    let app_handle = app.clone();
    let account_clone = account.clone();

    tauri::async_runtime::spawn_blocking(move || {
        // We catch errors inside the thread and report via logger/events
        // instead of blocking the main sequence orchestration.
        if let Err(e) = launch_game(&*os, &app_handle, &account_clone, true, false) {
            let _ = app_handle.emit("launch-log", LaunchLogPayload {
                account_id: account_clone.id.clone(),
                message: format!("启动失败: {}", e),
                level: "error".into(),
            });
        }
    });

    Ok(())
}

fn create_sequencer_window(app: &AppHandle) -> Result<tauri::WebviewWindow> {
    if let Some(w) = app.get_webview_window("sequencer") {
        let _ = w.show();
        let _ = w.set_focus();
        return Ok(w);
    }

    let win = WebviewWindowBuilder::new(app, "sequencer", WebviewUrl::App("index.html".into()))
        .title("D2R Multiplay Sequencer")
        .inner_size(320.0, 44.0)
        .resizable(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(true)
        .visible(true)
        .build()
        .map_err(|e| anyhow!("Failed to create sequencer window: {}", e))?;

    Ok(win)
}
