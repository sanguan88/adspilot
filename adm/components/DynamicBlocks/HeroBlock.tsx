"use client"

import { Button } from "@/components/ui/button"
import { HighlightText } from "@/components/ui/highlight-text"
import type { Block } from "@/types/page-builder"
import { Clock, Shield, Zap, Play } from "lucide-react"

interface HeroBlockProps {
    block: Block
    isPreview?: boolean
}

export function HeroBlock({ block, isPreview = false }: HeroBlockProps) {
    const {
        headline = "Tingkatkan Penjualan Shopee Anda",
        headlineHighlight1 = "Hingga 300%",
        headlineHighlight2 = "Otomasi Cerdas 24/7",
        subheadline = "",
        ctaText = "Daftar Sekarang",
        ctaUrl = "#harga",
        trustBadge1 = "Otomasi 24/7",
        trustBadge2 = "Aman & Terpercaya",
        trustBadge3 = "Setup 5 Menit",
    } = block.components

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-white py-12 sm:py-20 lg:py-28">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    {/* Headline */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
                        {headline as string}{" "}
                        <HighlightText>{headlineHighlight1 as string}</HighlightText>{" "}
                        dengan <HighlightText>{headlineHighlight2 as string}</HighlightText>!
                    </h1>

                    {/* Subheadline */}
                    <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
                        {subheadline as string}
                    </p>

                    {/* Video Placeholder */}
                    <div className="relative w-full mb-6 sm:mb-8">
                        <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 max-w-4xl mx-auto flex items-center justify-center">
                            <div className="text-center p-8">
                                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Play className="w-10 h-10 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">Video Demo</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Button */}
                    {!isPreview && (
                        <Button size="lg" className="text-base px-8 py-6 h-auto mb-6">
                            {ctaText as string}
                        </Button>
                    )}

                    {/* Trust Badges */}
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-muted-foreground">
                            <strong>Solusi untuk seller yang lelah mengelola iklan manual</strong>
                        </p>
                        <div className="flex items-center gap-6 flex-wrap justify-center text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <span>{trustBadge1 as string}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <span>{trustBadge2 as string}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span>{trustBadge3 as string}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
