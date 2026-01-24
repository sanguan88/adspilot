"use client"

import { Card } from "@/components/ui/card"
import type { Block } from "@/types/page-builder"
import { CheckCircle2 } from "lucide-react"
import * as Icons from "lucide-react"

interface FeatureCardProps {
    block: Block
    isPreview?: boolean
}

export function FeatureCard({ block, isPreview = false }: FeatureCardProps) {
    const {
        icon = "Zap",
        title = "Feature Title",
        description = "Feature description",
        checklist = [],
    } = block.components

    // Parse checklist - could be array or pipe-separated string
    const checklistItems = Array.isArray(checklist)
        ? checklist
        : typeof checklist === 'string'
            ? checklist.split('|').map(c => c.trim()).filter(Boolean)
            : []

    // Get icon component
    const IconComponent = (Icons as any)[icon as string] || Icons.Star

    return (
        <Card className="p-6 border-2 hover:border-primary/50 transition-colors h-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{title as string}</h3>
            </div>
            <p className="text-muted-foreground mb-4">
                {description as string}
            </p>
            {checklistItems.length > 0 && (
                <ul className="space-y-2">
                    {checklistItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <span>{item as string}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
