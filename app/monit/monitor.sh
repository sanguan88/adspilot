#!/bin/bash

# ============================================
# Script Monitoring Utama Aplikasi
# ============================================
# Script ini untuk monitoring aplikasi secara menyeluruh

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Fungsi untuk print dengan warna
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Cek apakah PM2 sudah terinstall
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 tidak ditemukan. Silakan install PM2 terlebih dahulu."
    exit 1
fi

# Clear screen
clear

# Header
print_header "📊 DASHBOARD MONITORING APLIKASI"
echo ""

# 1. Status PM2 Processes
print_header "1️⃣  STATUS APLIKASI (PM2)"
echo ""
pm2 list
echo ""

# 2. Resource Usage
print_header "2️⃣  PENGGUNAAN RESOURCE"
echo ""
pm2 monit --no-interaction &
MONIT_PID=$!
sleep 3
kill $MONIT_PID 2>/dev/null
echo ""

# 3. Health Check
print_header "3️⃣  HEALTH CHECK"
echo ""

# Cek status aplikasi
MAIN_APP_STATUS=$(pm2 jlist | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
WORKER_STATUS=$(pm2 jlist | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$MAIN_APP_STATUS" = "online" ]; then
    print_success "Main App (adbot-seller): ONLINE"
else
    print_error "Main App (adbot-seller): OFFLINE atau ERROR"
fi

if [ "$WORKER_STATUS" = "online" ]; then
    print_success "Worker (adbot-automation-worker): ONLINE"
else
    print_error "Worker (adbot-automation-worker): OFFLINE atau ERROR"
fi

echo ""

# 4. Recent Logs Summary
print_header "4️⃣  RINGKASAN LOG TERAKHIR (10 baris)"
echo ""

print_info "Main App Logs:"
pm2 logs adbot-seller --lines 10 --nostream 2>/dev/null | tail -10 || echo "Tidak ada log"
echo ""

print_info "Worker Logs:"
pm2 logs adbot-automation-worker --lines 10 --nostream 2>/dev/null | tail -10 || echo "Tidak ada log"
echo ""

# 5. Error Logs Summary
print_header "5️⃣  ERROR LOGS TERAKHIR (5 baris)"
echo ""

ERROR_COUNT=$(pm2 logs adbot-seller --err --lines 100 --nostream 2>/dev/null | grep -i "error\|exception\|failed" | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    print_warning "Ditemukan $ERROR_COUNT error dalam 100 baris log terakhir"
    echo ""
    pm2 logs adbot-seller --err --lines 5 --nostream 2>/dev/null | tail -5 || echo "Tidak ada error log"
else
    print_success "Tidak ada error dalam log terakhir"
fi

echo ""

# 6. System Information
print_header "6️⃣  INFORMASI SISTEM"
echo ""

print_info "Uptime: $(uptime -p 2>/dev/null || uptime)"
print_info "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
print_info "Memory Usage:"
free -h | grep -E "Mem|Swap"
echo ""

print_info "Disk Usage:"
df -h / | tail -1
echo ""

# 7. Environment Variables Check
print_header "7️⃣  CEK ENVIRONMENT VARIABLES"
echo ""

if [ -f .env.local ]; then
    print_success "File .env.local ditemukan"
    
    # Cek variabel penting
    if grep -q "TELEGRAM_BOT_TOKEN=" .env.local && ! grep -q "TELEGRAM_BOT_TOKEN=$" .env.local && ! grep -q "^TELEGRAM_BOT_TOKEN=\s*$" .env.local; then
        print_success "TELEGRAM_BOT_TOKEN: Terisi"
    else
        print_warning "TELEGRAM_BOT_TOKEN: Kosong atau tidak ditemukan"
    fi
    
    if grep -q "DB_HOST=" .env.local && ! grep -q "DB_HOST=$" .env.local; then
        print_success "DB_HOST: Terisi"
    else
        print_warning "DB_HOST: Kosong atau tidak ditemukan"
    fi
    
    if grep -q "JWT_SECRET=" .env.local && ! grep -q "JWT_SECRET=$" .env.local; then
        print_success "JWT_SECRET: Terisi"
    else
        print_warning "JWT_SECRET: Kosong atau tidak ditemukan"
    fi
else
    print_error "File .env.local tidak ditemukan!"
fi

echo ""

# 8. Quick Actions
print_header "8️⃣  QUICK ACTIONS"
echo ""
echo -e "${CYAN}Gunakan script berikut untuk aksi lebih lanjut:${NC}"
echo ""
echo "  📋 ./monit/check-logs.sh          - Lihat log detail"
echo "  🔍 ./monit/error-analyzer.sh      - Analisis error log"
echo "  💚 ./monit/health-check.sh        - Health check lengkap"
echo "  🔧 ./monit/edit-telegram-token.sh - Edit Telegram Bot Token"
echo "  📊 ./status.sh                    - Status PM2"
echo "  📝 ./logs.sh                      - Lihat logs"
echo ""

# Footer
print_header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "Tekan Ctrl+C untuk keluar atau tunggu 30 detik untuk refresh otomatis..."
echo ""

# Auto refresh setiap 30 detik (optional)
if [ "$1" = "--watch" ] || [ "$1" = "-w" ]; then
    sleep 30
    exec "$0" "$@"
fi

