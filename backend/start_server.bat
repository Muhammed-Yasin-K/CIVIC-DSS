@echo off
echo ========================================
echo   Starting Civic Risk Backend Server
echo ========================================
echo.

echo [1/2] Using virtual environment Python...
echo Virtual Environment: D:\Main_Project\.venv
echo.

REM Start the server using venv Python directly
echo [2/2] Starting FastAPI server on http://localhost:8000
echo.
echo Press CTRL+C to stop the server
echo.

D:\Main_Project\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

echo.
echo Server stopped.
pause
