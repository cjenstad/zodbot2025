@echo off
setlocal

:start
cd /d "D:\projects\apps\zodbot2"
echo Starting the server...
npm start

echo Server stopped or crashed. Restarting in 5 seconds...
timeout /t 5
goto start