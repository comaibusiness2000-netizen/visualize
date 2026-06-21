@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "USERPROFILE=%~dp0.local-home"
set "HOME=%USERPROFILE%"
set "npm_config_cache=%~dp0.npm-cache"
if not exist "%USERPROFILE%" mkdir "%USERPROFILE%"
echo Avvio Visualize con link pubblico temporaneo...
node tools\serve-preview-tunnel.mjs
