require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Full landing page content with ALL sections
const fullLandingPageContent = {
    sections: [
        // 1. HERO SECTION
        {
            id: 'hero-1',
            type: 'hero',
            enabled: true,
            order: 1,
            blocks: [
                {
                    id: 'hero-block-1',
                    type: 'hero',
                    components: {
                        headline: 'Tingkatkan Penjualan Shopee Anda **Hingga 300%** dengan **Otomasi Cerdas 24/7**!',
                        subtitle: 'Hentikan ketakutan budget iklan habis sia-sia. ADSPILOT mengelola iklan Shopee Anda secara otomatis 24/7, tanpa perlu bangun tengah malam untuk setting iklan.',
                        ctaText: 'Daftar Sekarang',
                        ctaLink: '#harga',
                    }
                }
            ]
        },

        // 2. FEATURES SECTION
        {
            id: 'features-1',
            type: 'features',
            enabled: true,
            order: 2,
            blocks: [
                {
                    id: 'feature-1',
                    type: 'feature',
                    components: {
                        icon: 'Zap',
                        title: 'Otomasi Iklan Cerdas',
                        description: 'Atur iklan Anda sekali, biarkan AdsPilot yang mengelola. Sistem otomasi kami akan mengoptimalkan budget dan bid secara otomatis untuk hasil maksimal.',
                        features: ['Auto-bid berdasarkan performa', 'Jadwal iklan otomatis', 'Pause iklan yang tidak efektif']
                    }
                },
                {
                    id: 'feature-2',
                    type: 'feature',
                    components: {
                        icon: 'BarChart3',
                        title: 'Analitik Real-Time',
                        description: 'Pantau performa iklan Anda secara real-time. Lihat ROI, conversion rate, dan metrik penting lainnya dalam satu dashboard yang mudah dipahami.',
                        features: ['Dashboard interaktif', 'Menganalisa data harian otomatis', 'Memprediksi performa untuk masa depan']
                    }
                },
                {
                    id: 'feature-3',
                    type: 'feature',
                    components: {
                        icon: 'BarChart3',
                        title: 'Rekam Medic - BCG Matrix',
                        description: 'Diagnosis kesehatan iklan dengan teknologi BCG Matrix dari Fortune 500. Ketahui iklan mana yang produktif dan mana yang buang-buang budget.',
                        features: ['Kategorisasi iklan otomatis', 'Analisis Star, Cash Cow, Dog', 'Rekomendasi aksi cerdas']
                    }
                },
                {
                    id: 'feature-4',
                    type: 'feature',
                    components: {
                        icon: 'DollarSign',
                        title: 'Hemat Budget Hingga 40%',
                        description: 'Optimalkan pengeluaran iklan Anda tanpa mengurangi performa. Sistem kami memastikan setiap rupiah yang Anda keluarkan memberikan hasil maksimal.',
                        features: ['Smart budget allocation', 'Deteksi iklan tidak efektif', 'Recomendasi optimasi budget']
                    }
                },
                {
                    id: 'feature-5',
                    type: 'feature',
                    components: {
                        icon: 'Shield',
                        title: '100% Aman & Terpercaya',
                        description: 'Data dan akun Shopee Anda aman bersama kami. Kami menggunakan enkripsi tingkat enterprise dan tidak pernah menyimpan password Anda.',
                        features: ['Enkripsi SSL 256-bit', 'Session cookies terenkripsi', 'Disconnect kapan saja']
                    }
                },
                {
                    id: 'feature-6',
                    type: 'feature',
                    components: {
                        icon: 'Rocket',
                        title: 'Setup dalam 5 Menit',
                        description: 'Tidak perlu ribet! Setup AdsPilot hanya butuh 5 menit. Koneksikan akun Shopee Anda, pilih produk yang ingin diiklankan, dan biarkan AdsPilot bekerja.',
                        features: ['Koneksi akun Shopee mudah', 'Buat automation rules cepat', 'Support via Telegram member group']
                    }
                }
            ]
        },

        // 3. TESTIMONIALS SECTION
        {
            id: 'testimonials-1',
            type: 'testimonials',
            enabled: true,
            order: 3,
            blocks: [
                {
                    id: 'testimonial-1',
                    type: 'testimonial',
                    components: {
                        name: 'Budi Santoso',
                        role: 'Owner Toko Fashion',
                        avatar: '',
                        rating: 5,
                        content: 'Sejak pakai AdsPilot, penjualan saya meningkat signifikan! Budget iklan lebih efisien dan ROI meningkat. Sekarang saya bisa tidur nyenyak tanpa khawatir iklan boncos. Recommended!'
                    }
                },
                {
                    id: 'testimonial-2',
                    type: 'testimonial',
                    components: {
                        name: 'Siti Nurhaliza',
                        role: 'Seller Kecantikan',
                        avatar: '',
                        rating: 5,
                        content: 'Wah, enak banget! Dulu saya harus cek iklan manual setiap hari. Sekarang semua otomatis, saya bisa fokus ke produk baru. Penjualan jadi lebih stabil dan terkontrol!'
                    }
                },
                {
                    id: 'testimonial-3',
                    type: 'testimonial',
                    components: {
                        name: 'Ahmad Rizki',
                        role: 'Seller Elektronik',
                        avatar: '',
                        rating: 5,
                        content: 'ROI iklan saya meningkat setelah pakai AdsPilot. Sistem auto-bid-nya benar-benar membantu. Tidak perlu lagi bangun tengah malam untuk setting iklan. Worth it!'
                    }
                }
            ]
        },

        // 4. CTA SECTION
        {
            id: 'cta-1',
            type: 'cta',
            enabled: true,
            order: 4,
            blocks: [
                {
                    id: 'cta-block-1',
                    type: 'cta',
                    components: {
                        headline: 'Siap Tingkatkan Penjualan Shopee Anda?',
                        description: 'Bergabunglah dengan ribuan seller yang sudah merasakan manfaat otomasi iklan dengan AdsPilot',
                        primaryCtaText: 'Mulai Sekarang - Gratis!',
                        primaryCtaLink: '#harga',
                        secondaryCtaText: 'Pelajari Lebih Lanjut',
                        secondaryCtaLink: '#fitur'
                    }
                }
            ]
        },

        // 5. FAQ SECTION
        {
            id: 'faq-1',
            type: 'faq',
            enabled: true,
            order: 5,
            blocks: [
                {
                    id: 'faq-1',
                    type: 'faq',
                    components: {
                        question: 'Apakah AdsPilot aman untuk akun Shopee saya?',
                        answer: 'Ya, 100% aman. Kami menggunakan enkripsi SSL 256-bit dan tidak pernah menyimpan password Anda. Kami hanya menggunakan session cookies yang terenkripsi untuk mengakses akun Shopee Anda.'
                    }
                },
                {
                    id: 'faq-2',
                    type: 'faq',
                    components: {
                        question: 'Berapa lama waktu yang dibutuhkan untuk setup?',
                        answer: 'Setup AdsPilot sangat cepat, hanya butuh 5 menit! Anda hanya perlu koneksikan akun Shopee, pilih produk yang ingin diiklankan, dan atur budget. Setelah itu, AdsPilot akan langsung bekerja otomatis.'
                    }
                },
                {
                    id: 'faq-3',
                    type: 'faq',
                    components: {
                        question: 'Apakah saya bisa menggunakan AdsPilot untuk multiple toko?',
                        answer: 'Ya, Anda bisa mengelola multiple toko Shopee dalam satu akun AdsPilot. Setiap toko akan memiliki dashboard dan automation rules sendiri.'
                    }
                }
            ]
        },

        // 6. STATS SECTION
        {
            id: 'stats-1',
            type: 'stats',
            enabled: true,
            order: 6,
            blocks: [
                {
                    id: 'stat-1',
                    type: 'stats',
                    components: {
                        icon: '👥',
                        value: '1000',
                        suffix: '+',
                        label: 'Active Users'
                    }
                },
                {
                    id: 'stat-2',
                    type: 'stats',
                    components: {
                        icon: '💰',
                        value: '300',
                        suffix: '%',
                        label: 'Average ROI Increase'
                    }
                },
                {
                    id: 'stat-3',
                    type: 'stats',
                    components: {
                        icon: '⚡',
                        value: '24',
                        suffix: '/7',
                        label: 'Automation Running'
                    }
                }
            ]
        }
    ]
};

async function populateContent() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting full content population...');

        // Upsert the content
        const query = `
            INSERT INTO landing_page_builder (page_name, content, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (page_name) 
            DO UPDATE SET 
                content = $2,
                updated_at = NOW()
            RETURNING *
        `;

        const result = await client.query(query, [
            'landing',
            JSON.stringify(fullLandingPageContent)
        ]);

        console.log('✅ Full content populated successfully!');
        console.log(`📊 Total sections: ${fullLandingPageContent.sections.length}`);
        console.log(`📦 Total blocks: ${fullLandingPageContent.sections.reduce((sum, s) => sum + s.blocks.length, 0)} `);

        console.log('\n📋 Sections created:');
        fullLandingPageContent.sections.forEach(section => {
            console.log(`   - ${section.type} (${section.blocks.length} blocks)`);
        });

    } catch (error) {
        console.error('❌ Error populating content:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the population
populateContent()
    .then(() => {
        console.log('\n✨ Population complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Population failed:', error);
        process.exit(1);
    });
