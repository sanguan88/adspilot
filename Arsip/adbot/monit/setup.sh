#!/bin/bash

# ============================================
# Script Setup Monitoring Tools
# ============================================
# Script ini untuk setup semua script monitoring

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

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_header "🔧 SETUP MONITORING TOOLS"
echo ""

# 1. Make scripts executable
print_header "1️⃣  MEMBUAT SCRIPT EXECUTABLE"
echo ""

SCRIPTS=(
    "monitor.sh"
    "edit-telegram-token.sh"
    "check-logs.sh"
    "health-check.sh"
    "error-analyzer.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$SCRIPT_DIR/$script" ]; then
        chmod +x "$SCRIPT_DIR/$script"
        print_success "$script: Executable"
    else
        print_error "$script: Tidak ditemukan"
    fi
done

echo ""

# 2. Check dependencies
print_header "2️⃣  CEK DEPENDENCIES"
echo ""

# Check PM2
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version 2>/dev/null || echo "unknown")
    print_success "PM2: Terinstall (Version: $PM2_VERSION)"
else
    print_error "PM2: Tidak terinstall"
    print_info "Install dengan: npm install -g pm2"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
    print_success "Node.js: Terinstall (Version: $NODE_VERSION)"
else
    print_error "Node.js: Tidak terinstall"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version 2>/dev/null || echo "unknown")
    print_success "npm: Terinstall (Version: $NPM_VERSION)"
else
    print_error "npm: Tidak terinstall"
fi

echo ""

# 3. Check environment files
print_header "3️⃣  CEK ENVIRONMENT FILES"
echo ""

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

if [ -f "$ENV_FILE" ]; then
    print_success "File $ENV_FILE ditemukan"
    
    # Check important variables
    if grep -q "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE" && ! grep -q "^TELEGRAM_BOT_TOKEN=\s*$" "$ENV_FILE"; then
        print_success "TELEGRAM_BOT_TOKEN: Terisi"
    else
        print_warning "TELEGRAM_BOT_TOKEN: Kosong atau tidak ditemukan"
    fi
else
    print_error "File .env.local atau .env tidak ditemukan"
    print_info "Buat dengan: ./setup-env.sh"
fi

echo ""

# 4. Check log directory
print_header "4️⃣  CEK LOG DIRECTORY"
echo ""

if [ -d "logs" ]; then
    print_success "Directory logs ditemukan"
    
    LOG_FILES=(
        "logs/pm2-error.log"
        "logs/pm2-out.log"
        "logs/pm2-worker-error.log"
        "logs/pm2-worker-out.log"
    )
    
    for log_file in "${LOG_FILES[@]}"; do
        if [ -f "$log_file" ]; then
            FILE_SIZE=$(du -h "$log_file" 2>/dev/null | cut -f1)
            print_info "$(basename $log_file): Ada (Size: $FILE_SIZE)"
        else
            print_warning "$(basename $log_file): Belum ada (akan dibuat saat aplikasi berjalan)"
        fi
    done
else
    print_warning "Directory logs tidak ditemukan"
    print_info "Membuat directory logs..."
    mkdir -p logs
    print_success "Directory logs dibuat"
fi

echo ""

# 5. Check PM2 processes
print_header "5️⃣  CEK PM2 PROCESSES"
echo ""

if command -v pm2 &> /dev/null; then
    PM2_PROCESSES=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | wc -l)
    
    if [ "$PM2_PROCESSES" -gt 0 ]; then
        print_success "PM2 processes ditemukan: $PM2_PROCESSES"
        echo ""
        pm2 list
    else
        print_warning "Tidak ada PM2 processes yang berjalan"
        print_info "Start aplikasi dengan: ./restart.sh atau pm2 start ecosystem.config.js"
    fi
else
    print_warning "PM2 tidak tersedia, tidak bisa cek processes"
fi

echo ""

# Summary
print_header "📊 SETUP SUMMARY"
echo ""

print_info "Setup selesai! Script monitoring siap digunakan."
echo ""
print_info "Gunakan script berikut:"
echo ""
echo "  📊 ./monit/monitor.sh              - Dashboard monitoring"
echo "  🔧 ./monit/edit-telegram-token.sh  - Edit Telegram token"
echo "  📋 ./monit/check-logs.sh           - Check logs detail"
echo "  💚 ./monit/health-check.sh         - Health check"
echo "  🔍 ./monit/error-analyzer.sh        - Analisis error"
echo ""
print_info "Lihat dokumentasi lengkap di: ./monit/README.md"
echo ""

