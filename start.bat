@echo off
cd /d "%~dp0"

:menu
cls
echo ====================================
echo        MyBlog - Blog System
echo ====================================
echo  1. Start dev server  (edit mode)
echo  2. Build static site (dist/)
echo  3. Preview build    (serve dist)
echo  4. Deploy to GitHub Pages
echo ====================================
set /p sel="Select (1/2/3/4): "

if "%sel%"=="1" goto start
if "%sel%"=="2" goto build
if "%sel%"=="3" goto preview
if "%sel%"=="4" goto deploy
goto menu

:start
echo.
echo Starting dev server at http://localhost:3000
node app.js
pause
goto menu

:build
echo.
set BASE_PATH=/xiaoshenblog.github.io
node build.js
pause
goto menu

:preview
echo.
echo Starting preview at http://localhost:8080
npx serve dist -l 8080
pause
goto menu

:deploy
echo.
set BASE_PATH=/xiaoshenblog.github.io
node build.js
echo Deploying to GitHub Pages...
npx gh-pages -d dist
pause
goto menu