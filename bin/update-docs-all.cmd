@echo off
setlocal
for /f "tokens=*" %%a in (%~dp0versions.txt) do (
    php "%~dp0update-docs.php" "%%a"
    if errorlevel 1 (
    	exit /b %ERRORLEVEL%
    )
)
