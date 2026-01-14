# Dokumentasi Workflow Automation Engine - AdsPilot

Dokumen ini menjelaskan arsitektur dan alur kerja sistem automasi iklan (Automation Engine) pada project AdsPilot, termasuk optimasi keamanan (anti-spam) dan performa skala besar.

## 1. Arsitektur Eksekusi

Sistem automasi dijalankan oleh sebuah **Worker Service** yang bekerja secara independen dari dashboard web. Arsitektur ini menggunakan model **Parallel Execution with Staggered Delays**.

### Hierarki Eksekusi:
- **Level User/Rule (Parallel)**: 100+ User dapat menjalankan rule mereka secara bersamaan. Server tidak mengantrekan satu user setelah user lain selesai (Non-blocking).
- **Level Akun/Toko (Parallel)**: Dalam satu rule, jika user memiliki banyak toko, semua toko tersebut akan diproses secara paralel.
- **Level Iklan/Campaign (Staggered)**: Di dalam satu akun/toko, iklan diproses secara **berurutan dengan jeda**.

---

## 2. Fitur Keamanan Anti-Spam (Staggered Delay)

Untuk menghindari deteksi bot oleh Shopee, sistem meniru perilaku manusia dengan tidak mengirimkan banyak perintah sekaligus dalam satu akun.

- **Jeda Acak (Randomized Delay)**: Antara eksekusi iklan satu ke iklan berikutnya dalam satu toko, sistem akan "tidur" selama **20 hingga 40 detik**.
- **Scope**: Jeda ini hanya berlaku per-akun. Akun yang berbeda tetap bisa berjalan bersamaan tanpa saling menunggu.
- **Metode**: Menggunakan fungsi `sleep` non-blocking agar CPU server tidak terbebani saat proses sedang menunggu.

---

## 3. Logika Aktivasi (Instant Start)

Sistem memiliki intelegensi untuk membedakan kapan sebuah rule harus segera berjalan atau menunggu jadwal:

- **Rule Continuous (24/7) / Interval**: Saat tombol di dashboard diubah menjadi **ON**, sistem akan langsung memicu eksekusi pertama di detik itu juga (Detik ke-1).
- **Rule Terjadwal (Specific Schedule)**: Jika rule diatur untuk jam 8 malam, namun di-ON-kan pada jam 2 siang, sistem **tidak akan** melakukan eksekusi instan. Sistem tetap akan patuh pada jadwal jam 8 malam.

---

## 4. Skalabilitas & Beban Server

Desain ini dioptimalkan untuk menangani ratusan hingga ribuan user secara bersamaan di VPS:

- **Beban CPU**: Sangat rendah karena proses didominasi oleh waktu tunggu (IDLE) yang ditangani secara asinkron oleh Node.js.
- **Efisiensi RAM**: Tiap proses yang berjalan paralel sangat ringan (lightweight), hanya menyimpan status antrean yang minimal.
- **Koneksi Database**: Sistem menggunakan *Connection Pooling*. Koneksi database langsung dilepas (released) sesaat setelah rule dibaca, bahkan saat proses iklan masih berjalan dengan delay. Ini mencegah error "Too many connections".

---

## 5. Panduan VPS (Deployment)

Karena eksekusi bisa memakan waktu lama (misal 10 menit untuk 20 iklan), berikut panduan teknis untuk VPS:

1. **Process Manager (PM2)**: Wajib menggunakan PM2 (`pm2 start ecosystem.config.js`) untuk menjaga agar worker tetap berjalan di background secara abadi.
2. **Timezone**: Pastikan timezone server VPS disetel ke `Asia/Jakarta` agar sinkron dengan jadwal yang dibuat user di dashboard.
3. **Memory**: Untuk 100-500 user aktif bersamaan, RAM minimal 2GB sudah sangat mencukupi.

---
*Terakhir diperbarui: 10 Januari 2026*
