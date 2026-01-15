# Skenario Sistem Affiliate: Hybrid Model (Dual Entry)
*Dokumen ini disusun berdasarkan diskusi pengembangan fitur Affiliate AdsPilot pada 16 Januari 2026*

## 1. Konsep Utama
AdsPilot menerapkan model **Hybrid (Dual Entry)** untuk pendaftaran affiliate. Model ini mengakomodasi dua jenis target market affiliate yang berbeda:
1.  **User Existing (Subscriber):** Seller Shopee yang sudah menggunakan layanan AdsPilot.
2.  **User Eksternal (Public):** Influencer, Freelancer, atau Digital Marketer yang tidak menggunakan layanan AdsPilot untuk tokonya sendiri.

Tujuannya adalah memaksimalkan akuisisi partner dengan memberikan *user experience* (UX) yang paling sesuai untuk masing-masing segmen.

---

## 2. Detail Skenario

### Skenario A: User Eksternal (Public)
*Ditujukan untuk: Influencer, Blogger, Partner non-seller.*

*   **Pintu Masuk:** Landing Page Affiliate (`aff.adspilot.id` atau sejenis).
*   **Proses Pendaftaran:** Manual Form.
*   **Flow:**
    1.  Mengunjungi halaman registrasi.
    2.  Mengisi form lengkap: Nama, Email, Password, WhatsApp, Username Telegram.
    3.  Submit data.
    4.  Sistem melakukan validasi dan auto-generate kode referral.
    5.  User login ke Dashboard Affiliate dengan kredensial yang baru dibuat.
*   **Karakteristik Akun:** Akun affiliate ini berdiri sendiri (tidak terhubung dengan fitur manajemen iklan/toko).

### Skenario B: User Existing (Subscriber)
*Ditujukan untuk: User AdsPilot yang puas dan ingin merekomendasikan layanan.*

*   **Pintu Masuk:** Dashboard Utama User (`app.adspilot.id/dashboard`).
*   **Proses Pendaftaran:** *One-Click Activation* (Friksi Rendah).
*   **Flow:**
    1.  User melihat menu/banner "Program Affiliate" di dashboard mereka.
    2.  Klik tombol **"Aktifkan Akun Affiliate Saya"**.
    3.  **Backend Process:**
        *   Sistem mengambil data profil user saat ini (Nama, Email, Password Hash).
        *   Menyalin data tersebut ke tabel `affiliates`.
        *   Mengenerate kode referral unik.
    4.  Sistem menampilkan notifikasi sukses.
    5.  Tombol berubah menjadi "Masuk Dashboard Affiliate" (SSO/Link).
*   **Karakteristik Akun:** Data tersinkronisasi satu arah saat inisiasi. Password sama dengan akun utama pada saat aktivasi.

---

## 3. Analisis Plus-Minus Model Hybrid

| Aspek | Keuntungan (Plus) ✅ | Tantangan (Minus) ⚠️ |
| :--- | :--- | :--- |
| **User Experience (UX)** | Memberikan kemudahan maksimal bagi subscriber setia. Tidak perlu isi ulang form data diri. | Perlu edukasi bahwa akun affiliate dan akun toko adalah entitas sistem yang berbeda (bisa beda saldo). |
| **Pertumbuhan (Growth)** | Potensi viralitas tinggi dari *happy users*. Influencer eksternal tetap terfasilitasi. | Membutuhkan strategi marketing yang berbeda untuk dua segmen ini. |
| **Teknis & Data** | Fleksibilitas data. Database terpisah menjaga performa dan keamanan masing-masing sistem. | **Isu Sinkronisasi:** Jika subscriber ganti password di akun toko, password affiliate *tidak* otomatis berubah (kecuali dibangun mekanisme SSO canggih). |
| **Development** | Menggunakan infrastruktur tabel yang sudah ada (`data_user` & `affiliates`). | Memerlukan implementasi API "jembatan" di dashboard user untuk aktivasi affiliate secara remote. |

---

## 4. Gambaran Teknis Singkat

### Struktur Database (Existing)
Sistem menggunakan dua tabel utama yang terpisah:
*   `data_user`: Menyimpan data subscriber AdsPilot.
*   `affiliates`: Menyimpan data partner affiliate.

### Logic "One-Click Activation" (Skenario B)
Untuk mewujudkan Skenario B tanpa merombak struktur database, akan dibuat API Endpoint khusus di Backend Affiliate yang bisa dipanggil oleh Dashboard User.

**Endpoint:** `POST /api/internal/activate-affiliate`
**Payload:** `{ user_id, email, name, password_hash, ... }`
**Logic:**
1.  Cek apakah email sudah ada di tabel `affiliates`.
2.  Jika belum, lakukan `INSERT` dengan data dari payload.
3.  Return `affiliate_code` dan status `success`.

---

## 5. Kesimpulan
Implementasi Model Hybrid direkomendasikan karena menyeimbangkan antara **kemudahan akuisisi user internal** dan **keterbukaan untuk partner eksternal**. Tantangan teknis sinkronisasi data dapat dimitigasi dengan komunikasi yang jelas kepada user bahwa manajemen akun afiliasi bersifat independen setelah aktivasi.
