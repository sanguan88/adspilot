// Tutorial data structure and content
export interface TutorialSection {
    id: string;
    title: string;
    content: string;
    image?: string;
    imageCaption?: string;
}

export interface TutorialArticle {
    slug: string;
    title: string;
    description: string;
    duration: string;
    type: "video" | "article";
    category: string;
    icon: string; // icon name from lucide
    videoUrl?: string;
    coverImage?: string;
    sections: TutorialSection[];
    tips?: string[];
    warnings?: string[];
    faqs?: { question: string; answer: string }[];
    relatedSlugs?: string[];
}

export const tutorials: TutorialArticle[] = [
    {
        slug: "pengenalan-adspilot",
        title: "Pengenalan ADSPILOT",
        description: "Pelajari fitur-fitur utama dan cara kerja ADSPILOT untuk mengoptimalkan iklan Shopee Anda",
        duration: "5 menit",
        type: "video",
        category: "Dasar",
        icon: "BookOpen",
        videoUrl: "https://youtube.com/@adspilot",
        coverImage: "https://placehold.co/1200x400/0d9488/ffffff?text=ADSPILOT+Introduction",
        sections: [
            {
                id: "apa-itu-adspilot",
                title: "Apa itu ADSPILOT?",
                content: `ADSPILOT adalah platform automation untuk iklan Shopee yang membantu seller mengoptimalkan budget iklan secara otomatis berdasarkan performa real-time.

Dengan ADSPILOT, Anda tidak perlu lagi mengecek dan mengubah budget iklan secara manual setiap hari. Sistem kami akan melakukannya untuk Anda berdasarkan aturan yang Anda tentukan.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Dashboard+Overview",
                imageCaption: "Tampilan Dashboard ADSPILOT"
            },
            {
                id: "fitur-utama",
                title: "Fitur Utama",
                content: `ADSPILOT menyediakan berbagai fitur untuk membantu Anda mengelola iklan Shopee:

1. **Automation Rules** - Buat aturan otomatis untuk mengubah budget, bid, atau status iklan
2. **Rekam Medic** - Analisis performa produk menggunakan BCG Matrix
3. **Multi-Store Management** - Kelola banyak toko dalam satu dashboard
4. **Real-time Monitoring** - Pantau performa iklan secara real-time
5. **Activity Logs** - Lihat semua aktivitas automation yang berjalan`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Features+Overview",
                imageCaption: "Fitur-fitur utama ADSPILOT"
            },
            {
                id: "cara-kerja",
                title: "Cara Kerja ADSPILOT",
                content: `ADSPILOT bekerja dengan cara menghubungkan akun Shopee Anda melalui cookies browser. Setelah terhubung, sistem kami dapat:

1. Membaca data performa iklan Anda
2. Mengeksekusi perubahan (budget, bid, status) sesuai aturan
3. Mengirimkan notifikasi ke Telegram Anda

Proses ini berjalan otomatis setiap 30 menit, memastikan iklan Anda selalu dalam kondisi optimal.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=How+It+Works+Diagram",
                imageCaption: "Diagram cara kerja ADSPILOT"
            }
        ],
        tips: [
            "Mulai dengan 1-2 automation rule sederhana sebelum membuat yang kompleks",
            "Gunakan fitur Logs untuk memantau eksekusi automation",
            "Pastikan cookies toko selalu up-to-date untuk menghindari error"
        ],
        faqs: [
            {
                question: "Apakah ADSPILOT aman digunakan?",
                answer: "Ya, ADSPILOT hanya membaca dan mengubah pengaturan iklan. Kami tidak menyimpan data sensitif seperti password."
            },
            {
                question: "Berapa lama proses setup?",
                answer: "Proses setup hanya membutuhkan waktu 5-10 menit. Anda hanya perlu menghubungkan toko dan membuat automation rule pertama."
            }
        ],
        relatedSlugs: ["cara-menghubungkan-toko", "membuat-automation-rule"]
    },
    {
        slug: "cara-menghubungkan-toko",
        title: "Cara Menghubungkan Toko Shopee",
        description: "Panduan lengkap menghubungkan toko Shopee Anda dengan ADSPILOT menggunakan cookies",
        duration: "8 menit",
        type: "video",
        category: "Setup",
        icon: "Store",
        videoUrl: "https://youtube.com/@adspilot",
        coverImage: "https://placehold.co/1200x400/3b82f6/ffffff?text=Connect+Your+Store",
        sections: [
            {
                id: "persiapan",
                title: "Persiapan",
                content: `Sebelum menghubungkan toko, pastikan Anda memiliki:

1. **Akun Shopee Seller** yang aktif
2. **Browser Chrome** (disarankan) atau browser modern lainnya
3. **Extension Cookie Editor** - untuk menyalin cookies

Anda juga harus login ke Shopee Seller Center di browser yang sama.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Prerequisites+Checklist",
                imageCaption: "Checklist persiapan sebelum menghubungkan toko"
            },
            {
                id: "langkah-1-install-extension",
                title: "Langkah 1: Install Cookie Editor Extension",
                content: `Pertama, Anda perlu menginstall extension untuk menyalin cookies dari browser:

1. Buka Chrome Web Store
2. Cari "Cookie Editor" atau "EditThisCookie"
3. Klik "Add to Chrome"
4. Konfirmasi instalasi

Extension ini memungkinkan Anda menyalin cookies dari Shopee untuk digunakan di ADSPILOT.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Install+Cookie+Extension",
                imageCaption: "Instalasi Cookie Editor di Chrome"
            },
            {
                id: "langkah-2-login-shopee",
                title: "Langkah 2: Login ke Shopee Seller Center",
                content: `Selanjutnya, login ke Shopee Seller Center:

1. Buka https://seller.shopee.co.id
2. Login dengan akun seller Anda
3. Pastikan Anda sudah berada di dashboard seller
4. Biarkan tab ini terbuka`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Shopee+Seller+Center+Login",
                imageCaption: "Login ke Shopee Seller Center"
            },
            {
                id: "langkah-3-copy-cookies",
                title: "Langkah 3: Salin Cookies",
                content: `Sekarang salin cookies dari Shopee:

1. Klik icon Cookie Editor di toolbar browser
2. Klik tombol "Export" atau "Copy All"
3. Cookies akan tersalin ke clipboard dalam format JSON

Pastikan Anda menyalin SEMUA cookies, bukan hanya satu.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Copy+Cookies+Step",
                imageCaption: "Menyalin cookies dengan Cookie Editor"
            },
            {
                id: "langkah-4-paste-adspilot",
                title: "Langkah 4: Paste di ADSPILOT",
                content: `Terakhir, masukkan cookies ke ADSPILOT:

1. Buka halaman **Store** di ADSPILOT
2. Klik tombol **Tambah Toko** atau **Update Cookies**
3. Paste cookies yang sudah disalin
4. Klik **Simpan**

Jika berhasil, status toko akan berubah menjadi "Active".`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Paste+in+ADSPILOT",
                imageCaption: "Memasukkan cookies di halaman Store ADSPILOT"
            }
        ],
        tips: [
            "Cookies biasanya expired setelah 7-30 hari. Update secara berkala.",
            "Jika status toko 'Expired', ulangi proses ini dari Langkah 2",
            "Gunakan Incognito mode jika memiliki banyak akun Shopee"
        ],
        warnings: [
            "Jangan share cookies Anda ke orang lain - ini seperti memberikan akses ke akun Anda",
            "Setelah update cookies, perlu waktu ~5 menit sampai data iklan muncul"
        ],
        faqs: [
            {
                question: "Kenapa harus pakai cookies?",
                answer: "Shopee tidak menyediakan API resmi untuk seller. Cookies adalah satu-satunya cara untuk mengakses data iklan."
            },
            {
                question: "Apakah cookies aman?",
                answer: "ADSPILOT menyimpan cookies secara terenkripsi. Cookies hanya digunakan untuk mengakses fitur iklan, bukan transaksi atau data sensitif lainnya."
            }
        ],
        relatedSlugs: ["pengenalan-adspilot", "membuat-automation-rule"]
    },
    {
        slug: "membuat-automation-rule",
        title: "Membuat Automation Rule Pertama",
        description: "Tutorial step-by-step membuat automation rule untuk mengoptimalkan budget iklan",
        duration: "12 menit",
        type: "video",
        category: "Automation",
        icon: "Zap",
        videoUrl: "https://youtube.com/@adspilot",
        coverImage: "https://placehold.co/1200x400/f59e0b/ffffff?text=Create+Automation+Rule",
        sections: [
            {
                id: "konsep-dasar",
                title: "Konsep Dasar Automation Rule",
                content: `Automation Rule adalah aturan yang Anda buat untuk mengotomatisasi pengelolaan iklan. Setiap rule terdiri dari:

1. **Kondisi (IF)** - Kapan rule ini aktif? (contoh: ROAS < 1)
2. **Aksi (THEN)** - Apa yang harus dilakukan? (contoh: Kurangi budget 20%)
3. **Target** - Iklan mana yang terpengaruh? (contoh: Semua iklan toko X)
4. **Jadwal** - Kapan rule dijalankan? (contoh: Setiap jam 9 pagi)

Dengan kombinasi ini, Anda bisa membuat berbagai skenario automation.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Rule+Anatomy+Diagram",
                imageCaption: "Anatomi sebuah Automation Rule"
            },
            {
                id: "step-1-buka-halaman",
                title: "Step 1: Buka Halaman Automations",
                content: `Mulai dengan membuka halaman Automations:

1. Login ke ADSPILOT
2. Klik menu **Automations** di sidebar
3. Klik tombol **+ Create Rule**

Modal pembuatan rule akan terbuka.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Automations+Page",
                imageCaption: "Halaman Automations dengan tombol Create Rule"
            },
            {
                id: "step-2-pilih-aksi",
                title: "Step 2: Pilih Aksi",
                content: `Pertama, tentukan aksi yang ingin dilakukan:

**Opsi Aksi:**
- **Adjust Budget** - Ubah budget iklan (naik/turun %)
- **Pause Campaign** - Hentikan iklan sementara
- **Resume Campaign** - Aktifkan kembali iklan
- **Adjust Bid** - Ubah bidding price

Untuk pemula, disarankan mulai dengan "Adjust Budget".`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Select+Action+Step",
                imageCaption: "Pilihan aksi yang tersedia"
            },
            {
                id: "step-3-pilih-target",
                title: "Step 3: Pilih Target",
                content: `Selanjutnya, tentukan iklan mana yang akan terpengaruh:

**Level Target:**
- **Semua Iklan** - Berlaku untuk semua iklan di toko terpilih
- **Campaign Tertentu** - Pilih campaign spesifik
- **Produk Tertentu** - Pilih produk/iklan spesifik

**Filter Tambahan:**
- Filter by status (active/paused)
- Filter by tipe iklan (product ads, shop ads)`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Select+Target+Step",
                imageCaption: "Memilih target iklan"
            },
            {
                id: "step-4-set-jadwal",
                title: "Step 4: Set Jadwal",
                content: `Tentukan kapan rule akan dieksekusi:

**Opsi Jadwal:**
- **Setiap X menit** - Eksekusi berkala (30 menit, 1 jam, dst)
- **Jam tertentu** - Eksekusi pada jam spesifik (misal: 09:00, 21:00)
- **Hari tertentu** - Hanya dieksekusi pada hari tertentu

Untuk pemula, gunakan jadwal "Setiap 1 jam" agar tidak terlalu agresif.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Set+Schedule+Step",
                imageCaption: "Pengaturan jadwal eksekusi"
            },
            {
                id: "step-5-set-kondisi",
                title: "Step 5: Set Kondisi",
                content: `Ini adalah bagian terpenting - tentukan kondisi kapan aksi dieksekusi:

**Metrik yang Tersedia:**
- **ROAS** - Return on Ad Spend
- **CTR** - Click Through Rate
- **CR** - Conversion Rate
- **Spend** - Total pengeluaran
- **Impressions** - Jumlah tayang
- **Orders** - Jumlah pesanan

**Operator:**
- Lebih besar dari (>)
- Lebih kecil dari (<)
- Sama dengan (=)
- Antara (between)

**Contoh Kondisi:**
- ROAS < 1 → Iklan rugi, kurangi budget
- ROAS > 3 → Iklan profit, tambah budget
- Spend > 100000 AND Orders = 0 → Stop iklan yang tidak konversi`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Set+Conditions+Step",
                imageCaption: "Membuat kondisi rule"
            },
            {
                id: "step-6-review-save",
                title: "Step 6: Review & Simpan",
                content: `Terakhir, review dan simpan rule Anda:

1. Periksa kembali semua pengaturan
2. Beri nama yang deskriptif (contoh: "Stop Iklan Rugi ROAS<1")
3. Klik tombol **Simpan**

Rule akan langsung aktif dan mulai dieksekusi sesuai jadwal.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Review+and+Save",
                imageCaption: "Review sebelum menyimpan"
            }
        ],
        tips: [
            "Mulai dengan rule konservatif (perubahan kecil 10-20%) sebelum yang agresif",
            "Gunakan periode waktu evaluasi minimal 3 hari sebelum membuat kesimpulan",
            "Kombinasikan beberapa rule untuk strategi yang komprehensif"
        ],
        warnings: [
            "Rule dengan kondisi salah bisa mematikan semua iklan Anda. Selalu test dengan 1 iklan dulu.",
            "Terlalu banyak rule yang bentrok bisa menyebabkan behaviour tak terduga"
        ],
        faqs: [
            {
                question: "Berapa rule yang bisa dibuat?",
                answer: "Tergantung paket subscription Anda. Paket Basic: 5 rules, Pro: 20 rules, Enterprise: Unlimited."
            },
            {
                question: "Bagaimana jika rule saling bertentangan?",
                answer: "Rule dieksekusi berdasarkan urutan prioritas. Rule dengan prioritas lebih tinggi akan dieksekusi duluan."
            }
        ],
        relatedSlugs: ["pengenalan-adspilot", "memahami-rekam-medic"]
    },
    {
        slug: "memahami-rekam-medic",
        title: "Memahami Rekam Medic",
        description: "Cara membaca dan menggunakan Rekam Medic (berbasis BCG Matrix) untuk strategi iklan yang lebih efektif",
        duration: "10 menit",
        type: "article",
        category: "Analisis",
        icon: "Activity",
        coverImage: "https://placehold.co/1200x400/10b981/ffffff?text=Understanding+Rekam+Medic",
        sections: [
            {
                id: "apa-itu-rekam-medic",
                title: "Apa itu Rekam Medic?",
                content: `Rekam Medic adalah fitur analisis berbasis **BCG Matrix** (Boston Consulting Group Matrix) yang membantu Anda mengkategorikan performa produk iklan.

BCG Matrix awalnya dikembangkan untuk analisis portfolio bisnis, tapi konsepnya sangat cocok untuk menganalisis performa iklan.

Dengan Rekam Medic, Anda bisa dengan cepat mengidentifikasi:
- Produk mana yang menghasilkan profit
- Produk mana yang berpotensi tapi perlu optimasi
- Produk mana yang sebaiknya dihentikan iklannya`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=BCG+Matrix+Intro",
                imageCaption: "Konsep dasar BCG Matrix untuk analisis iklan"
            },
            {
                id: "empat-kategori",
                title: "Empat Kategori BCG Matrix",
                content: `Rekam Medic membagi produk iklan Anda menjadi 4 kategori:`,
                image: "https://placehold.co/800x500/f1f5f9/64748b?text=BCG+Matrix+4+Quadrants",
                imageCaption: "Diagram 4 kuadran BCG Matrix"
            },
            {
                id: "stars",
                title: "1. Stars ⭐ (Bintang)",
                content: `**Karakteristik:**
- GMV tinggi (banyak penjualan)
- ROAS tinggi (profit bagus)
- Pertumbuhan positif

**Strategi:**
- Pertahankan atau tingkatkan budget
- Ini adalah "mesin uang" Anda
- Prioritaskan dalam campaign

**Contoh:** Produk bestseller dengan ROAS > 3`,
                image: "https://placehold.co/800x300/fef3c7/92400e?text=⭐+STARS+Category",
                imageCaption: "Produk Stars adalah yang paling menguntungkan"
            },
            {
                id: "cash-cows",
                title: "2. Cash Cows 🐄 (Sapi Perah)",
                content: `**Karakteristik:**
- GMV tinggi (masih menghasilkan)
- ROAS stabil tapi tidak spektakuler
- Pertumbuhan lambat atau stagnan

**Strategi:**
- Pertahankan budget current
- Jangan terlalu agresif menaikkan
- Gunakan profit untuk invest ke Question Marks

**Contoh:** Produk yang stabil jual tapi sudah mature`,
                image: "https://placehold.co/800x300/dcfce7/166534?text=🐄+CASH+COWS+Category",
                imageCaption: "Cash Cows memberikan income stabil"
            },
            {
                id: "question-marks",
                title: "3. Question Marks ❓ (Tanda Tanya)",
                content: `**Karakteristik:**
- GMV masih rendah
- Pertumbuhan tinggi (potensial)
- ROAS belum stabil

**Strategi:**
- Butuh investasi dan eksperimen
- Optimasi creative, targeting, bidding
- Jika tidak improve dalam 2 minggu, pertimbangkan stop

**Contoh:** Produk baru yang sedang di-push`,
                image: "https://placehold.co/800x300/e0e7ff/3730a3?text=❓+QUESTION+MARKS+Category",
                imageCaption: "Question Marks perlu analisis lebih lanjut"
            },
            {
                id: "dogs",
                title: "4. Dogs 🐕 (Anjing)",
                content: `**Karakteristik:**
- GMV rendah (tidak laku)
- ROAS rendah (rugi atau impas)
- Pertumbuhan negatif atau flat

**Strategi:**
- Pertimbangkan untuk menghentikan iklan
- Fokuskan budget ke kategori lain
- Atau lakukan overhaul total (ganti foto, deskripsi, harga)

**Contoh:** Produk yang sudah 2 minggu ROAS < 0.5`,
                image: "https://placehold.co/800x300/fee2e2/991b1b?text=🐕+DOGS+Category",
                imageCaption: "Dogs sebaiknya dihentikan atau di-overhaul"
            },
            {
                id: "cara-menggunakan",
                title: "Cara Menggunakan Rekam Medic",
                content: `Berikut cara menggunakan fitur Rekam Medic:

1. **Buka halaman Rekam Medic** dari sidebar
2. **Pilih toko** yang ingin dianalisis
3. **Pilih rentang tanggal** (disarankan minimal 7 hari)
4. **Lihat visualisasi** BCG Matrix
5. **Klik pada titik/produk** untuk melihat detail
6. **Ambil keputusan** berdasarkan posisi produk

Dashboard akan menampilkan produk Anda dalam bentuk scatter plot, dengan sumbu X (GMV) dan sumbu Y (Growth Rate).`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Rekam+Medic+Dashboard",
                imageCaption: "Tampilan dashboard Rekam Medic"
            },
            {
                id: "actionable-insights",
                title: "Actionable Insights",
                content: `Setelah melihat Rekam Medic, berikut action yang bisa Anda ambil:

| Kategori | Action |
|----------|--------|
| Stars | Tingkatkan budget 20-50% |
| Cash Cows | Pertahankan budget |
| Question Marks | Optimasi atau beri deadline |
| Dogs | Stop atau kurangi budget 50% |

Kombinasikan dengan Automation Rules untuk mengotomatisasi keputusan ini!`,
                image: "https://placehold.co/800x300/f1f5f9/64748b?text=Action+Matrix+Table",
                imageCaption: "Tabel rekomendasi action berdasarkan kategori"
            }
        ],
        tips: [
            "Lakukan analisis Rekam Medic minimal seminggu sekali",
            "Jangan terlalu cepat menyimpulkan - gunakan data minimal 7 hari",
            "Kombinasikan dengan metrik lain seperti CTR dan CR untuk gambaran lengkap"
        ],
        faqs: [
            {
                question: "Berapa lama data diproses?",
                answer: "Data di-update setiap hari pukul 00:00 WIB berdasarkan report Shopee."
            },
            {
                question: "Apakah bisa export data Rekam Medic?",
                answer: "Ya, Anda bisa mengexport hasil analisis dalam format CSV atau PDF."
            }
        ],
        relatedSlugs: ["membuat-automation-rule", "monitoring-logs"]
    },
    {
        slug: "optimasi-roas",
        title: "Optimasi Campaign dengan Target ROAS",
        description: "Strategi menggunakan target ROAS untuk meningkatkan performa iklan",
        duration: "15 menit",
        type: "video",
        category: "Optimization",
        icon: "Target",
        videoUrl: "https://youtube.com/@adspilot",
        coverImage: "https://placehold.co/1200x400/8b5cf6/ffffff?text=ROAS+Optimization",
        sections: [
            {
                id: "apa-itu-roas",
                title: "Apa itu ROAS?",
                content: `ROAS (Return on Ad Spend) adalah metrik yang mengukur efektivitas pengeluaran iklan Anda.

**Rumus:**
ROAS = Total Revenue / Total Ad Spend

**Contoh:**
- Spend iklan: Rp 100.000
- Total penjualan dari iklan: Rp 500.000
- ROAS = 500.000 / 100.000 = **5.0x**

Artinya, setiap Rp 1 yang dikeluarkan untuk iklan menghasilkan Rp 5 revenue.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=ROAS+Formula+Diagram",
                imageCaption: "Cara menghitung ROAS"
            },
            {
                id: "benchmark-roas",
                title: "Benchmark ROAS yang Sehat",
                content: `Berapa ROAS yang dianggap bagus? Tergantung margin produk Anda:

| Margin Produk | ROAS Minimum | ROAS Target |
|---------------|--------------|-------------|
| 10-20% | 5.0x | 7.0x+ |
| 20-30% | 3.5x | 5.0x+ |
| 30-50% | 2.0x | 3.0x+ |
| 50%+ | 1.5x | 2.0x+ |

**Rumus Praktis:**
ROAS Minimum = 100% / Margin%

Contoh: Margin 25% → ROAS Min = 100/25 = 4.0x`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=ROAS+Benchmark+Table",
                imageCaption: "Benchmark ROAS berdasarkan margin produk"
            },
            {
                id: "strategi-optimasi",
                title: "Strategi Optimasi ROAS",
                content: `Berikut strategi untuk meningkatkan ROAS:

**1. Segmentasi Budget**
- Alokasikan 70% budget ke produk dengan ROAS tinggi
- 20% untuk testing produk baru
- 10% untuk eksperimen

**2. Optimasi Targeting**
- Gunakan Search Ads untuk intent tinggi
- Gunakan Discovery Ads untuk awareness
- Retarget visitors yang belum convert

**3. Optimasi Creative**
- Gunakan foto berkualitas tinggi
- Highlight promo/diskon
- A/B test berbagai creative

**4. Optimasi Bidding**
- Mulai dengan bidding konservatif
- Naikkan gradual untuk produk yang perform
- Turunkan untuk yang underperform`
            }
        ],
        tips: [
            "ROAS harian bisa fluktuatif, lihat trend 7 hari",
            "Pertimbangkan customer lifetime value, bukan hanya first purchase",
            "Seasonal products mungkin perlu target ROAS berbeda"
        ],
        relatedSlugs: ["membuat-automation-rule", "memahami-rekam-medic"]
    },
    {
        slug: "monitoring-logs",
        title: "Monitoring Logs dan Activity",
        description: "Cara memantau dan menganalisis logs automation untuk troubleshooting",
        duration: "7 menit",
        type: "article",
        category: "Monitoring",
        icon: "RotateCcw",
        coverImage: "https://placehold.co/1200x400/64748b/ffffff?text=Monitoring+Logs",
        sections: [
            {
                id: "pentingnya-monitoring",
                title: "Pentingnya Monitoring",
                content: `Monitoring logs adalah bagian penting dari penggunaan automation. Dengan memantau logs, Anda bisa:

- Memastikan rule berjalan sesuai ekspektasi
- Mendeteksi error atau masalah lebih awal
- Menganalisis pola eksekusi
- Melakukan troubleshooting jika ada issue`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Logs+Dashboard+Overview",
                imageCaption: "Tampilan halaman Logs"
            },
            {
                id: "jenis-log",
                title: "Jenis Log",
                content: `Ada beberapa jenis log yang perlu Anda pahami:

**✅ Success (Hijau)**
- Rule berhasil dieksekusi
- Action selesai dilakukan
- Contoh: "Budget updated from 50000 to 60000"

**⚠️ Warning (Kuning)**
- Rule dieksekusi tapi dengan catatan
- Partial success
- Contoh: "Budget already at maximum limit"

**❌ Error (Merah)**
- Rule gagal dieksekusi
- Perlu perhatian/action
- Contoh: "Cookie expired, please update"

**ℹ️ Info (Biru)**
- Informasi umum
- Tidak perlu action
- Contoh: "Rule scheduled for next run"`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Log+Types+Legend",
                imageCaption: "Jenis-jenis log dan artinya"
            },
            {
                id: "cara-filter",
                title: "Cara Filter Logs",
                content: `Untuk menganalisis logs secara efektif, gunakan filter:

1. **Filter by Date** - Pilih rentang tanggal spesifik
2. **Filter by Status** - Success, Warning, Error, atau All
3. **Filter by Rule** - Lihat logs untuk rule tertentu
4. **Filter by Store** - Lihat logs untuk toko tertentu
5. **Search** - Cari keyword dalam log message`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Filter+Options",
                imageCaption: "Opsi filter yang tersedia"
            },
            {
                id: "troubleshooting",
                title: "Troubleshooting Umum",
                content: `Berikut solusi untuk error umum:

**Cookie Expired**
→ Update cookies di halaman Store

**Budget Limit Reached**
→ Cek saldo iklan Shopee, top up jika perlu

**API Error / Timeout**
→ Biasanya masalah sementara, akan retry otomatis

**Rule Conflict**
→ Cek apakah ada 2 rule yang bertentangan

**No Data**
→ Pastikan ada data untuk periode yang dipilih`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Troubleshooting+Guide",
                imageCaption: "Panduan troubleshooting error umum"
            }
        ],
        tips: [
            "Cek logs secara rutin, minimal sekali sehari",
            "Set notifikasi Telegram untuk alert error",
            "Export logs bulanan untuk arsip dan analisis"
        ],
        relatedSlugs: ["setup-telegram", "membuat-automation-rule"]
    },
    {
        slug: "setup-telegram",
        title: "Setup Notifikasi Telegram",
        description: "Panduan mengaktifkan notifikasi Telegram untuk update real-time",
        duration: "5 menit",
        type: "article",
        category: "Setup",
        icon: "MessageSquare",
        coverImage: "https://placehold.co/1200x400/0088cc/ffffff?text=Telegram+Notification+Setup",
        sections: [
            {
                id: "kenapa-telegram",
                title: "Kenapa Menggunakan Telegram?",
                content: `Notifikasi Telegram memungkinkan Anda:

- Menerima update realtime di HP
- Tidak perlu buka dashboard terus-menerus
- Alert cepat jika ada masalah
- Monitoring saat mobile

Telegram dipilih karena gratis, cepat, dan mendukung rich formatting.`
            },
            {
                id: "step-1-dapatkan-chat-id",
                title: "Step 1: Dapatkan Chat ID",
                content: `Pertama, Anda perlu mendapatkan Chat ID Telegram:

1. Buka Telegram
2. Cari bot **@userinfobot**
3. Klik **Start** atau kirim pesan apapun
4. Bot akan membalas dengan info Anda termasuk **Your ID**
5. Salin angka tersebut (contoh: 123456789)

Chat ID adalah identitas unik Anda di Telegram.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Get+Telegram+Chat+ID",
                imageCaption: "Cara mendapatkan Chat ID dari @userinfobot"
            },
            {
                id: "step-2-start-bot",
                title: "Step 2: Start Bot ADSPILOT",
                content: `Selanjutnya, aktifkan bot ADSPILOT:

1. Cari bot **@AdsPilotBot** di Telegram
2. Klik **Start**
3. Bot akan mengirim pesan selamat datang

Jika tidak di-start, bot tidak bisa mengirim notifikasi ke Anda.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Start+ADSPILOT+Bot",
                imageCaption: "Start bot @AdsPilotBot"
            },
            {
                id: "step-3-masukkan-di-settings",
                title: "Step 3: Masukkan Chat ID di Settings",
                content: `Terakhir, hubungkan di ADSPILOT:

1. Buka halaman **Settings**
2. Scroll ke bagian **Telegram Notification**
3. Masukkan Chat ID yang sudah disalin
4. Klik **Save**
5. Klik **Test** untuk mengirim pesan test

Jika berhasil, Anda akan menerima pesan test di Telegram.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Settings+Telegram+Section",
                imageCaption: "Pengaturan Telegram di halaman Settings"
            },
            {
                id: "jenis-notifikasi",
                title: "Jenis Notifikasi yang Dikirim",
                content: `Berikut notifikasi yang akan Anda terima:

- ✅ **Rule Executed** - Saat automation rule dieksekusi
- ⚠️ **Cookie Expired** - Saat cookies toko perlu di-update
- 📊 **Daily Summary** - Ringkasan harian (opsional)
- 🔔 **Subscription Reminder** - Pengingat sebelum expired
- 🛠 **System Updates** - Info penting dari ADSPILOT

Anda bisa mengatur notifikasi mana yang ingin diterima di Settings.`
            }
        ],
        tips: [
            "Gunakan Chat ID grup jika ingin notifikasi ke tim (ID negatif)",
            "Jangan block bot, atau notifikasi tidak akan terkirim",
            "Aktifkan notifikasi Telegram di HP agar tidak ketinggalan"
        ],
        warnings: [
            "Chat ID adalah angka, bukan username. Jangan masukkan @username",
            "Jika tidak menerima test message, pastikan sudah klik Start di bot"
        ],
        relatedSlugs: ["monitoring-logs", "pengenalan-adspilot"]
    },
    {
        slug: "mengelola-subscription",
        title: "Mengelola Subscription dan Invoice",
        description: "Cara upgrade, downgrade, dan mengelola subscription Anda",
        duration: "6 menit",
        type: "article",
        category: "Billing",
        icon: "CreditCard",
        coverImage: "https://placehold.co/1200x400/059669/ffffff?text=Subscription+Management",
        sections: [
            {
                id: "paket-tersedia",
                title: "Paket Subscription",
                content: `ADSPILOT menyediakan beberapa paket:

| Paket | Toko | Rules | Harga/Bulan |
|-------|------|-------|-------------|
| Trial | 1 | 2 | Gratis 7 hari |
| Basic | 2 | 5 | Rp 99.000 |
| Pro | 5 | 20 | Rp 249.000 |
| Enterprise | Unlimited | Unlimited | Custom |

Semua paket include: Dashboard, Logs, Telegram Notification, Support.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Subscription+Plans+Table",
                imageCaption: "Perbandingan paket subscription"
            },
            {
                id: "cara-upgrade",
                title: "Cara Upgrade Paket",
                content: `Untuk upgrade paket:

1. Buka halaman **Subscription**
2. Pilih paket yang diinginkan
3. Sistem akan menampilkan invoice
4. Lakukan transfer ke rekening yang tertera
5. Upload bukti pembayaran
6. Tunggu konfirmasi admin (max 1x24 jam)

Setelah dikonfirmasi, paket akan langsung aktif.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Upgrade+Flow",
                imageCaption: "Langkah-langkah upgrade paket"
            },
            {
                id: "download-invoice",
                title: "Download Invoice",
                content: `Untuk mengunduh invoice pembayaran:

1. Buka halaman **Subscription**
2. Scroll ke bagian **Riwayat Pembayaran**
3. Klik icon **Download** di samping transaksi
4. Invoice PDF akan ter-download

Invoice bisa digunakan untuk keperluan pencatatan keuangan atau reimbursement.`,
                image: "https://placehold.co/800x400/f1f5f9/64748b?text=Download+Invoice+Feature",
                imageCaption: "Tombol download invoice"
            },
            {
                id: "perpanjangan",
                title: "Perpanjangan Otomatis",
                content: `Saat ini ADSPILOT belum support auto-renewal. Anda akan mendapat notifikasi:

- **7 hari sebelum** - Reminder perpanjangan
- **3 hari sebelum** - Warning perpanjangan
- **1 hari sebelum** - Urgent reminder
- **Hari H** - Notifikasi subscription expired

Jika tidak diperpanjang, automation akan berhenti sampai diperpanjang.`
            }
        ],
        tips: [
            "Upgrade di awal bulan untuk memanfaatkan full periode",
            "Simpan invoice untuk keperluan pencatatan bisnis",
            "Hubungi support jika butuh paket custom"
        ],
        faqs: [
            {
                question: "Apakah bisa refund?",
                answer: "Tidak ada refund setelah aktivasi. Pastikan memilih paket yang sesuai."
            },
            {
                question: "Bagaimana jika expired?",
                answer: "Automation akan berhenti. Data Anda tetap aman dan bisa dilanjutkan setelah perpanjang."
            },
            {
                question: "Bisa bayar tahunan?",
                answer: "Ya, bayar 12 bulan sekaligus dapat diskon 20%. Hubungi support."
            }
        ],
        relatedSlugs: ["pengenalan-adspilot", "setup-telegram"]
    }
];

export function getTutorialBySlug(slug: string): TutorialArticle | undefined {
    return tutorials.find(t => t.slug === slug);
}

export function getRelatedTutorials(slugs: string[]): TutorialArticle[] {
    return tutorials.filter(t => slugs.includes(t.slug));
}
