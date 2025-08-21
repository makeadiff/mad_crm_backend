@echo off
REM Setup Windows Task Scheduler for MAD CRM User Sync
REM This script sets up automated user synchronization from Hasura API

setlocal EnableDelayedExpansion

REM Configuration - Update these paths
set PROJECT_DIR=C:\MAD_Projects\mad_crm\mad_crm_backend
set NODE_PATH=C:\Program Files\nodejs\node.exe
set LOG_DIR=%PROJECT_DIR%\logs\cron

REM Colors for output (Windows 10+)
set RED=[31m
set GREEN=[32m
set YELLOW=[33m
set NC=[0m

REM Function to print status
:print_status
echo [INFO] %~1
exit /b

:print_warning
echo [WARN] %~1
exit /b

:print_error
echo [ERROR] %~1
exit /b

REM Main script logic
if "%1"=="setup" goto setup
if "%1"=="remove" goto remove
if "%1"=="test" goto test
if "%1"=="status" goto status
if "%1"=="help" goto help
if "%1"=="" goto help

echo Invalid command: %1
goto help

:setup
echo Setting up Windows Scheduled Tasks for MAD CRM User Sync...

REM Validate configuration
if not exist "%NODE_PATH%" (
    call :print_error "Node.js not found at: %NODE_PATH%"
    call :print_error "Please update NODE_PATH in this script"
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%" (
    call :print_error "Project directory not found: %PROJECT_DIR%"
    call :print_error "Please update PROJECT_DIR in this script"
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\src\scripts\runUserSync.js" (
    call :print_error "Sync script not found"
    pause
    exit /b 1
)

REM Create log directory
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Create wrapper batch file
call :create_wrapper

REM Create scheduled tasks
call :create_tasks

call :print_status "Setup completed successfully!"
call :print_status "Tasks created in Windows Task Scheduler"
pause
exit /b

:create_wrapper
echo Creating wrapper batch file...

set WRAPPER_FILE=%PROJECT_DIR%\cron\user-sync-wrapper.bat

echo @echo off > "%WRAPPER_FILE%"
echo REM User Sync Windows Wrapper >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo cd /d "%PROJECT_DIR%" >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Set environment >> "%WRAPPER_FILE%"
echo set NODE_ENV=production >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Load .env file if exists (basic implementation) >> "%WRAPPER_FILE%"
echo if exist ".env" ( >> "%WRAPPER_FILE%"
echo   for /f "usebackq tokens=1,2 delims==" %%%%a in (".env"^) do ( >> "%WRAPPER_FILE%"
echo     set %%%%a=%%%%b >> "%WRAPPER_FILE%"
echo   ^) >> "%WRAPPER_FILE%"
echo ^) >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Get sync type from argument >> "%WRAPPER_FILE%"
echo set SYNC_TYPE=%%1 >> "%WRAPPER_FILE%"
echo if "%%SYNC_TYPE%%"=="" set SYNC_TYPE=delta >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Create log file with timestamp >> "%WRAPPER_FILE%"
echo for /f "tokens=1-4 delims=/ " %%%%i in ('date /t'^) do set DATE=%%%%l%%%%j%%%%k >> "%WRAPPER_FILE%"
echo for /f "tokens=1-2 delims=: " %%%%i in ('time /t'^) do set TIME=%%%%i%%%%j >> "%WRAPPER_FILE%"
echo set LOG_FILE=%LOG_DIR%\user-sync-%%DATE%%.log >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Log start >> "%WRAPPER_FILE%"
echo echo [%%DATE%% %%TIME%%] Starting %%SYNC_TYPE%% sync ^>^> "%%LOG_FILE%%" >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Run sync >> "%WRAPPER_FILE%"
echo "%NODE_PATH%" "%PROJECT_DIR%\src\scripts\runUserSync.js" --type=%%SYNC_TYPE%% ^>^> "%%LOG_FILE%%" 2^>^&1 >> "%WRAPPER_FILE%"
echo. >> "%WRAPPER_FILE%"
echo REM Log completion >> "%WRAPPER_FILE%"
echo if %%ERRORLEVEL%% EQU 0 ( >> "%WRAPPER_FILE%"
echo   echo [%%DATE%% %%TIME%%] %%SYNC_TYPE%% sync completed successfully ^>^> "%%LOG_FILE%%" >> "%WRAPPER_FILE%"
echo ^) else ( >> "%WRAPPER_FILE%"
echo   echo [%%DATE%% %%TIME%%] %%SYNC_TYPE%% sync failed with exit code %%ERRORLEVEL%% ^>^> "%%LOG_FILE%%" >> "%WRAPPER_FILE%"
echo ^) >> "%WRAPPER_FILE%"

call :print_status "Wrapper batch file created"
exit /b

:create_tasks
echo Creating Windows Scheduled Tasks...

REM Delete existing tasks if they exist
schtasks /delete /tn "MAD CRM Full Sync" /f >nul 2>&1
schtasks /delete /tn "MAD CRM Delta Sync Morning" /f >nul 2>&1
schtasks /delete /tn "MAD CRM Delta Sync Evening" /f >nul 2>&1
schtasks /delete /tn "MAD CRM Log Cleanup" /f >nul 2>&1

REM Create Full Sync task (daily at 2:00 AM)
schtasks /create /tn "MAD CRM Full Sync" /tr "\"%PROJECT_DIR%\cron\user-sync-wrapper.bat\" full" /sc daily /st 02:00 /ru SYSTEM

REM Create Delta Sync task (10:00 AM)
schtasks /create /tn "MAD CRM Delta Sync Morning" /tr "\"%PROJECT_DIR%\cron\user-sync-wrapper.bat\" delta" /sc daily /st 10:00 /ru SYSTEM

REM Create Delta Sync task (6:00 PM)
schtasks /create /tn "MAD CRM Delta Sync Evening" /tr "\"%PROJECT_DIR%\cron\user-sync-wrapper.bat\" delta" /sc daily /st 18:00 /ru SYSTEM

REM Create Log Cleanup task (weekly on Sunday at 3:00 AM)
schtasks /create /tn "MAD CRM Log Cleanup" /tr "forfiles /p \"%LOG_DIR%\" /s /m *.log /d -30 /c \"cmd /c del @path\"" /sc weekly /d SUN /st 03:00 /ru SYSTEM

call :print_status "Scheduled tasks created successfully"
exit /b

:remove
echo Removing MAD CRM Windows Scheduled Tasks...

schtasks /delete /tn "MAD CRM Full Sync" /f
schtasks /delete /tn "MAD CRM Delta Sync Morning" /f
schtasks /delete /tn "MAD CRM Delta Sync Evening" /f
schtasks /delete /tn "MAD CRM Log Cleanup" /f

call :print_status "MAD CRM scheduled tasks removed"
pause
exit /b

:test
echo Testing user sync...

if not exist "%PROJECT_DIR%\cron\user-sync-wrapper.bat" (
    call :print_error "Wrapper script not found. Run setup first."
    pause
    exit /b 1
)

call :print_status "Running delta sync test..."
call "%PROJECT_DIR%\cron\user-sync-wrapper.bat" delta

if %ERRORLEVEL% EQU 0 (
    call :print_status "Test completed successfully"
) else (
    call :print_error "Test failed"
)

pause
exit /b

:status
echo Current MAD CRM Scheduled Tasks:
echo.
schtasks /query | findstr "MAD CRM"
echo.
pause
exit /b

:help
echo Usage: %0 {setup^|remove^|test^|status^|help}
echo.
echo Commands:
echo   setup   - Set up scheduled tasks for user synchronization
echo   remove  - Remove all MAD CRM scheduled tasks
echo   test    - Test the sync manually
echo   status  - Show current MAD CRM scheduled tasks
echo   help    - Show this help message
echo.
echo Schedule:
echo   - Full sync: Daily at 2:00 AM
echo   - Delta sync: Twice daily at 10:00 AM and 6:00 PM
echo   - Log cleanup: Weekly on Sunday at 3:00 AM
echo.
echo Before running setup, update the paths at the top of this file:
echo   PROJECT_DIR: %PROJECT_DIR%
echo   NODE_PATH: %NODE_PATH%
pause
exit /b