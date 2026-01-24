import type { Block } from "../../types/page-builder"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight } from "lucide-react"

interface PricingCardProps {
    block: Block
    isPreview?: boolean
}

export function PricingCard({ block, isPreview = false }: PricingCardProps) {
    const {
        name = "Plan",
        price = "0",
        currency = "Rp",
        period = "/bulan",
        features = [],
        ctaText = "Choose Plan",
        ctaLink = "#",
        highlighted = false,
    } = block.components

    const isHighlighted = highlighted === "true" || highlighted === true
    const featuresArray = Array.isArray(features)
        ? features
        : typeof features === 'string'
            ? features.split(',').map(f => f.trim()).filter(Boolean)
            : []

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isPreview) {
            e.preventDefault()
        }
    }

    return (
        <Card
            className={`p-6 sm:p-8 relative h-full flex flex-col ${isHighlighted
                ? "border-2 border-primary shadow-xl md:scale-105 bg-gradient-to-br from-primary/5 to-white"
                : "border-2 border-gray-200"
                }`}
        >
            {isHighlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        ⭐ POPULER
                    </span>
                </div>
            )}
            <div className="text-center mb-6">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">{name}</h3>
                <div className="mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                        <span className="text-sm">{currency}</span>
                        <span className="text-3xl sm:text-4xl font-bold">
                            {Number(price).toLocaleString("id-ID")}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{period}</p>
                </div>
            </div>

            <ul className="space-y-2 mb-6 flex-grow">
                {featuresArray.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                ))}
            </ul>

            <Button
                className={`w-full ${isHighlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                asChild
            >
                <a
                    href={isPreview ? undefined : (ctaLink as string)}
                    onClick={handleClick}
                >
                    {ctaText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </a>
            </Button>
        </Card >
    )
}
