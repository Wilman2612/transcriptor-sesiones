#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$ProgressPreference    = "SilentlyContinue"

$BASE = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Helpers visuales (solo ASCII para compatibilidad con PS 5.1) ──────────────

function Show-Header {
    Clear-Host
    $Host.UI.RawUI.WindowTitle = "Instalador - Transcriptor Municipal"
    Write-Host ""
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |      TRANSCRIPTOR DE SESIONES MUNICIPALES                |" -ForegroundColor Cyan
    Write-Host "  |             Instalador automatico                        |" -ForegroundColor Cyan
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Step($num, $total, $msg) {
    Write-Host "  [$num/$total] $msg" -ForegroundColor White
}

function Show-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Show-Info($msg) { Write-Host "       $msg" -ForegroundColor DarkGray }
function Show-Warn($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

function Show-Fail($msg) {
    Write-Host ""
    Write-Host "  [ERROR] $msg" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Presiona ENTER para cerrar..." -ForegroundColor DarkGray
    Read-Host | Out-Null
    exit 1
}

# ── Deteccion de hardware ─────────────────────────────────────────────────────

function Get-HardwareInfo {
    $ram_gb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB)
    $cores  = (Get-CimInstance Win32_Processor).NumberOfLogicalProcessors
    $gpuObj = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
    $gpu    = if ($gpuObj) { $gpuObj.Name } else { $null }
    return @{ ram_gb = $ram_gb; cores = $cores; gpu = $gpu }
}

function Get-RecommendedModel($info) {
    if ($info.gpu)              { return "large-v3" }
    if ($info.ram_gb -ge 16)   { return "medium" }
    if ($info.ram_gb -ge 8)    { return "small" }
    return "base"
}

function Get-ModelSize($m) {
    switch ($m) {
        "base"     { return "145 MB" }
        "small"    { return "488 MB" }
        "medium"   { return "1.5 GB" }
        "large-v3" { return "3.1 GB" }
        default    { return "?" }
    }
}

function Get-ModelDesc($m) {
    switch ($m) {
        "large-v3" { return "calidad maxima (GPU)" }
        "medium"   { return "alta calidad" }
        "small"    { return "buena calidad" }
        default    { return "calidad basica" }
    }
}

# ── Verificar/instalar Python ─────────────────────────────────────────────────

function Install-PythonIfMissing {
    $py = Get-Command python -ErrorAction SilentlyContinue
    if ($py) {
        $ver = & python --version 2>&1
        if ($ver -match "3\.(1[1-9]|[2-9]\d)") {
            Show-OK "Python encontrado: $ver"
            return (Get-Command python).Source
        }
        Show-Warn "Python encontrado pero version antigua ($ver). Instalando version nueva..."
    }

    Show-Info "Instalando Python 3.12 via winget..."
    try {
        winget install --id Python.Python.3.12 -e --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
    } catch {
        Show-Fail "No se pudo instalar Python. Descargalo de https://python.org e intenta de nuevo."
    }

    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $py = Get-Command python -ErrorAction SilentlyContinue
    if (-not $py) { Show-Fail "Python instalado pero no encontrado en PATH. Reinicia e intenta de nuevo." }
    Show-OK "Python instalado correctamente."
    return $py.Source
}

# ── Entorno virtual ───────────────────────────────────────────────────────────

function New-VirtualEnv($pyExe) {
    $venv = Join-Path $BASE ".venv"
    if (-not (Test-Path "$venv\Scripts\python.exe")) {
        Show-Info "Creando entorno virtual..."
        & $pyExe -m venv $venv 2>&1 | Out-Null
        Show-OK "Entorno virtual creado."
    } else {
        Show-OK "Entorno virtual ya existe."
    }
    return "$venv\Scripts"
}

# ── Dependencias ──────────────────────────────────────────────────────────────

function Install-AppDeps($scripts, $hasGpu) {
    Show-Info "Instalando dependencias (puede tardar 2-5 min la primera vez)..."
    & "$scripts\pip" install --upgrade pip --quiet 2>&1 | Out-Null
    & "$scripts\pip" install -e "$BASE\.[dev]" --quiet 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Show-Fail "Error al instalar dependencias. Revisa tu conexion a internet." }

    if ($hasGpu) {
        Show-Info "GPU NVIDIA detectada - instalando soporte CUDA..."
        & "$scripts\pip" install ctranslate2 --extra-index-url https://download.pytorch.org/whl/cu121 --quiet 2>&1 | Out-Null
    }
    Show-OK "Dependencias instaladas."
}

# ── Descargar modelo Whisper ──────────────────────────────────────────────────

function Invoke-ModelDownload($scripts, $model) {
    Show-Info "Descargando modelo '$model' ($(Get-ModelSize $model)) - esto ocurre una sola vez..."
    $script = "from faster_whisper import WhisperModel; WhisperModel('$model', device='cpu', compute_type='int8'); print('OK')"
    $tmp = [System.IO.Path]::GetTempFileName() -replace "\.tmp$", ".py"
    [System.IO.File]::WriteAllText($tmp, $script)

    $proc = Start-Process "$scripts\python" -ArgumentList $tmp -NoNewWindow -PassThru
    $dots = 0
    while (-not $proc.HasExited) {
        Start-Sleep -Seconds 3
        $dots++
        $pct = [math]::Min(95, $dots * 3)
        Write-Host "`r       Descargando... $pct%   " -NoNewline -ForegroundColor DarkCyan
    }
    Write-Host ""
    Remove-Item $tmp -ErrorAction SilentlyContinue

    if ($proc.ExitCode -ne 0) { Show-Fail "Error al descargar el modelo. Revisa tu conexion a internet." }
    Show-OK "Modelo '$model' listo."
}

