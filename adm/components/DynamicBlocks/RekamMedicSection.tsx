"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HighlightText } from "@/components/ui/highlight-text"
import type { Block } from "@/types/page-builder"
import { CheckCircle2, TrendingUp, Target, Award, BarChart3, Sparkles, ArrowRight } from "lucide-react"

interface RekamMedicSectionProps {
    block: Block
    isPreview?: boolean
}

export function RekamMedicSection({ block, isPreview = false }: RekamMedicSectionProps) {
    const {
        badge = "FITUR REVOLUSIONER",
        headline = "Akhirnya Terungkap!",
        headlineHighlight = "Rekam Medic",
        headlineEnd = "untuk Iklan Shopee",
        subheadline = "Teknologi yang digunakan perusahaan Fortune 500, sekarang tersedia untuk seller Shopee",
        whatIsTitle = "Apa Itu Rekam Medic?",
        whatIsDescription = "Rekam Medic adalah fitur diagnosis kesehatan iklan...",
        card1Title = "Hentikan Pemborosan",
        card1Description = "Langsung tahu iklan mana yang buang-buang budget.",
        card2Title = "Alokasi Budget Cerdas",
        card2Description = "Tidak perlu nebak-nebak lagi.",
        card3Title = "Teknologi Terbukti",
        card3Description = "Framework BCG Matrix yang digunakan perusahaan Fortune 500.",
        ctaHeadline = "Jangan Biarkan Budget Iklan Terbuang Sia-Sia",
        ctaDescription = "Dengan Rekam Medic, Anda akan langsung tahu iklan mana yang produktif.",
        ctaText = "Coba Rekam Medic Sekarang - Gratis!",
        ctaUrl = "#harga",
    } = block.components

    const benefits = [
        { title: "Star Products", description: "Iklan yang menghasilkan tinggi dan tumbuh cepat. Fokus investasi di sini!" },
        { title: "Cash Cows", description: "Iklan stabil yang menghasilkan uang konsisten. Pertahankan!" },
        { title: "Question Marks", description: "Iklan potensial tapi belum jelas. Perlu optimasi atau cut loss?" },
        { title: "Dogs", description: "Iklan yang buang-buang budget. Hentikan sekarang!" },
    ]

    return (
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <Sparkles className="h-4 w-4" />
                            {badge as string}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                            {headline as string} <HighlightText>{headlineHighlight as string}</HighlightText> {headlineEnd as string}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            {subheadline as string}
                        </p>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid lg:grid-cols-2 gap-8 items-center mb-12">
                        {/* Left: Image Placeholder */}
                        <div className="relative">
                            <div className="relative aspect-square rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center">
                                <div className="text-center p-8">
                                    <BarChart3 className="h-24 w-24 text-primary/50 mx-auto mb-4" />
                                    <p className="text-sm text-muted-foreground font-medium">
                                        Rekam Medic Visualization
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Content */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold text-foreground mb-4">
                                    {whatIsTitle as string}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {whatIsDescription as string}
                                </p>
                            </div>

                            <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg">
                                <p className="text-foreground font-semibold mb-3">
                                    Dengan Rekam Medic, Anda akan tahu:
                                </p>
                                <ul className="space-y-2 text-muted-foreground">
                                    {benefits.map((benefit, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                            <span>
                                                <strong className="text-foreground">{benefit.title}</strong> - {benefit.description}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Benefit Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        <Card className="p-6 border-2 border-primary/20">
                            <div className="text-center">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <TrendingUp className="h-8 w-8 text-primary" />
                                </div>
                                <h4 className="font-bold text-foreground mb-2">{card1Title as string}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {card1Description as string}
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6 border-2 border-primary/20">
                            <div className="text-center">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Target className="h-8 w-8 text-primary" />
                                </div>
                                <h4 className="font-bold text-foreground mb-2">{card2Title as string}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {card2Description as string}
                                </p>
                            </div>
                        </Card>

                        <Card className="p-6 border-2 border-primary/20">
                            <div className="text-center">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Award className="h-8 w-8 text-primary" />
                                </div>
                                <h4 className="font-bold text-foreground mb-2">{card3Title as string}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {card3Description as string}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* CTA Box */}
                    <div className="text-center bg-white rounded-lg p-8 border-2 border-primary/20 shadow-lg">
                        <h3 className="text-2xl font-bold text-foreground mb-4">
                            {ctaHeadline as string}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {ctaDescription as string}
                        </p>
                        {!isPreview && (
                            <Button size="lg" className="text-base px-4 py-4 sm:px-8 sm:py-6 h-auto">
                                {ctaText as string}
                                <ArrowRight className="ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
