fn main() {
    #[cfg(target_os = "windows")]
    {
        // 解决 LNK1123：关闭增量链接
        println!("cargo:rustc-link-arg=/INCREMENTAL:NO");
    }

    // 使用 tauri-build 的 app_manifest 替换默认清单
    // 包含管理员权限和 Common Controls 6.0
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="0.4.5.0" processorArchitecture="*" name="com.d2rmultiplay.ui" type="win32"/>
  <description>D2R Multi</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
  <dependency>
    <dependentAssembly>
      <assemblyIdentity type="win32" name="Microsoft.Windows.Common-Controls" version="6.0.0.0" processorArchitecture="*" publicKeyToken="6595b64144ccf1df" language="*"/>
    </dependentAssembly>
  </dependency>
  <compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1">
    <application>
      <supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/>
    </application>
  </compatibility>
</assembly>"#);

    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("failed to run tauri-build");
}
