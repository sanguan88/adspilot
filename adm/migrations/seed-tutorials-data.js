/**
 * Migration: Seed initial tutorial data
 * 
 * Run with: node migrations/seed-tutorials-data.js
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
try {
    const envPath = path.join(process.cwd(), '.env.local')
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=')
            if (key && value) {
                process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '')
            }
        })
    }
} catch (err) {
    console.error('Error loading .env.local:', err)
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

// Tutorial data to seed
const tutorials = [
    {
        slug: "pengenalan-adspilot",
        title: "Pengenalan ADSPILOT",
        description: "Pelajari fitur-fitur utama dan cara kerja ADSPILOT untuk mengoptimalkan iklan Shopee Anda",
        duration: "5 menit",
        type: "video",
        category: "Dasar",
        icon: "BookOpen",
        video_url: "https://www.youtube.com/watch?v=example1",
        is_published: true,
        order_index: 1,
        sections: [
            {
                title: "Apa itu ADSPILOT?",
                content: `ADSPILOT adalah platform automation yang dirancang khusus untuk mengoptimalkan iklan Shopee Anda. Dengan ADSPILOT, Anda dapat:

1. **Mengotomatisasi pengelolaan budget** berdasarkan performa iklan
2. **Memonitor performa** semua toko dalam satu dashboard
3. **Menganalisis ROI dan ROAS** untuk setiap campaign
4. **Menghemat waktu** dengan automation rules yang berjalan 24/7`,
            },
            {
                title: "Fitur Utama",
                content: `- **Automation Rules**: Atur kondisi dan aksi otomatis untuk iklan Anda
- **Multi-Store Dashboard**: Kelola banyak toko dalam satu tempat
- **Rekam Medic (BCG Matrix)**: Analisis produk berdasarkan performa
- **Real-time Monitoring**: Pantau performa iklan secara real-time
- **Telegram Notifications**: Dapatkan notifikasi langsung ke Telegram`,
            }
        ],
        tips: [
            "Mulai dengan 1-2 automation rule sederhana sebelum membuat rule yang kompleks",
            "Gunakan Rekam Medic untuk mengidentifikasi produk terbaik",
            "Aktifkan notifikasi Telegram untuk update real-time"
        ],
        warnings: [
            "Pastikan cookies Shopee selalu terupdate untuk menghindari error",
            "Jangan membuat terlalu banyak rule yang saling konflik"
        ],
        faqs: [
            {
                question: "Apakah ADSPILOT aman digunakan?",
                answer: "Ya, ADSPILOT hanya membaca dan mengelola iklan Anda, tidak mengakses data sensitif lainnya."
            },
            {
                question: "Berapa lama cookies Shopee berlaku?",
                answer: "Cookies biasanya berlaku 7-30 hari tergantung aktivitas login Anda."
            }
        ]
    },
    {
        slug: "cara-menghubungkan-toko",
        title: "Cara Menghubungkan Toko Shopee",
        description: "Panduan lengkap menghubungkan toko Shopee Anda dengan ADSPILOT menggunakan cookies",
        duration: "8 menit",
        type: "video",
        category: "Setup",
        icon: "Store",
        video_url: "https://www.youtube.com/watch?v=example2",
        is_published: true,
        order_index: 2,
        sections: [
            {
                title: "Persiapan",
                content: `Sebelum menghubungkan toko, pastikan Anda memiliki:

1. **Akun Shopee Seller** yang sudah terverifikasi
2. **Browser Chrome** dengan extension EditThisCookie
3. **Login ke Shopee Seller Center** di browser yang sama`,
            },
            {
                title: "Langkah-langkah Koneksi",
                content: `1. Login ke Shopee Seller Center
2. Buka extension EditThisCookie
3. Klik tombol Export untuk menyalin cookies
4. Buka ADSPILOT > Store Management
5. Klik "Tambah Toko Baru"
6. Paste cookies yang sudah dicopy
7. Klik "Simpan" dan tunggu verifikasi`,
            }
        ],
        tips: [
            "Gunakan browser yang berbeda untuk setiap akun Shopee",
            "Simpan backup cookies di tempat yang aman",
            "Update cookies setiap 7 hari untuk menghindari expired"
        ],
        faqs: [
            {
                question: "Mengapa cookies saya sering expired?",
                answer: "Cookies akan expired jika Anda login ulang di browser lain atau jika Shopee melakukan security refresh."
            }
        ]
    },
    {
        slug: "membuat-automation-rule",
        title: "Membuat Automation Rule Pertama",
        description: "Tutorial step-by-step membuat automation rule untuk mengoptimalkan budget iklan",
        duration: "12 menit",
        type: "video",
        category: "Automation",
        icon: "Zap",
        video_url: "https://www.youtube.com/watch?v=example3",
        is_published: true,
        order_index: 3,
        sections: [
            {
                title: "Konsep Automation Rule",
                content: `Automation Rule adalah aturan otomatis yang mengeksekusi aksi tertentu ketika kondisi terpenuhi.

**Struktur Rule:**
- **Kondisi (IF)**: Siapa target dan apa syaratnya?
- **Aksi (THEN)**: Apa yang harus dilakukan?
- **Jadwal (WHEN)**: Kapan rule ini dijalankan?`,
            },
            {
                title: "Contoh Rule Populer",
                content: `**Rule 1: Budget Boost untuk Produk ROI Tinggi**
- Kondisi: ROI > 200%
- Aksi: Naikkan budget 20%
- Jadwal: Setiap hari jam 08:00

**Rule 2: Pause Iklan Low Performer**
- Kondisi: CTR < 0.5% AND Spend > 100rb
- Aksi: Pause campaign
- Jadwal: Setiap 6 jam`,
            }
        ],
        tips: [
            "Mulai dengan rule sederhana dan tingkatkan kompleksitas bertahap",
            "Test rule dengan budget kecil terlebih dahulu",
            "Monitor hasil rule selama 3-7 hari sebelum optimize"
        ],
        warnings: [
            "Hindari membuat rule dengan kondisi yang saling bertentangan",
            "Pastikan ada batas maksimum budget untuk menghindari overspend"
        ]
    },
    {
        slug: "memahami-rekam-medic",
        title: "Memahami Rekam Medic",
        description: "Cara membaca dan menggunakan Rekam Medic (berbasis BCG Matrix) untuk strategi iklan yang lebih efektif",
        duration: "10 menit",
        type: "article",
        category: "Analisis",
        icon: "Activity",
        is_published: true,
        order_index: 4,
        sections: [
            {
                title: "Apa itu Rekam Medic?",
                content: `Rekam Medic adalah fitur analisis berbasis **BCG Matrix** yang membantu Anda mengkategorikan performa produk iklan berdasarkan dua dimensi utama:

- **Sumbu X**: Market Share (GMV relatif terhadap produk lain)
- **Sumbu Y**: Growth Rate (Pertumbuhan performa)`,
            },
            {
                title: "Kategori BCG Matrix",
                content: `**⭐ Stars (Bintang)**
- GMV tinggi, pertumbuhan tinggi
- Strategi: Investasi maksimal, jagoan utama

**🐄 Cash Cows (Sapi Perah)**
- GMV tinggi, pertumbuhan rendah
- Strategi: Pertahankan budget, ambil profit

**❓ Question Marks (Tanda Tanya)**
- GMV rendah, pertumbuhan tinggi
- Strategi: Evaluasi dan test dengan budget tambahan

**🐕 Dogs (Anjing)**
- GMV rendah, pertumbuhan rendah
- Strategi: Kurangi budget atau stop iklan`,
            }
        ],
        tips: [
            "Fokuskan 60-70% budget pada produk Stars",
            "Jangan langsung matikan produk Dogs, evaluasi dulu penyebabnya",
            "Produk Question Marks bisa jadi Stars jika dioptimasi dengan benar"
        ]
    }
]

async function seed() {
    const client = await pool.connect()
    try {
        console.log('🚀 Starting tutorials data seeding...')

        // Check if tutorials already exist
        const existingCheck = await client.query('SELECT COUNT(*) FROM tutorials')
        if (parseInt(existingCheck.rows[0].count) > 0) {
            console.log('⚠️ Tutorials already exist. Skipping seed.')
            console.log('   To re-seed, first run: DELETE FROM tutorials;')
            return
        }

        await client.query('BEGIN')

        for (const tutorial of tutorials) {
            console.log(`  📝 Inserting: ${tutorial.title}`)

            // Insert tutorial
            const tutorialResult = await client.query(
                `INSERT INTO tutorials (slug, title, description, duration, type, category, icon, video_url, is_published, order_index)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [tutorial.slug, tutorial.title, tutorial.description, tutorial.duration, tutorial.type, tutorial.category, tutorial.icon, tutorial.video_url || null, tutorial.is_published, tutorial.order_index]
            )
            const tutorialId = tutorialResult.rows[0].id

            // Insert sections
            if (tutorial.sections) {
                for (let i = 0; i < tutorial.sections.length; i++) {
                    const section = tutorial.sections[i]
                    await client.query(
                        `INSERT INTO tutorial_sections (tutorial_id, order_index, title, content, image_url, image_caption)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [tutorialId, i, section.title, section.content, section.image_url || null, section.image_caption || null]
                    )
                }
            }

            // Insert tips
            if (tutorial.tips) {
                for (let i = 0; i < tutorial.tips.length; i++) {
                    await client.query(
                        `INSERT INTO tutorial_tips (tutorial_id, content, order_index) VALUES ($1, $2, $3)`,
                        [tutorialId, tutorial.tips[i], i]
                    )
                }
            }

            // Insert warnings
            if (tutorial.warnings) {
                for (let i = 0; i < tutorial.warnings.length; i++) {
                    await client.query(
                        `INSERT INTO tutorial_warnings (tutorial_id, content, order_index) VALUES ($1, $2, $3)`,
                        [tutorialId, tutorial.warnings[i], i]
                    )
                }
            }

            // Insert FAQs
            if (tutorial.faqs) {
                for (let i = 0; i < tutorial.faqs.length; i++) {
                    const faq = tutorial.faqs[i]
                    await client.query(
                        `INSERT INTO tutorial_faqs (tutorial_id, question, answer, order_index) VALUES ($1, $2, $3, $4)`,
                        [tutorialId, faq.question, faq.answer, i]
                    )
                }
            }
        }

        await client.query('COMMIT')
        console.log(`\n✅ Successfully seeded ${tutorials.length} tutorials!`)

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Seeding failed:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

seed().catch(console.error)
