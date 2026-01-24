import type { Block } from "../../types/page-builder"
import { Card } from "@/components/ui/card"
import * as Icons from "lucide-react"
import { CheckCircle2 } from "lucide-react"

interface FeatureCardProps {
    block: Block
    isPreview?: boolean
}

export function FeatureCard({ block, isPreview = false }: FeatureCardProps) {
    const {
        icon = "Zap",
        title = "Feature",
        description = "",
        accentColor = "#3b82f6",
        features = [],
    } = block.components

    // Get the Lucide icon component dynamically
    const IconComponent = Icons[icon as keyof typeof Icons] as React.ComponentType<{ className?: string }> || Icons.Zap

    // Parse features if it's a string
    const featureList = Array.isArray(features)
        ? features
        : typeof features === 'string'
            ? features.split(',').map(f => f.trim()).filter(Boolean)
            : []

    return (
        <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{title}</h3>
            </div>
            <p className="text-muted-foreground mb-4">{description}</p>
            {featureList.length > 0 && (
                <ul className="space-y-2">
                    {featureList.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
