@echo off
title SMS SMP Negeri - One Click Launcher
color 0A

echo ========================================================
echo   SMS SMP Negeri Terpadu - Memulai Semua Layanan
echo ========================================================
echo.

:: 1. Cek & Jalankan Docker Container
echo [1/3] Menyalakan Database PostgreSQL (Port 5433) & MinIO (Port 9000)...
docker compose -f infra\docker\docker-compose.yml up -d
if %errorlevel% neq 0 (
    echo.
    echo [PERINGATAN] Gagal menjalankan Docker Compose.
    echo Pastikan Docker Desktop sudah aktif/running di Windows Anda!
    echo.
) else (
    echo [OK] Database PostgreSQL & MinIO aktif.
)

:: 2. Jalankan Backend Server di Terminal Terpisah
echo.
echo [2/3] Menjalankan Backend API Server (Port 3001)...
start "SMS - API Server (NestJS :3001)" cmd /k "cd services\api-server && npm run start:dev"

:: 3. Jalankan Web Dashboard di Terminal Terpisah
echo.
echo [3/3] Menjalankan Web Dashboard Admin (Port 3000)...
start "SMS - Web Dashboard (Next.js :3000)" cmd /k "cd apps\web-dashboard && npm run dev"

echo.
echo ========================================================
echo   Semua layanan sedang dijalankan!
echo   - Web Dashboard : http://localhost:3000
echo   - Backend API   : http://localhost:3001/api/v1
echo   - MinIO Console : http://localhost:9001
echo ========================================================
echo.
echo Membuka browser dalam 5 detik...
timeout /t 5 >nul
start http://localhost:3000

echo Selesai. Anda dapat menutup jendela ini kapan saja.
pause
