#!/bin/bash

# ============================================
# Script Health Check Aplikasi
# ============================================
# Script ini untuk memeriksa kesehatan aplikasi secara menyeluruh

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Counter untuk health status
HEALTH_SCORE=0
TOTAL_CHECKS=0

# Fungsi untuk menambah score
add_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ "$1" = "pass" ]; then
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    fi
}

# Clear screen
clear

# Header
print_header "💚 HEALTH CHECK APLIKASI"
echo ""
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
print_info "Waktu: $TIMESTAMP"
echo ""

# 1. Cek PM2
print_header "1️⃣  CEK PM2"
echo ""

if ! command -v pm2 &> /dev/null; then
    print_error "PM2 tidak terinstall"
    add_check "fail"
else
    print_success "PM2 terinstall"
    PM2_VERSION=$(pm2 --version 2>/dev/null || echo "unknown")
    print_info "Version: $PM2_VERSION"
    add_check "pass"
fi

echo ""

# 2. Cek Status Aplikasi
print_header "2️⃣  STATUS APLIKASI"
echo ""

if command -v pm2 &> /dev/null; then
    # Cek main app
    MAIN_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "not_running")
    MAIN_RESTARTS=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"restart_time":[0-9]*' | grep -o '"restart_time":[0-9]*' | cut -d':' -f2 || echo "0")
    
    if [ "$MAIN_STATUS" = "online" ]; then
        print_success "Main App (adbot-seller): ONLINE"
        if [ "$MAIN_RESTARTS" -gt 5 ]; then
            print_warning "Restart count: $MAIN_RESTARTS (tinggi, mungkin ada masalah)"
        else
            print_info "Restart count: $MAIN_RESTARTS"
        fi
        add_check "pass"
    else
        print_error "Main App (adbot-seller): $MAIN_STATUS"
        add_check "fail"
    fi
    
    echo ""
    
    # Cek worker
    WORKER_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "not_running")
    WORKER_RESTARTS=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"restart_time":[0-9]*' | grep -o '"restart_time":[0-9]*' | cut -d':' -f2 || echo "0")
    
    if [ "$WORKER_STATUS" = "online" ]; then
        print_success "Worker (adbot-automation-worker): ONLINE"
        if [ "$WORKER_RESTARTS" -gt 5 ]; then
            print_warning "Restart count: $WORKER_RESTARTS (tinggi, mungkin ada masalah)"
        else
            print_info "Restart count: $WORKER_RESTARTS"
        fi
        add_check "pass"
    else
        print_error "Worker (adbot-automation-worker): $WORKER_STATUS"
        add_check "fail"
    fi
else
    print_error "PM2 tidak tersedia, tidak bisa cek status aplikasi"
    add_check "fail"
fi

echo ""

# 3. Cek Resource Usage
print_header "3️⃣  PENGGUNAAN RESOURCE"
echo ""

