# 📊 Dokumentasi Monitoring Tools

Dokumentasi untuk script-script monitoring aplikasi yang tersedia di folder `monit/`.

## 📋 Daftar Script Monitoring

1. **monitor.sh** - Dashboard monitoring utama
2. **edit-telegram-token.sh** - Edit Telegram Bot Token
3. **check-logs.sh** - Pemeriksaan log detail
4. **health-check.sh** - Health check aplikasi menyeluruh
5. **error-analyzer.sh** - Analisis error log

---

## 🖥️ 1. monitor.sh - Dashboard Monitoring Utama

Script utama untuk monitoring aplikasi secara menyeluruh dengan dashboard interaktif.

### Fitur:
- ✅ Status aplikasi PM2 (main app & worker)
- ✅ Resource usage (CPU, Memory)
- ✅ Health check cepat
- ✅ Ringkasan log terakhir
- ✅ Error logs summary
- ✅ Informasi sistem (uptime, load, memory, disk)
- ✅ Cek environment variables
- ✅ Quick actions menu

### Cara Penggunaan:

```bash
# Jalankan dashboard monitoring
./monit/monitor.sh

# Dashboard dengan auto-refresh setiap 30 detik
./monit/monitor.sh --watch
```

### Output:
- Status aplikasi (online/offline)
- Resource usage
- Log summary
- Error count
- System information
- Environment variables status

---

## 🔧 2. edit-telegram-token.sh - Edit Telegram Bot Token

Script untuk mengedit Telegram Bot Token dengan mudah dan aman.

### Fitur:
- ✅ Backup otomatis file .env.local
- ✅ Validasi format token
- ✅ Mask token untuk keamanan saat display
- ✅ Opsi restart aplikasi setelah update
- ✅ Cek status aplikasi setelah restart

### Cara Penggunaan:

```bash
# Edit Telegram Bot Token
./monit/edit-telegram-token.sh
```

### Proses:
1. Script akan membuat backup file .env.local
2. Menampilkan token saat ini (dengan masking)
3. Meminta input token baru (tersembunyi)
4. Validasi format token
5. Update token di file .env.local
6. Opsi untuk restart aplikasi

### Catatan:
- Token akan disembunyikan saat input (menggunakan `read -s`)
- Backup dibuat dengan timestamp: `.env.local.backup.YYYYMMDD_HHMMSS`
- Aplikasi perlu di-restart untuk menerapkan perubahan

---

## 📋 3. check-logs.sh - Pemeriksaan Log Detail

Script untuk memeriksa log worker dan aplikasi secara detail dengan berbagai opsi.

### Fitur:
- ✅ Lihat log main app atau worker
- ✅ Filter error logs atau output logs
- ✅ Follow logs real-time
- ✅ Customizable jumlah lines
- ✅ Log statistics (error count, warning count)
- ✅ Informasi log files (size, line count)

### Cara Penggunaan:

```bash
# Lihat semua logs (default 50 lines)
./monit/check-logs.sh

# Lihat logs main app saja
./monit/check-logs.sh --main

# Lihat logs worker saja
./monit/check-logs.sh --worker

# Lihat logs dengan jumlah lines tertentu
./monit/check-logs.sh --lines 100

# Follow logs real-time
./monit/check-logs.sh --follow

# Lihat error logs saja
./monit/check-logs.sh --error

# Lihat output logs saja
./monit/check-logs.sh --out

# Kombinasi
./monit/check-logs.sh --main --lines 100 --follow
./monit/check-logs.sh --worker --error --lines 200

# Help
./monit/check-logs.sh --help
```

### Opsi:
- `--main, -m` - Show logs untuk main app saja
- `--worker, -w` - Show logs untuk worker saja
- `--lines, -n NUMBER` - Jumlah lines yang ditampilkan (default: 50)
- `--error, -e` - Show error logs saja
- `--out, -o` - Show output logs saja
- `--follow, -f` - Follow logs real-time
- `--help, -h` - Tampilkan help message

---

## 💚 4. health-check.sh - Health Check Aplikasi

Script untuk memeriksa kesehatan aplikasi secara menyeluruh dengan scoring system.

### Fitur:
- ✅ Cek PM2 installation
- ✅ Status aplikasi (main app & worker)
- ✅ Resource usage (memory, CPU, disk)
- ✅ Environment variables validation
- ✅ Log files existence check
- ✅ Recent errors check
- ✅ Port & connectivity check
- ✅ Health score dengan persentase
- ✅ Rekomendasi berdasarkan hasil check

### Cara Penggunaan:

```bash
# Jalankan health check
./monit/health-check.sh
```

### Output:
1. **PM2 Check** - Apakah PM2 terinstall
2. **Status Aplikasi** - Status main app dan worker (online/offline)
3. **Resource Usage** - Memory, CPU, disk usage
4. **Environment Variables** - Validasi variabel penting
5. **Log Files** - Cek keberadaan log files
6. **Recent Errors** - Error count dalam log terakhir
7. **Port & Connectivity** - Cek port yang digunakan
8. **Health Score** - Skor kesehatan (0-100%)

