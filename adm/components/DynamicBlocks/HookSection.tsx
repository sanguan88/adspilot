"use client"

import { Button } from "@/components/ui/button"
import { HighlightText } from "@/components/ui/highlight-text"
import type { Block } from "@/types/page-builder"
import { ArrowRight } from "lucide-react"

interface HookSectionProps {
    block: Block
    isPreview?: boolean
}

export function HookSection({ block, isPreview = false }: HookSectionProps) {
    const {
        badgeText = "⚠️ PERHATIAN!",
        headline = "Seller Shopee Gak Ngiklan?",
        headlineHighlight = "OMSET Auto Drop Drastis!",
        introText = "Oleh karena itu, salah satu cara boost OMSET adalah dengan ngiklan.",
        warningTitle = "Namun!!! Ngiklan bukan hanya sekedar ngiklan biasa,",
        warningHighlight = "tapi iklan yang benar-benar terkontrol dan teroptimasi.",
        problemTitle = "Masalahnya adalah...",
        problems = [],
        solutionTitle = "Solusinya?",
        solutionText = "ADSPILOT mengelola iklan Anda secara otomatis 24/7 dengan kontrol penuh.",
        solutionHighlight = "ADSPILOT yang mengatur semuanya, iklan Anda benar-benar terkontrol dan teroptimasi.",
        ctaText = "Kontrol Iklan Anda Sekarang",
        ctaUrl = "#harga",
    } = block.components

    // Parse problems - could be array or pipe-separated string
    const problemList = Array.isArray(problems)
        ? problems
        : typeof problems === 'string'
            ? problems.split('|').map(p => p.trim()).filter(Boolean)
            : []

    return (
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-red-50 via-orange-50 to-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg shadow-xl border-2 border-red-200 p-8 sm:p-10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                                {badgeText as string}
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight">
                                {headline as string}{" "}
                                <HighlightText>{headlineHighlight as string}</HighlightText>
                            </h2>
                        </div>

                        <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                            {/* Intro */}
                            <p className="text-center text-xl font-semibold text-foreground">
                                {introText as string}
                            </p>

                            {/* Warning Box */}
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg my-6">
                                <p className="text-xl font-bold text-foreground mb-2">
                                    {warningTitle as string}
                                </p>
                                <p className="text-xl font-bold text-primary">
                                    {warningHighlight as string}
                                </p>
                            </div>

                            {/* Problem Box */}
                            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                                <p className="text-lg font-bold text-foreground mb-4">
                                    {problemTitle as string}
                                </p>
                                <ul className="space-y-3 text-foreground">
                                    {problemList.map((problem, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <span className="text-red-500 mt-1 font-bold text-xl">•</span>
                                            <span>{problem as string}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Solution Box */}
                            <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg mt-6">
                                <p className="text-lg font-semibold text-foreground mb-2">
                                    {solutionTitle as string}
                                </p>
                                <p className="text-lg text-foreground">
                                    <strong>ADSPILOT</strong> {solutionText as string}{" "}
                                    <HighlightText>{solutionHighlight as string}</HighlightText>
                                </p>
                            </div>
                        </div>

                        {/* CTA */}
                        {!isPreview && (
                            <div className="mt-8 text-center">
                                <Button size="lg" className="text-base px-8 py-6 h-auto">
                                    {ctaText as string}
                                    <ArrowRight className="ml-2" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
