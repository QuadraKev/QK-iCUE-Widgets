@echo off
setlocal

echo.
echo   Now Playing Server - Setup and Launch
echo   ======================================
echo.

:: Check for Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Python was not found.
    echo   Please install Python 3.10 or later from https://www.python.org
    echo   Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: Show Python version
for /f "tokens=*" %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo   Found %PYVER%
echo.

:: Install dependencies
echo   Installing dependencies...
echo.
python -m pip install --quiet --upgrade PyAudioWPatch numpy websockets pystray Pillow winrt-runtime winrt-Windows.Media.Control winrt-Windows.Storage.Streams
if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Failed to install dependencies.
    echo   Try running this script as Administrator.
    echo.
    pause
    exit /b 1
)

echo.
echo   Dependencies installed successfully.
echo.

:: Launch the server
echo   Starting server...
echo   The server will appear as an icon in your system tray.
echo   Right-click the tray icon to quit.
echo.

start "" pythonw "%~dp0NowPlayingServer.pyw"
exit /b 0
