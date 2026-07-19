use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

#[derive(thiserror::Error, Debug)]
pub enum FileSwapError {
    #[error("error.file_swap.deletion_failed")]
    FileDeletionFailed(String),
    #[error("error.file_swap.env_error")]
    EnvError,
    #[error("error.file_swap.permission_denied")]
    PermissionDenied(String),
    #[error("error.file_swap.file_in_use")]
    FileInUse(String),
    #[error("error.file_swap.io")]
    Io(#[from] std::io::Error),
}

fn map_io_error(e: std::io::Error, path: &Path) -> FileSwapError {
    match e.kind() {
        std::io::ErrorKind::PermissionDenied => {
            FileSwapError::PermissionDenied(path.to_string_lossy().to_string())
        }
        _ => {
            // code 32 = ERROR_SHARING_VIOLATION
            let msg = e.to_string();
            if msg.contains("32") || msg.contains("sharing") {
                FileSwapError::FileInUse(path.to_string_lossy().to_string())
            } else {
                FileSwapError::Io(e)
            }
        }
    }
}

/// (Industrial Grade Verify) Attempt to open the file with exclusive access to check for locks
pub fn verify_config_writable() -> Result<(), FileSwapError> {
    let path = get_bnet_config_path()?;
    if !path.exists() {
        return Ok(());
    }

    // Try to open with write access and NO sharing (exclusive)
    // On Windows, this will fail if any other process (like Battle.net or Agent) has it open
    match fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open(&path) 
    {
        Ok(_) => Ok(()),
        Err(e) => Err(map_io_error(e, &path)),
    }
}

fn get_bnet_config_path() -> Result<PathBuf, FileSwapError> {
    let program_data = env::var("ProgramData").map_err(|_| FileSwapError::EnvError)?;
    let path = Path::new(&program_data)
        // Correct path: %ProgramData%\Battle.net\Agent\product.db
        .join("Battle.net")
        .join("Agent")
        .join("product.db");
    Ok(path)
}

fn get_snapshot_dir(app: &AppHandle) -> Result<PathBuf, FileSwapError> {
    Ok(crate::modules::data_root::get_data_root(app).join("snapshots"))
}

fn get_snapshot_path(app: &AppHandle, account_id: &str) -> Result<PathBuf, FileSwapError> {
    get_snapshot_dir(app).map(|p| p.join(format!("product_{}.db", account_id)))
}

/// Normalize a user-supplied or extracted config path for comparison:
/// lowercase, forward slashes, no trailing separator; surrounding quotes
/// (Explorer's "Copy as path" adds them) and a trailing "/d2r.exe" are
/// stripped so users may paste the game dir or the exe path either way.
pub fn normalize_config_path(s: &str) -> String {
    let s = s.trim().trim_matches(|c| c == '"' || c == '\'').trim();
    let mut p = s.to_lowercase().replace('\\', "/");
    while p.ends_with('/') {
        p.pop();
    }
    if let Some(stripped) = p.strip_suffix("/d2r.exe") {
        p = stripped.to_string();
    }
    p
}

/// Extract the game install paths recorded inside a product.db blob.
/// product.db is a protobuf container, but the path values are stored as plain
/// UTF-8 strings, so a byte-level scan is enough — no structural parsing.
/// Battle.net's own directories are filtered out so only game install paths
/// remain. Results are normalized: lowercase, forward slashes, no trailing '/'.
fn extract_game_paths(bytes: &[u8]) -> Vec<String> {
    let text = String::from_utf8_lossy(bytes).to_lowercase().replace('\\', "/");
    let chars: Vec<char> = text.chars().collect();
    let mut paths = Vec::new();
    let mut i = 0;

    while i + 2 < chars.len() {
        // Path start: drive letter + ":/"
        if chars[i].is_ascii_alphabetic() && chars[i + 1] == ':' && chars[i + 2] == '/' {
            let start = i;
            let mut end = i + 3;
            while end < chars.len() {
                let c = chars[end];
                // Path body: ASCII path characters or any non-ASCII printable
                // (e.g. CJK directory names). Control bytes and U+FFFD (lossy
                // replacement for the surrounding protobuf binary) terminate.
                let is_path_char = c.is_ascii_alphanumeric()
                    || matches!(c, '/' | ' ' | '(' | ')' | '.' | '-' | '_' | '\'' | '&' | '+' | '!' | '#' | '@' | ',')
                    || (!c.is_ascii() && c != '\u{FFFD}');
                if !is_path_char {
                    break;
                }
                end += 1;
            }
            let path: String = chars[start..end].iter().collect();
            let path = path.trim_end_matches(['/', ' ', '.']).to_string();
            // Filter Battle.net's own dirs; what's left are game installs.
            if path.len() > 3 && !path.contains("battle.net") && !paths.contains(&path) {
                paths.push(path);
            }
            i = end;
        } else {
            i += 1;
        }
    }
    paths
}

/// Compare the game path(s) recorded in the live product.db against those in
/// `account_id`'s snapshot. Returns `None` when undetermined (either file is
/// missing/unreadable or contains no recognizable game path), `Some(true)` if
/// they share at least one game path, `Some(false)` if both sides have paths
/// but none in common — i.e. the live config describes someone else's game.
///
/// Both sides must be *configured* paths as set through the Battle.net client:
/// with mirror junctions, several accounts can share one real install
/// directory and the configured mirror path is the only thing distinguishing
/// them, so the running D2R.exe's (junction-resolved) real path is useless as
/// a discriminator here.
pub fn live_config_matches_snapshot(app: &AppHandle, account_id: &str) -> Option<bool> {
    let live_bytes = fs::read(get_bnet_config_path().ok()?).ok()?;
    let snap_bytes = fs::read(get_snapshot_path(app, account_id).ok()?).ok()?;

    let live_paths = extract_game_paths(&live_bytes);
    let snap_paths = extract_game_paths(&snap_bytes);
    if live_paths.is_empty() || snap_paths.is_empty() {
        return None;
    }
    // Subset, not intersection: EVERY game path the snapshot records must be
    // present in the live config. With a second Blizzard game installed, its
    // (identical) path appears in every account's db — an any-intersection
    // would always match and let a swapped D2R path slip through. Extra paths
    // in the live config (newly installed game) are fine; a snapshot path
    // missing from live (swapped or uninstalled) refuses conservatively.
    Some(snap_paths.iter().all(|p| live_paths.contains(p)))
}

/// Check whether the live product.db records `baseline` (a user-confirmed
/// configured game dir) among its game paths. `None` = undetermined (live
/// file missing/unreadable, no recognizable paths, or empty baseline).
/// The user-confirmed baseline takes priority over snapshot comparison in the
/// backup content gate: it is human-attested ground truth, works before the
/// first snapshot exists, and cannot be poisoned by a bad backup.
pub fn live_config_contains_path(baseline: &str) -> Option<bool> {
    let needle = normalize_config_path(baseline);
    if needle.is_empty() {
        return None;
    }
    let live_bytes = fs::read(get_bnet_config_path().ok()?).ok()?;
    let live_paths = extract_game_paths(&live_bytes);
    if live_paths.is_empty() {
        return None;
    }
    Some(live_paths.contains(&needle))
}

/// Game paths recorded inside an account's snapshot (empty when no snapshot
/// or none found). Used by the account editor to suggest a baseline path for
/// the user to confirm.
pub fn snapshot_game_paths(app: &AppHandle, account_id: &str) -> Vec<String> {
    let Ok(path) = get_snapshot_path(app, account_id) else {
        return Vec::new();
    };
    match fs::read(&path) {
        Ok(bytes) => extract_game_paths(&bytes),
        Err(_) => Vec::new(),
    }
}

fn get_pending_path(app: &AppHandle, account_id: &str) -> Result<PathBuf, FileSwapError> {
    get_snapshot_dir(app).map(|p| p.join(format!("pending_{}.db", account_id)))
}

/// Baseline-conflict evidence stash: copy the DISPUTED live product.db aside
/// before the launch flow destroys it. The user's arbitration (cancel backup /
/// adopt as new baseline and back up) later operates on this frozen copy, so
/// the decision is decoupled from the launch and never captures post-injection
/// content by mistake.
pub fn stash_pending(app: &AppHandle, account_id: &str) -> Result<(), FileSwapError> {
    let live = get_bnet_config_path()?;
    if !live.exists() {
        return Err(FileSwapError::FileDeletionFailed("live config missing".into()));
    }
    let pending = get_pending_path(app, account_id)?;
    if let Some(parent) = pending.parent() {
        fs::create_dir_all(parent).map_err(|e| map_io_error(e, parent))?;
    }
    fs::copy(&live, &pending).map_err(|e| map_io_error(e, &live))?;
    clear_hidden_attribute(&pending);
    Ok(())
}

/// Game paths recorded in an account's pending (disputed) copy; empty when no
/// pending file exists.
pub fn pending_game_paths(app: &AppHandle, account_id: &str) -> Vec<String> {
    let Ok(path) = get_pending_path(app, account_id) else {
        return Vec::new();
    };
    match fs::read(&path) {
        Ok(bytes) => extract_game_paths(&bytes),
        Err(_) => Vec::new(),
    }
}

/// Resolve a stashed baseline conflict.
/// - `adopt == false` (取消备份): delete the pending copy; snapshot untouched.
/// - `adopt == true` (更新基准并备份): the pending copy must record exactly ONE
///   game path — that path is returned so the caller can write it into the
///   account's baseline — and the copy is atomically promoted to the account's
///   snapshot (the deferred backup completes with the exact disputed bytes).
/// Returns Ok(None) on discard, Ok(Some(new_baseline)) on adopt.
pub fn resolve_pending(app: &AppHandle, account_id: &str, adopt: bool) -> Result<Option<String>, FileSwapError> {
    let pending = get_pending_path(app, account_id)?;
    if !pending.exists() {
        return Err(FileSwapError::FileDeletionFailed("error.baseline.pending_missing".into()));
    }

    if !adopt {
        fs::remove_file(&pending).map_err(|e| map_io_error(e, &pending))?;
        return Ok(None);
    }

    let bytes = fs::read(&pending).map_err(|e| map_io_error(e, &pending))?;
    let paths = extract_game_paths(&bytes);
    if paths.len() != 1 {
        // Ambiguous (multiple Blizzard games) or unreadable — the caller's UI
        // only offers adopt for single-path pendings, so this is a safety net.
        return Err(FileSwapError::FileDeletionFailed("error.baseline.pending_ambiguous".into()));
    }

    let snapshot = get_snapshot_path(app, account_id)?;
    fs::rename(&pending, &snapshot).map_err(|e| map_io_error(e, &snapshot))?;
    Ok(Some(paths.into_iter().next().unwrap()))
}

/// All account ids that currently have a pending (unresolved) conflict copy.
pub fn list_pending_ids(app: &AppHandle) -> Vec<String> {
    let Ok(dir) = get_snapshot_dir(app) else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(&dir) else {
        return Vec::new();
    };
    entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            name.strip_prefix("pending_")
                .and_then(|s| s.strip_suffix(".db"))
                .map(|s| s.to_string())
        })
        .collect()
}

