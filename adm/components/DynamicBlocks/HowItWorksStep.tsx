"use client"

import type { Block } from "@/types/page-builder"
import * as Icons from "lucide-react"

interface HowItWorksStepProps {
    block: Block
    isPreview?: boolean
}

export function HowItWorksStep({ block, isPreview = false }: HowItWorksStepProps) {
    const {
        step = "1",
        icon = "ShoppingBag",
        title = "Step Title",
        description = "Step description",
    } = block.components

    const IconComponent = (Icons as any)[icon as string] || Icons.CheckCircle

    return (
        <div className="text-center">
            <div className="relative inline-flex items-center justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconComponent className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {step as string}
                </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">{title as string}</h3>
            <p className="text-muted-foreground">{description as string}</p>
        </div>
    )
}
