
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
})

const newTutorials = [
    {
        slug: "setup-telegram",
        title: "Setup Notifikasi Telegram",
        description: "Panduan mengaktifkan notifikasi Telegram untuk update real-time",
        duration: "5 menit",
        type: "article",
        category: "Setup",
        icon: "MessageSquare",
        cover_image: "https://placehold.co/1200x400/0088cc/ffffff?text=Telegram+Notification+Setup",
        video_url: null,
        order_index: 5,
        sections: [
            {
                title: "Kenapa Menggunakan Telegram?",
                content: `Notifikasi Telegram memungkinkan Anda:

- Menerima update realtime di HP
- Tidak perlu buka dashboard terus-menerus
- Alert cepat jika ada masalah
- Monitoring saat mobile

Telegram dipilih karena gratis, cepat, dan mendukung rich formatting.`,
                image_url: null,
                image_caption: null
            },
            {
                title: "Step 1: Dapatkan Chat ID/User ID",
                content: `Pertama, Anda perlu mendapatkan Chat ID Telegram:

1. Buka Telegram
2. Cari bot **@userinfobot**
3. Klik **Start** atau kirim pesan apapun
4. Bot akan membalas dengan info Anda termasuk **Id**
5. Salin angka tersebut (contoh: 123456789)

Chat ID adalah identitas unik Anda di Telegram.`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Get+Telegram+Chat+ID",
                image_caption: "Cara mendapatkan Chat ID dari @userinfobot"
            },
            {
                title: "Step 2: Start Bot ADSPILOT",
                content: `Selanjutnya, aktifkan bot ADSPILOT agar diizinkan mengirim pesan:

1. Cari bot **@adspilotid_bot** di Telegram
2. Klik **Start**
3. Bot akan mengirim pesan selamat datang

Jika tidak di-start, bot tidak bisa mengirim notifikasi ke Anda.`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Start+ADSPILOT+Bot",
                image_caption: "Start bot @adspilotid_bot"
            },
            {
                title: "Step 3: Masukkan Chat ID di Settings",
                content: `Terakhir, hubungkan di ADSPILOT:

1. Buka halaman **Settings** di dashboard AdsPilot
2. Scroll ke bagian **Telegram Notification**
3. Masukkan Chat ID yang sudah disalin
4. Klik **Simpan**
5. Klik **Test** untuk mengirim pesan test

Jika berhasil, Anda akan menerima pesan test di Telegram.`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Settings+Telegram+Section",
                image_caption: "Pengaturan Telegram di halaman Settings"
            }
        ],
        tips: [
            "Gunakan Chat ID grup jika ingin notifikasi ke tim (tambahkan bot ke grup)",
            "Jangan block bot, atau notifikasi tidak akan terkirim"
        ],
        warnings: [
            "Chat ID adalah angka, bukan username (@username)",
            "Pastikan bot yang di-start adalah @adspilotid_bot (resmi)"
        ],
        faqs: []
    },
    {
        slug: "monitoring-logs",
        title: "Monitoring Logs dan Activity",
        description: "Cara memantau dan menganalisis logs automation untuk troubleshooting",
        duration: "7 menit",
        type: "article",
        category: "Monitoring",
        icon: "RotateCcw",
        cover_image: "https://placehold.co/1200x400/64748b/ffffff?text=Monitoring+Logs",
        video_url: null,
        order_index: 6,
        sections: [
            {
                title: "Pentingnya Monitoring",
                content: `Monitoring logs adalah bagian penting dari penggunaan automation. Dengan memantau logs, Anda bisa:

- Memastikan rule berjalan sesuai ekspektasi
- Mendeteksi error atau masalah lebih awal
- Menganalisis pola eksekusi
- Melakukan troubleshooting jika ada issue`,
                image_url: null,
                image_caption: null
            },
            {
                title: "Jenis Log & Kode Warna",
                content: `Ada beberapa jenis log yang perlu Anda pahami:

**✅ Success (Hijau)**
- Rule berhasil dieksekusi
- Action selesai dilakukan
- Contoh: "Budget updated from 50000 to 60000"

**⚠️ Warning (Kuning)**
- Rule dieksekusi tapi tidak ada perubahan
- Kondisi belum terpenuhi
- Contoh: "Budget already at maximum limit"

**❌ Error (Merah)**
- Rule gagal dieksekusi
- Perlu perhatian/action
- Contoh: "Cookie expired, please update"

**ℹ️ Info (Biru)**
- Informasi umum scheduler
- Tidak perlu action`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Log+Color+Codes",
                image_caption: "Kode warna log untuk identifikasi cepat"
            },
            {
                title: "Troubleshooting Error Umum",
                content: `Berikut solusi untuk error yang sering muncul:

**Cookie Expired / Invalid**
→ Sesi Shopee habis. Buka menu Store > Update Cookie.

**Budget Limit Reached**
→ Saldo iklan habis atau limit budget tercapai.

**Network Error / Timeout**
→ Gangguan koneksi sesaat ke Shopee. Akan retry otomatis.`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Troubleshooting+Guide",
                image_caption: "Panduan troubleshooting error umum"
            }
        ],
        tips: [
            "Cek logs secara rutin, minimal 2 hari sekali",
            "Aktifkan notifikasi Telegram agar error langsung masuk HP"
        ],
        warnings: [],
        faqs: []
    },
    {
        slug: "troubleshooting-cookies",
        title: "Panduan Masalah Koneksi & Cookies",
        description: "Cara mengatasi status toko Disconnect/Expired dan tips menjaga koneksi",
        duration: "6 menit",
        type: "article",
        category: "Setup",
        icon: "Shield", // Shield icon for security/connection
        cover_image: "https://placehold.co/1200x400/dc2626/ffffff?text=Connection+Troubleshooting",
        video_url: null,
        order_index: 7,
        sections: [
            {
                title: "Kenapa Toko Bisa Disconnect?",
                content: `Status toko "Expired" atau "Disconnect" terjadi karena **Sesi Cookies Shopee Berakhir**.

Ini adalah hal wajar karena sistem keamanan Shopee. Biasanya terjadi saat:
1. Anda klik "Logout" di Seller Center.
2. Anda login di device baru dan device lama ter-logout.
3. Sesi cookies kadaluarsa secara alami (biasanya 1-2 minggu).
4. Shopee mendeteksi aktivitas tidak biasa.`,
                image_url: null,
                image_caption: null
            },
            {
                title: "Cara Update Cookies yang Aman",
                content: `Untuk mengupdate cookies tanpa masalah berulang:

1. Buka Shopee Seller Center di Tab Browser baru (Incognito disarankan).
2. Login kembali jika diminta.
3. Pastikan dashboard Seller Center terbuka penuh.
4. Buka extension Cookie Editor > Export.
5. Segera paste ke AdsPilot (Menu Store > Update Cookie).

**Tips Penting:** Jangan melogout tab Shopee setelah mengambil cookies. Cukup tutup tab-nya saja, jangan klik Logout.`,
                image_url: "https://placehold.co/800x400/f1f5f9/64748b?text=Update+Cookies+Steps",
                image_caption: "Langkah update cookies"
            },
            {
                title: "Apa Dampaknya?",
                content: `Saat toko diskonek:
- Automation Rule **BERHENTI** berjalan.
- Iklan berjalan liar tanpa kontrol otomatis.
- Data performance tidak terupdate.

Karena itu, segera update cookies begitu Anda mendapat notifikasi "Cookie Expired" di Telegram.`,
                image_url: null,
                image_caption: null
            }
        ],
        tips: [
            "Gunakan user Sub-Akun Shopee khusus untuk AdsPilot jika memungkinkan",
            "Cek status toko di dashboard setiap pagi"
        ],
        warnings: [
            "Jangan berikan cookies ke pihak ketiga yang tidak dipercaya",
            "Jangan sering gonta-ganti IP saat login Shopee"
        ],
        faqs: []
    }
]

