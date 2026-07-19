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
        return Err("error.sequence.invalid_index".into());
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
            .ok_or("error.sequence.not_found")?
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

    Ok(())
}

#[tauri::command]
pub async fn next_sequence_step(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let mut sequence_state = {
        let active = state.sequence_lock();
        active.clone().ok_or("error.sequence.no_active")?
    };

    // 1. Trigger launch for CURRENT step
    let result = trigger_current_step(&app, &state, sequence_state.clone()).await;
    
    if let Err(e) = result {
        // 如果启动失败，标记序列为失败状态
        logger::log_localized(Some(&app), "error", "logs.sequence.step_failed", 
            Some(serde_json::json!({ "error": e })),
            &format!("Sequence step failed: {}", e));
        
        // 停止序列
        interrupt_sequence(app, state.clone()).await?;
        return Err(e);
    }

    // 2. Advance to NEXT index
    sequence_state.current_index += 1;

    if sequence_state.current_index >= sequence_state.queue.len() {
        // Sequence finished. The LAST launched account's snapshot is NOT backed up
        // here automatically: at this moment the user has only just been logged in
        // and may still be adjusting Battle.net / game settings before they are
        // "done". Auto-capturing the launch-time product.db now would freeze a
        // half-finished state. The mini-window offers an optional "Finish & back
        // up" button for an immediate deliberate capture; skipping it is safe —
        // the baseline rotation backs the account up at the next launch.

        // Clear states
        let mut active = state.sequence_lock();
        *active = None;

        {
            let mut config = state.config_lock();
            config.active_sequence = None;
            config.save(&app).map_err(|e| e.to_string())?;
        }

        // Broadcast finish
        let _ = app.emit("sequence-state-changed", Option::<ActiveSequenceState>::None);

        return Ok(true);
    }

    // 3. Update and Persist Next State
    {
        let mut active = state.sequence_lock();
        *active = Some(sequence_state.clone());
    }
    
    {
        let mut config = state.config_lock();
        config.active_sequence = Some(sequence_state.clone());
        config.save(&app).map_err(|e| e.to_string())?;
    }

    // 4. Broadcast Next State (Industrial Push)
    let _ = app.emit("sequence-state-changed", Some(sequence_state.clone()));
    
    Ok(false)
}

#[tauri::command]
pub async fn interrupt_sequence(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    logger::log_localized(Some(&app), "warn", "logs.sequence.interrupted", None, "Sequence automation manually interrupted by user");

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
            .ok_or_else(|| format!("error.sequence.account_not_found|{{\"id\":\"{}\"}}", account_id))?
    };

    logger::log_localized(Some(app), "info", "logs.sequence.advancing", 
        Some(serde_json::json!({ "user": account.win_user, "current": seq.current_index + 1, "total": seq.queue.len() })),
        &format!("Sequence Advancing: Starting account {} ({}/{})", account.win_user, seq.current_index + 1, seq.queue.len()));

    // (Industrial Optimization) Offload blocking launch_game to background thread pool
    // This prevents the whole tokio runtime/command pool from starving during slow Win32 API calls.
    // We await the handle here to ensure logic integrity (Wait for launch before advancing or reporting success)
    let os = state.os.clone();
    let app_handle = app.clone();
    let account_clone = account.clone();

    // force=true: the sequencer is trusted orchestration with its own pacing,
    // so it bypasses the soft launch-pacing guard (which targets manual clicks).
    let result = tauri::async_runtime::spawn_blocking(move || {
        launch_game(&*os, &app_handle, &account_clone, false, true, false)
    }).await.map_err(|e| format!("logs.inspector.task_join_error|{{\"error\":\"{}\"}}", e))?;

    if let Err(e) = result {
        // Log the error globally as well
        let _ = app.emit("launch-log", LaunchLogPayload {
            account_id: account.id.clone(),
            message: format!("logs.sequence.launch_failed|{{\"error\":\"{}\"}}", e),
            level: "error".into(),
        });
        return Err(e.to_string());
    }

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
