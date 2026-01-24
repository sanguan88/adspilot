# Dokumentasi Sistem Tracking Affiliate
Terakhir Diperbarui: 2026-01-12

## Ringkasan
AdsPilot menggunakan **Sistem Tracking Dual-Layer** yang tangguh, dirancang agar adil bagi affiliate sekaligus memaksimalkan efisiensi pemasaran. Sistem ini memisahkan **Atribusi Komisi** (Internal) dari **Tracking Platform Iklan** (Eksternal).

## 1. Arsitektur Dual-Layer

| Layer | Tipe | Mekanisme | Tujuan | Logika |
| :--- | :--- | :--- | :--- | :--- |
| **Layer 1** | **Atribusi Komisi** | Cookie Browser (`referral_code`) | Menentukan siapa yang mendapatkan komisi saat pengguna mendaftar. | **First-Click Wins** (Memprioritaskan pengenal pertama). |
| **Layer 2** | **Tracking Pixel Iklan** | Pixel Facebook/TikTok/Google | Mengirim data ke platform iklan untuk optimasi & retargeting. | **Always Fire** (Memprioritaskan kesegaran data untuk pengiklan saat ini). |

---

## 2. Detail Logika

### Layer 1: Atribusi Komisi (Cookie)
**Aturan: "First-Click Wins" (Siapa Cepat Dia Dapat)**
*   **Skenario**: User A klik link Affiliate Budi (`?ref=BUDI`).
    *   **Aksi**: Sistem mengecek apakah cookie `referral_code` sudah ada.
    *   **Hasil**: Cookie `referral_code=BUDI` diset selama **90 hari**. Budi "mengunci" user ini.
*   **Skenario**: User A (besoknya) klik link Affiliate Siti (`?ref=SITI`).
    *   **Aksi**: Sistem mengecek cookie. Menemukan bahwa `referral_code=BUDI` sudah ada.
    *   **Hasil**: Cookie **TIDAK** ditimpa. Tetap `BUDI`.
    *   **Alasan**: Kami menghargai affiliate yang *pertama kali* memperkenalkan platform kepada pengguna. Ini mencegah "cookie stuffing" atau pembajakan link di menit terakhir.

### Layer 2: Tracking Pixel Iklan (Pixels)
**Aturan: "Always Fire" (Selalu Menyala)**
*   **Skenario**: User A klik link Affiliate Budi (`?ref=BUDI`).
    *   **Aksi**: Landing page memuat Pixel yang dikonfigurasi Budi (FB/TikTok/Google).
    *   **Event**: `PageView` ditembakkan ke akun iklan Budi.
*   **Skenario**: User A (besoknya) klik link Affiliate Siti (`?ref=SITI`).
    *   **Aksi**: Landing page melihat `ref=SITI` di URL.
    *   **Hasil**: Sistem memuat **Pixel milik Siti**.
    *   **Event**: `PageView` ditembakkan ke akun iklan Siti.
    *   **Manfaat**: Siti mendapatkan data berharga bahwa iklannya diklik dan landing page dilihat (berguna untuk Retargeting atau Custom Audiences), meskipun dia mungkin tidak mendapatkan komisi jika user mendaftar (karena Budi sudah menguncinya duluan). Ini memastikan budget iklan Siti tidak "buta".

---

## 3. Link Campaign Custom (Deteksi Pintar)
Sistem mendukung akhiran (suffix) kustom untuk tracking yang lebih detail tanpa merusak fungsionalitas.

*   **Format**: `KODE_VARIASI` (contoh: `BUDI_IG`, `BUDI_WA`, `BUDI_TIKTOK`).
*   **Logika**:
    1.  Sistem mendeteksi tanda `_` di kode ref.
    2.  Sistem memotong suffix untuk mendapatkan kode dasar (`BUDI`).
    3.  Sistem menggunakan kode dasar (`BUDI`) untuk mencari ID Pixel di database.
    4.  **Hasil**: Pixel menyala dengan benar untuk `BUDI`, sementara cookie menyimpan `BUDI_IG` secara utuh (berguna bagi Budi untuk melihat link spesifik mana yang performanya paling bagus di laporan).

---

## 4. Ringkasan Implementasi

### Frontend (Landing Page)
*   **`page.tsx`**: Menangani logika Cookie. Hanya menset cookie jika `document.cookie` belum memiliki `referral_code`.
*   **`PixelTracker.tsx`**: Menangani logika Pixel. Selalu mengambil dan memuat pixel berdasarkan URL `searchParams.get('ref')` saat ini.

### Backend (Affiliate API)
*   **`/api/tracking/pixels`**: 
    *   Menerima `code` dari frontend.
    *   Memisahkan berdasarkan `_` untuk menemukan pemiliknya.
    *   Mengembalikan daftar Pixel ID aktif untuk pemilik tersebut.

---

## 5. Keamanan & Validitas
*   **Durasi Cookie**: 90 Hari.
*   **Keamanan Cookie**: `SameSite=Strict` (mencegah CSRF).
*   **Validasi**: Backend registrasi user mengecek nilai cookie terhadap affiliate aktif yang valid sebelum memberikan komisi.
