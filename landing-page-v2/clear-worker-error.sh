#!/bin/bash

# Script untuk membersihkan error log worker yang sudah tidak relevan
# Error tsx/cjs/api/register adalah error lama dari run-worker.js yang tidak digunakan

echo "Membersihkan error log worker yang tidak relevan..."
echo ""

# Cek path log
LOG_ERR_PATH="./logs/pm2-worker-error.log"

if [ ! -f "$LOG_ERR_PATH" ]; then
    if [ -f "../logs/pm2-worker-error.log" ]; then
        LOG_ERR_PATH="../logs/pm2-worker-error.log"
    elif [ -f "/opt/adsbot/logs/pm2-worker-error.log" ]; then
        LOG_ERR_PATH="/opt/adsbot/logs/pm2-worker-error.log"
    fi
fi

if [ -f "$LOG_ERR_PATH" ]; then
    # Backup log lama
    cp "$LOG_ERR_PATH" "${LOG_ERR_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Hapus baris yang mengandung error tsx/cjs/api/register (error lama)
    grep -v "tsx/cjs/api/register" "$LOG_ERR_PATH" > "${LOG_ERR_PATH}.tmp" 2>/dev/null
    mv "${LOG_ERR_PATH}.tmp" "$LOG_ERR_PATH"
    
    echo "✅ Error log lama telah dibersihkan"
    echo "   Backup disimpan di: ${LOG_ERR_PATH}.backup.*"
else
    echo "⚠️  File log error tidak ditemukan"
fi

echo ""
echo "Catatan: Error tsx/cjs/api/register adalah error lama dari run-worker.js"
echo "yang tidak digunakan. Worker sebenarnya berjalan dengan baik menggunakan"
echo "ecosystem.config.js dengan --import tsx."

