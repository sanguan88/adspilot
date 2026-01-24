"use client"

import { HighlightText } from "@/components/ui/highlight-text"
import type { Block } from "@/types/page-builder"
import { Play } from "lucide-react"

interface VideoDemoSectionProps {
    block: Block
    isPreview?: boolean
}

export function VideoDemoSection({ block, isPreview = false }: VideoDemoSectionProps) {
    const {
        headline = "Lihat",
        headlineHighlight = "Cara Kerja",
        headlineEnd = "ADSPILOT dalam 2 Menit",
        subheadline = "Tonton demo singkat bagaimana ADSPILOT mengelola iklan Shopee Anda secara otomatis",
        videoUrl = "",
    } = block.components

    return (
        <section id="video-demo" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/5 to-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                            {headline as string} <HighlightText>{headlineHighlight as string}</HighlightText> {headlineEnd as string}
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            {subheadline as string}
                        </p>
                    </div>

                    {/* Video Placeholder */}
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20">
                        {videoUrl ? (
                            <iframe
                                src={videoUrl as string}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <div className="text-center p-8">
                                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:bg-primary/30 transition-colors">
                                        <Play className="w-10 h-10 text-primary" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">Klik untuk memutar video demo</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
