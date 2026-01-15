# 🤖 Automation Rule Logic & Guide

Dokumentasi ini menjelaskan cara kerja sistem **Automation Rule** di AdsPilot, logika pengambilan data, metrik yang tersedia, serta contoh penggunaan untuk strategi iklan Shopee.

---

## 🧠 Core Logic: Bagaimana Sistem Bekerja?

### 1. Lingkup Data (Data Scope)
Hal paling penting untuk dipahami adalah sistem menggunakan **Data Harian (Real-time Today)**.

*   **Periode Data:** Pukul 00:00:00 hari ini s/d detik ini (Current Time).
*   **Reset:** Data kembali ke 0 setiap pergantian hari (00:00 tengah malam).
*   **Tidak Akumulatif:** Sistem tidak melihat data kemarin, 7 hari lalu, atau bulan lalu. Keputusan murni berdasarkan performa hari ini.

### 2. Frekuensi Pengecekan
Worker berjalan secara periodik (tergantung konfigurasi, biasanya setiap 5-15 menit) untuk memeriksa apakah kondisi rule terpenuhi.

### 3. Alur Eksekusi
1.  **Fetch Data:** Worker mengambil data performa terbaru dari Shopee API (Live Data).
2.  **Evaluasi:** Sistem membandingkan data tersebut dengan semua **Conditions** yang Anda buat.
3.  **Eksekusi:** Jika (dan HANYA jika) **SEMUA** kondisi dalam satu grup terpenuhi (Logic AND), maka **Actions** akan dijalankan.

---

## 📏 Komponen Rule

### A. Metrik (Metrics)
Data yang bisa dijadikan parameter kondisi:

| Metrik | Kode Sistem | Penjelasan |
| :--- | :--- | :--- |
| **Biaya (Cost)** | `cost` | Total pengeluaran iklan hari ini (Rp). |
| **Omzet (GMV)** | `broad_gmv` | Gross Merchandise Value (pendapatan kotor) iklan. |
| **Pesanan (Orders)** | `broad_order` | Jumlah pesanan yang dihasilkan iklan. |
| **ROI** | `broad_roi` | Return on Investment (Omzet / Biaya). |
| **Dilihat (Views)** | `view` / `impression` | Berapa kali iklan tampil. |
| **Klik (Clicks)** | `click` | Jumlah klik pada iklan. |
| **CTR** | `ctr` | Click-Through Rate (Klik / Dilihat) dalam persentase. |
| **CPC** | `cpc` | Cost Per Click (Biaya per klik). |
| **Saldo Toko** | `saldo` | Sisa saldo iklan toko saat ini. |
| **Budget Harian** | `daily_budget` | Batas modal harian yang diset di iklan. |

### B. Operator
Cara membandingkan metrik dengan nilai target:

*   **Lebih Besar (`>`)** : Contoh: `Biaya > 50000`
*   **Lebih Kecil (`<`)** : Contoh: `ROI < 2`
*   **Sama Dengan (`=`)** : Contoh: `Budget = 25000`
*   **Lebih Besar Sama Dengan (`>=`)**
*   **Lebih Kecil Sama Dengan (`<=`)**

### C. Aksi (Actions)
Apa yang dilakukan jika kondisi terpenuhi:

1.  **Ubah Status Iklan:**
    *   `Pause` : Menjeda iklan sementara.
    *   `Resume` : Menjalankan kembali iklan.
    *   `Stop` : Menghentikan iklan (selamanya/archive).
2.  **Ubah Budget:**
    *   `Set Budget` : Mengatur budget ke angka tertentu (Rp).
    *   `Increase Budget` : Menambah budget (% atau Rp).
    *   `Decrease Budget` : Mengurangi budget (% atau Rp).
3.  **Notifikasi:**
    *   `Telegram Notify` : Mengirim pesan ke Telegram tanpa mengubah iklan.

---

## 🎯 Contoh Strategi & Resep (Rule Recipes)

Berikut adalah beberapa contoh rule umum yang digunakan oleh Advertiser:

### 1. Resep "Anti Boncos" (Strict)
**Tujuan:** Mematikan iklan yang sudah menghabiskan banyak uang tapi tidak menghasilkan penjualan sama sekali HARI INI.

*   **Kondisi:**
    1.  `Biaya (Cost)` **>** Rp 25.000
    2.  `Pesanan (Orders)` **=** 0
*   **Aksi:**
    *   `Pause Keywords/Ads`
    *   `Notify Telegram` (Pesan: "Iklan dimatikan karena boncos > 25rb tanpa order")

### 2. Resep "ROI Protection"
**Tujuan:** Menjaga agar iklan tidak merugi terlalu dalam. Jika ada penjualan tapi biaya terlalu mahal (ROI rendah).

*   **Kondisi:**
    1.  `Biaya (Cost)` **>** Rp 50.000 (Pastikan data cukup matang)
    2.  `ROI` **<** 3 (Artinya omzet kurang dari 3x biaya)
*   **Aksi:**
    *   `Reduce Budget` **20%**
    *   `Notify Telegram` (Pesan: "Budget dipotong karena ROI rendah hari ini")

### 3. Resep "Scaling Winning Product" (Boost)
**Tujuan:** Menambah bensin (budget) untuk iklan yang performanya sangat bagus hari ini agar tidak kehabisan budget (Limited by Budget).

*   **Kondisi:**
    1.  `ROI` **>** 8 (Profit tebal)
    2.  `Pesanan (Orders)` **>** 5
*   **Aksi:**
    *   `Increase Budget` **50%**
    *   `Notify Telegram` (Pesan: "Winning Product! Budget dinaikkan 50%")

### 4. Resep "Low CTR Warning"
**Tujuan:** Mendeteksi iklan yang tidak menarik (gambar/judul kurang bagus) karena jarang diklik.

*   **Kondisi:**
    1.  `Dilihat (Impression)` **>** 500 (Data sample cukup)
    2.  `CTR` **<** 0.02 (CTR di bawah 2%)
*   **Aksi:**
    *   `Notify Telegram` (Pesan: "Warning! CTR Iklan sangat rendah (<2%), cek gambar produk")
    *   *(Opsional)* `Pause Keywords/Ads`

### 5. Resep "Saldo Darurat"
**Tujuan:** Memberi peringatan jika saldo iklan toko menipis agar iklan tidak berhenti mendadak.

*   **Kondisi:**
    1.  `Saldo (Balance)` **<** Rp 50.000
*   **Aksi:**
    *   `Notify Telegram` (Pesan: "SALDO KRITIS! Segera topup, sisa < 50rb")

---

## ⚠️ Catatan Penting

1.  **Timing is Everything:** Rule "Anti Boncos" sebaiknya dikombinasikan dengan pengecekan waktu (misal: jalankan mulai jam 10 pagi) agar iklan punya kesempatan "bernafas" di pagi hari. *
2.  **Budget Limit:** Saat menggunakan `Increase Budget`, pastikan Anda memantau secara berkala agar budget tidak naik tak terkendali jika kondisi terus terpenuhi (kecuali logic Anda sudah sangat matang).

*) *Fitur penjadwalan waktu (Start Time - End Time) sedang dalam pengembangan di AdsPilot.*
