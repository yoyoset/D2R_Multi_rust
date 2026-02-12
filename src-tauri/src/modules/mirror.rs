use super::os::windows::utils::to_pcwstr;
use anyhow::Result;
use std::path::Path;
use windows::core::PCWSTR;
use windows::Win32::Foundation::{CloseHandle, GENERIC_WRITE, HANDLE};
use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT, FILE_SHARE_READ,
    FILE_SHARE_WRITE, OPEN_EXISTING,
};
use windows::Win32::System::Ioctl::FSCTL_SET_REPARSE_POINT;
use windows::Win32::System::IO::DeviceIoControl;

// IO_REPARSE_TAG_MOUNT_POINT
const IO_REPARSE_TAG_MOUNT_POINT: u32 = 0xA0000003;

#[repr(C)]
struct ReparseDataBufferMountPoint {
    reparse_tag: u32,
    reparse_data_length: u16,
    reserved: u16,
    substitute_name_offset: u16,
    substitute_name_length: u16,
    print_name_offset: u16,
    print_name_length: u16,
    buffer: [u16; 16384],
}

#[tauri::command]
pub async fn create_mirror_junction(
    source: String,
    destination: String,
    name: String,
) -> Result<String, String> {
    let source_path = Path::new(&source);
    if !source_path.exists() || !source_path.is_dir() {
        return Err("源路径不存在或不是一个目录".to_string());
    }

    let target_path = Path::new(&destination).join(&name);
    if target_path.exists() {
        return Err(format!("目标路径已存在: {:?}", target_path));
    }

    // 1. Create the empty directory first
    if let Some(parent) = target_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("创建父目录失败: {}", e))?;
        }
    }
    std::fs::create_dir(target_path.clone()).map_err(|e| format!("无法创建目录: {}", e))?;

    // 2. Prepare paths
    // Substitute name must start with \??\
    let source_full = source_path
        .canonicalize()
        .map_err(|e| format!("无法规范化源路径: {}", e))?;
    let source_str = source_full.to_string_lossy().replace(r"\\?\", r"\??\");
    let print_name_str = source_full.to_string_lossy().replace(r"\\?\", "");

    let sub_name_u16 = to_pcwstr(&source_str);
    let print_name_u16 = to_pcwstr(&print_name_str);

    // PCWSTR includes \0, but for buffer we don't want the last \0
    let sub_len = (sub_name_u16.len() - 1) * 2;
    let print_len = (print_name_u16.len() - 1) * 2;

    // 3. Fill the buffer
    let mut reparse_data = ReparseDataBufferMountPoint {
        reparse_tag: IO_REPARSE_TAG_MOUNT_POINT,
        reparse_data_length: (sub_len + print_len + 12) as u16,
        reserved: 0,
        substitute_name_offset: 0,
        substitute_name_length: sub_len as u16,
        print_name_offset: (sub_len + 2) as u16,
        print_name_length: print_len as u16,
        buffer: [0u16; 16384],
    };

    unsafe {
        std::ptr::copy_nonoverlapping(
            sub_name_u16.as_ptr(),
            reparse_data.buffer.as_mut_ptr(),
            sub_name_u16.len() - 1,
        );
        std::ptr::copy_nonoverlapping(
            print_name_u16.as_ptr(),
            reparse_data.buffer.as_mut_ptr().add(sub_len / 2 + 1),
            print_name_u16.len() - 1,
        );

        let target_u16 = to_pcwstr(&target_path.to_string_lossy());
        let handle = CreateFileW(
            PCWSTR(target_u16.as_ptr()),
            GENERIC_WRITE.0,
            FILE_SHARE_READ | FILE_SHARE_WRITE,
            None,
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
            Some(HANDLE::default()),
        )
        .map_err(|e| format!("无法获取目录句柄: {}", e))?;

        let mut bytes_returned = 0u32;
        let success = DeviceIoControl(
            handle,
            FSCTL_SET_REPARSE_POINT,
            Some(&reparse_data as *const _ as *const _),
            reparse_data.reparse_data_length as u32 + 8,
            None,
            0,
            Some(&mut bytes_returned),
            None,
        )
        .is_ok();

        let _ = CloseHandle(handle);

        if success {
            Ok(format!("成功创建镜像: {:?}", target_path))
        } else {
            // Cleanup on failure
            let _ = std::fs::remove_dir(target_path);
            Err("DeviceIoControl 设置重解析点失败".to_string())
        }
    }
}