if command -v pm2 &> /dev/null; then
    # Memory usage
    MAIN_MEM=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"memory":[0-9]*' | grep -o '"memory":[0-9]*' | cut -d':' -f2 || echo "0")
    WORKER_MEM=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"memory":[0-9]*' | grep -o '"memory":[0-9]*' | cut -d':' -f2 || echo "0")
    
    if [ -n "$MAIN_MEM" ] && [ "$MAIN_MEM" != "0" ]; then
        MAIN_MEM_MB=$((MAIN_MEM / 1024 / 1024))
        print_info "Main App Memory: ${MAIN_MEM_MB}MB"
        if [ "$MAIN_MEM_MB" -gt 800 ]; then
            print_warning "Memory usage tinggi (>800MB)"
        else
            add_check "pass"
        fi
    fi
    
    if [ -n "$WORKER_MEM" ] && [ "$WORKER_MEM" != "0" ]; then
        WORKER_MEM_MB=$((WORKER_MEM / 1024 / 1024))
        print_info "Worker Memory: ${WORKER_MEM_MB}MB"
        if [ "$WORKER_MEM_MB" -gt 800 ]; then
            print_warning "Memory usage tinggi (>800MB)"
        else
            add_check "pass"
        fi
    fi
    
    # CPU usage
    MAIN_CPU=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"cpu":[0-9.]*' | grep -o '"cpu":[0-9.]*' | cut -d':' -f2 || echo "0")
    WORKER_CPU=$(pm2 jlist 2>/dev/null | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"cpu":[0-9.]*' | grep -o '"cpu":[0-9.]*' | cut -d':' -f2 || echo "0")
    
    if [ -n "$MAIN_CPU" ]; then
        print_info "Main App CPU: ${MAIN_CPU}%"
    fi
    
    if [ -n "$WORKER_CPU" ]; then
        print_info "Worker CPU: ${WORKER_CPU}%"
    fi
fi

echo ""

# System memory
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
USED_MEM=$(free -m | awk '/^Mem:/{print $3}')
MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

print_info "System Memory: ${USED_MEM}MB / ${TOTAL_MEM}MB (${MEM_PERCENT}%)"

if [ "$MEM_PERCENT" -gt 90 ]; then
    print_error "Memory usage sangat tinggi!"
    add_check "fail"
elif [ "$MEM_PERCENT" -gt 80 ]; then
    print_warning "Memory usage tinggi"
    add_check "pass"
else
    print_success "Memory usage normal"
    add_check "pass"
fi

echo ""

# Disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
print_info "Disk Usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 90 ]; then
    print_error "Disk usage sangat tinggi!"
    add_check "fail"
elif [ "$DISK_USAGE" -gt 80 ]; then
    print_warning "Disk usage tinggi"
    add_check "pass"
else
    print_success "Disk usage normal"
    add_check "pass"
fi

echo ""

# 4. Cek Environment Variables
print_header "4️⃣  ENVIRONMENT VARIABLES"
echo ""

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    print_success "File $ENV_FILE ditemukan"
    add_check "pass"
    
    # Cek variabel penting
    REQUIRED_VARS=("TELEGRAM_BOT_TOKEN" "DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "JWT_SECRET")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" "$ENV_FILE" && ! grep -q "^${var}=\s*$" "$ENV_FILE" && ! grep -q "^${var}=$" "$ENV_FILE"; then
            VALUE=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")
            if [ -n "$VALUE" ] && [ "$VALUE" != "" ]; then
                print_success "$var: Terisi"
            else
                print_warning "$var: Kosong"
                MISSING_VARS+=("$var")
            fi
        else
            print_error "$var: Tidak ditemukan"
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        add_check "pass"
    else
        print_warning "Beberapa variabel penting belum diisi: ${MISSING_VARS[*]}"
        add_check "fail"
    fi
else
    print_error "File .env.local atau .env tidak ditemukan!"
    add_check "fail"
fi

echo ""

# 5. Cek Log Files
print_header "5️⃣  LOG FILES"
echo ""

LOG_FILES=(
    "./logs/pm2-error.log"
    "./logs/pm2-out.log"
    "./logs/pm2-worker-error.log"
    "./logs/pm2-worker-out.log"
)

ALL_LOGS_EXIST=true
for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        FILE_SIZE=$(du -h "$log_file" | cut -f1)
        print_success "$(basename $log_file): Ada (Size: $FILE_SIZE)"
    else
        print_warning "$(basename $log_file): Tidak ditemukan"
        ALL_LOGS_EXIST=false
    fi
done

if [ "$ALL_LOGS_EXIST" = true ]; then
    add_check "pass"
else
    add_check "fail"
fi

echo ""

# 6. Cek Recent Errors
print_header "6️⃣  RECENT ERRORS"
echo ""

if command -v pm2 &> /dev/null; then
    ERROR_COUNT=$(pm2 logs --err --lines 100 --nostream 2>/dev/null | grep -iE "error|exception|failed|fatal" | wc -l)
    
    if [ "$ERROR_COUNT" -eq 0 ]; then
        print_success "Tidak ada error dalam 100 baris log terakhir"
        add_check "pass"
    elif [ "$ERROR_COUNT" -lt 5 ]; then
        print_warning "Ditemukan $ERROR_COUNT error dalam 100 baris log terakhir"
        add_check "pass"
    else
        print_error "Ditemukan $ERROR_COUNT error dalam 100 baris log terakhir (tinggi!)"
        print_info "Gunakan ./monit/error-analyzer.sh untuk analisis detail"
        add_check "fail"
    fi
else
    print_warning "PM2 tidak tersedia, tidak bisa cek errors"
fi

echo ""

# 7. Cek Port (jika aplikasi berjalan)
print_header "7️⃣  PORT & CONNECTIVITY"
echo ""

if command -v netstat &> /dev/null || command -v ss &> /dev/null; then
    PORT=$(grep -E "^PORT=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2 | sed 's/^"//;s/"$//' || echo "1002")
    
    if command -v ss &> /dev/null; then
        PORT_STATUS=$(ss -tuln | grep ":$PORT " || echo "")
    else
        PORT_STATUS=$(netstat -tuln | grep ":$PORT " || echo "")
    fi
    
    if [ -n "$PORT_STATUS" ]; then
        print_success "Port $PORT: Terbuka dan digunakan"
        add_check "pass"
    else
        print_warning "Port $PORT: Tidak terdeteksi (mungkin aplikasi belum start atau port berbeda)"
    fi
else
    print_warning "netstat/ss tidak tersedia, tidak bisa cek port"
fi

echo ""

# Summary
print_header "📊 HEALTH CHECK SUMMARY"
echo ""

HEALTH_PERCENT=$((HEALTH_SCORE * 100 / TOTAL_CHECKS))

print_info "Health Score: $HEALTH_SCORE / $TOTAL_CHECKS ($HEALTH_PERCENT%)"
echo ""

if [ "$HEALTH_PERCENT" -ge 90 ]; then
    print_success "Status: SEHAT ✅"
    echo "Aplikasi berjalan dengan baik."
elif [ "$HEALTH_PERCENT" -ge 70 ]; then
    print_warning "Status: PERHATIAN ⚠️"
    echo "Ada beberapa hal yang perlu diperhatikan. Cek detail di atas."
else
    print_error "Status: BERMASALAH ❌"
    echo "Aplikasi memiliki beberapa masalah yang perlu segera ditangani!"
    echo ""
    print_info "Rekomendasi:"
    echo "  1. Cek logs dengan: ./monit/check-logs.sh --error"
    echo "  2. Analisis error dengan: ./monit/error-analyzer.sh"
    echo "  3. Restart aplikasi dengan: ./restart.sh"
fi

echo ""
print_info "Selesai pada: $(date '+%Y-%m-%d %H:%M:%S')"

