import type { Block } from "@/types/page-builder"

interface CTASectionProps {
    block: Block
    isPreview?: boolean
}

export function CTASection({ block, isPreview = false }: CTASectionProps) {
    const {
        headline = "Ready to get started?",
        description = "",
        primaryCtaText = "Get Started",
        primaryCtaLink = "#",
        secondaryCtaText = "",
        secondaryCtaLink = "#",
    } = block.components

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isPreview) {
            e.preventDefault()
        }
    }

    return (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-6 rounded-lg text-center">
            <h2 className="text-4xl font-bold mb-4">{headline}</h2>
            {description && <p className="text-xl mb-8 opacity-90">{description}</p>}
            <div className="flex gap-4 justify-center">
                {primaryCtaText && (
                    <a
                        href={isPreview ? undefined : (primaryCtaLink as string)}
                        onClick={handleClick}
                        className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                        {primaryCtaText}
                    </a>
                )}
                {secondaryCtaText && (
                    <a
                        href={isPreview ? undefined : (secondaryCtaLink as string)}
                        onClick={handleClick}
                        className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        {secondaryCtaText}
                    </a>
                )}
            </div>
        </div>
    )
}
