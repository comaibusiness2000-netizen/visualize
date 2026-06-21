@echo off
setlocal
set "GIT=C:\Program Files\Git\cmd\git.exe"

if "%~1"=="" (
  echo Uso:
  echo 2-connect-github-pages.bat https://github.com/TUO-UTENTE/visualize-app.git
  echo.
  echo Prima crea il repository su:
  echo https://github.com/new
  echo.
  pause
  exit /b 1
)

"%GIT%" remote remove origin 2>nul
"%GIT%" remote add origin "%~1"
"%GIT%" push -u origin main

echo.
echo Ora apri GitHub:
echo Settings - Pages - Build and deployment - GitHub Actions
echo Poi vai su Actions e attendi Deploy Visualize Preview.
pause
