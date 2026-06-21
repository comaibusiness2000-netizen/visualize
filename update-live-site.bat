@echo off
setlocal
set "GIT=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT%" (
  echo Git non trovato.
  pause
  exit /b 1
)

"%GIT%" add .
"%GIT%" commit -m "Update Visualize prototype"
"%GIT%" push

echo.
echo Aggiornamento inviato. GitHub Pages aggiornera lo stesso link.
pause
