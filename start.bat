@echo off
setlocal

echo Starting Technical Moodboard MVP Setup...

echo.
echo [1/3] Installing Frontend Dependencies...
call npm install --legacy-peer-deps

echo.
echo [2/3] Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo.
echo [3/3] Starting Servers...
set BACKEND_PORT=3002
echo Starting backend on port %BACKEND_PORT% and frontend on port 5173...

start cmd /k "cd backend && set YPERSISTENCE=./ydb&& npm start"
start cmd /k "npm run dev"

echo.
echo Done! Your frontend and backend servers are now running in separate windows.
echo Please open your browser to the Vite URL (usually http://localhost:5173)
endlocal
