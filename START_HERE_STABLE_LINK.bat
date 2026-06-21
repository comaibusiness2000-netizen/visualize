@echo off
setlocal
echo Visualize - creazione link stabile
echo.
echo 1. Si aprira GitHub per creare il repository visualize-app.
echo 2. Dopo averlo creato, copia l'URL HTTPS del repo.
echo    Esempio: https://github.com/tuo-utente/visualize-app.git
echo 3. Torna qui e incollalo.
echo.
start https://github.com/new
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp03-publish-stable-link.ps1"
