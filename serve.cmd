@echo off
setlocal
title F1 - local preview
cd /d "%~dp0"

set "NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  set "NODE=%USERPROFILE%\.local\node\node-v24.22.0-win-x64\node.exe"
)

if not exist "%NODE%" (
  if "%NODE%"=="node" (
    echo Node.js was not found on PATH.
  ) else (
    echo Node.js was not found at "%NODE%".
  )
  echo Open http://localhost:8080/ in a browser while a server is running,
  echo or install Node.js and run:  npm install ^&^& npm run build
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo No production build was found in dist\.
  echo Build it first with:  npm install ^&^& npm run build
  pause
  exit /b 1
)

echo Starting the F1 preview - your browser will open automatically.
echo Close this window to stop the server.
"%NODE%" "scripts\serve.mjs" 8080
pause
