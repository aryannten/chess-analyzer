@echo off
echo Starting Chess Analyzer Development Server with Cache Disabled...
echo.
echo This will start the development server with aggressive cache-busting
echo to ensure the latest worker version is always loaded.
echo.

REM Clear any existing cache directories
if exist node_modules\.cache (
    echo Clearing webpack cache...
    rmdir /s /q node_modules\.cache
)

REM Set environment variables to disable caching
set GENERATE_SOURCEMAP=false
set FAST_REFRESH=false
set BROWSER=none

echo Starting development server...
npm start

pause