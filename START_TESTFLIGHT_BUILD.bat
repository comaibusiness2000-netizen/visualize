@echo off
setlocal
cd /d "%~dp0"

echo.
echo Kairum - TestFlight build helper
echo.
echo Prima di continuare assicurati che in App Store Connect esista l'app:
echo Nome: Kairum
echo Bundle ID: com.samuelecomai.visualize
echo SKU: com.samuelecomai.visualize
echo.
pause

echo.
echo 1/5 - Controllo progetto Expo...
call npx.cmd expo-doctor
if errorlevel 1 goto fail

echo.
echo 2/5 - Login Expo/EAS...
call npx.cmd eas-cli login
if errorlevel 1 goto fail

echo.
echo 3/5 - Verifico collegamento progetto EAS...
call npx.cmd eas-cli project:info
if errorlevel 1 goto fail

echo.
echo 4/5 - Creo build iOS per TestFlight...
call npx.cmd eas-cli build --platform ios --profile production
if errorlevel 1 goto fail

echo.
echo 5/5 - Carico l'ultima build su App Store Connect...
call npx.cmd eas-cli submit --platform ios --profile production --latest
if errorlevel 1 goto fail

echo.
echo Fatto. Controlla TestFlight in App Store Connect.
pause
exit /b 0

:fail
echo.
echo Qualcosa si e' fermato. Fai uno screenshot di questa finestra e mandamelo.
pause
exit /b 1
