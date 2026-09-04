@echo off
:: ============================================
:: MACCAN RMS - Auto-Start on Login
:: Place this in the Windows Startup folder
:: C:\Users\soley\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
:: ============================================

:: Set paths
set PROJECT_ROOT=C:\Users\soley\OneDrive\Desktop\Maccan Kitchen\maccan-rms
set BACKEND_DIR=%PROJECT_ROOT%\backend-nestjs
set FRONTEND_DIR=%PROJECT_ROOT%\frontend
set LOG_DIR=%PROJECT_ROOT%\logs

:: Create log directory if it doesn't exist
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Wait 15 seconds for network/OneDrive to be ready
timeout /t 15 /nobreak >nul

:: ---- Check if already running ----
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] Backend already running, skipping... >> "%LOG_DIR%\autostart.log"
    goto :check_frontend
)

:: ---- Kill any stale backend on port 3001 ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: ---- Start Backend ----
echo [%date% %time%] Starting backend... >> "%LOG_DIR%\autostart.log"
cd /d "%BACKEND_DIR%"

:: Build if dist doesn't exist
if not exist "dist\src\main.js" (
    echo [%date% %time%] Building backend... >> "%LOG_DIR%\autostart.log"
    call npm run build >> "%LOG_DIR%\build-backend.log" 2>&1
)

start "MACCAN Backend" /B node dist\src\main.js >> "%LOG_DIR%\backend.log" 2>&1
echo [%date% %time%] Backend started on port 3001 >> "%LOG_DIR%\autostart.log"

:: Wait for backend to initialize
timeout /t 8 /nobreak >nul

:check_frontend
:: ---- Check if frontend already running ----
netstat -ano | findstr ":7451" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] Frontend already running, skipping... >> "%LOG_DIR%\autostart.log"
    goto :done
)

:: ---- Kill any stale frontend on port 7451 ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7451" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: ---- Start Frontend ----
echo [%date% %time%] Starting frontend... >> "%LOG_DIR%\autostart.log"
cd /d "%FRONTEND_DIR%"
start "MACCAN Frontend" /B npm run dev >> "%LOG_DIR%\frontend.log" 2>&1
echo [%date% %time%] Frontend starting on port 7451 >> "%LOG_DIR%\autostart.log"

:done
echo [%date% %time%] Auto-start complete >> "%LOG_DIR%\autostart.log"
