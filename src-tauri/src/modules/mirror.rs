use std::path::Path;
use std::process::Command;
use std::os::windows::process::CommandExt;

// Windows constant for creating a process without showing a window (for cmd)
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[tauri::command]
pub async fn create_mirror_junction(source: String, destination: String, name: String) -> Result<String, String> {
    let source_path = Path::new(&source);
    if !source_path.exists() || !source_path.is_dir() {
        return Err("源路径不存在或不是一个目录".to_string());
    }

    let target_path = Path::new(&destination).join(&name);
    if target_path.exists() {
        return Err(format!("目标路径已存在: {:?}", target_path));
    }

    // Ensure parents of target exist
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
        }
    }

    // Run mklink /J via cmd
    // Syntax: mklink /J "Target" "Source"
    let output = Command::new("cmd")
        .args(&[
            "/C",
            "mklink",
            "/J",
            target_path.to_str().ok_or("无效的目标路径字符")?,
            source_path.to_str().ok_or("无效的源路径字符")?,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("无法执行 mklink 命令: {}", e))?;

    if output.status.success() {
        Ok(format!("成功创建镜像: {:?}", target_path))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("创建失败: {}", stderr))
    }
}
