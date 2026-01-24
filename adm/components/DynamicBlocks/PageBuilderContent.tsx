"use client"

import { useEffect, useState } from "react"
import type { PageContent, Section } from "@/types/page-builder"
import { renderBlock } from "./index"

export function PageBuilderContent() {
    const [content, setContent] = useState<PageContent | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/content?page=landing")
            .then((res) => res.json())
            .then((data) => {
                if (data.sections) {
                    setContent(data)
                }
            })
            .catch((err) => {
                console.error("Error fetching page content:", err)
            })
            .finally(() => {
                setLoading(false)
            })
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        )
    }

    if (!content || content.sections.length === 0) {
        return null // Fallback to static content if no page builder content
    }

    return (
        <>
            {content.sections
                .filter((section: Section) => section.enabled)
                .sort((a: Section, b: Section) => a.order - b.order)
                .map((section: Section) => (
                    <div key={section.id} className={`section-${section.type}`}>
                        {section.type === "features" || section.type === "pricing" || section.type === "stats" || section.type === "logos" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-6 py-12">
                                {section.blocks.map((block) => renderBlock(block))}
                            </div>
                        ) : section.type === "faq" ? (
                            <div className="max-w-3xl mx-auto px-6 py-12">
                                <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
                                <div className="border rounded-lg overflow-hidden">
                                    {section.blocks.map((block) => renderBlock(block))}
                                </div>
                            </div>
                        ) : (
                            section.blocks.map((block) => renderBlock(block))
                        )}
                    </div>
                ))}
        </>
    )
}
