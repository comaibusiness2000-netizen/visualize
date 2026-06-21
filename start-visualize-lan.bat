@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "USERPROFILE=%~dp0.local-home"
set "HOME=%USERPROFILE%"
set "npm_config_cache=%~dp0.npm-cache"
set "DOTSLASH_CACHE=%TEMP%\VisualizeExpo\dotslash-cache"
if not exist "%USERPROFILE%" mkdir "%USERPROFILE%"
if not exist "%DOTSLASH_CACHE%" mkdir "%DOTSLASH_CACHE%"
echo Avvio Visualize sulla rete locale...
echo Usa questa opzione solo se PC e iPhone sono sulla stessa Wi-Fi.
npx expo start --lan --clear
