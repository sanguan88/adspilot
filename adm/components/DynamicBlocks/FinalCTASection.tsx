"use client"

import { Button } from "@/components/ui/button"
import { HighlightText } from "@/components/ui/highlight-text"
import type { Block } from "@/types/page-builder"
import { ArrowRight } from "lucide-react"

interface FinalCTASectionProps {
    block: Block
    isPreview?: boolean
}

export function FinalCTASection({ block, isPreview = false }: FinalCTASectionProps) {
    const {
        headline = "Hentikan Ketakutan,",
        headlineHighlight = "Tidur Tenang Mulai Malam Ini",
        description = "Jangan biarkan ketakutan budget iklan habis sia-sia atau harus bangun tengah malam menghambat bisnis Anda. Mulai gratis hari ini!",
        ctaText = "Daftar Sekarang - Gratis 7 Hari",
        ctaUrl = "#harga",
        footerNote = "Tidak perlu kartu kredit • Cancel kapan saja • Garansi 30 hari uang kembali",
    } = block.components

    return (
        <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                        {headline as string} <HighlightText className="text-primary-foreground">{headlineHighlight as string}</HighlightText>
                    </h2>
                    <p className="text-lg mb-8 opacity-90">
                        {description as string}
                    </p>
                    {!isPreview && (
                        <Button
                            size="lg"
                            variant="secondary"
                            className="text-base px-8 py-6 h-auto bg-white text-primary hover:bg-white/90"
                        >
                            {ctaText as string}
                            <ArrowRight className="ml-2" />
                        </Button>
                    )}
                    <p className="text-sm mt-6 opacity-75">
                        {footerNote as string}
                    </p>
                </div>
            </div>
        </section>
    )
}
