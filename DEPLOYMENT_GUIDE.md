# 📘 AdsPilot VPS Deployment Guide

**Tanggal Deployment:** 14 Januari 2026  
**Server IP:** 154.19.37.198  
**OS:** Ubuntu 20.04 LTS  
**Node.js Version:** v20.19.6  
**Database:** PostgreSQL 12

---

## 🎯 Ringkasan Deployment

AdsPilot berhasil di-deploy ke VPS dengan **semua 4 portal berjalan sempurna**:

| Portal | Port | Status | URL |
|--------|------|--------|-----|
| User Portal | 3000 | ✅ ONLINE | http://app.adspilot.id |
| Admin Portal | 3001 | ✅ ONLINE | http://adm.adspilot.id |
| Landing Page | 3002 | ✅ ONLINE | http://adspilot.id |
| Affiliate Portal | 3003 | ✅ ONLINE | http://aff.adspilot.id |

---

## 📂 Struktur Direktori Server

```
/root/adspilot/
├── adm/              # Admin Portal (Next.js 14)
├── app/              # User Portal (Next.js 14)
├── aff/              # Affiliate Portal (Next.js 14)
├── landing-page-v2/  # Landing Page (Next.js 14) - FIXED ✅
├── Arsip/            # Backup & Documentation
├── DATABASE_SCHEMA.md
└── README.md
```

---

## 🔐 Akses Server

### SSH Access
```bash
ssh root@154.19.37.198
```

**SSH Key:** Sudah dikonfigurasi di `~/.ssh/id_rsa_github` untuk GitHub access

### Kredensial Database
- **Host:** 154.19.37.198
- **Port:** 3306 (PostgreSQL)
- **Database:** soroboti_ads
- **User:** soroboti_db
- **Password:** `123qweASD!@#!@#`

---

## 🚀 Konfigurasi Aplikasi

### Environment Variables

#### User Portal (`/root/adspilot/app/.env`)
```env
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
DB_HOST=154.19.37.198
DB_PORT=3306
DB_NAME=soroboti_ads
DB_USER=soroboti_db
DB_PASSWORD="123qweASD!@#!@#"
JWT_SECRET=ADBOT-SOROBOT-2026-CB45
TELEGRAM_BOT_TOKEN=8489555840:AAHFNTi2UeqLjM8eCAtFneNPVwBRmrAeb00
TELEGRAM_WEBHOOK_URL=https://app.adspilot.id/api/telegram/webhook
NEXT_PUBLIC_APP_URL=https://adspilot.id
APP_URL=https://app.adspilot.id
SMTP_USER=adspilot.id@gmail.com
SMTP_PASS=tjqkjkbjdkadvrwp
SMTP_FROM="AdsPilot" <adspilot.id@gmail.com>
```

#### Admin Portal (`/root/adspilot/adm/.env`)
```env
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
DB_HOST=154.19.37.198
DB_PORT=3306
DB_NAME=soroboti_ads
DB_USER=soroboti_db
DB_PASSWORD="123qweASD!@#!@#"
JWT_SECRET=ADS-SOROBOT-2026-CB45
TELEGRAM_BOT_TOKEN=8489555840:AAHFNTi2UeqLjM8eCAtFneNPVwBRmrAeb00 
TELEGRAM_WEBHOOK_URL=https://app.adspilot.id/api/telegram/webhook
BYPASS_AUTH=false
```

#### Affiliate Portal (`/root/adspilot/aff/.env`)
```env
NODE_ENV=production
PORT=3003
HOSTNAME=0.0.0.0
DB_HOST=154.19.37.198
DB_PORT=3306
DB_NAME=soroboti_ads
DB_USER=soroboti_db
DB_PASSWORD="123qweASD!@#!@#"
JWT_SECRET=ADS-SOROBOT-2026-CB45
TELEGRAM_BOT_TOKEN=8489555840:AAHFNTi2UeqLjM8eCAtFneNPVwBRmrAeb00
TELEGRAM_WEBHOOK_URL=https://app.adspilot.id/api/telegram/webhook
NEXT_PUBLIC_APP_URL=https://aff.adspilot.id
```

---

## 🔧 PM2 Process Manager

### Status Aplikasi
```bash
pm2 list
```
**Active Processes:**
- `adbot-seller` (User Portal)
- `adbot-automation-worker` (Automation & Subscription Engine)
- `app-admin` (Admin Portal)
- `app-affiliate` (Affiliate Portal)

