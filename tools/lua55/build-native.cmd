@echo off
call "%~1" >nul
if errorlevel 1 exit /b 1
pushd "%~2"
cl.exe @compile.rsp
set build_result=%errorlevel%
popd
exit /b %build_result%
