import type { Block } from "../../types/page-builder"
import { HighlightText } from "@/components/ui/highlight-text"
import { Clock, Shield, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeroBlockProps {
    block: Block
    isPreview?: boolean
}

export function HeroBlock({ block, isPreview = false }: HeroBlockProps) {
    const {
        headline = "Welcome",
        subtitle = "",
        ctaText = "Get Started",
        ctaLink = "#",
        backgroundImage = "",
    } = block.components

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isPreview) {
            e.preventDefault()
        }
    }

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-white py-12 sm:py-20 lg:py-28">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    {/* Headline with HighlightText support */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                        {headline}
                    </h1>

                    {/* Subheadline */}
                    {subtitle && (
                        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
                            {subtitle}
                        </p>
                    )}

                    {/* CTA Button */}
                    {ctaText && (
                        <Button size="lg" className="mb-6 sm:mb-8" asChild>
                            <a
                                href={isPreview ? undefined : (ctaLink as string)}
                                onClick={handleClick}
                            >
                                {ctaText}
                            </a>
                        </Button>
                    )}

                    {/* Social Proof */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>Solusi untuk seller yang lelah mengelola iklan manual</strong>
                        </p>
                        <div className="flex items-center gap-6 flex-wrap justify-center text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span>Otomasi 24/7</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <span>Aman & Terpercaya</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span>Setup 5 Menit</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
