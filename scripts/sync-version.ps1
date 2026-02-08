param (
    [Parameter(Mandatory = $true)]
    [string]$NewVersion
)

Write-Host "🔄 正在同步版本号至 $NewVersion..." -ForegroundColor Cyan

# 1. Update package.json
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$pkg.version = $NewVersion
$pkg | ConvertTo-Json -Depth 10 | Out-File "package.json" -Encoding utf8

# 2. Update tauri.conf.json
$tauri = Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json
$tauri.version = $NewVersion
$tauri | ConvertTo-Json -Depth 10 | Out-File "src-tauri/tauri.conf.json" -Encoding utf8

# 3. Update Cargo.toml
$cargo = Get-Content "src-tauri/Cargo.toml" -Raw
$cargo = $cargo -replace 'version = "[^"]+"', "version = `"$NewVersion`""
$cargo | Out-File "src-tauri/Cargo.toml" -Encoding utf8

Write-Host "✅ 版本同步完成。建议运行 'cargo check' 或 'npm run tauri build' 验证。" -ForegroundColor Green
