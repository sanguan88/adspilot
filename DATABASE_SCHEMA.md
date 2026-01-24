# Dokumentasi Skema Database AdsPilot

Dokumen ini menjelaskan struktur database yang digunakan oleh ekosistem aplikasi AdsPilot, mencakup portal Admin (`adm`), Affiliate (`aff`), App (`app`), dan Landing Page (`landing-page`).

## Teknologi
- **Database Engine**: PostgreSQL (diakses menggunakan driver `pg` pada aplikasi)
- **Host**: `154.19.37.198` (Configured port 3306 in some scripts)
- **Database Name**: `soroboti_ads`

---

## 1. Core & User Management (App & Global)
Tabel-tabel ini menyimpan data inti pengguna dan otentikasi.

### `data_user`
Menyimpan data pengguna aplikasi utama.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `no` | SERIAL (PK) | Auto-increment ID |
| `user_id` | UUID | ID unik user sistem |
| `username` | VARCHAR | Username login |
| `email` | VARCHAR | Email pengguna (Unique) |
| `password` | VARCHAR | Hash password |
| `nama_lengkap` | VARCHAR | Nama lengkap |
| `no_whatsapp` | VARCHAR | Nomor WhatsApp |
| `role` | VARCHAR | Role user (e.g., 'user', 'superadmin') |
| `status_user` | VARCHAR | Status akun (e.g., 'aktif', 'pending_payment') |
| `referred_by_affiliate` | VARCHAR(50) | ID Affiliate yang mereferensikan |
| `referral_date` | TIMESTAMP | Tanggal referral tercatat |
| `chatid_tele` | VARCHAR | ID Telegram untuk notifikasi |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `update_at` | TIMESTAMP | Waktu update terakhir |

