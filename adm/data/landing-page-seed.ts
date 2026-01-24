// Seed Data for Landing Page Content
// This file contains all the landing page content extracted from the existing page.tsx
// Run this to populate the Page Builder with initial content

import type { PageContent, Section, Block } from "../types/page-builder"

export const LANDING_PAGE_SEED_DATA: PageContent = {
    sections: [
        // ==================== HERO SECTION ====================
        {
            id: "section-hero-1",
            type: "hero",
            enabled: true,
            order: 1,
            blocks: [
                {
                    id: "block-hero-1",
                    type: "hero",
                    enabled: true,
                    components: {
                        headline: "Tingkatkan Penjualan Shopee Anda",
                        headlineHighlight1: "Hingga 300%",
                        headlineHighlight2: "Otomasi Cerdas 24/7",
                        subheadline: "Hentikan ketakutan budget iklan habis sia-sia. ADSPILOT mengelola iklan Shopee Anda secara otomatis 24/7, tanpa perlu bangun tengah malam untuk setting iklan.",
                        ctaText: "Daftar Sekarang",
                        ctaUrl: "#harga",
                        videoUrl: "",
                        trustBadge1: "Otomasi 24/7",
                        trustBadge2: "Aman & Terpercaya",
                        trustBadge3: "Setup 5 Menit",
                    }
                }
            ]
        },

        // ==================== HOOK SECTION (PAIN POINTS) ====================
        {
            id: "section-hook-1",
            type: "hook",
            enabled: true,
            order: 2,
            blocks: [
                {
                    id: "block-hook-1",
                    type: "hook-section",
                    enabled: true,
                    components: {
                        badgeText: "⚠️ PERHATIAN!",
                        headline: "Seller Shopee Gak Ngiklan?",
                        headlineHighlight: "OMSET Auto Drop Drastis!",
                        introText: "Oleh karena itu, salah satu cara boost OMSET adalah dengan ngiklan.",
                        warningTitle: "Namun!!! Ngiklan bukan hanya sekedar ngiklan biasa,",
                        warningHighlight: "tapi iklan yang benar-benar terkontrol dan teroptimasi.",
                        problemTitle: "Masalahnya adalah...",
                        problems: [
                            "Sebagian besar budget iklan bisa terbuang sia-sia karena iklan tidak terkontrol dengan baik. Budget habis di produk yang tidak menghasilkan penjualan, tapi Anda tidak tahu mana yang rugi.",
                            "Harus bangun tengah malam untuk setting iklan di jam 00:00 karena promo dimulai tengah malam. Kalau lupa, kehilangan momentum penjualan.",
                            "Pusing cek puluhan hingga ratusan iklan setiap hari. Harus buka satu per satu, cek performa, adjust bid, dan monitor budget. Capek mental!",
                            "Bayar advertiser mahal untuk mengelola banyak toko Shopee. Biaya bulanan bisa puluhan juta, padahal hasilnya belum tentu maksimal.",
                            "Rasio iklan tidak terkontrol dan ternyata boncos. Baru sadar setelah budget habis, ternyata ROI negatif. Terlambat!",
                        ],
                        solutionTitle: "Solusinya?",
                        solutionText: "mengelola iklan Anda secara otomatis 24/7 dengan kontrol penuh. Tidak perlu bangun tengah malam lagi. Tidak perlu panik saat budget habis.",
                        solutionHighlight: "ADSPILOT yang mengatur semuanya, iklan Anda benar-benar terkontrol dan teroptimasi.",
                        ctaText: "Kontrol Iklan Anda Sekarang",
                        ctaUrl: "#harga",
                    }
                }
            ]
        },

        // ==================== VIDEO DEMO SECTION ====================
        {
            id: "section-video-demo-1",
            type: "video-demo",
            enabled: true,
            order: 3,
            blocks: [
                {
                    id: "block-video-demo-1",
                    type: "video-demo",
                    enabled: true,
                    components: {
                        headline: "Lihat",
                        headlineHighlight: "Cara Kerja",
                        headlineEnd: "ADSPILOT dalam 2 Menit",
                        subheadline: "Tonton demo singkat bagaimana ADSPILOT mengelola iklan Shopee Anda secara otomatis, tanpa perlu bangun tengah malam lagi",
                        videoUrl: "",
                    }
                }
            ]
        },

        // ==================== FEATURES SECTION ====================
        {
            id: "section-features-1",
            type: "features",
            enabled: true,
            order: 4,
            blocks: [
                {
                    id: "block-feature-1",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "Zap",
                        title: "Otomasi Iklan Cerdas",
                        description: "Atur iklan Anda sekali, biarkan AdsPilot yang mengelola. Sistem otomasi kami akan mengoptimalkan budget dan bid secara otomatis untuk hasil maksimal.",
                        checklist: [
                            "Auto-bid berdasarkan performa",
                            "Jadwal iklan otomatis",
                            "Pause iklan yang tidak efektif",
                        ],
                    }
                },
                {
                    id: "block-feature-2",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "BarChart3",
                        title: "Analitik Real-Time",
                        description: "Pantau performa iklan Anda secara real-time. Lihat ROI, conversion rate, dan metrik penting lainnya dalam satu dashboard yang mudah dipahami.",
                        checklist: [
                            "Dashboard interaktif",
                            "Menganalisa data harian otomatis",
                            "Memprediksi performa untuk masa depan",
                        ],
                    }
                },
                {
                    id: "block-feature-3",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "BarChart3",
                        title: "Rekam Medic - BCG Matrix",
                        description: "Diagnosis kesehatan iklan dengan teknologi BCG Matrix dari Fortune 500. Ketahui iklan mana yang produktif dan mana yang buang-buang budget.",
                        checklist: [
                            "Kategorisasi iklan otomatis",
                            "Analisis Star, Cash Cow, Dog",
                            "Rekomendasi aksi cerdas",
                        ],
                    }
                },
                {
                    id: "block-feature-4",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "DollarSign",
                        title: "Hemat Budget Hingga 40%",
                        description: "Optimalkan pengeluaran iklan Anda tanpa mengurangi performa. Sistem kami memastikan setiap rupiah yang Anda keluarkan memberikan hasil maksimal.",
                        checklist: [
                            "Smart budget allocation",
                            "Deteksi iklan tidak efektif",
                            "Recomendasi optimasi budget",
                        ],
                    }
                },
                {
                    id: "block-feature-5",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "Shield",
                        title: "100% Aman & Terpercaya",
                        description: "Data dan akun Shopee Anda aman bersama kami. Kami menggunakan enkripsi tingkat enterprise dan tidak pernah menyimpan password Anda.",
                        checklist: [
                            "Enkripsi SSL 256-bit",
                            "Session cookies terenkripsi",
                            "Disconnect kapan saja",
                        ],
                    }
                },
                {
                    id: "block-feature-6",
                    type: "feature",
                    enabled: true,
                    components: {
                        icon: "Rocket",
                        title: "Setup dalam 5 Menit",
                        description: "Tidak perlu ribet! Setup AdsPilot hanya butuh 5 menit. Koneksikan akun Shopee Anda, pilih produk yang ingin diiklankan, dan biarkan AdsPilot bekerja.",
                        checklist: [
                            "Koneksi akun Shopee mudah",
                            "Buat automation rules cepat",
                            "Support via Telegram member group",
                        ],
                    }
                },
            ]
        },

        // ==================== REKAM MEDIC SECTION ====================
        {
            id: "section-rekam-medic-1",
            type: "rekam-medic",
            enabled: true,
            order: 5,
            blocks: [
                {
                    id: "block-rekam-medic-1",
                    type: "rekam-medic",
                    enabled: true,
                    components: {
                        badge: "FITUR REVOLUSIONER",
                        headline: "Akhirnya Terungkap!",
                        headlineHighlight: "Rekam Medic",
                        headlineEnd: "untuk Iklan Shopee",
                        subheadline: "Teknologi yang digunakan perusahaan Fortune 500, sekarang tersedia untuk seller Shopee",
                        whatIsTitle: "Apa Itu Rekam Medic?",
                        whatIsDescription: "Rekam Medic adalah fitur diagnosis kesehatan iklan yang menggunakan teknologi BCG Matrix (Boston Consulting Group) - framework analisis bisnis legendaris yang digunakan perusahaan Fortune 500 untuk mengkategorikan produk berdasarkan Market Share dan Growth Rate. Sekarang, AdsPilot membawa teknologi ini ke dunia iklan Shopee.",
                        card1Title: "Hentikan Pemborosan",
                        card1Description: "Langsung tahu iklan mana yang buang-buang budget. Hentikan iklan \"Dogs\" yang tidak produktif, fokus ke \"Stars\" yang menghasilkan.",
                        card2Title: "Alokasi Budget Cerdas",
                        card2Description: "Tidak perlu nebak-nebak lagi. Rekam Medic memberitahu Anda persis di mana harus investasi budget untuk hasil maksimal.",
                        card3Title: "Teknologi Terbukti",
                        card3Description: "Framework BCG Matrix yang digunakan perusahaan Fortune 500 untuk analisis bisnis. Sekarang tersedia untuk seller Shopee.",
                        ctaHeadline: "Jangan Biarkan Budget Iklan Terbuang Sia-Sia",
                        ctaDescription: "Dengan Rekam Medic, Anda akan langsung tahu iklan mana yang produktif dan mana yang buang-buang duit. Hemat budget hingga 40% dengan alokasi yang tepat.",
                        ctaText: "Coba Rekam Medic Sekarang - Gratis!",
                        ctaUrl: "#harga",
                    }
                }
            ]
        },

        // ==================== TESTIMONIALS SECTION ====================
        {
            id: "section-testimonials-1",
            type: "testimonials",
            enabled: true,
            order: 6,
            blocks: [
                {
                    id: "block-testimonial-1",
                    type: "testimonial",
                    enabled: true,
                    components: {
                        name: "Budi Santoso",
                        role: "Owner Toko Fashion",
                        avatar: "BS",
                        rating: 5,
                        content: "Sejak pakai AdsPilot, penjualan saya meningkat signifikan! Budget iklan lebih efisien dan ROI meningkat. Sekarang saya bisa tidur nyenyak tanpa khawatir iklan boncos. Recommended!",
                    }
                },
                {
                    id: "block-testimonial-2",
                    type: "testimonial",
                    enabled: true,
                    components: {
                        name: "Siti Nurhaliza",
                        role: "Seller Kecantikan",
                        avatar: "SN",
                        rating: 5,
                        content: "Wah, enak banget! Dulu saya harus cek iklan manual setiap hari. Sekarang semua otomatis, saya bisa fokus ke produk baru. Penjualan jadi lebih stabil dan terkontrol!",
                    }
                },
                {
                    id: "block-testimonial-3",
                    type: "testimonial",
                    enabled: true,
                    components: {
                        name: "Ahmad Rizki",
                        role: "Seller Elektronik",
                        avatar: "AR",
                        rating: 5,
                        content: "ROI iklan saya meningkat setelah pakai AdsPilot. Sistem auto-bid-nya benar-benar membantu. Tidak perlu lagi bangun tengah malam untuk setting iklan. Worth it!",
                    }
                },
            ]
        },

        // ==================== HOW IT WORKS SECTION ====================
        {
            id: "section-how-it-works-1",
            type: "how-it-works",
            enabled: true,
            order: 7,
            blocks: [
                {
                    id: "block-how-it-works-1",
                    type: "how-it-works-step",
                    enabled: true,
                    components: {
                        step: "1",
                        icon: "ShoppingBag",
                        title: "Daftar & Koneksikan Akun",
                        description: "Daftar gratis, lalu koneksikan akun Shopee Anda dengan aman. Proses ini hanya butuh 2 menit.",
                    }
                },
                {
                    id: "block-how-it-works-2",
                    type: "how-it-works-step",
                    enabled: true,
                    components: {
                        step: "2",
                        icon: "Target",
                        title: "Pilih Produk & Atur Budget",
                        description: "Pilih produk yang ingin diiklankan dan tentukan budget harian. AdsPilot akan memberikan rekomendasi optimal.",
                    }
                },
                {
                    id: "block-how-it-works-3",
                    type: "how-it-works-step",
                    enabled: true,
                    components: {
                        step: "3",
                        icon: "Sparkles",
                        title: "Biarkan AdsPilot Bekerja",
                        description: "Sit back and relax! ADSPILOT akan mengelola iklan Anda 24/7, mengoptimalkan performa secara otomatis.",
                    }
                },
            ]
        },

        // ==================== PRICING SECTION (Reference - Dynamic) ====================
        {
            id: "section-pricing-1",
            type: "pricing",
            enabled: true,
            order: 8,
            blocks: [
                {
                    id: "block-pricing-ref-1",
                    type: "pricing",
                    enabled: true,
                    components: {
                        note: "Pricing data diambil dari API plans secara otomatis",
                    }
                }
            ]
        },

        // ==================== FAQ SECTION ====================
        {
            id: "section-faq-1",
            type: "faq",
            enabled: true,
            order: 9,
            blocks: [
                {
                    id: "block-faq-1",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Apa itu ADSPILOT?",
                        answer: "ADSPILOT adalah platform otomasi iklan untuk Shopee yang membantu seller mengelola, mengoptimalkan, dan meningkatkan performa iklan secara otomatis. Dengan algoritma cerdas, ADSPILOT memastikan setiap rupiah budget iklan Anda memberikan hasil maksimal.",
                    }
                },
                {
                    id: "block-faq-2",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Bagaimana cara AdsPilot bekerja?",
                        answer: "AdsPilot terhubung dengan akun Shopee Anda menggunakan session cookies (sama seperti saat Anda login di browser). Setelah setup, sistem otomasi kami akan menganalisis performa iklan, mengoptimalkan bid, mengatur budget, dan memberikan rekomendasi strategi secara real-time. Semua berjalan otomatis 24/7.",
                    }
                },
                {
                    id: "block-faq-3",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Apakah AdsPilot aman untuk akun Shopee saya?",
                        answer: "Ya, sangat aman! AdsPilot menggunakan session cookies yang terenkripsi (sama seperti saat Anda login di browser Shopee). Kami menggunakan enkripsi SSL 256-bit untuk melindungi data Anda. Kami TIDAK pernah menyimpan password Anda, dan Anda bisa disconnect kapan saja. Seller Shopee sudah mempercayai AdsPilot untuk mengelola iklan mereka dengan aman.",
                    }
                },
                {
                    id: "block-faq-4",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Berapa lama waktu setup?",
                        answer: "Setup AdsPilot sangat cepat! Hanya butuh 5 menit. Anda cukup daftar, koneksikan akun Shopee, pilih produk yang ingin diiklankan, dan tentukan budget. Setelah itu, AdsPilot langsung mulai bekerja.",
                    }
                },
                {
                    id: "block-faq-5",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Apakah ada trial gratis?",
                        answer: "Ya! Kami menawarkan trial gratis 7 hari untuk semua paket. Anda bisa mencoba semua fitur tanpa perlu kartu kredit. Jika tidak puas, Anda bisa cancel kapan saja tanpa biaya.",
                    }
                },
                {
                    id: "block-faq-6",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Bagaimana jika saya tidak puas?",
                        answer: "Anda bisa cancel subscription kapan saja tanpa biaya tambahan. Untuk trial gratis 7 hari, tidak ada charge sama sekali. Untuk paket berbayar, Anda bisa berhenti berlangganan kapan saja melalui dashboard, dan akses akan berlanjut sampai akhir periode yang sudah dibayar. Kami juga punya komunitas Telegram yang aktif untuk membantu Anda memaksimalkan hasil iklan!",
                    }
                },
                {
                    id: "block-faq-7",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Apakah ADSPILOT bisa digunakan untuk semua kategori produk?",
                        answer: "Ya! ADSPILOT bekerja untuk semua kategori produk di Shopee, mulai dari fashion, kecantikan, elektronik, makanan, hingga produk digital. Sistem otomasi kami akan menyesuaikan strategi iklan sesuai dengan karakteristik produk Anda.",
                    }
                },
                {
                    id: "block-faq-8",
                    type: "faq",
                    enabled: true,
                    components: {
                        question: "Bagaimana cara menghubungi support?",
                        answer: "Kami menyediakan support via Telegram member group untuk semua paket. Anda akan bergabung dengan komunitas seller Shopee yang aktif, bisa bertanya kapan saja, dan mendapatkan bantuan dari tim support serta member lainnya. Tim support kami siap membantu Anda kapan saja!",
                    }
                },
            ]
        },

        // ==================== FINAL CTA SECTION ====================
        {
            id: "section-final-cta-1",
            type: "final-cta",
            enabled: true,
            order: 10,
            blocks: [
                {
                    id: "block-final-cta-1",
                    type: "final-cta",
                    enabled: true,
                    components: {
                        headline: "Hentikan Ketakutan,",
                        headlineHighlight: "Tidur Tenang Mulai Malam Ini",
                        description: "Jangan biarkan ketakutan budget iklan habis sia-sia atau harus bangun tengah malam menghambat bisnis Anda. Mulai gratis hari ini!",
                        ctaText: "Daftar Sekarang - Gratis 7 Hari",
                        ctaUrl: "#harga",
                        footerNote: "Tidak perlu kartu kredit • Cancel kapan saja • Garansi 30 hari uang kembali",
                    }
                }
            ]
        },

        // ==================== FOOTER SECTION ====================
        {
            id: "section-footer-1",
            type: "footer",
            enabled: true,
            order: 11,
            blocks: [
                {
                    id: "block-footer-1",
                    type: "footer",
                    enabled: true,
                    components: {
                        tagline: "Platform otomasi iklan terbaik untuk seller Shopee di Indonesia.",
                        column1Title: "Produk",
                        column1Links: "Fitur|#fitur,Harga|#harga,Testimoni|#testimoni",
                        column2Title: "Perusahaan",
                        column2Links: "FAQ|#faq,Tentang Kami|#,Blog|#",
                        column3Title: "Support",
                        column3Links: "Hubungi Kami|#,Privacy Policy|#,Terms of Service|#",
                        copyright: "© 2026 AdsPilot. All rights reserved.",
                    }
                }
            ]
        },
    ]
}

export default LANDING_PAGE_SEED_DATA
