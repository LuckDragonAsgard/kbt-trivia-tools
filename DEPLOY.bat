@echo off
echo ==============================
echo  KBT Trial - Deploying to Vercel
echo ==============================
echo.
cd /d "H:\My Drive\KBT\kbt-trial"
vercel --prod
echo.
echo Done! Check kbt-trial.vercel.app
pause
