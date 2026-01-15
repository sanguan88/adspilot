# MONITORING & HEALTH CHECK STATUS

**Last Updated:** 15 Januari 2026
**Status:** Partial Implementation (Stability Focus)

Dokumen ini menjelaskan status implementasi fitur monitoring di Admin Portal (`adm.adspilot.id`). Beberapa metrik sudah **REAL-TIME** (terkoneksi database), sementara beberapa masih **MOCKED/STATIC** (hardcoded) demi menjaga performa server utama di fase awal deployment.

---

## 1. 🏥 Application Health (`/health`)

| Component | Status | Source | Description |
|-----------|--------|--------|-------------|
| **Database** | ✅ **REAL** | `SELECT 1` | Mengecek koneksi aktif ke PostgreSQL. Jika DB down, status akan merah. |
| **Main App** | ⚠️ **INFERRED** | Logic Check | Diasumsikan "Healthy" jika koneksi database lancar (belum cek PM2 process ID). |
| **Worker** | ⚠️ **INFERRED** | Logic Check | Diasumsikan "Healthy" jika koneksi database lancar (belum cek Worker process). |
| **Metrics** | ❌ **EMPTY** | Static | CPU, RAM, & Disk Usage di-hardcode `0%` untuk menghindari overhead monitoring. |

---

## 2. 📊 Usage & Monitoring (`/usage`)

| Metric Category | Metric Name | Status | Source |
|-----------------|-------------|--------|--------|
| **User Stats** | Total Users | ✅ **REAL** | `COUNT(*) FROM data_user` |
| | Active Users | ✅ **REAL** | `status_user = 'aktif'` |
| | Active (30d) | ✅ **REAL** | `last_login >= NOW() - 30 days` |
| **Business Data** | Total Accounts | ✅ **REAL** | `COUNT(*) FROM data_toko` |
| | Total Campaigns | ✅ **REAL** | `COUNT(*) FROM data_produk` |
| | Active Rules | ✅ **REAL** | `COUNT(*) FROM data_rules` |
| **System** | DB Size | ✅ **REAL** | `pg_size_pretty(pg_database_size())` |
| | API Calls | ❌ **MOCKED** | Hardcoded `0` (Memerlukan Redis/Logging service untuk tracking real). |
| **Resources** | CPU/RAM | ❌ **MOCKED** | Hardcoded `0%` di UI. |

---

## 📝 Recommendation for Future Update

Untuk mengaktifkan monitoring **REAL-TIME** penuh (CPU, RAM, PM2 Status), diperlukan langkah berikut:
1.  **Install Library:** `node-os-utils` dan `pm2` programmatic API.
2.  **Enable System Access:** Memastikan user linux yang menjalankan aplikasi memiliki izin baca sistem metrics.
3.  **Performace Impact:** Mempertimbangkan caching (misal: Redis) agar monitoring tidak membebani CPU server utama.

**Keputusan Saat Ini:**
Fokus pada **Stabilitas Aplikasi Utama** (Automation & User Dashboard). Fitur monitoring dibiarkan "semi-real" karena sudah cukup untuk mendeteksi masalah fatal (Database Down).
