@echo off
title RedGIFs Downloader Pro
color 0c

echo ========================================================
echo         REDGIFS VIDEO DOWNLOADER PRO - V1.0
echo ========================================================
echo.
echo Iniciando servidor y abriendo interfaz web...
echo Carpeta de descargas: %~dp0downloads
echo.

start "" "http://127.0.0.1:8000"
python -m uvicorn app:app --host 127.0.0.1 --port 8000

pause
