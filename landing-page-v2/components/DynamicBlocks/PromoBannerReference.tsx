"use client"

import { useEffect, useState } from "react"
import type { Block } from "../../types/page-builder"
import { Clock } from "lucide-react"

interface PromoBannerReferenceProps {
    block: Block
    isPreview?: boolean
}

interface PromoBannerData {
    isEnabled: boolean
    badgeText: string
    title: string
    description: string
    ctaText: string
}

export function PromoBannerReference({ block, isPreview = false }: PromoBannerReferenceProps) {
    const [bannerData, setBannerData] = useState<PromoBannerData | null>(null)
    const [loading, setLoading] = useState(!isPreview)

    useEffect(() => {
        if (isPreview) {
            // In preview mode, show placeholder
            setBannerData({
                isEnabled: true,
                badgeText: "PREVIEW MODE",
                title: "Promo Banner Content",
                description: "Content will be loaded from Promo Banner API in live mode",
                ctaText: "See Pricing"
            })
            setLoading(false)
            return
        }

        fetch("/api/promo-banner")
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.data.isEnabled) {
                    setBannerData(data.data)
                }
            })
            .catch((err) => console.error("Error fetching promo banner:", err))
            .finally(() => setLoading(false))
    }, [isPreview])

    if (loading) {
        return null
    }

    if (!bannerData || !bannerData.isEnabled) {
        return null
    }

    return (
        <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
            {bannerData.badgeText && (
                <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                    <Clock className="h-4 w-4" />
                    {bannerData.badgeText}
                </div>
            )}
            {bannerData.title && (
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    {bannerData.title}
                </h2>
            )}
            {bannerData.description && (
                <p className="text-lg text-muted-foreground">
                    {bannerData.description}
                </p>
            )}
            {bannerData.ctaText && !isPreview && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800">
                        🚀 {bannerData.ctaText}
                    </p>
                </div>
            )}
        </div>
    )
}
