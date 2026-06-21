@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Avvio prototipo web Visualize...
echo Apri l'indirizzo che comparira sotto da Safari su iPhone/iPad.
node tools\serve-preview.mjs