/// Delete an account's pending conflict copy if present (orphan cleanup).
pub fn discard_pending(app: &AppHandle, account_id: &str) {
    if let Ok(p) = get_pending_path(app, account_id) {
        if p.exists() {
            let _ = fs::remove_file(p);
        }
    }
}

/// Save current DB to specified account's snapshot
pub fn rotate_save(app: &AppHandle, last_account_id: &str) -> Result<(), FileSwapError> {
    let current_db = get_bnet_config_path()?;
    if !current_db.exists() {
        tracing::warn!("Backup skipped: Config not found at {:?}", current_db);
        return Ok(());
    }

    let snapshot_path = get_snapshot_path(app, last_account_id)?;
    let tmp_snapshot = snapshot_path.with_extension("tmp");

    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent).map_err(|e| map_io_error(e, parent))?;
    }

    // INDUSTRIAL ATOMICITY: Copy to .tmp first, then rename
    fs::copy(&current_db, &tmp_snapshot).map_err(|e| map_io_error(e, &current_db))?;
    // Battle.net's Agent creates product.db with the Hidden attribute, and
    // fs::copy (CopyFileEx) carries attributes over — which made snapshots
    // invisible in Explorer. Strip Hidden so users can see their own backups.
    clear_hidden_attribute(&tmp_snapshot);
    fs::rename(&tmp_snapshot, &snapshot_path).map_err(|e| map_io_error(e, &snapshot_path))?;

    tracing::info!("Backup successful (Atomic): {:?} -> {:?}", current_db, snapshot_path);
    Ok(())
}

