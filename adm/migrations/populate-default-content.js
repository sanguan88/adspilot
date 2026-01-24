// Migration: Populate Page Builder dengan Landing Page Existing
// Run this after landing-page-builder.sql migration

const { Pool } = require('pg');

const pool = new Pool({
    host: '154.19.37.198',
    port: 3306,
    database: 'soroboti_ads',
    user: 'soroboti_db',
    password: '123qweASD!@#!@#',
});

const defaultLandingPageContent = {
    sections: [
        // Hero Section
        {
            id: 'section-hero',
            type: 'hero',
            enabled: true,
            order: 1,
            blocks: [
                {
                    id: 'block-hero-1',
                    type: 'hero',
                    components: {
                        headline: 'Tingkatkan Penjualan Shopee Anda Hingga 300% dengan Otomasi Cerdas 24/7!',
                        subtitle: 'Hentikan ketakutan budget iklan habis sia-sia. ADSPILOT mengelola iklan Shopee Anda secara otomatis 24/7, tanpa perlu bangun tengah malam untuk setting iklan.',
                        ctaText: 'Daftar Sekarang',
                        ctaUrl: '#harga',
                        backgroundImage: '',
                    },
                },
            ],
        },

        // Features Section
        {
            id: 'section-features',
            type: 'features',
            enabled: true,
            order: 2,
            blocks: [
                {
                    id: 'block-feature-1',
                    type: 'feature',
                    components: {
                        icon: '⚡',
                        title: 'Otomasi Iklan Cerdas',
                        description: 'Atur iklan Anda sekali, biarkan AdsPilot yang mengelola. Sistem otomasi kami akan mengoptimalkan budget dan bid secara otomatis untuk hasil maksimal.',
                        accentColor: '#3b82f6',
                    },
                },
                {
                    id: 'block-feature-2',
                    type: 'feature',
                    components: {
                        icon: '📊',
                        title: 'Analitik Real-Time',
                        description: 'Pantau performa iklan Anda secara real-time. Lihat ROI, conversion rate, dan metrik penting lainnya dalam satu dashboard yang mudah dipahami.',
                        accentColor: '#3b82f6',
                    },
                },
                {
                    id: 'block-feature-3',
                    type: 'feature',
                    components: {
                        icon: '🩺',
                        title: 'Rekam Medic - BCG Matrix',
                        description: 'Diagnosis kesehatan iklan dengan teknologi BC Matrix dari Fortune 500. Ketahui iklan mana yang produktif dan mana yang buang-buang budget.',
                        accentColor: '#3b82f6',
                    },
                },
                {
                    id: 'block-feature-4',
                    type: 'feature',
                    components: {
                        icon: '💰',
                        title: 'Hemat Budget Hingga 40%',
                        description: 'Optimalkan pengeluaran iklan Anda tanpa mengurangi performa. Sistem kami memastikan setiap rupiah yang Anda keluarkan memberikan hasil maksimal.',
                        accentColor: '#3b82f6',
                    },
                },
                {
                    id: 'block-feature-5',
                    type: 'feature',
                    components: {
                        icon: '🛡️',
                        title: '100% Aman & Terpercaya',
                        description: 'Data dan akun Shopee Anda aman bersama kami. Kami menggunakan enkripsi tingkat enterprise dan tidak pernah menyimpan password Anda.',
                        accentColor: '#3b82f6',
                    },
                },
                {
                    id: 'block-feature-6',
                    type: 'feature',
                    components: {
                        icon: '🚀',
                        title: 'Setup dalam 5 Menit',
                        description: 'Tidak perlu ribet! Setup AdsPilot hanya butuh 5 menit. Koneksikan akun Shopee Anda, pilih produk yang ingin diiklankan, dan biarkan AdsPilot bekerja.',
                        accentColor: '#3b82f6',
                    },
                },
            ],
        },

        // Testimonials Section
        {
            id: 'section-testimonials',
            type: 'testimonials',
            enabled: true,
            order: 3,
            blocks: [
                {
                    id: 'block-testimonial-1',
                    type: 'testimonial',
                    components: {
                        name: 'Budi Santoso',
                        role: 'Owner Toko Fashion',
                        avatar: '',
                        rating: 5,
                        content: 'Sejak pakai AdsPilot, penjualan saya meningkat signifikan! Budget iklan lebih efisien dan ROI meningkat. Sekarang saya bisa tidur nyenyak tanpa khawatir iklan boncos. Recommended!',
                    },
                },
                {
                    id: 'block-testimonial-2',
                    type: 'testimonial',
                    components: {
                        name: 'Siti Nurhaliza',
                        role: 'Seller Kecantikan',
                        avatar: '',
                        rating: 5,
                        content: 'Wah, enak banget! Dulu saya harus cek iklan manual setiap hari. Sekarang semua otomatis, saya bisa fokus ke produk baru. Penjualan jadi lebih stabil dan terkontrol!',
                    },
                },
                {
                    id: 'block-testimonial-3',
                    type: 'testimonial',
                    components: {
                        name: 'Ahmad Rizki',
                        role: 'Seller Elektronik',
                        avatar: '',
                        rating: 5,
                        content: 'ROI iklan saya meningkat setelah pakai AdsPilot. Sistem auto-bid-nya benar-benar membantu. Tidak perlu lagi bangun tengah malam untuk setting iklan. Worth it!',
                    },
                },
            ],
        },

        // CTA Section
        {
            id: 'section-cta',
            type: 'cta',
            enabled: true,
            order: 4,
            blocks: [
                {
                    id: 'block-cta-1',
                    type: 'cta',
                    components: {
                        headline: 'Siap Tingkatkan Penjualan Shopee Anda?',
                        description: 'Bergabunglah dengan ribuan seller yang sudah merasakan manfaat otomasi iklan dengan AdsPilot',
                        primaryCtaText: 'Mulai Sekarang - Gratis!',
                        primaryCtaUrl: '#harga',
                        secondaryCtaText: 'Pelajari Lebih Lanjut',
                        secondaryCtaUrl: '#fitur',
                    },
                },
            ],
        },

        // FAQ Section
        {
            id: 'section-faq',
            type: 'faq',
            enabled: true,
            order: 5,
            blocks: [
                {
                    id: 'block-faq-1',
                    type: 'faq',
                    components: {
                        question: 'Apakah AdsPilot aman untuk akun Shopee saya?',
                        answer: 'Ya, 100% aman! Kami menggunakan enkripsi SSL 256-bit dan tidak pernah menyimpan password Anda. Anda bisa disconnect kapan saja.',
                    },
                },
                {
                    id: 'block-faq-2',
                    type: 'faq',
                    components: {
                        question: 'Berapa lama waktu yang dibutuhkan untuk setup?',
                        answer: 'Setup AdsPilot sangat mudah dan cepat, hanya butuh 5 menit! Koneksikan akun Shopee, pilih produk, atur budget, dan AdsPilot siap bekerja.',
                    },
                },
                {
                    id: 'block-faq-3',
                    type: 'faq',
                    components: {
                        question: 'Apakah saya bisa menggunakan AdsPilot untuk multiple toko?',
                        answer: 'Ya! Tergantung paket yang Anda pilih. Paket Pro dan Enterprise mendukung multiple akun Shopee.',
                    },
                },
            ],
        },

        // Stats Section
        {
            id: 'section-stats',
            type: 'stats',
            enabled: true,
            order: 6,
            blocks: [
                {
                    id: 'block-stats-1',
                    type: 'stats',
                    components: {
                        icon: '👥',
                        value: '1000',
                        suffix: '+',
                        label: 'Active Users',
                    },
                },
                {
                    id: 'block-stats-2',
                    type: 'stats',
                    components: {
                        icon: '💰',
                        value: '300',
                        suffix: '%',
                        label: 'Average ROI Increase',
                    },
                },
                {
                    id: 'block-stats-3',
                    type: 'stats',
                    components: {
                        icon: '⚡',
                        value: '24',
                        suffix: '/7',
                        label: 'Automation Running',
                    },
                },
            ],
        },
    ],
};

async function migrateDefaultContent() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting default content migration...');

        // Update landing page with default content
        const result = await client.query(`
      UPDATE landing_page_builder 
      SET content = $1, updated_by = 'migration', updated_at = CURRENT_TIMESTAMP
      WHERE page_key = 'landing'
    `, [JSON.stringify(defaultLandingPageContent)]);

        if (result.rowCount > 0) {
            console.log('✅ Default landing page content migrated successfully!');
            console.log(`   - ${defaultLandingPageContent.sections.length} sections`);
            console.log(`   - ${defaultLandingPageContent.sections.reduce((acc, s) => acc + s.blocks.length, 0)} blocks total`);
        } else {
            console.log('⚠️  No rows updated. Make sure landing page record exists.');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateDefaultContent()
    .then(() => {
        console.log('\n🎉 Migration completed!');
        console.log('👉 Open Page Builder to see your existing landing page content!');
        process.exit(0);
    })
    .catch(() => process.exit(1));
