@echo off
cd /d "%~dp0"
call npx tsc --noEmit 2>&1
echo TSC_EXIT=%ERRORLEVEL%
call npm run lint 2>&1
echo LINT_EXIT=%ERRORLEVEL%
call npm run test:unit 2>&1
echo TEST_EXIT=%ERRORLEVEL%
call npm run build 2>&1
echo BUILD_EXIT=%ERRORLEVEL%
echo ALL_DONE