"use client"

import { Card } from "@/components/ui/card"
import type { Block } from "@/types/page-builder"

interface FAQItemProps {
    block: Block
    isPreview?: boolean
}

export function FAQItem({ block, isPreview = false }: FAQItemProps) {
    const {
        question = "Frequently asked question?",
        answer = "Answer to the question",
    } = block.components

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
                {question as string}
            </h3>
            <p className="text-muted-foreground">
                {answer as string}
            </p>
        </Card>
    )
}
