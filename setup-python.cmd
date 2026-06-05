@echo off
rem Downloads Python's "embeddable" distribution into .\python\ so the app
rem can run on machines without a system-wide Python install. Idempotent:
rem rerunning it when python\python.exe already exists is a no-op.
rem
rem Once this folder is populated, zip the whole WorkflowRunner directory
rem and copy it to any Windows machine — recipients unzip and run
rem start.cmd (or the desktop shortcut) without installing anything.

setlocal
set "PY_VERSION=3.13.1"
set "ZIP_URL=https://www.python.org/ftp/python/%PY_VERSION%/python-%PY_VERSION%-embed-amd64.zip"
set "ZIP_PATH=%~dp0python-embed.zip"
set "PY_DIR=%~dp0python"

if exist "%PY_DIR%\python.exe" (
  echo Embeddable Python already present at "%PY_DIR%". Nothing to do.
  goto :eof
)

echo Downloading embeddable Python %PY_VERSION% ...
echo   %ZIP_URL%
powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri '%ZIP_URL%' -OutFile '%ZIP_PATH%'"
if errorlevel 1 (
  echo.
  echo ERROR: Download failed. Check your internet connection and proxy
  echo        settings, then re-run setup-python.cmd.
  exit /b 1
)

echo Extracting to "%PY_DIR%" ...
if not exist "%PY_DIR%" mkdir "%PY_DIR%"
powershell -NoProfile -Command "Expand-Archive -LiteralPath '%ZIP_PATH%' -DestinationPath '%PY_DIR%' -Force"
if errorlevel 1 (
  echo.
  echo ERROR: Extraction failed.
  exit /b 1
)

del "%ZIP_PATH%" >nul 2>&1

if not exist "%PY_DIR%\python.exe" (
  echo.
  echo ERROR: Extraction completed but python.exe was not found. The
  echo        embeddable zip may have changed format. Check
  echo        https://www.python.org/ftp/python/%PY_VERSION%/
  exit /b 1
)

echo.
echo Done. Embeddable Python installed at "%PY_DIR%".
echo You can now double-click start.cmd — no system Python required.
