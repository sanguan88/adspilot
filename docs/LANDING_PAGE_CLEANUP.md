# 📋 Dokumentasi: Pembersihan Duplikasi Landing Page

> **Tanggal:** 16 Januari 2026  
> **Status:** PENDING - Akan dikerjakan setelah presentasi  
> **Prioritas:** High (Technical Debt)

---

## 📌 Ringkasan Masalah

Proyek `landing-page-v2` (domain: `adspilot.id`) memiliki **DUPLIKASI BESAR-BESARAN** dengan proyek `app` (domain: `app.adspilot.id`).

Ini menyebabkan:
1. Bug karena perubahan tidak sinkron antara 2 codebase
2. Maintenance sulit (harus update 2 tempat)
3. Ukuran build yang tidak perlu besar
4. Kebingungan developer

---

## 🏗️ Arsitektur yang Seharusnya

### Landing Page (`landing-page-v2` / `adspilot.id`)
**Fungsi:** Marketing website dan funnel registrasi

**Halaman yang HARUS ada:**
- `/` → Homepage marketing (pricing, features, testimonials)
- `/auth/login` → Login form (redirect ke User Portal setelah sukses)
- `/auth/register` → Register form
- `/auth/checkout` → Checkout/payment page
- `/auth/payment-confirmation` → Konfirmasi pembayaran
- `/auth/forgot-password` → Lupa password
- `/auth/reset-password` → Reset password

**Halaman yang TIDAK BOLEH ada:**
- ❌ `/general` (Dashboard)
- ❌ `/automations`
- ❌ `/accounts`
- ❌ `/campaigns`
- ❌ `/dashboard/*`
- ❌ `/rekam-medic`
- ❌ `/settings`
- ❌ `/subscription`
- ❌ `/tutorial`
- ❌ `/logs`
- ❌ `/rules`

### User Portal (`app` / `app.adspilot.id`)
**Fungsi:** Dashboard aplikasi untuk user yang sudah login

**Halaman yang HARUS ada:**
- `/auth/login` → Login form (native login)
- `/general` → Dashboard Overview
- `/automations` → Automation rules
- `/accounts` → Store accounts management
- `/campaigns` → Campaign management
- `/dashboard/payment-status` → Status pembayaran
- `/rekam-medic` → Rekam Medic analysis
- `/settings` → User settings
- `/subscription` → Subscription management
- `/tutorial` → Tutorial pages
- `/logs` → System logs
- `/rules` → Rules management
- `/affiliate` → Affiliate dashboard

---

## 📁 File/Folder yang Harus DIHAPUS dari `landing-page-v2`

### 1. Halaman Dashboard (Folder dalam `app/`)

```
landing-page-v2/app/
├── general/              ❌ HAPUS
├── automations/          ❌ HAPUS
├── accounts/             ❌ HAPUS
├── campaigns/            ❌ HAPUS
├── dashboard/            ❌ HAPUS (kecuali payment-status jika diperlukan)
├── rekam-medic/          ❌ HAPUS
├── settings/             ❌ HAPUS
├── subscription/         ❌ HAPUS
├── tutorial/             ❌ HAPUS
├── logs/                 ❌ HAPUS
├── rules/                ❌ HAPUS
│
├── auth/                 ✅ PERTAHANKAN
├── api/                  ⚠️ CEK (hanya pertahankan yang diperlukan)
├── page.tsx              ✅ PERTAHANKAN (Homepage)
├── layout.tsx            ✅ PERTAHANKAN
└── globals.css           ✅ PERTAHANKAN
```

### 2. Components yang Tidak Diperlukan

```
landing-page-v2/components/
├── dashboard-layout.tsx            ❌ HAPUS
├── general-overview-page.tsx       ❌ HAPUS
├── accounts-page.tsx               ❌ HAPUS
├── automations-page.tsx            ❌ HAPUS
├── campaign-management-page.tsx    ❌ HAPUS
├── rekam-medic-page.tsx            ❌ HAPUS
├── rekam-medic-*.tsx               ❌ HAPUS (semua rekam-medic)
├── settings-page.tsx               ❌ HAPUS
├── subscription-page.tsx           ❌ HAPUS
├── tutorial-page.tsx               ❌ HAPUS
├── multi-step-rule-modal.tsx       ❌ HAPUS
├── rule-*.tsx                      ❌ HAPUS (semua rule components)
├── automated-rules-page.tsx        ❌ HAPUS
├── automation-engine-status.tsx    ❌ HAPUS
├── campaign-hierarchy.tsx          ❌ HAPUS
├── campaign-metrics.tsx            ❌ HAPUS
├── condition-builder.tsx           ❌ HAPUS
├── log-detail-modal.tsx            ❌ HAPUS
├── multi-account-selector.tsx      ❌ HAPUS
├── account-multi-select.tsx        ❌ HAPUS
├── account-table.tsx               ❌ HAPUS
├── editable-budget.tsx             ❌ HAPUS
├── invoice-template.tsx            ❌ HAPUS
├── action-*.tsx                    ❌ HAPUS
│
├── ProtectedRoute.tsx              ⚠️ CEK jika dipakai di auth
├── particle-background.tsx         ✅ PERTAHANKAN (untuk login page)
├── PixelTracker.tsx                ✅ PERTAHANKAN (untuk tracking)
├── global-banner.tsx               ⚠️ CEK
├── date-range-picker.tsx           ⚠️ CEK
├── change-password-dialog.tsx      ⚠️ CEK
├── page-breadcrumb.tsx             ⚠️ CEK
├── theme-provider.tsx              ✅ PERTAHANKAN
├── top-loading-bar.tsx             ✅ PERTAHANKAN
└── ui/                             ✅ PERTAHANKAN (shadcn components)
```

