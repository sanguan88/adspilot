#!/bin/bash

# ============================================
# Script Error Log Analyzer
# ============================================
# Script ini untuk menganalisis error log dan memberikan insight

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

# Default values
LINES=500
APP_NAME=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --main|-m)
            APP_NAME="adbot-seller"
            shift
            ;;
        --worker|-w)
            APP_NAME="adbot-automation-worker"
            shift
            ;;
        --lines|-n)
            LINES="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: ./monit/error-analyzer.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --main, -m          Analyze main app logs only"
            echo "  --worker, -w        Analyze worker logs only"
            echo "  --lines, -n NUMBER  Number of lines to analyze (default: 500)"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./monit/error-analyzer.sh              # Analyze all logs (last 500 lines)"
            echo "  ./monit/error-analyzer.sh -m -n 1000   # Analyze main app (last 1000 lines)"
            echo "  ./monit/error-analyzer.sh -w           # Analyze worker logs only"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Cek apakah PM2 sudah terinstall
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 tidak ditemukan. Silakan install PM2 terlebih dahulu."
    exit 1
fi

# Clear screen
clear

# Header
print_header "🔍 ERROR LOG ANALYZER"
echo ""

print_info "Menganalisis $LINES baris log terakhir..."
if [ -n "$APP_NAME" ]; then
    print_info "Aplikasi: $APP_NAME"
else
    print_info "Aplikasi: Semua"
fi
echo ""

# Ambil logs
TEMP_LOG=$(mktemp)
if [ -n "$APP_NAME" ]; then
    pm2 logs "$APP_NAME" --err --lines $LINES --nostream 2>/dev/null > "$TEMP_LOG"
else
    pm2 logs --err --lines $LINES --nostream 2>/dev/null > "$TEMP_LOG"
fi

# 1. Error Count
print_header "1️⃣  ERROR STATISTICS"
echo ""

TOTAL_LINES=$(wc -l < "$TEMP_LOG" 2>/dev/null || echo "0")
ERROR_COUNT=$(grep -iE "error|exception|failed|fatal" "$TEMP_LOG" 2>/dev/null | wc -l)
WARN_COUNT=$(grep -iE "warn|warning" "$TEMP_LOG" 2>/dev/null | wc -l)

print_info "Total log lines: $TOTAL_LINES"
print_info "Error count: $ERROR_COUNT"
print_info "Warning count: $WARN_COUNT"

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_success "Tidak ada error ditemukan!"
else
    ERROR_PERCENT=$((ERROR_COUNT * 100 / TOTAL_LINES))
    if [ "$ERROR_PERCENT" -gt 10 ]; then
        print_error "Error rate tinggi: ${ERROR_PERCENT}%"
    elif [ "$ERROR_PERCENT" -gt 5 ]; then
        print_warning "Error rate sedang: ${ERROR_PERCENT}%"
    else
        print_info "Error rate rendah: ${ERROR_PERCENT}%"
    fi
fi

echo ""

# 2. Error Types
print_header "2️⃣  ERROR TYPES"
echo ""

ERROR_TYPES=(
    "Database|DB|MySQL|PostgreSQL|Connection"
    "Network|Timeout|ECONNREFUSED|ETIMEDOUT"
    "Authentication|Auth|JWT|Token|Unauthorized"
    "Validation|Invalid|Bad Request|400|422"
    "Server|500|Internal|Server Error"
    "Memory|Out of memory|heap|OOM"
    "Telegram|Bot|Webhook|API"
)

for error_type in "${ERROR_TYPES[@]}"; do
    TYPE_NAME=$(echo "$error_type" | cut -d'|' -f1)
    PATTERNS=$(echo "$error_type" | cut -d'|' -f2-)
    
    COUNT=$(grep -iE "$PATTERNS" "$TEMP_LOG" 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 0 ]; then
        print_warning "$TYPE_NAME: $COUNT occurrences"
    fi
done

echo ""

# 3. Most Common Errors
print_header "3️⃣  MOST COMMON ERRORS"
echo ""

print_info "Top 10 error messages:"
echo ""

# Extract error messages and count
grep -iE "error|exception|failed|fatal" "$TEMP_LOG" 2>/dev/null | \
    sed 's/.*\(error\|exception\|failed\|fatal\)[^:]*: *//i' | \
    sed 's/^[^:]*: *//' | \
    cut -d' ' -f1-10 | \
    sort | uniq -c | sort -rn | head -10 | \
    while read count message; do
        if [ "$count" -gt 5 ]; then
            print_error "[$count] $message"
        elif [ "$count" -gt 2 ]; then
            print_warning "[$count] $message"
        else
            print_info "[$count] $message"
        fi
    done

