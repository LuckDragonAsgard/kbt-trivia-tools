@echo off
cd /d "%TEMP%"
echo.
echo === KBT Question Dev Deploy ===
echo.

REM Clean any previous clone
if exist kbt-trial-deploy rd /s /q kbt-trial-deploy

echo Cloning repo...
git clone https://github.com/paddygallivan/kbt-trial.git kbt-trial-deploy
if errorlevel 1 (
    echo ERROR: git clone failed. Make sure you're signed into GitHub.
    pause
    exit /b 1
)

echo Copying files...
copy /y "H:\My Drive\KBT\kbt-trial\question-dev.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\brain-tool.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\face-morph-tool.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\ghost-actors-tool.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\crack-the-code-tool.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\brand-tool.html" kbt-trial-deploy\
copy /y "H:\My Drive\KBT\kbt-trial\soundmash-tool.html" kbt-trial-deploy\

cd kbt-trial-deploy

echo Adding files...
git add question-dev.html brain-tool.html face-morph-tool.html ghost-actors-tool.html crack-the-code-tool.html brand-tool.html soundmash-tool.html

echo Committing...
git commit -m "Add Question Dev hub + 6 multimedia question builder tools"

echo Pushing to GitHub...
git push origin main

echo.
if errorlevel 1 (
    echo ERROR: Push failed. Check GitHub authentication.
) else (
    echo === Deploy complete! Vercel will auto-build. ===
    echo Visit: https://kbt-trial.vercel.app/question-dev
)
echo.
pause