async function seed() {
    const client = await pool.connect()
    console.log('Connected to database')

    try {
        await client.query('BEGIN')

        for (const tutorial of newTutorials) {
            console.log(`Processing: ${tutorial.title}`)

            // 1. Check if exists
            const existing = await client.query('SELECT id FROM tutorials WHERE slug = $1', [tutorial.slug])
            let tutorialId

            if (existing.rows.length > 0) {
                console.log(`- Update existing tutorial...`)
                tutorialId = existing.rows[0].id
                // Update basic info
                await client.query(`
                    UPDATE tutorials SET 
                        title = $1, description = $2, duration = $3, type = $4, category = $5,
                        icon = $6, cover_image = $7, video_url = $8, order_index = $9, is_published = true
                    WHERE id = $10
                `, [
                    tutorial.title, tutorial.description, tutorial.duration, tutorial.type, tutorial.category,
                    tutorial.icon, tutorial.cover_image, tutorial.video_url, tutorial.order_index, tutorialId
                ])

                // Clear child tables to re-insert
                await client.query('DELETE FROM tutorial_sections WHERE tutorial_id = $1', [tutorialId])
                await client.query('DELETE FROM tutorial_tips WHERE tutorial_id = $1', [tutorialId])
                await client.query('DELETE FROM tutorial_warnings WHERE tutorial_id = $1', [tutorialId])
                await client.query('DELETE FROM tutorial_faqs WHERE tutorial_id = $1', [tutorialId])
                // We keep related tutorials mostly, or clear if needed. Let's keep for now.
            } else {
                console.log(`- Insert new tutorial...`)
                const res = await client.query(`
                    INSERT INTO tutorials (
                        slug, title, description, duration, type, category, icon, 
                        cover_image, video_url, order_index, is_published
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
                    RETURNING id
                `, [
                    tutorial.slug, tutorial.title, tutorial.description, tutorial.duration, tutorial.type,
                    tutorial.category, tutorial.icon, tutorial.cover_image, tutorial.video_url, tutorial.order_index
                ])
                tutorialId = res.rows[0].id
            }

            // 2. Insert Sections
            let secOrder = 0
            for (const section of tutorial.sections) {
                await client.query(`
                    INSERT INTO tutorial_sections (tutorial_id, title, content, image_url, image_caption, order_index)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [tutorialId, section.title, section.content, section.image_url, section.image_caption, secOrder++])
            }

            // 3. Insert Tips
            let tipOrder = 0
            for (const tip of tutorial.tips) {
                await client.query(`
                    INSERT INTO tutorial_tips (tutorial_id, content, order_index)
                    VALUES ($1, $2, $3)
                `, [tutorialId, tip, tipOrder++])
            }

            // 4. Insert Warnings
            let warnOrder = 0
            for (const warning of tutorial.warnings) {
                await client.query(`
                    INSERT INTO tutorial_warnings (tutorial_id, content, order_index)
                    VALUES ($1, $2, $3)
                `, [tutorialId, warning, warnOrder++])
            }

            // 5. Insert FAQs (if any)
            let faqOrder = 0
            for (const faq of tutorial.faqs) {
                await client.query(`
                    INSERT INTO tutorial_faqs (tutorial_id, question, answer, order_index)
                    VALUES ($1, $2, $3, $4)
                `, [tutorialId, faq.question, faq.answer, faqOrder++])
            }
        }

        await client.query('COMMIT')
        console.log('Seeding completed successfully!')
    } catch (e) {
        await client.query('ROLLBACK')
        console.error('Error seeding tutorials:', e)
    } finally {
        client.release()
        await pool.end()
    }
}

seed()