/// Remove the Hidden attribute from a file, if set. No-op on failure — the
/// attribute is cosmetic and must never abort a backup.
fn clear_hidden_attribute(path: &Path) {
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        GetFileAttributesW, SetFileAttributesW, FILE_ATTRIBUTE_HIDDEN, FILE_FLAGS_AND_ATTRIBUTES,
        INVALID_FILE_ATTRIBUTES,
    };

    let wide = to_pcwstr(&path.to_string_lossy());
    unsafe {
        let attrs = GetFileAttributesW(PCWSTR(wide.as_ptr()));
        if attrs != INVALID_FILE_ATTRIBUTES && (attrs & FILE_ATTRIBUTE_HIDDEN.0) != 0 {
            let _ = SetFileAttributesW(
                PCWSTR(wide.as_ptr()),
                FILE_FLAGS_AND_ATTRIBUTES(attrs & !FILE_ATTRIBUTE_HIDDEN.0),
            );
        }
    }
}

/// Forcefully delete the current Battle.net product.db
pub fn delete_config() -> Result<(), FileSwapError> {
    // Audit before operation
    verify_config_writable()?;

    let target_db = get_bnet_config_path()?;
    if target_db.exists() {
        match fs::remove_file(&target_db) {
            Ok(_) => {
                tracing::info!("Config deleted successfully: {:?}", target_db);
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to delete config: {:?} (Error: {})", target_db, e);
                Err(FileSwapError::FileDeletionFailed(e.to_string()))
            }
        }
    } else {
        tracing::info!("Config deletion skipped (Not Found): {:?}", target_db);
        Ok(())
    }
}

