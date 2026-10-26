@echo off
setlocal
cd /d "%~dp0"
title PortStation - Desarrollo

where npm >nul 2>nul
if errorlevel 1 (
  echo No se encontro npm. Instala Node.js y vuelve a intentarlo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo No se encontro node_modules. Ejecuta npm install en la carpeta del proyecto.
  pause
  exit /b 1
)

call npm run tauri dev
set "PORTSTATION_EXIT_CODE=%ERRORLEVEL%"
if not "%PORTSTATION_EXIT_CODE%"=="0" (
  echo.
  echo PortStation termino con el codigo %PORTSTATION_EXIT_CODE%.
  pause
)
exit /b %PORTSTATION_EXIT_CODE%
