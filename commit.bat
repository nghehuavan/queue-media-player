@echo off
set thisFilePath=%~dp0
cd /d %thisFilePath%

set excludeFileName=exclude.lst
set excludeFileFullPath=%CD%\%excludeFileName%
:begin
@echo "@@ Commit And Push All File @@"
SET /P sComment=Please comment for commit (empty is default):

git add --all

@IF %sComment%.==. GOTO defaultComment
GOTO userComment

:defaultComment
git commit -m "[UPD-API]"
goto push

:userComment
git commit -m "%sComment%"

:push
git.exe push --all --thin --progress "origin"
:end
pause
cls 
goto begin