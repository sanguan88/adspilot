// Dynamic Block Components - Component mapping and exports
import React from "react"

export { HeroBlock } from "./HeroBlock"
export { FeatureCard } from "./FeatureCard"
export { PricingCard } from "./PricingCard"
export { TestimonialCard } from "./TestimonialCard"
export { CTASection } from "./CTASection"
export { FAQItem } from "./FAQItem"
export { StatsCounter } from "./StatsCounter"
export { LogoGrid } from "./LogoGrid"
export { PromoBannerReference } from "./PromoBannerReference"

import { HeroBlock } from "./HeroBlock"
import { FeatureCard } from "./FeatureCard"
import { PricingCard } from "./PricingCard"
import { TestimonialCard } from "./TestimonialCard"
import { CTASection } from "./CTASection"
import { FAQItem } from "./FAQItem"
import { StatsCounter } from "./StatsCounter"
import { LogoGrid } from "./LogoGrid"
import { PromoBannerReference } from "./PromoBannerReference"
import type { Block, BlockType } from "@/types/page-builder"

// Component mapping with isPreview support
export const BLOCK_COMPONENT_MAP: Record<BlockType, React.ComponentType<{ block: Block; isPreview?: boolean }>> = {
    "hero": HeroBlock,
    "feature": FeatureCard,
    "pricing": PricingCard,
    "testimonial": TestimonialCard,
    "cta": CTASection,
    "faq": FAQItem,
    "stats": StatsCounter,
    "logos": LogoGrid,
    "promo-banner-ref": PromoBannerReference,
}

// Render block dynamically with isPreview support
export function renderBlock(block: Block, isPreview: boolean = false) {
    const Component = BLOCK_COMPONENT_MAP[block.type]
    if (!Component) {
        console.warn(`Unknown block type: ${block.type}`)
        return null
    }
    return <Component key={block.id} block={block} isPreview={isPreview} />
}
