#!/bin/bash

# ============================================
# Script Edit Telegram Bot Token
# ============================================
# Script ini untuk mengedit Telegram Bot Token dengan mudah

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

# Cek apakah file .env.local ada
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    print_error "File $ENV_FILE tidak ditemukan!"
    print_info "Mencoba file .env..."
    ENV_FILE=".env"
    if [ ! -f "$ENV_FILE" ]; then
        print_error "File .env juga tidak ditemukan!"
        print_info "Silakan buat file .env.local terlebih dahulu dengan menjalankan: ./setup-env.sh"
        exit 1
    fi
fi

print_header "🔧 EDIT TELEGRAM BOT TOKEN"
echo ""

# Backup file
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
print_success "Backup dibuat: $BACKUP_FILE"
echo ""

# Tampilkan token saat ini (jika ada)
CURRENT_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed "s/^'//;s/'$//")

if [ -n "$CURRENT_TOKEN" ] && [ "$CURRENT_TOKEN" != "" ]; then
    # Mask token untuk keamanan (tampilkan hanya 10 karakter pertama dan terakhir)
    MASKED_TOKEN="${CURRENT_TOKEN:0:10}...${CURRENT_TOKEN: -10}"
    print_info "Token saat ini: $MASKED_TOKEN"
    echo ""
    read -p "Apakah Anda ingin mengganti token? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        print_info "Operasi dibatalkan."
        exit 0
    fi
    echo ""
else
    print_warning "Token saat ini tidak ditemukan atau kosong"
    echo ""
fi

# Input token baru
echo -e "${CYAN}Masukkan Telegram Bot Token baru:${NC}"
echo -e "${YELLOW}(Token akan disembunyikan saat mengetik)${NC}"
read -s NEW_TOKEN
echo ""

if [ -z "$NEW_TOKEN" ]; then
    print_error "Token tidak boleh kosong!"
    exit 1
fi

# Validasi format token (format umum: angka:karakter)
if ! echo "$NEW_TOKEN" | grep -qE "^[0-9]+:[A-Za-z0-9_-]+$"; then
    print_warning "Format token tidak sesuai standar (format: angka:karakter)"
    read -p "Lanjutkan tetap? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        print_info "Operasi dibatalkan."
        exit 0
    fi
fi

# Update atau tambahkan token di file
if grep -q "^TELEGRAM_BOT_TOKEN=" "$ENV_FILE"; then
    # Update existing token
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$NEW_TOKEN|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$NEW_TOKEN|" "$ENV_FILE"
    fi
    print_success "Token berhasil diupdate"
else
    # Tambahkan token baru
    echo "" >> "$ENV_FILE"
    echo "TELEGRAM_BOT_TOKEN=$NEW_TOKEN" >> "$ENV_FILE"
    print_success "Token berhasil ditambahkan"
fi

echo ""

# Tanyakan apakah ingin restart aplikasi
print_info "Token telah diupdate. Untuk menerapkan perubahan, aplikasi perlu di-restart."
echo ""
read -p "Apakah Anda ingin restart aplikasi sekarang? (y/n): " RESTART

if [ "$RESTART" = "y" ] || [ "$RESTART" = "Y" ]; then
    echo ""
    print_info "Menghentikan aplikasi..."
    
    # Cek apakah PM2 terinstall
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 tidak ditemukan. Silakan restart aplikasi secara manual."
        exit 1
    fi
    
    # Stop aplikasi
    pm2 stop all 2>/dev/null || true
    sleep 2
    
    # Load environment variables dan restart
    print_info "Memuat environment variables dan restart aplikasi..."
    
    # Load .env.local ke environment
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Restart dengan PM2
    pm2 restart ecosystem.config.js 2>/dev/null || pm2 start ecosystem.config.js
    
    sleep 3
    
    # Cek status
    echo ""
    print_info "Status aplikasi setelah restart:"
    pm2 list
    
    echo ""
    MAIN_STATUS=$(pm2 jlist | grep -o '"name":"adbot-seller"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    WORKER_STATUS=$(pm2 jlist | grep -o '"name":"adbot-automation-worker"[^}]*"pm2_env"[^}]*"status":"[^"]*"' | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$MAIN_STATUS" = "online" ] && [ "$WORKER_STATUS" = "online" ]; then
        print_success "Aplikasi berhasil di-restart dan berjalan normal"
    else
        print_warning "Aplikasi di-restart, tetapi ada yang perlu dicek. Gunakan ./monit/health-check.sh untuk detail"
    fi
else
    print_info "Token telah diupdate. Jangan lupa restart aplikasi dengan: ./restart.sh"
fi

echo ""
print_success "Selesai!"
echo ""

