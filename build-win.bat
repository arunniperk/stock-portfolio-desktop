@echo off
REM Stock Portfolio Monitor - Windows 11 Executable Builder (Vite edition)
setlocal EnableDelayedExpansion

if not exist "package.json" (
    echo [ERROR] package.json not found! Run from project root.
    exit /b 1
)

echo ========================================
echo  Stock Portfolio Monitor - Build Tool
echo ========================================
echo.

REM Clean previous builds
if exist "dist"  rmdir /s /q dist
if exist "build" rmdir /s /q build

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 ( echo [ERROR] npm install failed. & exit /b 1 )

echo.
echo [2/4] Building React app with Vite...
call npm run build
if errorlevel 1 ( echo [ERROR] Vite build failed. Check console for errors. & exit /b 1 )

echo.
echo --- Bundle sizes ---
for %%f in (build\assets\*.js) do echo %%~nxf  %%~zf bytes
echo --------------------
echo.

echo [3/4] Installing electron-builder...
call npm install electron-builder --save-dev
if errorlevel 1 ( echo [ERROR] electron-builder install failed. & exit /b 1 )

echo.
echo [4/4] Packaging Windows installer...
call npm run dist:win
if errorlevel 1 ( echo [ERROR] Electron packaging failed. Check console logs. & exit /b 1 )

if not exist "dist" ( echo [ERROR] dist folder not created. & exit /b 1 )

echo.
echo ========================================
echo  BUILD COMPLETE
echo ========================================
echo Installer : dist\Stock Portfolio Monitor Setup*.exe
echo Portable  : dist\Stock Portfolio Monitor*.exe
echo ========================================
pause