/// Restore a specific account's snapshot to the active position
/// Returns Ok(true) if restored, Ok(false) if snapshot not found (skipped)
pub fn restore_snapshot(app: &AppHandle, account_id: &str) -> Result<bool, FileSwapError> {
    // Critical pre-flight check
    verify_config_writable()?;

    let target_db = get_bnet_config_path()?;
    let snapshot_path = get_snapshot_path(app, account_id)?;

    if !snapshot_path.exists() {
        tracing::info!("Restore skipped: Snapshot not found at {:?}", snapshot_path);
        return Ok(false);
    }

    if let Some(parent) = target_db.parent() {
        fs::create_dir_all(parent).map_err(|e| map_io_error(e, parent))?;
    }

    // INDUSTRIAL ATOMICITY: Restore to .tmp first, then rename to replace target_db
    // This prevents leaving the system with NO config if copy fails.
    let tmp_restore = target_db.with_extension("tmp");
    fs::copy(&snapshot_path, &tmp_restore).map_err(|e| map_io_error(e, &snapshot_path))?;
    fs::rename(&tmp_restore, &target_db).map_err(|e| map_io_error(e, &target_db))?;

    tracing::debug!("Restored snapshot (Atomic): {:?}", snapshot_path);
    Ok(true)
}

/// Delete a specific account's snapshot file
pub fn delete_snapshot(app: &AppHandle, account_id: &str) -> Result<(), FileSwapError> {
    let snapshot_path = get_snapshot_path(app, account_id)?;
    if snapshot_path.exists() {
        fs::remove_file(snapshot_path)?;
    }
    Ok(())
}