### Mengelola Aplikasi
```bash
# Restart semua aplikasi
pm2 restart all

# Restart aplikasi tertentu
pm2 restart adbot-seller
pm2 restart adbot-automation-worker
pm2 restart app-admin

# Stop aplikasi
pm2 stop adbot-automation-worker

# Monitor khusus Automation Worker
pm2 logs adbot-automation-worker
```

### Auto-Start Configuration
PM2 sudah dikonfigurasi untuk auto-start saat server reboot:
```bash
pm2 save
pm2 startup systemd
```

---

## 🌐 Nginx Configuration

### Lokasi File Konfigurasi
- **Config File:** `/etc/nginx/sites-available/adspilot`
- **Enabled Link:** `/etc/nginx/sites-enabled/adspilot`

### Mengelola Nginx
```bash
# Test konfigurasi
nginx -t

# Reload konfigurasi
systemctl reload nginx

# Restart Nginx
systemctl restart nginx

# Status Nginx
systemctl status nginx

# Enable auto-start
systemctl enable nginx
```

### Reverse Proxy Configuration
Nginx dikonfigurasi sebagai reverse proxy untuk:
- `app.adspilot.id` → `localhost:3000`
- `adm.adspilot.id` → `localhost:3001`
- `aff.adspilot.id` → `localhost:3003`

---

## 🔄 Update & Deployment Workflow

### 1. Update Kode dari GitHub
```bash
# SSH ke server
ssh root@154.19.37.198

# Masuk ke direktori project
cd ~/adspilot

# Pull update terbaru
git pull origin main
```

### 2. Update Dependencies (Jika ada perubahan package.json)
```bash
# Update User Portal
cd ~/adspilot/app
npm install --legacy-peer-deps

# Update Admin Portal
cd ~/adspilot/adm
npm install --legacy-peer-deps

# Update Affiliate Portal
cd ~/adspilot/aff
npm install --legacy-peer-deps
```

### 3. Build Aplikasi
```bash
# Build User Portal
cd ~/adspilot/app
npm run build

# Build Admin Portal
cd ~/adspilot/adm
npm run build

# Build Affiliate Portal
cd ~/adspilot/aff
npm run build
```

### 4. Restart Aplikasi
```bash
pm2 restart all
```

---

## 🌍 Konfigurasi DNS

Untuk mengaktifkan domain, tambahkan A Record di DNS provider Anda:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | app | 154.19.37.198 | 3600 |
| A | adm | 154.19.37.198 | 3600 |
| A | aff | 154.19.37.198 | 3600 |
| A | @ atau www | 154.19.37.198 | 3600 |

**Propagasi DNS:** Biasanya memakan waktu 5-60 menit

---

## 🔒 SSL Certificate (HTTPS)

### Install Certbot
```bash
apt update
apt install certbot python3-certbot-nginx -y
```

### Generate SSL Certificate
```bash
certbot --nginx -d app.adspilot.id -d adm.adspilot.id -d aff.adspilot.id
```

### Auto-Renewal
Certbot akan otomatis setup cron job untuk renewal. Cek dengan:
```bash
certbot renew --dry-run
```

---

## 🐛 Troubleshooting

### Aplikasi Tidak Bisa Diakses

1. **Cek Status PM2:**
```bash
pm2 list
pm2 logs app-user --lines 50
```

2. **Cek Status Nginx:**
```bash
systemctl status nginx
nginx -t
```

3. **Cek Port yang Digunakan:**
```bash
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :3003
```

### Database Connection Error

1. **Cek PostgreSQL Status:**
```bash
systemctl status postgresql
```

2. **Test Database Connection:**
```bash
psql -h 154.19.37.198 -U soroboti_db -d soroboti_ads
```

### Memory/CPU Issues

1. **Cek Resource Usage:**
```bash
free -h
df -h
top
```

2. **Restart Aplikasi yang Bermasalah:**
```bash
pm2 restart app-user
```

---

## 📊 Monitoring

### Server Resources
```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU & Process
top
htop
```

