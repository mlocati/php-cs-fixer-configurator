@echo off
setlocal
del "%~dp0../docs/js/php-cs-fixer-data-*.json" >NUL 2>NUL
del "%~dp0../docs/js/php-cs-fixer-versions.json" >NUL 2>NUL
for /f "tokens=*" %%a in (%~dp0versions.txt) do (
    php "%~dp0update-docs.php" "%%a"
    if errorlevel 1 (
    	exit /b %ERRORLEVEL%
    )
)
