#!/bin/bash

# ============================================
# Script Check Logs Detail
# ============================================
# Script ini untuk memeriksa log worker dan aplikasi secara detail

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

# Default values
LINES=50
APP_NAME=""
LOG_TYPE="all"
FOLLOW=false

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
        --error|-e)
            LOG_TYPE="error"
            shift
            ;;
        --out|-o)
            LOG_TYPE="out"
            shift
            ;;
        --follow|-f)
            FOLLOW=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./monit/check-logs.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --main, -m          Show logs for main app only"
            echo "  --worker, -w        Show logs for worker only"
            echo "  --lines, -n NUMBER  Number of lines to show (default: 50)"
            echo "  --error, -e         Show error logs only"
            echo "  --out, -o           Show output logs only"
            echo "  --follow, -f        Follow logs in real-time"
            echo "  --help, -h          Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./monit/check-logs.sh                    # Show all logs (last 50 lines)"
            echo "  ./monit/check-logs.sh -m -n 100          # Show main app logs (last 100 lines)"
            echo "  ./monit/check-logs.sh -w -f              # Follow worker logs in real-time"
            echo "  ./monit/check-logs.sh -e                 # Show error logs only"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Clear screen
clear

# Header
print_header "📋 CHECK LOGS DETAIL"
echo ""

# Tampilkan informasi
print_info "Lines: $LINES | App: ${APP_NAME:-All} | Type: $LOG_TYPE | Follow: $FOLLOW"
echo ""

# Cek log files
print_header "📁 LOG FILES"
echo ""

LOG_FILES=(
    "./logs/pm2-error.log"
    "./logs/pm2-out.log"
    "./logs/pm2-worker-error.log"
    "./logs/pm2-worker-out.log"
)

for log_file in "${LOG_FILES[@]}"; do
    if [ -f "$log_file" ]; then
        FILE_SIZE=$(du -h "$log_file" | cut -f1)
        FILE_LINES=$(wc -l < "$log_file" 2>/dev/null || echo "0")
        print_success "$log_file (Size: $FILE_SIZE, Lines: $FILE_LINES)"
    else
        print_warning "$log_file (tidak ditemukan)"
    fi
done

echo ""

# Tampilkan logs berdasarkan parameter
if [ "$FOLLOW" = true ]; then
    print_header "📋 FOLLOWING LOGS (Press Ctrl+C to stop)"
    echo ""
    
    if [ -n "$APP_NAME" ]; then
        if [ "$LOG_TYPE" = "error" ]; then
            pm2 logs "$APP_NAME" --err --lines $LINES
        elif [ "$LOG_TYPE" = "out" ]; then
            pm2 logs "$APP_NAME" --out --lines $LINES
        else
            pm2 logs "$APP_NAME" --lines $LINES
        fi
    else
        if [ "$LOG_TYPE" = "error" ]; then
            pm2 logs --err --lines $LINES
        elif [ "$LOG_TYPE" = "out" ]; then
            pm2 logs --out --lines $LINES
        else
            pm2 logs --lines $LINES
        fi
    fi
else
    print_header "📋 LOGS (Last $LINES lines)"
    echo ""
    
    if [ -n "$APP_NAME" ]; then
        if [ "$LOG_TYPE" = "error" ]; then
            print_info "Error logs untuk $APP_NAME:"
            pm2 logs "$APP_NAME" --err --lines $LINES --nostream
        elif [ "$LOG_TYPE" = "out" ]; then
            print_info "Output logs untuk $APP_NAME:"
            pm2 logs "$APP_NAME" --out --lines $LINES --nostream
        else
            print_info "All logs untuk $APP_NAME:"
            pm2 logs "$APP_NAME" --lines $LINES --nostream
        fi
    else
        if [ "$LOG_TYPE" = "error" ]; then
            print_info "Error logs untuk semua aplikasi:"
            pm2 logs --err --lines $LINES --nostream
        elif [ "$LOG_TYPE" = "out" ]; then
            print_info "Output logs untuk semua aplikasi:"
            pm2 logs --out --lines $LINES --nostream
        else
            print_info "Main App (adbot-seller):"
            pm2 logs adbot-seller --lines $LINES --nostream
            echo ""
            print_info "Worker (adbot-automation-worker):"
            pm2 logs adbot-automation-worker --lines $LINES --nostream
        fi
    fi
fi

echo ""

# Summary statistics
if [ "$FOLLOW" = false ]; then
    print_header "📊 LOG STATISTICS"
    echo ""
    
    # Hitung error dalam log terakhir
    if [ -n "$APP_NAME" ]; then
        ERROR_COUNT=$(pm2 logs "$APP_NAME" --err --lines 1000 --nostream 2>/dev/null | grep -iE "error|exception|failed|fatal" | wc -l)
        WARN_COUNT=$(pm2 logs "$APP_NAME" --lines 1000 --nostream 2>/dev/null | grep -iE "warn|warning" | wc -l)
    else
        ERROR_COUNT=$(pm2 logs --err --lines 1000 --nostream 2>/dev/null | grep -iE "error|exception|failed|fatal" | wc -l)
        WARN_COUNT=$(pm2 logs --lines 1000 --nostream 2>/dev/null | grep -iE "warn|warning" | wc -l)
    fi
    
    if [ "$ERROR_COUNT" -gt 0 ]; then
        print_warning "Errors dalam 1000 baris terakhir: $ERROR_COUNT"
    else
        print_success "Tidak ada error dalam 1000 baris terakhir"
    fi
    
    if [ "$WARN_COUNT" -gt 0 ]; then
        print_warning "Warnings dalam 1000 baris terakhir: $WARN_COUNT"
    else
        print_success "Tidak ada warning dalam 1000 baris terakhir"
    fi
    
    echo ""
fi

print_info "Selesai. Gunakan --follow untuk melihat logs real-time."

