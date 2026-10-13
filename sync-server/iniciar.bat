@echo off
cd /d "%~dp0\.."
echo Iniciando el servidor de sincronizacion...
echo Dejá esta ventana abierta mientras sincronizás. Para cortar, cerrá la ventana.
echo.
call npm run sync-server
pause
