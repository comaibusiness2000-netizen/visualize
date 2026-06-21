@echo off
setlocal
echo Creo pacchetto aggiornato per Netlify...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -Path '.\preview\*' -DestinationPath '.\visualize-web-preview.zip' -Force"
echo.
echo Pacchetto creato:
echo %cd%\visualize-web-preview.zip
echo.
echo Caricalo su Netlify manual deploy solo se NON hai ancora collegato GitHub.
pause