### 3. Contexts yang Perlu Disederhanakan

```
landing-page-v2/contexts/
├── AuthContext.tsx            ✅ PERTAHANKAN (sudah dimodifikasi untuk redirect)
├── CookiesHealthContext.tsx   ❌ HAPUS (tidak diperlukan di Landing Page)
├── SubscriptionContext.tsx    ⚠️ CEK (mungkin perlu untuk checkout)
```

---

## 🔧 Langkah-Langkah Pembersihan

### Phase 1: Backup
```bash
# Backup folder sebelum hapus
cp -r landing-page-v2 landing-page-v2-backup-$(date +%Y%m%d)
```

### Phase 2: Hapus Folder Halaman
```bash
cd landing-page-v2/app

# Hapus folder dashboard
rm -rf general
rm -rf automations
rm -rf accounts
rm -rf campaigns
rm -rf rekam-medic
rm -rf settings
rm -rf subscription
rm -rf tutorial
rm -rf logs
rm -rf rules

# Cek dashboard folder
ls dashboard/  # Jika hanya payment-status, pertahankan
```

### Phase 3: Hapus Components
```bash
cd landing-page-v2/components

# Hapus dashboard components satu per satu
rm dashboard-layout.tsx
rm general-overview-page.tsx
rm accounts-page.tsx
# ... (lanjutkan sesuai list di atas)
```

### Phase 4: Fix Import Errors
```bash
cd landing-page-v2
npm run build
# Lihat error, fix satu per satu
```

### Phase 5: Test
1. Buka `adspilot.id` → Homepage harus tampil
2. Buka `adspilot.id/auth/login` → Login page harus tampil
3. Login → Harus redirect ke `app.adspilot.id/general`
4. Buka `adspilot.id/auth/checkout?plan=1-month` → Checkout harus tampil
5. Register user baru → Payment confirmation harus tampil

### Phase 6: Deploy
```bash
git add .
git commit -m "Cleanup: Remove duplicate dashboard pages from landing-page-v2"
git push origin main

# Deploy
ssh root@154.19.37.198 "cd ~/adspilot && git pull && cd landing-page-v2 && npm run build && pm2 restart 13"
```

---

## ⚠️ Potensi Masalah & Solusi

### 1. Import Error setelah hapus component
**Masalah:** File lain meng-import component yang dihapus  
**Solusi:** Cek dengan `grep -r "import.*ComponentName" .` dan hapus/update import

### 2. Layout Error
**Masalah:** `layout.tsx` mungkin import `dashboard-layout`  
**Solusi:** Buat layout sederhana khusus untuk auth pages

### 3. Context Error
**Masalah:** Pages yang tersisa mungkin pakai context yang dihapus  
**Solusi:** Cek setiap page apakah pakai context, update sesuai kebutuhan

---

## 📊 Estimasi Ukuran Sebelum/Sesudah

| Metric | Sebelum | Sesudah (Estimasi) |
|--------|---------|-------------------|
| Total Files | ~150+ | ~30 |
| Build Size | ~5MB+ | ~1MB |
| Build Time | ~2 min | ~30 sec |
| Components | 45+ | ~10 |

---

## ✅ Checklist Setelah Pembersihan

- [ ] Homepage (`/`) tampil dengan benar
- [ ] Login page (`/auth/login`) berfungsi
- [ ] Login berhasil redirect ke User Portal
- [ ] Register page (`/auth/register`) berfungsi
- [ ] Checkout page (`/auth/checkout`) berfungsi
- [ ] Payment confirmation berfungsi
- [ ] Forgot/Reset password berfungsi
- [ ] Tidak ada console errors
- [ ] Build berhasil tanpa error
- [ ] Deploy ke production berhasil

---

## 📞 Kontak

Jika ada pertanyaan tentang pembersihan ini, hubungi developer yang membuat dokumentasi ini.

---

*Dokumentasi ini dibuat sebagai referensi untuk pembersihan technical debt pada proyek AdsPilot.*
