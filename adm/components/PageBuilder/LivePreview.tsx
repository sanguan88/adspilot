"use client"

import { renderBlock } from "@/components/DynamicBlocks"
import type { PageContent, SectionType } from "@/types/page-builder"
import { SECTION_TYPE_LABELS } from "@/types/page-builder"
import { Edit2, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HighlightText } from "@/components/ui/highlight-text"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface LivePreviewProps {
    content: PageContent
    onBlockClick?: (sectionId: string, blockId: string) => void
    onSectionClick?: (sectionId: string) => void
}

// Section types that should display blocks in a grid layout
const GRID_SECTION_TYPES: SectionType[] = ["features", "testimonials", "pricing", "faq"]

// Section types that display blocks in a horizontal row (3 columns)
const ROW_SECTION_TYPES: SectionType[] = ["how-it-works"]

// Section types that render as single full-width blocks (no wrapping needed)
const FULL_WIDTH_SECTION_TYPES: SectionType[] = [
    "hero", "hook", "video-demo", "rekam-medic", "final-cta", "footer", "cta", "promo"
]

export function LivePreview({ content, onBlockClick, onSectionClick }: LivePreviewProps) {
    if (!content?.sections?.length) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                <div className="text-center space-y-2">
                    <p className="text-lg">No content yet</p>
                    <p className="text-sm">Click "Add Section" to start building</p>
                </div>
            </div>
        )
    }

    const getSectionLayout = (sectionType: SectionType) => {
        if (GRID_SECTION_TYPES.includes(sectionType)) {
            return "grid"
        } else if (ROW_SECTION_TYPES.includes(sectionType)) {
            return "row"
        } else {
            return "full-width"
        }
    }

    const renderSectionHeader = (sectionType: SectionType) => {
        // Section headers for grid/row sections
        const headers: Partial<Record<SectionType, { title: string; highlight?: string; subtitle?: string }>> = {
            features: {
                title: "Semua yang Anda Butuhkan untuk",
                highlight: "Sukses di Shopee",
                subtitle: "Fitur lengkap yang dirancang khusus untuk membantu seller Shopee meningkatkan penjualan"
            },
            testimonials: {
                title: "Apa Kata Mereka yang Sudah",
                highlight: "Menggunakan ADSPILOT",
                subtitle: "Seller yang sudah merasakan manfaat otomasi iklan dengan ADSPILOT"
            },
            faq: {
                title: "Pertanyaan yang",
                highlight: "Sering Diajukan",
                subtitle: "Temukan jawaban untuk pertanyaan Anda di sini"
            },
            "how-it-works": {
                title: "Mulai dalam",
                highlight: "3 Langkah Sederhana",
                subtitle: "Setup ADSPILOT hanya butuh 5 menit, hasilnya bisa dirasakan langsung!"
            }
        }

        const header = headers[sectionType]
        if (!header) return null

        return (
            <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    {header.title}{" "}
                    {header.highlight && <HighlightText>{header.highlight}</HighlightText>}
                </h2>
                {header.subtitle && (
                    <p className="text-lg text-muted-foreground">
                        {header.subtitle}
                    </p>
                )}
            </div>
        )
    }

    const renderSectionFooter = (sectionType: SectionType) => {
        if (sectionType === "how-it-works") {
            return (
                <div className="text-center mt-12">
                    <Button size="lg" className="text-base px-8 py-6 h-auto">
                        Mulai Sekarang - Gratis!
                        <ArrowRight className="ml-2" />
                    </Button>
                </div>
            )
        }
        return null
    }

    const getSectionBackground = (sectionType: SectionType) => {
        const backgrounds: Partial<Record<SectionType, string>> = {
            features: "bg-white",
            testimonials: "bg-gradient-to-br from-primary/5 to-white",
            faq: "bg-white",
            "how-it-works": "bg-white",
        }
        return backgrounds[sectionType] || "bg-white"
    }

    return (
        <div className="space-y-0">
            {content.sections
                .filter((section) => section.enabled !== false)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((section) => {
                    const visibleBlocks = section.blocks?.filter((block) => block.enabled !== false) || []
                    const layout = getSectionLayout(section.type)
                    const background = getSectionBackground(section.type)

                    return (
                        <section
                            key={section.id}
                            className={`relative group/section ${layout !== "full-width" ? `py-12 sm:py-16 lg:py-20 ${background}` : ""}`}
                        >
                            {/* Section Hover Badge - Left side to avoid overlap with Edit badge */}
                            <div className="absolute top-4 left-4 opacity-0 group-hover/section:opacity-100 transition-opacity duration-200 z-20">
                                <Badge
                                    variant="outline"
                                    className="cursor-pointer bg-white hover:bg-gray-50 shadow-md"
                                    onClick={() => onSectionClick?.(section.id)}
                                >
                                    <Settings className="h-3 w-3 mr-1" />
                                    {SECTION_TYPE_LABELS[section.type]?.split(" ")[0] || "Section"}
                                </Badge>
                            </div>

                            {/* Section Content */}
                            {layout === "grid" ? (
                                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                                    {renderSectionHeader(section.type)}
                                    <div className={`grid gap-4 sm:gap-6 lg:gap-8 ${section.type === "faq"
                                            ? "grid-cols-1 max-w-3xl mx-auto"
                                            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                                        }`}>
                                        {visibleBlocks.map((block) => (
                                            <div
                                                key={block.id}
                                                className="relative group/block"
                                            >
                                                {/* Block Hover Badge */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/block:opacity-100 transition-opacity duration-200 z-10">
                                                    <Badge
                                                        className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onBlockClick?.(section.id, block.id)
                                                        }}
                                                    >
                                                        <Edit2 className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Badge>
                                                </div>
                                                {renderBlock(block, true)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : layout === "row" ? (
                                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                                    {renderSectionHeader(section.type)}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
                                        {visibleBlocks.map((block) => (
                                            <div
                                                key={block.id}
                                                className="relative group/block"
                                            >
                                                {/* Block Hover Badge */}
                                                <div className="absolute top-2 right-2 opacity-0 group-hover/block:opacity-100 transition-opacity duration-200 z-10">
                                                    <Badge
                                                        className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onBlockClick?.(section.id, block.id)
                                                        }}
                                                    >
                                                        <Edit2 className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Badge>
                                                </div>
                                                {renderBlock(block, true)}
                                            </div>
                                        ))}
                                    </div>
                                    {renderSectionFooter(section.type)}
                                </div>
                            ) : (
                                /* Full-width sections - blocks render their own containers */
                                <div className="space-y-0">
                                    {visibleBlocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="relative group/block"
                                        >
                                            {/* Block Hover Badge */}
                                            <div className="absolute top-4 right-4 opacity-0 group-hover/block:opacity-100 transition-opacity duration-200 z-10">
                                                <Badge
                                                    className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onBlockClick?.(section.id, block.id)
                                                    }}
                                                >
                                                    <Edit2 className="h-3 w-3 mr-1" />
                                                    Edit
                                                </Badge>
                                            </div>
                                            {renderBlock(block, true)}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )
                })}
        </div>
    )
}
