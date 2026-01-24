"use client"

import { useState } from "react"
import type { Block } from "../../types/page-builder"

interface FAQItemProps {
    block: Block
    isPreview?: boolean
}

export function FAQItem({ block, isPreview = false }: FAQItemProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { question = "Question?", answer = "Answer" } = block.components

    return (
        <div className="border-b border-gray-200 py-4">
            <button
                className="w-full text-left flex justify-between items-start gap-4"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-semibold text-lg">{question}</h4>
                <span className="text-2xl shrink-0">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
                <p className="text-gray-600 mt-2">
                    {answer}
                </p>
            )}
        </div>
    )
}