### `data_toko`
Menyimpan data toko (akun Shopee) yang terhubung ke user.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id_toko` | VARCHAR (PK) | ID Toko / Username Shopee |
| `nama_toko` | VARCHAR | Nama Toko |
| `email_toko` | VARCHAR | Email Toko |
| `user_id` | VARCHAR | ID User pemilik toko |
| `cookies` | TEXT | Shopee Cookies |
| `status_toko` | VARCHAR | Status toko (active/deleted) |
| `status_cookies` | VARCHAR | Status validitas cookies (aktif/expire) |
| `created_at` | TIMESTAMP | Waktu pembuatan |
| `update_at` | TIMESTAMP | Waktu update terakhir |

### `user_limits_override`
Konfigurasi batas penggunaan khusus per user (Admin Portal).
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `user_id` | VARCHAR(100) | ID User (Unique) |
| `max_accounts` | INTEGER | Override batas jumlah akun |
| `max_automation_rules`| INTEGER | Override batas automation rules |
| `max_campaigns` | INTEGER | Override batas campaign |

---

## 2. Billing & Subscriptions (App & Landing Page)
Menangani paket berlangganan, transaksi, dan voucher.

### `subscription_plans`
Definisi paket berlangganan.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `plan_id` | VARCHAR(50) | ID Unik Plan (e.g., 'basic_monthly') |
| `plan_name` | VARCHAR(100)| Nama tampilan paket |
| `price` | DECIMAL | Harga paket |
| `billing_cycle` | VARCHAR(20)| Siklus tagihan (monthly/yearly) |
| `features` | TEXT[] | List fitur paket |
| `is_active` | BOOLEAN | Status aktif paket |

### `subscriptions`
Data langganan user aktif/history.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `user_id` | VARCHAR(50) | ID User pemilik |
| `plan_id` | INTEGER | FK ke `subscription_plans` |
| `status` | VARCHAR(20) | Status (active, expired, cancelled) |
| `start_date` | TIMESTAMP | Tanggal mulai |
| `end_date` | TIMESTAMP | Tanggal berakhir |
| `auto_renew` | BOOLEAN | Opsi perpanjangan otomatis |

### `transactions`
Mencatat riwayat pembayaran.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `transaction_id` | VARCHAR | ID Transaksi unik (TXN-...) |
| `user_id` | VARCHAR | FK ke `data_user` |
| `plan_id` | VARCHAR | Plan yang dibeli |
| `total_amount` | DECIMAL | Total bayar (termasuk PPN+Unik) |
| `payment_status` | VARCHAR | Status pembayaran (pending, success) |
| `voucher_code` | VARCHAR | Kode voucher yang digunakan |
| `created_at` | TIMESTAMP | Waktu transaksi |

### `trial_usage_history`
Mencatat riwayat penggunaan free trial per toko.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `shop_id` | VARCHAR(50) | ID Toko |
| `plan_id` | VARCHAR(50) | Plan ID trial |
| `trial_started_at` | TIMESTAMP | Waktu mulai trial |
| `status` | VARCHAR(20) | Status trial |
| `unique_constraint` | (shop_id, plan_id) | 1 Trial per toko per plan |

### `vouchers`
Data kode diskon/voucher.
- Kolom: `id`, `code`, `discount_type` (fixed/percent), `discount_value`, `is_active`, `expiry_date`, `applicable_plans`, `minimum_purchase`, `maximum_discount`.

### `voucher_usage`
Log penggunaan voucher oleh user.
- Kolom: `voucher_id`, `transaction_id`, `user_id`, `discount_amount`, `used_at`.

---

## 3. Affiliate System (Aff Portal)
Sistem afiliasi untuk tracking referral dan komisi.

### `affiliates`
Data partner afiliasi.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `affiliate_id` | VARCHAR(50) (PK) | ID Unik Affiliate |
| `affiliate_code` | VARCHAR(50) | Kode Referral (Unique) |
| `email` | VARCHAR | Email login affiliate |
| `commission_rate` | DECIMAL | Persentase komisi default |
| `status` | VARCHAR | Status akun (active/suspended) |
| `bank_details` | VARIOUS | Informasi rekening bank |

### `affiliate_referrals`
Mencatat user yang mendaftar lewat link affiliate.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `referral_id` | SERIAL (PK) | Primary Key |
| `affiliate_id` | VARCHAR(50)| FK ke `affiliates` |
| `user_id` | VARCHAR(50) | FK ke `data_user` |
| `referral_code` | VARCHAR | Kode yang digunakan |
| `status` | VARCHAR | Status konversi |
| `signup_date` | TIMESTAMP | Waktu pendaftaran |

### `affiliate_commissions`
Perhitungan komisi dari transaksi user referral.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `commission_id` | SERIAL (PK) | Primary Key |
| `affiliate_id` | VARCHAR(50)| FK ke `affiliates` |
| `amount` | DECIMAL | Jumlah komisi |
| `transaction_id` | VARCHAR | ID Transaksi sumber |
| `status` | VARCHAR | Status (pending, paid) |
| `type` | VARCHAR | Tipe (first_payment, recurring) |

### `affiliate_clicks`
Log klik pada link referral.
- Kolom: `click_id`, `affiliate_id`, `ip_address`, `referrer_url`, `created_at`.

### `affiliate_pixels` & `affiliate_pixel_logs`
Manajemen pixel tracking (FB/TikTok/Google) untuk affiliate.
- `affiliate_pixels`: Menyimpan ID pixel per platform per affiliate.
- `affiliate_pixel_logs`: Log event pixel yang ditembakkan (server-side tracking).

---

## 4. Admin & System Management (Adm Portal)

### `system_settings`
Konfigurasi global aplikasi (dynamic settings).
- Kolom: `setting_key` (Unique), `setting_value`, `category`, `description`.

### `audit_logs`
Log aktivitas admin untuk keamanan dan audit.
- Kolom: `user_id`, `action` (e.g. user.create), `resource_type`, `old_values`, `new_values`, `ip_address`.

### `admin_impersonations`
Log saat admin melakukan "Login As User" (Impersonate).
- Kolom: `admin_id`, `affiliate_id` (target), `reason`, `started_at`, `ended_at`.

---

## 5. Tutorials & Education (Adm & App)
Sistem manajemen konten tutorial.

### `tutorials`
Header konten tutorial.
| Kolom | Tipe Data | Deskripsi |
|-------|-----------|-----------|
| `id` | SERIAL (PK) | Primary Key |
| `slug` | VARCHAR | URL slug unik |
| `title` | VARCHAR | Judul tutorial |
| `type` | VARCHAR | Tipe (video/article) |
| `category` | VARCHAR | Kategori |
| `is_published` | BOOLEAN | Status publikasi |

### Tabel Pendukung Tutorial:
- `tutorial_sections`: Bagian-bagian konten (text/image) untuk artikel.
- `tutorial_tips`: Blok tips dalam tutorial.
- `tutorial_warnings`: Blok peringatan/warning.
- `tutorial_faqs`: FAQ spesifik per tutorial.
- `tutorial_related`: Relasi ke tutorial lain (rekomendasi).

---

## 6. Analytics & Reporting
### `report_aggregate`
Tabel denormalisasi/cache untuk menyimpan data performa iklan harian yang diambil dari API Shopee. Digunakan untuk mempercepat loading dashboard tanpa perlu request berulang ke Shopee API.
- Kolom mencakup metrik iklan: `gmv`, `cost`, `impression`, `click`, `ctr`, `roas`, dll.
- Di-update secara berkala atau on-demand saat user mengakses dashboard.
