@echo off
REM Dubbelklik dit bestand om R7N SEO Studio te starten (Windows).
cd /d "%~dp0"
echo.
echo   R7N SEO Studio
echo   ------------------------------------------
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo   Node.js staat nog niet op deze computer.
  echo   1. Ga naar https://nodejs.org en download de LTS-versie.
  echo   2. Installeer die en dubbelklik daarna opnieuw op dit bestand.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo   Eerste keer: de studio installeert zichzelf ^(1 a 3 minuten^)...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo   Installeren lukte niet. Controleer je internet en probeer opnieuw.
    pause
    exit /b 1
  )
)
echo.
echo   De studio start op http://localhost:3000
echo   Je browser opent zo vanzelf. Laat dit venster open zolang je werkt.
echo.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run dev
