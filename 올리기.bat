@echo off
chcp 65001 >nul
title GitHub에 올리기 - Study Home
cd /d "%~dp0"

REM --- Git 경로 찾기 (시스템 PATH 우선, 없으면 PortableGit) ---
set "GIT=git"
where git >nul 2>&1
if %errorlevel% neq 0 set "GIT=%USERPROFILE%\PortableGit\cmd\git.exe"

if not exist "%GIT%" if "%GIT%"=="git" goto :nogit
echo.
echo  ============================================================
echo    변경 내용을 GitHub에 올립니다 (Study-Home)
echo  ============================================================
echo.

REM --- 변경사항 스테이징 ---
"%GIT%" add -A

REM --- 커밋 메시지 입력 (비우면 자동 메시지) ---
set "MSG="
set /p MSG=  커밋 메시지 (그냥 엔터 치면 날짜로 기록):
if "%MSG%"=="" set "MSG=update %date% %time%"

"%GIT%" commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo  [알림] 올릴 변경 내용이 없거나 커밋에 실패했습니다.
    echo  ^(바뀐 파일이 없으면 올릴 것도 없습니다.^)
)

echo.
echo  GitHub로 전송 중... (처음 한 번은 로그인 창이 뜰 수 있습니다)
"%GIT%" branch -M main
"%GIT%" push -u origin main

echo.
if %errorlevel%==0 (
    echo  ============================================================
    echo    완료! 1~2분 뒤 사이트에 반영됩니다.
    echo    https://bynewda.github.io/Study-Home/
    echo  ============================================================
) else (
    echo  [오류] 전송에 실패했습니다. 로그인(인증)이 필요하거나
    echo         인터넷 연결을 확인하세요.
)
echo.
pause
exit /b

:nogit
echo  [오류] Git을 찾을 수 없습니다.
echo  %USERPROFILE%\PortableGit\cmd\git.exe 가 있는지 확인하세요.
pause