echo ""

# 4. Recent Errors
print_header "4️⃣  RECENT ERRORS (Last 10)"
echo ""

grep -iE "error|exception|failed|fatal" "$TEMP_LOG" 2>/dev/null | tail -10 | \
    while IFS= read -r line; do
        # Extract timestamp if available
        TIMESTAMP=$(echo "$line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}' | head -1)
        if [ -n "$TIMESTAMP" ]; then
            print_error "[$TIMESTAMP] $(echo "$line" | sed 's/.*\(error\|exception\|failed\|fatal\)/.../i')"
        else
            print_error "$(echo "$line" | cut -c1-100)..."
        fi
    done

echo ""

# 5. Error Timeline
print_header "5️⃣  ERROR TIMELINE"
echo ""

print_info "Error distribution (last 24 hours jika timestamp tersedia):"
echo ""

# Extract timestamps and count errors per hour
grep -iE "error|exception|failed|fatal" "$TEMP_LOG" 2>/dev/null | \
    grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}' | \
    cut -d' ' -f2 | cut -d':' -f1 | \
    sort | uniq -c | \
    while read count hour; do
        if [ -n "$hour" ]; then
            BAR=$(printf "%${count}s" | tr ' ' '█')
            print_info "[$hour:00] $BAR ($count errors)"
        fi
    done

echo ""

# 6. Recommendations
print_header "6️⃣  RECOMMENDATIONS"
echo ""

if [ "$ERROR_COUNT" -eq 0 ]; then
    print_success "Tidak ada rekomendasi. Aplikasi berjalan dengan baik!"
elif [ "$ERROR_COUNT" -lt 5 ]; then
    print_info "Error count rendah. Monitor terus untuk memastikan tidak ada peningkatan."
else
    print_warning "Rekomendasi berdasarkan analisis:"
    echo ""
    
    # Check for database errors
    DB_ERRORS=$(grep -iE "database|db|mysql|postgresql|connection" "$TEMP_LOG" 2>/dev/null | wc -l)
    if [ "$DB_ERRORS" -gt 0 ]; then
        print_warning "1. Database errors detected ($DB_ERRORS):"
        echo "   - Cek koneksi database"
        echo "   - Cek credentials di .env.local"
        echo "   - Cek apakah database server berjalan"
        echo ""
    fi
    
    # Check for network errors
    NET_ERRORS=$(grep -iE "network|timeout|econnrefused|etimedout" "$TEMP_LOG" 2>/dev/null | wc -l)
    if [ "$NET_ERRORS" -gt 0 ]; then
        print_warning "2. Network errors detected ($NET_ERRORS):"
        echo "   - Cek koneksi internet"
        echo "   - Cek firewall settings"
        echo "   - Cek apakah service eksternal (API) dapat diakses"
        echo ""
    fi
    
    # Check for memory errors
    MEM_ERRORS=$(grep -iE "memory|out of memory|heap|oom" "$TEMP_LOG" 2>/dev/null | wc -l)
    if [ "$MEM_ERRORS" -gt 0 ]; then
        print_warning "3. Memory errors detected ($MEM_ERRORS):"
        echo "   - Cek penggunaan memory dengan: pm2 monit"
        echo "   - Pertimbangkan untuk meningkatkan memory limit"
        echo "   - Cek apakah ada memory leak"
        echo ""
    fi
    
    # Check for authentication errors
    AUTH_ERRORS=$(grep -iE "authentication|auth|jwt|token|unauthorized" "$TEMP_LOG" 2>/dev/null | wc -l)
    if [ "$AUTH_ERRORS" -gt 0 ]; then
        print_warning "4. Authentication errors detected ($AUTH_ERRORS):"
        echo "   - Cek JWT_SECRET di .env.local"
        echo "   - Cek token expiration settings"
        echo ""
    fi
    
    # General recommendations
    print_info "5. Tindakan umum:"
    echo "   - Restart aplikasi: ./restart.sh"
    echo "   - Monitor logs real-time: ./monit/check-logs.sh --follow"
    echo "   - Cek health status: ./monit/health-check.sh"
    echo ""
fi

# Cleanup
rm -f "$TEMP_LOG"

echo ""
print_info "Analisis selesai. Gunakan --lines untuk menganalisis lebih banyak log."

