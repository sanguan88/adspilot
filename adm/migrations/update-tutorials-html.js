/**
 * Migration: Update tutorial content to HTML format
 * 
 * Run with: node migrations/update-tutorials-html.js
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

// Updated tutorial data with HTML content
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
                content: `<p>ADSPILOT adalah platform automation yang dirancang khusus untuk mengoptimalkan iklan Shopee Anda. Dengan ADSPILOT, Anda dapat:</p>
<ol>
<li><strong>Mengotomatisasi pengelolaan budget</strong> berdasarkan performa iklan</li>
<li><strong>Memonitor performa</strong> semua toko dalam satu dashboard</li>
<li><strong>Menganalisis ROI dan ROAS</strong> untuk setiap campaign</li>
<li><strong>Menghemat waktu</strong> dengan automation rules yang berjalan 24/7</li>
</ol>`,
            },
            {
                title: "Fitur Utama",
                content: `<ul>
<li><strong>Automation Rules</strong>: Atur kondisi dan aksi otomatis untuk iklan Anda</li>
<li><strong>Multi-Store Dashboard</strong>: Kelola banyak toko dalam satu tempat</li>
<li><strong>Rekam Medic (BCG Matrix)</strong>: Analisis produk berdasarkan performa</li>
<li><strong>Real-time Monitoring</strong>: Pantau performa iklan secara real-time</li>
<li><strong>Telegram Notifications</strong>: Dapatkan notifikasi langsung ke Telegram</li>
</ul>`,
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
                content: `<p>Sebelum menghubungkan toko, pastikan Anda memiliki:</p>
<ol>
<li><strong>Akun Shopee Seller</strong> yang sudah terverifikasi</li>
<li><strong>Browser Chrome</strong> dengan extension EditThisCookie</li>
<li><strong>Login ke Shopee Seller Center</strong> di browser yang sama</li>
</ol>`,
            },
            {
                title: "Langkah-langkah Koneksi",
                content: `<ol>
<li>Login ke Shopee Seller Center</li>
<li>Buka extension EditThisCookie</li>
<li>Klik tombol Export untuk menyalin cookies</li>
<li>Buka ADSPILOT → Store Management</li>
<li>Klik "<strong>Tambah Toko Baru</strong>"</li>
<li>Paste cookies yang sudah dicopy</li>
<li>Klik "<strong>Simpan</strong>" dan tunggu verifikasi</li>
</ol>`,
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
                content: `<p>Automation Rule adalah aturan otomatis yang mengeksekusi aksi tertentu ketika kondisi terpenuhi.</p>
<h3>Struktur Rule:</h3>
<ul>
<li><strong>Kondisi (IF)</strong>: Siapa target dan apa syaratnya?</li>
<li><strong>Aksi (THEN)</strong>: Apa yang harus dilakukan?</li>
<li><strong>Jadwal (WHEN)</strong>: Kapan rule ini dijalankan?</li>
</ul>`,
            },
            {
                title: "Contoh Rule Populer",
                content: `<h3>Rule 1: Budget Boost untuk Produk ROI Tinggi</h3>
<ul>
<li><strong>Kondisi</strong>: ROI &gt; 200%</li>
<li><strong>Aksi</strong>: Naikkan budget 20%</li>
<li><strong>Jadwal</strong>: Setiap hari jam 08:00</li>
</ul>

<h3>Rule 2: Pause Iklan Low Performer</h3>
<ul>
<li><strong>Kondisi</strong>: CTR &lt; 0.5% AND Spend &gt; 100rb</li>
<li><strong>Aksi</strong>: Pause campaign</li>
<li><strong>Jadwal</strong>: Setiap 6 jam</li>
</ul>`,
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
                content: `<p>Rekam Medic adalah fitur analisis berbasis <strong>BCG Matrix</strong> yang membantu Anda mengkategorikan performa produk iklan berdasarkan dua dimensi utama:</p>
<ul>
<li><strong>Sumbu X</strong>: Market Share (GMV relatif terhadap produk lain)</li>
<li><strong>Sumbu Y</strong>: Growth Rate (Pertumbuhan performa)</li>
</ul>`,
            },
            {
                title: "Kategori BCG Matrix",
                content: `<h3>⭐ Stars (Bintang)</h3>
<ul>
<li>GMV tinggi, pertumbuhan tinggi</li>
<li><strong>Strategi</strong>: Investasi maksimal, jagoan utama</li>
</ul>

<h3>🐄 Cash Cows (Sapi Perah)</h3>
<ul>
<li>GMV tinggi, pertumbuhan rendah</li>
<li><strong>Strategi</strong>: Pertahankan budget, ambil profit</li>
</ul>

<h3>❓ Question Marks (Tanda Tanya)</h3>
<ul>
<li>GMV rendah, pertumbuhan tinggi</li>
<li><strong>Strategi</strong>: Evaluasi dan test dengan budget tambahan</li>
</ul>

<h3>🐕 Dogs (Anjing)</h3>
<ul>
<li>GMV rendah, pertumbuhan rendah</li>
<li><strong>Strategi</strong>: Kurangi budget atau stop iklan</li>
</ul>`,
            }
        ],
        tips: [
            "Fokuskan 60-70% budget pada produk Stars",
            "Jangan langsung matikan produk Dogs, evaluasi dulu penyebabnya",
            "Produk Question Marks bisa jadi Stars jika dioptimasi dengan benar"
        ]
    }
]

async function updateTutorials() {
    const client = await pool.connect()
    try {
        console.log('🔄 Updating tutorials to HTML format...')

        await client.query('BEGIN')

        // Delete existing data (cascade will handle related tables)
        console.log('  🗑️  Clearing existing tutorials...')
        await client.query('DELETE FROM tutorials')

        // Re-insert with HTML content
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

            // Insert sections with HTML content
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
        console.log(`\n✅ Successfully updated ${tutorials.length} tutorials with HTML format!`)

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Update failed:', error.message)
        throw error
    } finally {
        client.release()
        await pool.end()
    }
}

updateTutorials().catch(console.error)
