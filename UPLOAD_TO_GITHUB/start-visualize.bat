@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "USERPROFILE=%~dp0.local-home"
set "HOME=%USERPROFILE%"
set "npm_config_cache=%~dp0.npm-cache"
set "DOTSLASH_CACHE=%TEMP%\VisualizeExpo\dotslash-cache"
if not exist "%USERPROFILE%" mkdir "%USERPROFILE%"
if not exist "%DOTSLASH_CACHE%" mkdir "%DOTSLASH_CACHE%"
echo Avvio Visualize con Expo tunnel...
echo Se viene richiesto, accetta l'accesso alla rete privata nel firewall di Windows.
npx expo start --tunnel --clear
