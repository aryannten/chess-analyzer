@echo off
echo Starting Chess Analyzer Production Server...
cd /d "%~dp0build"
python -m http.server 3000