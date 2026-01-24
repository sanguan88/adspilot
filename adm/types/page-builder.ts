// Page Builder Types - Full Revamp

export type BlockType =
    | 'hero'
    | 'feature'
    | 'pricing'
    | 'testimonial'
    | 'cta'
    | 'faq'
    | 'stats'
    | 'logos'
    | 'promo-banner-ref'
    // New block types
    | 'hook-section'
    | 'video-demo'
    | 'rekam-medic'
    | 'how-it-works-step'
    | 'final-cta'
    | 'footer';

export type SectionType =
    | 'hero'
    | 'features'
    | 'pricing'
    | 'testimonials'
    | 'cta'
    | 'faq'
    | 'stats'
    | 'logos'
    | 'promo'
    // New section types
    | 'hook'
    | 'video-demo'
    | 'rekam-medic'
    | 'how-it-works'
    | 'final-cta'
    | 'footer';

export interface BlockComponents {
    [key: string]: string | number | boolean | string[] | object[];
}

export interface Block {
    id: string;
    type: BlockType;
    components: BlockComponents;
    enabled?: boolean;
}

export interface Section {
    id: string;
    type: SectionType;
    enabled: boolean;
    order: number;
    blocks: Block[];
    // Section-level styling
    background?: 'white' | 'gradient-primary' | 'gradient-red' | 'gradient-dark' | 'primary';
}

export interface PageContent {
    sections: Section[];
}

export interface PageBuilderData {
    content: PageContent;
    updated_at: string | null;
    updated_by: string | null;
}

export interface BlockDefinition {
    label: string;
    icon: string;
    description?: string;
    defaultComponents: BlockComponents;
    fields: Array<{
        key: string;
        label: string;
        type: 'text' | 'textarea' | 'richtext' | 'image' | 'url' | 'color' | 'select' | 'list' | 'checklist';
        options?: string[];
        placeholder?: string;
        help?: string;
    }>;
}

