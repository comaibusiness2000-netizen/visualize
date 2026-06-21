@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp03-publish-stable-link.ps1"