### Health Score:
- **90-100%**: SEHAT ✅
- **70-89%**: PERHATIAN ⚠️
- **<70%**: BERMASALAH ❌

---

## 🔍 5. error-analyzer.sh - Analisis Error Log

Script untuk menganalisis error log dan memberikan insight serta rekomendasi.

### Fitur:
- ✅ Error statistics (count, percentage)
- ✅ Error types categorization
- ✅ Most common errors (top 10)
- ✅ Recent errors dengan timestamp
- ✅ Error timeline (distribution per hour)
- ✅ Rekomendasi berdasarkan error types

### Cara Penggunaan:

```bash
# Analisis semua logs (default 500 lines)
./monit/error-analyzer.sh

# Analisis main app logs saja
./monit/error-analyzer.sh --main

# Analisis worker logs saja
./monit/error-analyzer.sh --worker

# Analisis dengan jumlah lines tertentu
./monit/error-analyzer.sh --lines 1000

# Kombinasi
./monit/error-analyzer.sh --main --lines 2000

# Help
./monit/error-analyzer.sh --help
```

### Opsi:
- `--main, -m` - Analyze main app logs only
- `--worker, -w` - Analyze worker logs only
- `--lines, -n NUMBER` - Number of lines to analyze (default: 500)
- `--help, -h` - Show help message

### Output:
1. **Error Statistics** - Total errors, warnings, error rate
2. **Error Types** - Kategorisasi error (Database, Network, Auth, dll)
3. **Most Common Errors** - Top 10 error messages
4. **Recent Errors** - 10 error terakhir dengan timestamp
5. **Error Timeline** - Distribusi error per jam
6. **Recommendations** - Rekomendasi berdasarkan error types

### Error Categories:
- Database (DB, MySQL, PostgreSQL, Connection)
- Network (Timeout, ECONNREFUSED, ETIMEDOUT)
- Authentication (Auth, JWT, Token, Unauthorized)
- Validation (Invalid, Bad Request, 400, 422)
- Server (500, Internal, Server Error)
- Memory (Out of memory, heap, OOM)
- Telegram (Bot, Webhook, API)

---

## 🚀 Setup Awal

Setelah upload file ke VPS, jalankan command berikut untuk membuat script executable:

```bash
chmod +x monit/*.sh
```

Atau untuk setiap script:

```bash
chmod +x monit/monitor.sh
chmod +x monit/edit-telegram-token.sh
chmod +x monit/check-logs.sh
chmod +x monit/health-check.sh
chmod +x monit/error-analyzer.sh
```

---

## 📝 Workflow Monitoring

### Monitoring Harian:

```bash
# 1. Cek status cepat
./monit/monitor.sh

# 2. Health check lengkap
./monit/health-check.sh

# 3. Cek logs jika ada masalah
./monit/check-logs.sh --error
```

### Ketika Ada Error:

```bash
# 1. Analisis error
./monit/error-analyzer.sh

# 2. Lihat logs detail
./monit/check-logs.sh --error --lines 200

# 3. Follow logs real-time
./monit/check-logs.sh --follow
```

### Update Telegram Token:

```bash
# Edit token
./monit/edit-telegram-token.sh
```

---

## 🔗 Integrasi dengan Script Lain

Script monitoring ini dapat digunakan bersama dengan script deployment:

```bash
# Setelah deploy
./install.sh
./monit/health-check.sh

# Setelah update
./update.sh
./monit/monitor.sh

# Setelah restart
./restart.sh
./monit/health-check.sh
```

---

## 🚨 Troubleshooting

### Error: Permission Denied
```bash
chmod +x monit/*.sh
```

### Error: PM2 Not Found
Script monitoring memerlukan PM2. Install PM2 jika belum:
```bash
npm install -g pm2
```

### Error: File .env.local Not Found
Pastikan file .env.local sudah dibuat:
```bash
./setup-env.sh
```

### Log Files Tidak Ditemukan
Pastikan aplikasi sudah pernah dijalankan dengan PM2. Log files akan dibuat otomatis saat aplikasi berjalan.

---

## 📌 Tips

1. **Jadwalkan Health Check** - Gunakan cron untuk menjadwalkan health check harian
2. **Monitor Error Trends** - Gunakan error-analyzer.sh secara berkala untuk melihat trend error
3. **Backup Logs** - Backup log files secara berkala untuk analisis historis
4. **Alert System** - Integrasikan dengan alert system jika health score < 70%
5. **Documentation** - Catat error yang sering muncul dan solusinya

### Contoh Cron Job:

```bash
# Health check setiap hari jam 9 pagi
0 9 * * * /path/to/project/monit/health-check.sh >> /path/to/project/logs/health-check.log 2>&1
```

---

## ✅ Checklist Monitoring

- [ ] Semua script monitoring sudah executable (`chmod +x`)
- [ ] PM2 sudah terinstall
- [ ] File .env.local sudah ada dan terisi
- [ ] Aplikasi sudah berjalan dengan PM2
- [ ] Log files sudah dibuat
- [ ] Health check berjalan normal
- [ ] Error analyzer dapat membaca logs

---

**Selamat Monitoring! 📊**

