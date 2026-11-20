@echo off
echo Killing any stuck Node.js processes...
taskkill /F /IM node.exe
echo Done. Now you can safely run start.bat again!
pause
