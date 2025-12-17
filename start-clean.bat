@echo off
REM Suppress Node.js deprecation warnings for cleaner development output
set NODE_OPTIONS=--no-deprecation
set GENERATE_SOURCEMAP=false

REM Start the development server with suppressed warnings
npm run start:clean
