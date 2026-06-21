@echo off
setlocal
set "GIT=C:\Program Files\Git\cmd\git.exe"

if not exist "%GIT%" (
  echo Git non trovato in C:\Program Files\Git.
  echo Installa Git for Windows o dimmi dove e installato.
  pause
  exit /b 1
)

echo Preparo repository Git locale...
"%GIT%" config --global --add safe.directory "%cd%"
"%GIT%" init
"%GIT%" branch -M main
"%GIT%" add .
"%GIT%" commit -m "Initial Visualize prototype"

echo.
echo Fatto. Ora crea il repository GitHub visualize-app.
echo Poi apri 2-connect-github-pages.bat.
pause