### Application Logs
```bash
# PM2 logs
pm2 logs

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

---

## ⚠️ Known Issues

**None** - All systems operational! ✅

### Recently Resolved Issues

#### Landing Page (Port 3002) - FIXED ✅
**Previous Status:** STOPPED  
**Issue:** Database connection error - password authentication failed  
**Resolution Date:** 2026-01-16  
**Solution:**
1. Created PM2 ecosystem config with hardcoded DB credentials
2. Copied working `lib/db.ts` from affiliate module
3. Rebuilt application with clean `.next` cache

**Current Status:** ✅ **ONLINE** - http://adspilot.id

---

## 🔄 Backup & Restore

### Backup Database
```bash
# PostgreSQL
pg_dump -h 154.19.37.198 -U soroboti_db soroboti_ads > backup_$(date +%Y%m%d).sql
```

### Backup Aplikasi
```bash
# Backup folder aplikasi
tar -czf adspilot_backup_$(date +%Y%m%d).tar.gz ~/adspilot

# Exclude node_modules
tar --exclude='node_modules' --exclude='.next' -czf adspilot_backup_$(date +%Y%m%d).tar.gz ~/adspilot
```

### Restore
```bash
# Restore database
psql -h 154.19.37.198 -U soroboti_db soroboti_ads < backup_20260114.sql

# Restore aplikasi
tar -xzf adspilot_backup_20260114.tar.gz -C /root/
```

---

## 📞 Support & Maintenance

### Kontak
- **Developer:** Antigravity AI
- **Email:** adspilot.id@gmail.com

### Regular Maintenance Tasks
1. **Weekly:** Check PM2 logs dan server resources
2. **Monthly:** Update dependencies dan security patches
3. **Quarterly:** Database optimization dan cleanup

### Security Updates
```bash
# Update system packages
apt update && apt upgrade -y

# Update Node.js (jika ada versi baru)
# Gunakan nvm atau NodeSource repository
```

---

## 📝 Changelog

### 2026-01-16 - Landing Page DB Fix & Click Tracking Deployment
- ✅ **[CRITICAL FIX]** Resolved Landing Page Database Connection Error (password authentication failed)
- ✅ **[FEATURE]** Implemented Real-Time Click Tracking System
- ✅ **[ENHANCEMENT]** Added Sparkline Tooltip with Daily Click Breakdown
- ✅ **[CONFIG]** Created PM2 Ecosystem Config for Landing Page with Hardcoded Credentials
- ✅ **[IMPROVEMENT]** Refactored Tracking Logic to Record Every Visit (not just first-click)
- ✅ **[FIX]** Updated CORS Headers for Cross-Origin Tracking Requests
- ✅ **[DEPLOYMENT]** Landing Page (Port 3002) Now ONLINE - http://adspilot.id
- **Files Modified:**
  - `landing-page-v2/lib/db.ts` - DB connection parser fix
  - `landing-page-v2/app/page.tsx` - Tracking logic refactor
  - `landing-page-v2/ecosystem.config.js` - PM2 config (NEW)
  - `aff/components/my-links-page.tsx` - Sparkline tooltip
  - `app/api/tracking/click/route.ts` - CORS improvements

### 2026-01-15 - Subscription Monitoring & Rebranding
- ✅ Migrated Telegram Bot to Rebranded Identity (@adspilotbot / ID: 8489555840)
- ✅ Implemented Daily Subscription Monitoring Worker (H-3, H-1, H-0 Reminders)
- ✅ Integrated Subscription Checks into `adbot-automation-worker`
- ✅ Updated `ecosystem.config.js` with new process structure and hardcoded webhook URLs
- ✅ Verified Clean Codebase (No references to old 'shopadexpert' brand)
- ✅ **[CRITICAL FIX]** Resolved "Double Connection Release" DB Error causing blank pages.
- ✅ **[CRITICAL FIX]** Fixed Admin Portal Usage Page (Error 500) & Broken Images (Refast.id).
- ✅ **[CONFIG]** Updated `adbot-seller` to properly run on Port 3000 (aligned with Nginx).

### 2026-01-14 - Initial Deployment
- ✅ Deployed User Portal (Port 3000)
- ✅ Deployed Admin Portal (Port 3001)
- ✅ Deployed Affiliate Portal (Port 3003)
- ✅ Configured Nginx reverse proxy
- ✅ Setup PM2 auto-start
- ✅ Configured SSH key for GitHub
- ✅ Landing Page deployment failed (Next.js 16 issue)

---

## 🎓 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [PM2 Documentation](https://pm2.keymetrics.io/docs)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Dokumentasi ini dibuat otomatis oleh Antigravity AI**  
**Last Updated:** 15 Januari 2026, 11:38 WIB
