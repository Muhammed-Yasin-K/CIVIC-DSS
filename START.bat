@echo off
echo ========================================
echo   Civic Risk Management System
echo   Quick Start Script
echo ========================================
echo.

echo [1/3] Starting Backend Server...
echo.
start "Backend Server" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Frontend Server...
echo.
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Opening Browser...
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173/login

echo.
echo ========================================
echo   Servers Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Login Credentials:
echo   Admin:   admin@civic.gov / admin123
echo   Officer: officer@civic.gov / officer123
echo.
echo Press any key to exit this window...
pause >nul
