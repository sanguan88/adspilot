# 🚀 Future Feature Roadmap: Shopee ROAS-Centric Automation

Dokumen ini berisi rencana fitur masa depan untuk AdsPilot, yang disesuaikan dengan mekanisme algoritma iklan Shopee (GMV Max & ROAS-based optimization).

---

## 🧠 Core Philosophy: "ROAS is King"
Berbeda dengan Google Ads lama yang fokus pada *Keyword Bidding*, Shopee Ads modern (terutama GMV Max dan Broad Match) sangat bergantung pada **Target ROAS**. Sistem harus mendukung strategi ini, bukan melawannya.

## 🌟 Top 5 Future Features (Priority)

### 1. 🎚️ Dynamic ROAS Tuner (Auto-Optimisasi Target)
Daripada mengubah Bid (harga per klik), kita mengubah **Target ROAS** untuk memberi sinyal pada algoritma Shopee.
*   **Logic:**
    *   *Jika Spending Rendah (Iklan tidak jalan):* **Turunkan Target ROAS** (misal dari 5x ke 3x) agar algoritma lebih agresif mencari traffic.
    *   *Jika Spending Tinggi tapi Boncos:* **Naikkan Target ROAS** (misal dari 2x ke 4x) agar algoritma lebih selektif mencari pembeli.
*   **Action Plan:** Menambahkan action type baru `adjust_target_roas`.

### 2. 🛡️ "Learning Phase" Guard (Perlindungan Fase Belajar)
Algoritma Shopee butuh waktu 7-14 hari untuk "belajar". Automation yang terlalu agresif di awal bisa merusak proses ini.
*   **Logic:** Bypass/Skip rule otomatis jika umur campaign < 7 hari.
*   **Implementasi:** Tambahkan pengecekan `campaign_start_date` sebelum mengeksekusi rule.
*   **User Benefit:** Mencegah user "mematikan" iklan yang sebenarnya sedang dalam proses belajar menjadi winning campaign.

### 3. 📅 Peak Day "Hyper Mode" (Tanggal Kembar & Gajian)
Saat 9.9, 12.12, atau Payday, perilaku market berubah total. Rule harian biasa tidak relevan.
*   **Fitur:** Tombol **"Activate Hyper Mode"** yang akan:
    1.  Menurunkan Target ROAS (Rela profit tipis demi Volume).
    2.  Menaikkan Budget Harian secara signifikan (Unlimited atau +200%).
    3.  Mematikan Rule "Anti Boncos" yang terlalu ketat.
*   **Scheduling:** Otomatis aktif di tanggal-tanggal yang dipilih user.

### 4. 📦 Inventory-Aware Protection
Mencegah membuang uang iklan untuk produk yang stoknya menipis.
*   **Logic:**
    *   Jika `Stok Produk` < 3 -> **Pause Ads** otomatis.
    *   Jika `Stok Produk` > 10 -> **Resume Ads**.
*   **Kenapa:** Shopee otomatis menyembunyikan produk habis, tapi kadang iklan masih jalan/terkena charge jika stok tinggal 1-2 (low conversion rate).

### 5. 🧟 Zombie Campaign Killer (ROAS Edition)
Mendeteksi campaign yang "hidup segan mati tak mau".
*   **Logic:**
    *   Jika selama 7 hari berturut-turut:
        *   Spending > Rp 50.000
        *   ROAS < 1.0 (Rugi)
    *   **Action:** Masukkan ke daftar "Review" atau otomatis Stop/Archive.

---

## 🔮 Advanced Concepts (AI & Data)

### 6. 🌤️ "Weather Forecast" (Market Trend)
Menggunakan data eksternal (Trend Pasar) untuk memberi saran.
*   *"Trend kategori Fashion sedang naik +20% minggu ini. Disarankan menaikkan budget."*

### 7. 🧪 Smart Budget Allocation
Memindahkan budget dari campaign yang jelek ke campaign yang bagus secara otomatis (Cross-Campaign Optimization).
*   *Campaign A (ROAS 8x) kehabisan budget.*
*   *Campaign B (ROAS 2x) masih sisa budget.*
*   **Action:** Ambil budget B, pindahkan ke A.

---

## 📝 Referensi & Riset
*   **Shopee "GMV Max":** Menggunakan machine learning untuk memprediksi konversi. Manipulasi Bid manual seringkali mengganggu prediksi ini.
*   **Best Practice:** Kontrol utama advertiser adalah di **Budget** dan **Target ROAS**, bukan lagi di Keyword Bid perintilan.