// Block Type Definitions with default components
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
    // ==================== HERO ====================
    hero: {
        label: "Hero Section",
        icon: "Rocket",
        description: "Main hero banner with headline, video, and trust badges",
        defaultComponents: {
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
        },
        fields: [
            { key: "headline", label: "Headline (sebelum highlight)", type: "text", placeholder: "Tingkatkan Penjualan..." },
            { key: "headlineHighlight1", label: "Highlight Text 1", type: "text", placeholder: "Hingga 300%", help: "Text dengan highlight kuning" },
            { key: "headlineHighlight2", label: "Highlight Text 2", type: "text", placeholder: "Otomasi Cerdas 24/7" },
            { key: "subheadline", label: "Subheadline", type: "textarea", placeholder: "Deskripsi pendukung..." },
            { key: "ctaText", label: "CTA Button Text", type: "text", placeholder: "Daftar Sekarang" },
            { key: "ctaUrl", label: "CTA URL", type: "url", placeholder: "#harga" },
            { key: "videoUrl", label: "Video URL (optional)", type: "url", placeholder: "https://youtube.com/..." },
            { key: "trustBadge1", label: "Trust Badge 1", type: "text", placeholder: "Otomasi 24/7" },
            { key: "trustBadge2", label: "Trust Badge 2", type: "text", placeholder: "Aman & Terpercaya" },
            { key: "trustBadge3", label: "Trust Badge 3", type: "text", placeholder: "Setup 5 Menit" },
        ],
    },

    // ==================== HOOK SECTION ====================
    "hook-section": {
        label: "Hook Section (Pain Points)",
        icon: "AlertTriangle",
        description: "Pain points section dengan alert boxes",
        defaultComponents: {
            badgeText: "⚠️ PERHATIAN!",
            headline: "Seller Shopee Gak Ngiklan?",
            headlineHighlight: "OMSET Auto Drop Drastis!",
            introText: "Oleh karena itu, salah satu cara boost OMSET adalah dengan ngiklan.",
            warningTitle: "Namun!!! Ngiklan bukan hanya sekedar ngiklan biasa,",
            warningHighlight: "tapi iklan yang benar-benar terkontrol dan teroptimasi.",
            problemTitle: "Masalahnya adalah...",
            problems: [
                "Sebagian besar budget iklan bisa terbuang sia-sia karena iklan tidak terkontrol dengan baik.",
                "Harus bangun tengah malam untuk setting iklan di jam 00:00.",
                "Pusing cek puluhan hingga ratusan iklan setiap hari.",
                "Bayar advertiser mahal untuk mengelola banyak toko Shopee.",
                "Rasio iklan tidak terkontrol dan ternyata boncos.",
            ],
            solutionTitle: "Solusinya?",
            solutionText: "ADSPILOT mengelola iklan Anda secara otomatis 24/7 dengan kontrol penuh.",
            solutionHighlight: "ADSPILOT yang mengatur semuanya, iklan Anda benar-benar terkontrol dan teroptimasi.",
            ctaText: "Kontrol Iklan Anda Sekarang",
            ctaUrl: "#harga",
        },
        fields: [
            { key: "badgeText", label: "Badge Text", type: "text", placeholder: "⚠️ PERHATIAN!" },
            { key: "headline", label: "Headline", type: "text" },
            { key: "headlineHighlight", label: "Headline Highlight", type: "text" },
            { key: "introText", label: "Intro Text", type: "textarea" },
            { key: "warningTitle", label: "Warning Title", type: "text" },
            { key: "warningHighlight", label: "Warning Highlight", type: "text" },
            { key: "problemTitle", label: "Problem Title", type: "text" },
            { key: "problems", label: "Problem List (pisah dengan |)", type: "textarea", help: "Pisahkan setiap poin dengan |" },
            { key: "solutionTitle", label: "Solution Title", type: "text" },
            { key: "solutionText", label: "Solution Text", type: "textarea" },
            { key: "solutionHighlight", label: "Solution Highlight", type: "text" },
            { key: "ctaText", label: "CTA Text", type: "text" },
            { key: "ctaUrl", label: "CTA URL", type: "url" },
        ],
    },

    // ==================== VIDEO DEMO ====================
    "video-demo": {
        label: "Video Demo Section",
        icon: "Play",
        description: "Video demo dengan heading",
        defaultComponents: {
            headline: "Lihat",
            headlineHighlight: "Cara Kerja",
            headlineEnd: "ADSPILOT dalam 2 Menit",
            subheadline: "Tonton demo singkat bagaimana ADSPILOT mengelola iklan Shopee Anda secara otomatis, tanpa perlu bangun tengah malam lagi",
            videoUrl: "",
        },
        fields: [
            { key: "headline", label: "Headline (awal)", type: "text" },
            { key: "headlineHighlight", label: "Headline Highlight", type: "text" },
            { key: "headlineEnd", label: "Headline (akhir)", type: "text" },
            { key: "subheadline", label: "Subheadline", type: "textarea" },
            { key: "videoUrl", label: "Video URL", type: "url" },
        ],
    },

    // ==================== FEATURE CARD ====================
    feature: {
        label: "Feature Card",
        icon: "Star",
        description: "Feature card dengan icon, title, description, dan checklist",
        defaultComponents: {
            icon: "Zap",
            title: "Otomasi Iklan Cerdas",
            description: "Atur iklan Anda sekali, biarkan AdsPilot yang mengelola.",
            checklist: [
                "Auto-bid berdasarkan performa",
                "Jadwal iklan otomatis",
                "Pause iklan yang tidak efektif",
            ],
        },
        fields: [
            { key: "icon", label: "Icon (Lucide icon name)", type: "text", placeholder: "Zap, BarChart3, Shield, etc." },
            { key: "title", label: "Title", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "checklist", label: "Checklist Items (pisah dengan |)", type: "textarea", help: "Pisahkan setiap item dengan |" },
        ],
    },

    // ==================== REKAM MEDIC ====================
    "rekam-medic": {
        label: "Rekam Medic Section",
        icon: "Activity",
        description: "BCG Matrix super feature showcase",
        defaultComponents: {
            badge: "FITUR REVOLUSIONER",
            headline: "Akhirnya Terungkap!",
            headlineHighlight: "Rekam Medic",
            headlineEnd: "untuk Iklan Shopee",
            subheadline: "Teknologi yang digunakan perusahaan Fortune 500, sekarang tersedia untuk seller Shopee",
            whatIsTitle: "Apa Itu Rekam Medic?",
            whatIsDescription: "Rekam Medic adalah fitur diagnosis kesehatan iklan yang menggunakan teknologi BCG Matrix (Boston Consulting Group) - framework analisis bisnis legendaris yang digunakan perusahaan Fortune 500.",
            benefits: [
                { title: "Star Products", description: "Iklan yang menghasilkan tinggi dan tumbuh cepat. Fokus investasi di sini!" },
                { title: "Cash Cows", description: "Iklan stabil yang menghasilkan uang konsisten. Pertahankan!" },
                { title: "Question Marks", description: "Iklan potensial tapi belum jelas. Perlu optimasi atau cut loss?" },
                { title: "Dogs", description: "Iklan yang buang-buang budget. Hentikan sekarang!" },
            ],
            card1Title: "Hentikan Pemborosan",
            card1Description: "Langsung tahu iklan mana yang buang-buang budget.",
            card2Title: "Alokasi Budget Cerdas",
            card2Description: "Tidak perlu nebak-nebak lagi. Rekam Medic memberitahu Anda persis di mana harus investasi.",
            card3Title: "Teknologi Terbukti",
            card3Description: "Framework BCG Matrix yang digunakan perusahaan Fortune 500.",
            ctaHeadline: "Jangan Biarkan Budget Iklan Terbuang Sia-Sia",
            ctaDescription: "Dengan Rekam Medic, Anda akan langsung tahu iklan mana yang produktif dan mana yang buang-buang duit.",
            ctaText: "Coba Rekam Medic Sekarang - Gratis!",
            ctaUrl: "#harga",
        },
        fields: [
            { key: "badge", label: "Badge Text", type: "text" },
            { key: "headline", label: "Headline", type: "text" },
            { key: "headlineHighlight", label: "Headline Highlight", type: "text" },
            { key: "headlineEnd", label: "Headline End", type: "text" },
            { key: "subheadline", label: "Subheadline", type: "textarea" },
            { key: "whatIsTitle", label: "What Is Title", type: "text" },
            { key: "whatIsDescription", label: "What Is Description", type: "textarea" },
            { key: "card1Title", label: "Benefit Card 1 Title", type: "text" },
            { key: "card1Description", label: "Benefit Card 1 Description", type: "textarea" },
            { key: "card2Title", label: "Benefit Card 2 Title", type: "text" },
            { key: "card2Description", label: "Benefit Card 2 Description", type: "textarea" },
            { key: "card3Title", label: "Benefit Card 3 Title", type: "text" },
            { key: "card3Description", label: "Benefit Card 3 Description", type: "textarea" },
            { key: "ctaHeadline", label: "CTA Headline", type: "text" },
            { key: "ctaDescription", label: "CTA Description", type: "textarea" },
            { key: "ctaText", label: "CTA Button Text", type: "text" },
            { key: "ctaUrl", label: "CTA URL", type: "url" },
        ],
    },

    // ==================== TESTIMONIAL ====================
    testimonial: {
        label: "Testimonial Card",
        icon: "MessageSquare",
        description: "Customer testimonial with rating",
        defaultComponents: {
            name: "Budi Santoso",
            role: "Owner Toko Fashion",
            avatar: "BS",
            rating: 5,
            content: "Sejak pakai AdsPilot, penjualan saya meningkat signifikan! Budget iklan lebih efisien dan ROI meningkat.",
        },
        fields: [
            { key: "name", label: "Name", type: "text" },
            { key: "role", label: "Role/Title", type: "text" },
            { key: "avatar", label: "Avatar (initials or URL)", type: "text" },
            { key: "rating", label: "Rating", type: "select", options: ["1", "2", "3", "4", "5"] },
            { key: "content", label: "Testimonial Content", type: "textarea" },
        ],
    },

    // ==================== HOW IT WORKS STEP ====================
    "how-it-works-step": {
        label: "How It Works Step",
        icon: "ListOrdered",
        description: "Single step in how-it-works section",
        defaultComponents: {
            step: "1",
            icon: "ShoppingBag",
            title: "Daftar & Koneksikan Akun",
            description: "Daftar gratis, lalu koneksikan akun Shopee Anda dengan aman. Proses ini hanya butuh 2 menit.",
        },
        fields: [
            { key: "step", label: "Step Number", type: "text" },
            { key: "icon", label: "Icon (Lucide name)", type: "text" },
            { key: "title", label: "Title", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
        ],
    },

    // ==================== PRICING (Reference) ====================
    pricing: {
        label: "Pricing Card (Dynamic)",
        icon: "DollarSign",
        description: "Pricing diambil dari API plans, tidak bisa diedit di sini",
        defaultComponents: {
            note: "Pricing data diambil dari API plans secara otomatis",
        },
        fields: [],
    },

    // ==================== FAQ ====================
    faq: {
        label: "FAQ Item",
        icon: "HelpCircle",
        description: "Single FAQ question and answer",
        defaultComponents: {
            question: "Apa itu ADSPILOT?",
            answer: "ADSPILOT adalah platform otomasi iklan untuk Shopee yang membantu seller mengelola, mengoptimalkan, dan meningkatkan performa iklan secara otomatis.",
        },
        fields: [
            { key: "question", label: "Question", type: "text" },
            { key: "answer", label: "Answer", type: "textarea" },
        ],
    },

    // ==================== FINAL CTA ====================
    "final-cta": {
        label: "Final CTA Section",
        icon: "Target",
        description: "Full-width gradient CTA section",
        defaultComponents: {
            headline: "Hentikan Ketakutan,",
            headlineHighlight: "Tidur Tenang Mulai Malam Ini",
            description: "Jangan biarkan ketakutan budget iklan habis sia-sia atau harus bangun tengah malam menghambat bisnis Anda. Mulai gratis hari ini!",
            ctaText: "Daftar Sekarang - Gratis 7 Hari",
            ctaUrl: "#harga",
            footerNote: "Tidak perlu kartu kredit • Cancel kapan saja • Garansi 30 hari uang kembali",
        },
        fields: [
            { key: "headline", label: "Headline", type: "text" },
            { key: "headlineHighlight", label: "Headline Highlight", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "ctaText", label: "CTA Button Text", type: "text" },
            { key: "ctaUrl", label: "CTA URL", type: "url" },
            { key: "footerNote", label: "Footer Note", type: "text" },
        ],
    },

    // ==================== FOOTER ====================
    footer: {
        label: "Footer Section",
        icon: "LayoutTemplate",
        description: "Website footer with columns",
        defaultComponents: {
            tagline: "Platform otomasi iklan terbaik untuk seller Shopee di Indonesia.",
            column1Title: "Produk",
            column1Links: "Fitur|#fitur,Harga|#harga,Testimoni|#testimoni",
            column2Title: "Perusahaan",
            column2Links: "FAQ|#faq,Tentang Kami|#,Blog|#",
            column3Title: "Support",
            column3Links: "Hubungi Kami|#,Privacy Policy|#,Terms of Service|#",
            copyright: "© 2026 AdsPilot. All rights reserved.",
        },
        fields: [
            { key: "tagline", label: "Tagline", type: "textarea" },
            { key: "column1Title", label: "Column 1 Title", type: "text" },
            { key: "column1Links", label: "Column 1 Links (label|url,label|url)", type: "textarea" },
            { key: "column2Title", label: "Column 2 Title", type: "text" },
            { key: "column2Links", label: "Column 2 Links", type: "textarea" },
            { key: "column3Title", label: "Column 3 Title", type: "text" },
            { key: "column3Links", label: "Column 3 Links", type: "textarea" },
            { key: "copyright", label: "Copyright Text", type: "text" },
        ],
    },

    // ==================== EXISTING (kept for compatibility) ====================
    cta: {
        label: "CTA Banner",
        icon: "Target",
        defaultComponents: {
            headline: "Ready to get started?",
            description: "Join thousands of satisfied customers",
            primaryCtaText: "Start Free Trial",
            primaryCtaUrl: "#",
            secondaryCtaText: "Learn More",
            secondaryCtaUrl: "#",
        },
        fields: [
            { key: "headline", label: "Headline", type: "text" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "primaryCtaText", label: "Primary CTA", type: "text" },
            { key: "primaryCtaUrl", label: "Primary URL", type: "url" },
            { key: "secondaryCtaText", label: "Secondary CTA", type: "text" },
            { key: "secondaryCtaUrl", label: "Secondary URL", type: "url" },
        ],
    },

    stats: {
        label: "Stats Counter",
        icon: "BarChart3",
        defaultComponents: {
            icon: "📊",
            value: "1000",
            suffix: "+",
            label: "Happy Customers",
        },
        fields: [
            { key: "icon", label: "Icon Emoji", type: "text" },
            { key: "value", label: "Value", type: "text" },
            { key: "suffix", label: "Suffix", type: "text" },
            { key: "label", label: "Label", type: "text" },
        ],
    },

    logos: {
        label: "Logo Grid",
        icon: "Grid3x3",
        defaultComponents: {
            logos: ["logo1.png", "logo2.png", "logo3.png"],
        },
        fields: [
            { key: "logos", label: "Logo URLs (comma-separated)", type: "textarea" },
        ],
    },

    "promo-banner-ref": {
        label: "Promo Banner (Reference)",
        icon: "Megaphone",
        defaultComponents: {
            note: "Content managed in Promo Banner tab",
        },
        fields: [],
    },
};

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
    hero: "Hero Section",
    features: "Features Section",
    pricing: "Pricing Section",
    testimonials: "Testimonials Section",
    cta: "CTA Section",
    faq: "FAQ Section",
    stats: "Stats Section",
    logos: "Logo Grid Section",
    promo: "Promo Banner Section",
    // New sections
    hook: "Hook Section (Pain Points)",
    "video-demo": "Video Demo Section",
    "rekam-medic": "Rekam Medic Section",
    "how-it-works": "How It Works Section",
    "final-cta": "Final CTA Section",
    footer: "Footer Section",
};

// Section to Block mapping
export const SECTION_BLOCK_MAP: Record<SectionType, BlockType[]> = {
    hero: ["hero"],
    hook: ["hook-section"],
    "video-demo": ["video-demo"],
    features: ["feature"],
    "rekam-medic": ["rekam-medic"],
    testimonials: ["testimonial"],
    "how-it-works": ["how-it-works-step"],
    pricing: ["pricing"],
    faq: ["faq"],
    "final-cta": ["final-cta"],
    footer: ["footer"],
    cta: ["cta"],
    stats: ["stats"],
    logos: ["logos"],
    promo: ["promo-banner-ref"],
};
