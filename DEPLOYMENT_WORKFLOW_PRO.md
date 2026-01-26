# 🚀 PRO DEPLOYMENT WORKFLOW (aka "Big Boys Style")

Dokumen ini adalah panduan standar operasional untuk melakukan update, bug fixing, dan deployment aplikasi AdsPilot menggunakan metode **Git Flow**. Metode ini menjamin keamanan, kecepatan, dan profesionalisme dalam pengembangan software.

## 🔄 Konsep Dasar
Jangan pernah mengedit kode langsung di server VPS!
1.  **Local (Laptop):** Tempat eksperimen, perbaikan, dan testing.
2.  **GitHub (Cloud):** Tempat penyimpanan kode yang valid dan aman.
3.  **VPS (Production):** Tempat kode dijalankan untuk user.

---

## 🛠️ TAHAP 1: LOCAL DEVELOPMENT (Di Laptop Boss)

Lakukan ini saat ada bug atau fitur baru yang ingin dibuat.

1.  **Coding & Fixing**
    *   Buka VS Code, edit file yang diperlukan.
    *   Test di local: `npm run dev`.
    *   Pastikan berjalan lancar dan bug hilang.

2.  **Commit & Push (Save ke Cloud)**
    Buka terminal di VS Code lalu jalankan:

    ```bash
    # 1. Cek file apa saja yang berubah
    git status

    # 2. Masukkan semua perubahan ke antrian
    git add .

    # 3. Beri label pada perubahan ini (WAJIB JELAS)
    git commit -m "Fix: perbaikan bug login 503"
    # atau
    git commit -m "Feat: tambah fitur payment gateway"

    # 4. Kirim ke GitHub
    git push origin main
    ```

    *Kalau sukses, kode Boss sekarang aman di GitHub!*

---

## 🚀 TAHAP 2: DEPLOY TO SERVER (Di VPS)

Lakukan ini agar perubahan di GitHub live di website `adspilot.id`.

1.  **Login ke Server**
    ```bash
    ssh root@154.19.37.198
    ```

2.  **Masuk ke Folder Project**
    ```bash
    cd ~/adspilot
    ```

3.  **Tarik Update dari GitHub (PULL)**
    Ini akan mendownload perubahan terbaru saja.
    ```bash
    git pull origin main
    ```

    *Catatan: Jika diminta username/password GitHub, atau ada konflik file, hubungi assistan AI.*

4.  **Install Library Baru (JIKA PERLU)**
    Hanya lakukan ini jika Boss menambah library baru di `package.json`.
    ```bash
    # Misal untuk folder app
    cd app && npm install
    ```

5.  **Build Ulang (JIKA PERLU)**
    Jika perubahan melibatkan Frontend/UI, wajib build ulang. Kalau cuma backend API, kadang tidak perlu tapi lebih aman build saja.
    ```bash
    # Contoh build ulang Landing Page
    cd landing-page-v2 && npm run build

    # Contoh build ulang User App
    cd app && npm run build
    ```

6.  **Restart PM2 (Finishing)**
    Agar perubahan aktif.
    ```bash
    # Restart spesifik service
    pm2 restart app-landing 
    # atau restart semua (paling gampang)
    pm2 restart all
    ```

---

## ⚡ CHEAT SHEET (Cara Cepat)

**Di Laptop:**
```bash
git add .
git commit -m "update fitur X"
git push origin main
```

**Di Server:**
```bash
cd ~/adspilot
git pull
# (Optional: npm run build di folder terkait)
pm2 restart all
```

---
## DB postgress port
DB postgress port 3306 (custom)

---
## 🛡️ SAFETY TIPS
*   **Selalu pull dulu sebelum push:** Jika ada developer lain (atau Boss edit di tempat lain), biasakan `git pull` di laptop sebelum mulai coding biar codingan Boss update.
*   **Cek ssh server:** `pm2 logs` adalah teman terbaik untuk melihat error di server.
*   **Rollback:** Jika habis deploy malah error, kita bisa undo pake git (tanya AI caranya kalau kejadian).

**Happy Coding, Big Boss!** 🕶️
