#!/bin/bash

# Script untuk mengecek status worker
# Usage: ./check-worker-status.sh

echo "========================================"
echo "  CEK STATUS AUTOMATION WORKER"
echo "========================================"
echo ""

# Cek apakah PM2 terinstall
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 tidak terinstall atau tidak ada di PATH"
    echo "   Install PM2 dengan: npm install -g pm2"
    exit 1
fi

echo "✅ PM2 terinstall"
echo ""

# Cek status semua aplikasi PM2
echo "📊 Status semua aplikasi PM2:"
pm2 list
echo ""

# Cek status worker khusus
echo "🔍 Status Worker (adbot-automation-worker):"

# Cek apakah worker ada di PM2
WORKER_EXISTS=$(pm2 list | grep -c "adbot-automation-worker" || echo "0")

if [ "$WORKER_EXISTS" -gt 0 ]; then
    # Extract info dari pm2 list (lebih reliable)
    WORKER_LINE=$(pm2 list | grep "adbot-automation-worker" | head -1)
    
    if [ -n "$WORKER_LINE" ]; then
        # Parse dari tabel pm2 list dengan memisahkan berdasarkan │
        # Format: │ id │ name │ mode │ ↺ │ status │ cpu │ memory │
        # Gunakan awk dengan field separator │
        STATUS=$(echo "$WORKER_LINE" | awk -F'│' '{print $6}' | xargs)
        RESTARTS=$(echo "$WORKER_LINE" | awk -F'│' '{print $5}' | xargs)
        CPU=$(echo "$WORKER_LINE" | awk -F'│' '{print $7}' | xargs)
        MEMORY=$(echo "$WORKER_LINE" | awk -F'│' '{print $8}' | xargs)
        
        if [ "$STATUS" = "online" ]; then
            echo "✅ Status: ONLINE"
        else
            echo "❌ Status: $STATUS"
        fi
        
        if [ -n "$RESTARTS" ] && [ "$RESTARTS" != "↺" ] && [ "$RESTARTS" != "0" ] && [ "$RESTARTS" != "" ]; then
            # Cek apakah RESTARTS adalah angka
            if echo "$RESTARTS" | grep -qE '^[0-9]+$'; then
                if [ "$RESTARTS" -gt 5 ]; then
                    echo "   ⚠️  Restart count: $RESTARTS (tinggi, mungkin ada masalah)"
                else
                    echo "   Restart count: $RESTARTS"
                fi
            fi
        fi
        
        if [ -n "$MEMORY" ] && [ "$MEMORY" != "memory" ] && [ "$MEMORY" != "" ]; then
            echo "   Memory: $MEMORY"
        fi
        
        if [ -n "$CPU" ] && [ "$CPU" != "cpu" ] && [ "$CPU" != "0%" ] && [ "$CPU" != "" ]; then
            echo "   CPU: $CPU"
        fi
        
        # Cek uptime dari pm2 describe (lebih reliable)
        UPTIME_RAW=$(pm2 describe adbot-automation-worker 2>/dev/null | grep -i "uptime" | head -1)
        if [ -n "$UPTIME_RAW" ]; then
            UPTIME=$(echo "$UPTIME_RAW" | sed 's/.*uptime[^:]*: *//' | sed 's/.*│ *//' | xargs)
            if [ -n "$UPTIME" ] && [ "$UPTIME" != "uptime" ] && [ ${#UPTIME} -lt 50 ]; then
                echo "   Uptime: $UPTIME"
            fi
        fi
    else
        echo "⚠️  Tidak bisa membaca info worker dari PM2"
    fi
else
    echo "❌ Worker tidak ditemukan di PM2"
    echo "   Worker mungkin belum di-start"
    echo "   Jalankan: pm2 start ecosystem.config.js"
fi

echo ""

# Cek log worker
echo ""
echo "📝 Log Worker (10 baris terakhir):"

# Cek path log (bisa di root atau di parent directory)
LOG_OUT_PATH="./logs/pm2-worker-out.log"
LOG_ERR_PATH="./logs/pm2-worker-error.log"

# Jika tidak ada di current dir, coba parent dir
if [ ! -f "$LOG_OUT_PATH" ]; then
    if [ -f "../logs/pm2-worker-out.log" ]; then
        LOG_OUT_PATH="../logs/pm2-worker-out.log"
    elif [ -f "/opt/adsbot/logs/pm2-worker-out.log" ]; then
        LOG_OUT_PATH="/opt/adsbot/logs/pm2-worker-out.log"
    fi
fi

if [ ! -f "$LOG_ERR_PATH" ]; then
    if [ -f "../logs/pm2-worker-error.log" ]; then
        LOG_ERR_PATH="../logs/pm2-worker-error.log"
    elif [ -f "/opt/adsbot/logs/pm2-worker-error.log" ]; then
        LOG_ERR_PATH="/opt/adsbot/logs/pm2-worker-error.log"
    fi
fi

if [ -f "$LOG_OUT_PATH" ]; then
    echo "--- Output Log (dari $LOG_OUT_PATH) ---"
    tail -n 10 "$LOG_OUT_PATH" 2>/dev/null | grep -v "^$" || echo "(log kosong)"
else
    echo "⚠️  File log output tidak ditemukan"
    echo "   Mencari di: ./logs/pm2-worker-out.log"
fi

echo ""

if [ -f "$LOG_ERR_PATH" ]; then
    ERROR_LINES=$(tail -n 10 "$LOG_ERR_PATH" 2>/dev/null | grep -v "^$" || echo "")
    if [ -n "$ERROR_LINES" ]; then
        # Cek apakah error adalah error lama dari tsx/cjs/api/register
        OLD_ERROR_COUNT=$(echo "$ERROR_LINES" | grep -c "tsx/cjs/api/register" || echo "0")
        
        if [ "$OLD_ERROR_COUNT" -gt 0 ]; then
            echo "--- Error Log (dari $LOG_ERR_PATH) ---"
            echo "$ERROR_LINES"
            echo ""
            echo "ℹ️  Error ini adalah error lama dari run-worker.js yang sudah tidak digunakan."
            echo "   Worker sebenarnya berjalan dengan baik menggunakan ecosystem.config.js."
            echo "   Untuk membersihkan error log lama: ./deploy/clear-worker-error.sh"
        else
            echo "--- Error Log (dari $LOG_ERR_PATH) ---"
            echo "$ERROR_LINES"
            echo ""
            echo "⚠️  Ada error dalam log! Cek detail dengan: pm2 logs adbot-automation-worker --err"
        fi
    else
        echo "✅ Tidak ada error dalam log"
    fi
else
    echo "⚠️  File log error tidak ditemukan"
fi

echo ""
echo "========================================"
echo "Untuk melihat log real-time:"
echo "  pm2 logs adbot-automation-worker"
echo ""
echo "Untuk restart worker:"
echo "  pm2 restart adbot-automation-worker"
echo "========================================"

