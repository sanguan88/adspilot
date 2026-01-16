# Panduan Deployment - Fitur Affiliate Hybrid

Fitur "One-Click Affiliate Activation" untuk subscriber telah diimplementasikan. Berikut langkah-langkah deployment ke production (VPS):

## 1. Update Codebase
Masuk ke folder project di VPS dan tarik perubahan terbaru:
```bash
cd /path/to/project
git pull origin main
```

## 2. Update Environment Variables (CRITICAL)
Anda perlu menambahkan 2 variable baru agar fitur ini berjalan.

### A. Untuk User Portal (`app/.env`)
Edit file `.env` di folder `app`:
```bash
nano app/.env
```
Tambahkan di baris paling bawah:
```env
# Internal API Secret (Harus sama di app dan aff)
INTERNAL_API_SECRET=ads_pilot_secret_key_2026_internal_secure

# Lokasi Service Affiliate (gunakan IP/Port internal di server)
# Jika using PM2 dan port 3003
AFFILIATE_SERVICE_URL=http://localhost:3003
```

### B. Untuk Affiliate Portal (`aff/.env`)
Edit file `.env` di folder `aff`:
```bash
nano aff/.env
```
Tambahkan di baris paling bawah:
```env
# Internal API Secret (Harus MATCHING dengan app)
INTERNAL_API_SECRET=ads_pilot_secret_key_2026_internal_secure
```

> **Catatan:** Ganti `ads_pilot_secret_key_2026_internal_secure` dengan string acak yang lebih aman jika diinginkan, asalkan SAMA di kedua file.

## 3. Rebuild & Restart Services
Setelah update env, restart service agar perubahan terbaca.

```bash
# Untuk App Portal
cd app
npm run build
pm2 restart app-service-name  # Sesuaikan dengan nama service di PM2 (misal: "app-portal" atau "web")

# Untuk Affiliate Portal
cd ../aff
npm run build  # Jika perlu build (Next.js)
pm2 restart affiliate-service-name # Misal: "aff-portal"
```

## 4. Verifikasi
1. Login ke User Portal.
2. Cek menu "Partner Affiliate" di sidebar.
3. Pastikan konten memuat "Komisi 30%" (sesuai config DB production).
4. Coba klik "Aktifkan Akun".

Selesai! 🚀
