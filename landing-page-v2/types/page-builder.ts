// Page Builder Types

export type BlockType =
    | 'hero-banner'
    | 'feature-card'
    | 'pricing-card'
    | 'testimonial-card'
    | 'cta-section'
    | 'faq-item'
    | 'stats-counter'
    | 'logo-grid'
    | 'promo-banner-ref';

export type SectionType =
    | 'hero'
    | 'features'
    | 'pricing'
    | 'testimonials'
    | 'cta'
    | 'faq'
    | 'stats'
    | 'logos'
    | 'promo-banner-ref';

export interface BlockComponents {
    [key: string]: string | number | boolean | string[];
}

export interface Block {
    id: string;
    type: BlockType;
    components: BlockComponents;
}

export interface Section {
    id: string;
    type: SectionType;
    enabled: boolean;
    order: number;
    blocks: Block[];
}

export interface PageContent {
    sections: Section[];
}

export interface PageBuilderData {
    content: PageContent;
    updated_at: string | null;
    updated_by: string | null;
}

// Block Type Definitions with default components
export const BLOCK_DEFINITIONS: Record<
    BlockType,
    {
        label: string;
        icon: string;
        defaultComponents: BlockComponents;
        fields: Array<{
            key: string;
            label: string;
            type: 'text' | 'textarea' | 'richtext' | 'image' | 'url' | 'color' | 'select';
            options?: string[];
            placeholder?: string;
        }>;
    };

// Block Type Definitions with default components
export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
    hero: {
        label: "Hero Banner",
        icon: "Rocket",
        defaultComponents: {
            headline: "Welcome to AdsPilot",
            subtitle: "Automate your Shopee ads",
            ctaText: "Get Started",
            ctaUrl: "#",
            backgroundImage: "",
        },
        fields: [
            { key: "headline", label: "Headline", type: "text", placeholder: "Main headline" },
            { key: "subtitle", label: "Subtitle", type: "textarea", placeholder: "Supporting text" },
            { key: "ctaText", label: "CTA Text", type: "text", placeholder: "Button text" },
            { key: "ctaUrl", label: "CTA URL", type: "url", placeholder: "https://..." },
            { key: "backgroundImage", label: "Background Image", type: "image" },
        ],
    },
    feature: {
        label: "Feature Card",
        icon: "Star",
        defaultComponents: {
            icon: "✨",
            title: "Feature Title",
            description: "Feature description",
            accentColor: "#3b82f6",
        },
        fields: [
            { key: "icon", label: "Icon Emoji", type: "text", placeholder: "✨" },
            { key: "title", label: "Title", type: "text", placeholder: "Feature name" },
            { key: "description", label: "Description", type: "textarea", placeholder: "Feature details" },
            { key: "accentColor", label: "Accent Color", type: "color" },
        ],
    },
    pricing: {
        label: "Pricing Card",
        icon: "DollarSign",
        defaultComponents: {
            name: "Basic Plan",
            price: "99",
            currency: "Rp",
            period: "/month",
            features: ["Feature 1", "Feature 2", "Feature 3"],
            ctaText: "Choose Plan",
            ctaUrl: "#",
            highlighted: false,
        },
        fields: [
            { key: "name", label: "Plan Name", type: "text", placeholder: "Basic" },
            { key: "price", label: "Price", type: "text", placeholder: "99" },
            { key: "currency", label: "Currency", type: "text", placeholder: "Rp" },
            { key: "period", label: "Period", type: "text", placeholder: "/month" },
            {
                key: "features",
                label: "Features (comma-separated)",
                type: "textarea",
                placeholder: "Feature 1, Feature 2, Feature 3",
            },
            { key: "ctaText", label: "CTA Text", type: "text", placeholder: "Choose Plan" },
            { key: "ctaUrl", label: "CTA URL", type: "url", placeholder: "#" },
            { key: "highlighted", label: 'Highlighted', type: 'select', options: ['true', 'false'] },
        ],
    },
    testimonial: {
        label: "Testimonial",
        icon: "MessageSquare",
        defaultComponents: {
            name: "John Doe",
            role: "CEO at Company",
            avatar: "",
            rating: 5,
            content: "This product is amazing!",
        },
        fields: [
            { key: "name", label: "Name", type: "text", placeholder: "John Doe" },
            { key: "role", label: "Role", type: "text", placeholder: "CEO at Company" },
            { key: "avatar", label: "Avatar Image", type: "image" },
            { key: "rating", label: "Rating", type: "select", options: ["1", "2", "3", "4", "5"] },
            { key: "content", label: "Testimonial", type: "richtext", placeholder: "Customer feedback" },
        ],
    },
    cta: {
        label: "CTA Section",
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
            { key: "headline", label: "Headline", type: "text", placeholder: "Main CTA" },
            { key: "description", label: "Description", type: "textarea", placeholder: "Supporting text" },
            { key: "primaryCtaText", label: "Primary CTA", type: "text", placeholder: "Start Now" },
            { key: "primaryCtaUrl", label: "Primary URL", type: "url", placeholder: "#" },
            { key: "secondaryCtaText", label: "Secondary CTA", type: "text", placeholder: "Learn More" },
            { key: "secondaryCtaUrl", label: "Secondary URL", type: "url", placeholder: "#" },
        ],
    },
    faq: {
        label: "FAQ Item",
        icon: "HelpCircle",
        defaultComponents: {
            question: "Frequently asked question?",
            answer: "Answer to the question",
        },
        fields: [
            { key: "question", label: "Question", type: "text", placeholder: "What is...?" },
            { key: "answer", label: "Answer", type: "richtext", placeholder: "The answer is..." },
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
            { key: "icon", label: "Icon Emoji", type: "text", placeholder: "📊" },
            { key: "value", label: "Value", type: "text", placeholder: "1000" },
            { key: "suffix", label: "Suffix", type: "text", placeholder: "+" },
            { key: "label", label: "Label", type: "text", placeholder: "Description" },
        ],
    },
    logos: {
        label: "Logo Grid",
        icon: "Grid3x3",
        defaultComponents: {
            logos: ["logo1.png", "logo2.png", "logo3.png"],
        },
        fields: [
            {
                key: "logos",
                label: "Logo URLs (comma-separated)",
                type: "textarea",
                placeholder: "logo1.png, logo2.png, logo3.png",
            },
        ],
    },
    "promo-banner-ref": {
        label: "Promo Banner (Reference)",
        icon: "Megaphone",
        defaultComponents: {
            note: 'Content managed in Promo Banner tab',
        },
        fields: [],
    },
};

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
    hero: 'Hero Section',
    features: 'Features Section',
    pricing: 'Pricing Section',
    testimonials: 'Testimonials Section',
    cta: 'CTA Section',
    faq: 'FAQ Section',
    stats: 'Stats Section',
    logos: 'Logo Grid Section',
    'promo-banner-ref': 'Promo Banner Section',
};
