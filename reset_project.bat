@echo off
cd /d %~dp0
echo Removing node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
echo Done.
pause
