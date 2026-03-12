@echo off
setlocal

cd /d "%~dp0"

set "DEST=C:\Program Files\Corsair\Corsair iCUE5 Software\widgets"

if not exist "%DEST%" (
    echo ERROR: iCUE widgets directory not found:
    echo   %DEST%
    echo Make sure iCUE is installed.
    pause
    exit /b 1
)

if not exist "%DEST%\images" mkdir "%DEST%\images"

echo Installing QK widgets to:
echo   %DEST%
echo.

set COUNT=0

for /r "widgets" %%F in (QK*.html) do (
    copy /y "%%F" "%DEST%\" >nul
    echo   %%~nxF
    set /a COUNT+=1
)

for /r "widgets" %%F in (QK*_translation.json) do (
    copy /y "%%F" "%DEST%\" >nul
    echo   %%~nxF
    set /a COUNT+=1
)

for /r "widgets" %%F in (qk-*.svg) do (
    copy /y "%%F" "%DEST%\images\" >nul
    echo   images\%%~nxF
    set /a COUNT+=1
)

echo.
echo Done. %COUNT% files copied.
echo Restart iCUE for new widgets to appear.
pause
