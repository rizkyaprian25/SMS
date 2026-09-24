# SMS SMP Negeri - Skrip Pencadangan Basis Data Otomatis (PostgreSQL pg_dump)
# Penggunaan: powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1

$ErrorActionPreference = "Stop"
$backupDir = Join-Path $PSScriptRoot "..\backups"

if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Write-Host "[INFO] Membuat direktori backup: $backupDir" -ForegroundColor Cyan
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "sms_backup_$timestamp.sql"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Pencadangan Basis Data SMS SMP Negeri (PostgreSQL)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[1/2] Mengekstrak data dari container sms-postgres..." -ForegroundColor Yellow

try {
    # Dump menggunakan docker exec agar tidak memerlukan pg_dump terinstal di host Windows
    docker exec -t sms-postgres pg_dump -U sms sms > $backupFile
    
    if (Test-Path $backupFile) {
        $fileSize = (Get-Item $backupFile).Length / 1KB
        Write-Host "[2/2] Pencadangan sukses!" -ForegroundColor Green
        Write-Host "Lokasi File : $backupFile" -ForegroundColor White
        Write-Host "Ukuran File : $([math]::Round($fileSize, 2)) KB" -ForegroundColor White
    }
} catch {
    Write-Host "[ERROR] Gagal melakukan backup: $_" -ForegroundColor Red
    Write-Host "Pastikan container 'sms-postgres' sedang aktif." -ForegroundColor Red
}

Write-Host ""
Write-Host "Selesai." -ForegroundColor Green
