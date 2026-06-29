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
    # Cada consulta WMI va en su propio try: en algunas PCs Get-CimInstance falla y,
    # con ErrorActionPreference=Stop, eso tumbaria el instalador. Con fallback nunca falla.
    $ram_gb = 8; $cores = 4; $gpu = $null
    try { $ram_gb = [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory / 1GB) } catch {}
    try { $cores  = (Get-CimInstance Win32_Processor -ErrorAction Stop | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum } catch {}
    if (-not $cores -or $cores -lt 1) { $cores = 4 }
    try {
        $gpuObj = Get-CimInstance Win32_VideoController -ErrorAction Stop | Where-Object { $_.Name -match "NVIDIA" } | Select-Object -First 1
        if ($gpuObj) { $gpu = $gpuObj.Name }
    } catch {}
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

function Test-PythonExe($exe) {
    # Devuelve la version si $exe es un Python 3.11+ usable; si no, $null.
    if (-not $exe -or -not (Test-Path $exe)) { return $null }
    try {
        $ver = & $exe --version 2>&1
        if ("$ver" -match "3\.(1[1-9]|[2-9]\d)") { return "$ver" }
    } catch {}
    return $null
}

function Find-PythonExe {
    # Busca un python.exe real, ignorando el stub de Microsoft Store (que esta en
    # WindowsApps y no es Python de verdad). Orden: lanzador py -> PATH -> rutas tipicas.
    $candidates = @()

    # 1) Lanzador oficial 'py'
    if (Get-Command py -ErrorAction SilentlyContinue) {
        try { $candidates += (& py -3 -c "import sys; print(sys.executable)" 2>$null) } catch {}
    }
    # 2) python del PATH, descartando el stub de la Store
    $cmd = Get-Command python -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -notlike "*WindowsApps*") { $candidates += $cmd.Source }
    # 3) Ubicaciones tipicas de instalacion (no dependen del PATH de esta sesion)
    foreach ($glob in @(
        "$env:LOCALAPPDATA\Programs\Python\Python3*\python.exe",
        "$env:ProgramFiles\Python3*\python.exe",
        "${env:ProgramFiles(x86)}\Python3*\python.exe"
    )) {
        $candidates += (Get-ChildItem $glob -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName })
    }

    foreach ($c in $candidates) {
        if (Test-PythonExe $c) { return $c }
    }
    return $null
}

function Install-PythonIfMissing {
    $exe = Find-PythonExe
    if ($exe) {
        Show-OK "Python encontrado: $(Test-PythonExe $exe)"
        return $exe
    }

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Show-Fail "No se encontro Python ni winget. Instala Python 3.12 desde https://www.python.org/downloads/ (marca 'Add python.exe to PATH') y vuelve a ejecutar INSTALAR.bat."
    }

    Show-Info "Instalando Python 3.12 (puede tardar 1-2 min)..."
    try {
        winget install --id Python.Python.3.12 -e --source winget --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
    } catch {
        Show-Fail "No se pudo instalar Python automaticamente. Descargalo de https://www.python.org/downloads/ e intenta de nuevo."
    }

    # Refrescar PATH y re-buscar escaneando las rutas reales (no solo el PATH).
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    $exe = Find-PythonExe
    if (-not $exe) {
        Show-Fail "Python se instalo pero no se encontro. Cierra esta ventana, REINICIA la PC y vuelve a ejecutar INSTALAR.bat."
    }
    Show-OK "Python instalado: $(Test-PythonExe $exe)"
    return $exe
}

# ── Verificar/instalar ffmpeg (procesa el audio) ──────────────────────────────

function Install-FfmpegIfMissing {
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Show-OK "ffmpeg encontrado."
        return
    }
    Show-Info "Instalando ffmpeg (necesario para procesar el audio) via winget..."
    try {
        winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
    } catch {
        Show-Warn "No se pudo instalar ffmpeg. Instalalo desde https://ffmpeg.org y reinicia."
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Show-OK "ffmpeg instalado."
    } else {
        Show-Warn "ffmpeg instalado pero aun no visible. Si falla al transcribir, reinicia la PC."
    }
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

