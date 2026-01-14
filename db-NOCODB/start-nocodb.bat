@echo off
setlocal
echo ==============================================
echo  🚀 STARTING NOCODB FOR ADSPILOT (DIRECT MODE)
echo ==============================================
echo.
echo [STEP 1] Pastikan Boss SUDAH menjalankan SSH TUNNEL di terminal lain:
echo command: ssh -L 5433:localhost:3306 root@154.19.37.198 -N
echo.

echo [STEP 2] Mengkonfigurasi Koneksi Database...
set "NC_DB=pg://localhost:5433?u=soroboti_db&p=123qweASD%%21%%40%%23%%21%%40%%23&d=soroboti_ads"
set PORT=8080

echo [STEP 3] Menjalankan NocoDB (Direct Node)...
echo Tunggu sebentar, dashboard akan terbuka di http://localhost:8080/dashboard
echo.

:: Menjalankan bundle.js langsung. Ini bypass masalah path bin/cmd.
node node_modules/nocodb/dist/bundle.js

pause
