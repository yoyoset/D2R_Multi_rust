$VERSION = (Get-Content "package.json" | ConvertFrom-Json).version
$BUCKET = "d2r-rust-updates"
$KEY_PATH = "keys\signer"
$PASSWORD = ""

Write-Host "[INIT] Version: $VERSION" -ForegroundColor Cyan

# 1. Try Build (skip signing env setup as we allow manual fallback)
Write-Host "[INFO] Build started (Parallel codegen: 16)..." -ForegroundColor Yellow
npm run tauri build -- --bundles nsis, msi, updater

# 2. Artifact Discovery & Manual Fallback
$TARGET_DIR = "src-tauri\target\release\bundle"
$NSIS_DIR = "$TARGET_DIR\nsis"
$SETUP_EXE = Get-ChildItem -Path $NSIS_DIR -Filter "d2r-rust_*_x64-setup.exe" | Select-Object -First 1
$UPDATER_ZIP = Get-ChildItem -Path $NSIS_DIR -Filter "*.zip" | Select-Object -First 1

# Check if updater zip exists. If not, create it manually.
if (-not $UPDATER_ZIP) {
    Write-Host "[WARN] Autosigned updater ZIP not found. Initiating manual fallback..." -ForegroundColor Yellow
    $RAW_EXE = "src-tauri\target\release\d2r-rust.exe"
    if (Test-Path $RAW_EXE) {
        $ZIP_NAME = "d2r-rust_$VERSION_x64_en-US.nsis.zip"
        $ZIP_PATH = "$NSIS_DIR\$ZIP_NAME"
        
        # Ensure directory exists
        if (!(Test-Path $NSIS_DIR)) { New-Item -ItemType Directory -Path $NSIS_DIR | Out-Null }
        
        # Compress
        Compress-Archive -Path $RAW_EXE -DestinationPath $ZIP_PATH -Force
        $UPDATER_ZIP = Get-Item $ZIP_PATH
        Write-Host "[INFO] Created manual ZIP: $ZIP_PATH" -ForegroundColor Green
        
        # Sign manually with ABSOLUTE PATH to avoid CLI parsing issues
        $KEY_ABS_PATH = (Resolve-Path $KEY_PATH).Path
        Write-Host "[INFO] Signing using key at: $KEY_ABS_PATH" -ForegroundColor Yellow
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
        
        # Use simple string matching to extract signature from output
        $SIGN_OUTPUT = npm run tauri signer sign -- -k "$KEY_ABS_PATH" "$ZIP_PATH" 2>&1
        
        # Extract signature (assuming last line or specific format)
        $SIG = $SIGN_OUTPUT | Select-String -Pattern "([a-zA-Z0-9+/=]{80,})" | Select-Object -ExpandProperty Matches | Select-Object -ExpandProperty Value | Select-Object -Last 1
        
        if (-not $SIG) {
            Write-Host "[ERROR] Manual signing failed. Output: $SIGN_OUTPUT" -ForegroundColor Red
            exit 1
        }
        Write-Host "[INFO] Manual signature generated." -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] Raw EXE not found at $RAW_EXE" -ForegroundColor Red
        exit 1
    }
}
else {
    $SIG = Get-Content "$($UPDATER_ZIP.FullName).sig" -Raw
}

if (-not $SETUP_EXE) {
    # If setup exe missing, check if we can find it recursively or just fail
    $SETUP_EXE = Get-ChildItem -Path "$TARGET_DIR\nsis" -Filter "*.exe" | Select-Object -First 1
    if (-not $SETUP_EXE) {
        Write-Host "[ERROR] Installer (.exe) not found anywhere." -ForegroundColor Red
        exit 1
    }
}

# 3. Generate updater.json
$UPDATER_JSON = @{
    version   = $VERSION
    notes     = "Release v$VERSION"
    pub_date  = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    platforms = @{
        "windows-x86_64" = @{
            signature = $SIG.Trim()
            url       = "https://update.squareuncle.com/d2r-rust/$($UPDATER_ZIP.Name)"
        }
    }
}

if (!(Test-Path "dist-updates")) { New-Item -ItemType Directory -Path "dist-updates" }
$UPDATER_JSON | ConvertTo-Json -Depth 10 | Out-File "dist-updates\latest.json" -Encoding utf8

# 4. Upload to Cloudflare R2
Write-Host "[INFO] Uploading to Cloudflare R2..." -ForegroundColor Yellow
npx wrangler r2 object put "$BUCKET/d2r-rust/$($SETUP_EXE.Name)" --file "$($SETUP_EXE.FullName)"
npx wrangler r2 object put "$BUCKET/d2r-rust/$($UPDATER_ZIP.Name)" --file "$($UPDATER_ZIP.FullName)"
npx wrangler r2 object put "$BUCKET/d2r-rust/latest.json" --file "dist-updates\latest.json"

Write-Host "[SUCCESS] Release v$VERSION fully deployed!" -ForegroundColor Green