# ── Verificar interfaz React (build versionado en el repo) ────────────────────

function Confirm-Frontend($base) {
    # El build estatico de React (web/dist) viene incluido en el repo, asi que
    # el usuario final NO necesita Node. Solo verificamos que este presente.
    $dist = Join-Path $base "web\dist\index.html"
    if (Test-Path $dist) {
        Show-OK "Interfaz lista (build incluido)."
    } else {
        Show-Fail "Falta web\dist. Descarga el proyecto completo (no solo el codigo fuente)."
    }
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

    # Carpeta de datos FUERA del programa, en Documentos: así las sesiones
    # corregidas sobreviven si el usuario vuelve a copiar/extraer el ZIP.
    $docs    = [Environment]::GetFolderPath("MyDocuments")
    $dataDir = Join-Path $docs "Transcriptor Municipal\data"
    New-Item -ItemType Directory -Force $dataDir | Out-Null
    $dataDirEnv = $dataDir -replace "\\", "/"   # barras normales para el .env

    $content = Get-Content $envPath -Raw
    $content = $content -replace "WHISPER_MODEL=\S+",   "WHISPER_MODEL=$model"
    $content = $content -replace "WHISPER_BACKEND=\S+", "WHISPER_BACKEND=local"
    if ($content -match "WHISPER_DEVICE=") {
        $content = $content -replace "WHISPER_DEVICE=\S+", "WHISPER_DEVICE=$device"
    } else {
        $content = $content.TrimEnd() + "`r`nWHISPER_DEVICE=$device`r`n"
    }
    if ($content -match "(?m)^DATA_DIR=") {
        $content = $content -replace "(?m)^DATA_DIR=.*$", "DATA_DIR=$dataDirEnv"
    } else {
        $content = $content.TrimEnd() + "`r`nDATA_DIR=$dataDirEnv`r`n"
    }
    [System.IO.File]::WriteAllText($envPath, $content)
    Show-OK "Configuracion guardada (modelo: $model, dispositivo: $device)."
    Show-Info "Tus sesiones se guardaran en: $dataDir"
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

try {

# Paso 1: Hardware
Show-Step 1 7 "Analizando tu computadora..."
$info  = Get-HardwareInfo
$model = Get-RecommendedModel $info
Show-Info "RAM: $($info.ram_gb) GB  |  CPU: $($info.cores) nucleos  |  GPU NVIDIA: $(if ($info.gpu) { $info.gpu } else { 'No detectada' })"
Show-Info "Modelo de IA: $model ($(Get-ModelSize $model)) - $(Get-ModelDesc $model)"
Write-Host ""

# Paso 2: Python
Show-Step 2 7 "Verificando Python..."
$pyExe = Install-PythonIfMissing
Write-Host ""

# Paso 3: Venv
Show-Step 3 7 "Preparando entorno virtual..."
$scripts = New-VirtualEnv $pyExe
Write-Host ""

# Paso 4: Deps
Show-Step 4 7 "Instalando librerias..."
Install-AppDeps $scripts ($null -ne $info.gpu)
Install-FfmpegIfMissing
Write-Host ""

# Paso 5: Modelo
Show-Step 5 7 "Descargando modelo de inteligencia artificial..."
Invoke-ModelDownload $scripts $model
Write-Host ""

# Paso 6: Interfaz
Show-Step 6 7 "Verificando la interfaz..."
Confirm-Frontend $BASE
Write-Host ""

# Paso 7: Config y acceso directo
Show-Step 7 7 "Finalizando..."
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

} catch {
    # Red de seguridad: cualquier error no previsto muestra el detalle y espera,
    # en vez de cerrar la ventana en silencio.
    Write-Host ""
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Red
    Write-Host "  |          LA INSTALACION SE DETUVO                        |" -ForegroundColor Red
    Write-Host "  +----------------------------------------------------------+" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Motivo: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Detalle tecnico (para soporte):" -ForegroundColor DarkGray
    Write-Host "  $($_.ScriptStackTrace)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Presiona ENTER para cerrar..." -ForegroundColor DarkGray
    Read-Host | Out-Null
    exit 1
}
