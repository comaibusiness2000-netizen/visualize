@echo off
setlocal
cd /d "%~dp0"

echo.
echo Kairum - carica su TestFlight senza rifare la build
echo.
echo Uso l'ultima build iOS gia' creata e la carico su App Store Connect.
echo App Store Connect App ID: 6795251107
echo.
pause

echo.
echo 1/3 - Login Expo/EAS...
call npx.cmd eas-cli login
if errorlevel 1 goto fail

echo.
echo 2/3 - Verifico progetto EAS...
call npx.cmd eas-cli project:info
if errorlevel 1 goto fail

echo.
echo 3/3 - Carico l'ultima build iOS su App Store Connect...
call npx.cmd eas-cli submit --platform ios --profile production --latest --wait --verbose
if errorlevel 1 goto fail

echo.
echo Fatto. Controlla App Store Connect > Kairum > TestFlight.
pause
exit /b 0

:fail
echo.
echo Qualcosa si e' fermato. Fai uno screenshot di questa finestra e mandamelo.
pause
exit /b 1
