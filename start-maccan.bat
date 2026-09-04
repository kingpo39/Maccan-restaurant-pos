@echo off
setlocal
title MACCAN RMS - Start
cd /d "%~dp0"

set BACKEND_DIR=%~dp0backend-nestjs
set FRONTEND_DIR=%~dp0frontend
set PORT=7451

echo ==========================================
echo    MACCAN RMS - دهکده جنگلی ماکان
echo    Restaurant Management System
echo ==========================================
echo.

echo [1/3] Stopping old servers on ports 3001, %PORT% ...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001 " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1

echo [2/3] Starting backend on port 3001 ...
cd /d "%BACKEND_DIR%"
if not exist "dist\src\main.js" (
  echo     Building backend first...
  call npx nest build >nul 2>&1
)
start "MACCAN Backend" /min cmd /c "node dist\src\main.js"

echo [3/3] Starting frontend on port %PORT% ...
cd /d "%FRONTEND_DIR%"
start "MACCAN Frontend" /min cmd /c "node node_modules\vite\bin\vite.js --port %PORT% --host --strictPort"

echo.
echo Waiting for servers to start...
timeout /t 6 /nobreak >nul

start "" "http://localhost:%PORT%"
echo.
echo   App:      http://localhost:%PORT%
echo   Backend:  http://localhost:3001/api
echo   Login:    email only - click any demo account
echo.
endlocal