# ── Configurar .env ───────────────────────────────────────────────────────────

function Set-AppConfig($model, $info) {
    $envPath = Join-Path $BASE ".env"
    if (-not (Test-Path $envPath)) {
        Copy-Item "$BASE\.env.example" $envPath
    }
    $device = if ($info.gpu) { "cuda" } else { "cpu" }
    $content = Get-Content $envPath -Raw
    $content = $content -replace "WHISPER_MODEL=\S+",   "WHISPER_MODEL=$model"
    $content = $content -replace "WHISPER_BACKEND=\S+", "WHISPER_BACKEND=local"
    if ($content -match "WHISPER_DEVICE=") {
        $content = $content -replace "WHISPER_DEVICE=\S+", "WHISPER_DEVICE=$device"
    } else {
        $content = $content.TrimEnd() + "`r`nWHISPER_DEVICE=$device`r`n"
    }
    [System.IO.File]::WriteAllText($envPath, $content)
    Show-OK "Configuracion guardada (modelo: $model, dispositivo: $device)."
}

# ── Acceso directo y lanzador ─────────────────────────────────────────────────

function New-AppLauncher {
    $launcherPath = Join-Path $BASE "iniciar.ps1"
    $content = @'
$ErrorActionPreference = "Stop"
$BASE = Split-Path -Parent $MyInvocation.MyCommand.Path
$Host.UI.RawUI.WindowTitle = "Transcriptor Municipal"
Write-Host ""
Write-Host "  Iniciando Transcriptor de Sesiones..." -ForegroundColor Cyan
Write-Host ""
Set-Location $BASE
& "$BASE\.venv\Scripts\python" run.py
Write-Host ""
Write-Host "  El programa se cerro. Presiona ENTER para salir." -ForegroundColor DarkGray
Read-Host | Out-Null
'@
    [System.IO.File]::WriteAllText($launcherPath, $content)
}

function New-DesktopShortcut {
    $desktop = [Environment]::GetFolderPath("Desktop")
    $lnkPath = Join-Path $desktop "Transcriptor Municipal.lnk"
    $wsh = New-Object -ComObject WScript.Shell
    $lnk = $wsh.CreateShortcut($lnkPath)
    $lnk.TargetPath       = "powershell.exe"
    $lnk.Arguments        = "-NoProfile -ExecutionPolicy Bypass -File `"$BASE\iniciar.ps1`""
    $lnk.WorkingDirectory = $BASE
    $lnk.Description      = "Transcriptor de Sesiones Municipales"
    $lnk.IconLocation     = "shell32.dll,22"
    $lnk.Save()
    Show-OK "Acceso directo creado en el escritorio."
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════

Show-Header

Write-Host "  Este instalador configurara todo lo necesario para usar" -ForegroundColor White
Write-Host "  el Transcriptor de Sesiones de Consejo Municipal." -ForegroundColor White
Write-Host "  Solo necesitas conexion a internet." -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Presiona ENTER para comenzar..." -ForegroundColor Yellow
Read-Host | Out-Null

Show-Header

# Paso 1: Hardware
Show-Step 1 6 "Analizando tu computadora..."
$info  = Get-HardwareInfo
$model = Get-RecommendedModel $info
Show-Info "RAM: $($info.ram_gb) GB  |  CPU: $($info.cores) nucleos  |  GPU NVIDIA: $(if ($info.gpu) { $info.gpu } else { 'No detectada' })"
Show-Info "Modelo de IA: $model ($(Get-ModelSize $model)) - $(Get-ModelDesc $model)"
Write-Host ""

# Paso 2: Python
Show-Step 2 6 "Verificando Python..."
$pyExe = Install-PythonIfMissing
Write-Host ""

# Paso 3: Venv
Show-Step 3 6 "Preparando entorno virtual..."
$scripts = New-VirtualEnv $pyExe
Write-Host ""

# Paso 4: Deps
Show-Step 4 6 "Instalando librerias..."
Install-AppDeps $scripts ($null -ne $info.gpu)
Write-Host ""

# Paso 5: Modelo
Show-Step 5 6 "Descargando modelo de inteligencia artificial..."
Invoke-ModelDownload $scripts $model
Write-Host ""

# Paso 6: Config y acceso directo
Show-Step 6 6 "Finalizando..."
Set-AppConfig $model $info
New-AppLauncher
New-DesktopShortcut
Write-Host ""

# Resumen
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host "  |          INSTALACION COMPLETA                            |" -ForegroundColor Green
Write-Host "  +----------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  Para usar el transcriptor:" -ForegroundColor White
Write-Host "  > Doble clic en 'Transcriptor Municipal' en el escritorio" -ForegroundColor Cyan
Write-Host "  > O ejecuta INICIAR.bat desde esta carpeta" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Modelo: $model  |  RAM: $($info.ram_gb) GB  |  GPU: $(if ($info.gpu) { 'Si' } else { 'No' })" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Presiona ENTER para cerrar..." -ForegroundColor DarkGray
Read-Host | Out-Null