pub fn clear_all_snapshots(app: &AppHandle) -> Result<(), FileSwapError> {
    let snapshot_dir = get_snapshot_dir(app)?;
    if snapshot_dir.exists() {
        fs::remove_dir_all(&snapshot_dir)?;
        fs::create_dir_all(&snapshot_dir)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{extract_game_paths, normalize_config_path};

    #[test]
    fn normalizes_quotes_slashes_and_exe_suffix() {
        // Explorer "Copy as path" pastes with quotes; exe or dir both accepted.
        assert_eq!(normalize_config_path("\"F:\\game\\Diablo II Resurrected\\D2R.exe\""), "f:/game/diablo ii resurrected");
        assert_eq!(normalize_config_path("  F:/game/Diablo II Resurrected/  "), "f:/game/diablo ii resurrected");
        assert_eq!(normalize_config_path("'f:\\dec2027game\\maylyy'"), "f:/dec2027game/maylyy");
    }

    #[test]
    fn snapshot_subset_check_catches_swapped_d2r_path_despite_shared_game() {
        // A second Blizzard game installed at the same path appears in every
        // account's product.db. The gate must require ALL snapshot paths to be
        // present in live — any-intersection would pass on the shared game
        // alone and miss the swapped D2R path.
        fn blob(paths: &[&str]) -> Vec<u8> {
            let mut b = vec![0x0a, 0x02];
            for p in paths {
                b.extend_from_slice(p.as_bytes());
                b.push(0x00);
            }
            b
        }
        let snap = extract_game_paths(&blob(&["D:/Hearthstone", "F:/dec2027game/maylyy"]));
        let live = extract_game_paths(&blob(&["D:/Hearthstone", "F:/dec2027game/game"]));

        // Same expression as live_config_matches_snapshot's core comparison.
        let subset_ok = snap.iter().all(|p| live.contains(p));
        assert!(!subset_ok, "swapped D2R path must be detected");
        // Regression guard: the old any-intersection would have (wrongly) passed.
        assert!(snap.iter().any(|p| live.contains(p)));
    }

    #[test]
    fn extracts_and_normalizes_game_paths() {
        // Simulate a product.db blob: protobuf framing bytes around plain
        // UTF-8 path strings, mixed slash styles, Battle.net's own dirs.
        let mut blob: Vec<u8> = vec![0x0a, 0x32, 0x01];
        blob.extend_from_slice("C:/ProgramData/Battle.net/Agent".as_bytes());
        blob.push(0x12);
        blob.extend_from_slice(r"F:\dec2027game\maylyy".as_bytes());
        blob.push(0x00);
        blob.extend_from_slice("C:/Program Files (x86)/Battle.net".as_bytes());
        blob.push(0xff); // invalid UTF-8 -> U+FFFD terminator
        blob.extend_from_slice("F:/game/Diablo II Resurrected/".as_bytes());
        blob.push(0x07);

        let paths = extract_game_paths(&blob);
        assert_eq!(
            paths,
            vec![
                "f:/dec2027game/maylyy".to_string(),
                "f:/game/diablo ii resurrected".to_string(),
            ]
        );
    }
}

/// Cleanup Battle.net archive files and cache
pub fn cleanup_bnet_archives() -> Result<String, FileSwapError> {
    let program_data = env::var("ProgramData").map_err(|_| FileSwapError::EnvError)?;
    let bnet_agent_dir = Path::new(&program_data).join("Battle.net").join("Agent");

    let mut cleaned_count = 0;

    // Files to remove
    let targets = ["product.db", "Agent.db", "Agent.log"];

    for target in targets {
        let path = bnet_agent_dir.join(target);
        if path.exists() {
            if fs::remove_file(&path).is_ok() {
                cleaned_count += 1;
            }
        }
    }

    // Also try to remove Logs folder
    let logs_dir = bnet_agent_dir.join("Logs");
    if logs_dir.exists() {
        let _ = fs::remove_dir_all(logs_dir);
    }

    Ok(format!("logs.file_swap.cleaned_count|{{\"count\":{}}}", cleaned_count))
}
