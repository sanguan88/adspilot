"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { RefreshCw } from "lucide-react"
import { PageBuilderToolbar } from "./PageBuilderToolbar"
import { SectionTypeSelector } from "./SectionTypeSelector"
import { LivePreview } from "./LivePreview"
import { BlockEditor } from "./BlockEditor"
import { SectionSettings } from "./SectionSettings"
import type { PageContent, Section, Block, BlockType } from "@/types/page-builder"
import { authenticatedFetch } from "@/lib/api-client"

export function PageBuilderEditor() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [content, setContent] = useState<PageContent>({ sections: [] })
    const [selectedBlock, setSelectedBlock] = useState<{ sectionId: string; block: Block } | null>(null)
    const [isBlockEditorOpen, setIsBlockEditorOpen] = useState(false)
    const [isSectionSelectorOpen, setIsSectionSelectorOpen] = useState(false)
    const [selectedSection, setSelectedSection] = useState<Section | null>(null)
    const [isSectionSettingsOpen, setIsSectionSettingsOpen] = useState(false)

    const fetchContent = useCallback(async () => {
        try {
            setLoading(true)
            const res = await authenticatedFetch("/api/page-builder?page=landing")
            const data = await res.json()
            if (data.content) {
                setContent(data.content)
            }
        } catch (error) {
            console.error("Error fetching content:", error)
            toast.error("Gagal memuat content")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchContent()
    }, [fetchContent])

    const handleSave = async () => {
        try {
            setSaving(true)
            const res = await authenticatedFetch("/api/page-builder", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    page_key: "landing",
                    content,
                    updated_by: "admin",
                }),
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Perubahan berhasil disimpan dan dipublikasi!")
            } else {
                toast.error(data.error || "Gagal menyimpan perubahan")
            }
        } catch (error) {
            console.error("Error saving content:", error)
            toast.error("Terjadi kesalahan saat menyimpan")
        } finally {
            setSaving(false)
        }
    }

    const handleLoadDefault = async () => {
        if (!confirm("Ini akan mengganti semua konten dengan template default. Lanjutkan?")) {
            return
        }

        try {
            setLoading(true)
            const res = await authenticatedFetch("/api/page-builder/seed?page=landing&force=true", {
                method: "POST",
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Berhasil memuat ${data.data.sections_count} sections dengan ${data.data.blocks_count} blocks`)
                // Refresh content
                await fetchContent()
            } else {
                toast.error(data.message || "Gagal memuat template default")
            }
        } catch (error) {
            console.error("Error loading default content:", error)
            toast.error("Terjadi kesalahan saat memuat template")
        } finally {
            setLoading(false)
        }
    }

    const handleAddSection = (type: string) => {
        // Import SECTION_BLOCK_MAP and BLOCK_DEFINITIONS to create default block
        const { SECTION_BLOCK_MAP, BLOCK_DEFINITIONS } = require("@/types/page-builder")

        // Get the default block type for this section
        const blockTypes = SECTION_BLOCK_MAP[type] || []
        const defaultBlockType = blockTypes[0]

        // Create default block if block type exists
        const defaultBlocks = defaultBlockType && BLOCK_DEFINITIONS[defaultBlockType] ? [{
            id: `block-${Date.now()}`,
            type: defaultBlockType,
            components: { ...BLOCK_DEFINITIONS[defaultBlockType].defaultComponents },
            enabled: true,
        }] : []

        const newSection: Section = {
            id: `section-${Date.now()}-${Math.random()}`,
            type: type as any,
            enabled: true,
            order: content.sections.length + 1,
            blocks: defaultBlocks,
        }
        setContent((prev) => ({
            ...prev,
            sections: [...prev.sections, newSection],
        }))
        toast.success("Section berhasil ditambahkan dengan default block")
    }

    const handleAddAllSections = () => {
        const allSectionTypes = Object.keys({
            hero: "Hero Section",
            features: "Features Section",
            pricing: "Pricing Section",
            testimonials: "Testimonials Section",
            cta: "CTA Section",
            faq: "FAQ Section",
            stats: "Stats Section",
            logos: "Logo Grid Section",
            promo: "Promo Banner Section",
        })

        const newSections: Section[] = allSectionTypes.map((type, index) => ({
            id: `section-${Date.now()}-${index}`,
            type: type as any,
            enabled: true,
            order: content.sections.length + index + 1,
            blocks: [],
        }))

        setContent((prev) => ({
            ...prev,
            sections: [...prev.sections, ...newSections],
        }))

        toast.success(`${newSections.length} sections berhasil ditambahkan`)
    }

    const handleRemoveSection = (sectionId: string) => {
        setContent({
            ...content,
            sections: content.sections.filter((s) => s.id !== sectionId),
        })
        toast.success("Section berhasil dihapus")
    }

    const handleToggleSectionVisibility = (sectionId: string) => {
        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === sectionId ? { ...s, enabled: !s.enabled } : s
            ),
        })
    }

    const handleReorderSection = (sectionId: string, direction: "up" | "down") => {
        const index = content.sections.findIndex((s) => s.id === sectionId)
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === content.sections.length - 1)
        ) {
            return
        }

        const newSections = [...content.sections]
        const targetIndex = direction === "up" ? index - 1 : index + 1
            ;[newSections[index], newSections[targetIndex]] = [
                newSections[targetIndex],
                newSections[index],
            ]

        // Update order numbers
        newSections.forEach((s, i) => {
            s.order = i + 1
        })

        setContent({ ...content, sections: newSections })
    }

    const handleAddBlock = (sectionId: string, blockType: BlockType) => {
        const newBlock: Block = {
            id: `block-${Date.now()}`,
            type: blockType,
            components: {},
        }

        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === sectionId
                    ? { ...s, blocks: [...s.blocks, newBlock] }
                    : s
            ),
        })

        toast.success("Block berhasil ditambahkan")
    }

    const handleEditBlock = (sectionId: string, block: Block) => {
        setSelectedBlock({ sectionId, block })
        setIsBlockEditorOpen(true)
    }

    const handleSaveBlock = (updatedComponents: any) => {
        if (!selectedBlock) return

        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === selectedBlock.sectionId
                    ? {
                        ...s,
                        blocks: s.blocks.map((b) =>
                            b.id === selectedBlock.block.id
                                ? { ...b, components: updatedComponents }
                                : b
                        ),
                    }
                    : s
            ),
        })

        setIsBlockEditorOpen(false)
        setSelectedBlock(null)
        toast.success("Block berhasil diupdate")
    }

    const handleRemoveBlock = (sectionId: string, blockId: string) => {
        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === sectionId
                    ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) }
                    : s
            ),
        })
        toast.success("Block berhasil dihapus")
    }

    const handleDuplicateBlock = (sectionId: string, block: Block) => {
        const duplicatedBlock: Block = {
            ...block,
            id: `block-${Date.now()}`,
        }

        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === sectionId
                    ? { ...s, blocks: [...s.blocks, duplicatedBlock] }
                    : s
            ),
        })
        toast.success("Block berhasil diduplikasi")
    }

    const handleReorderBlock = (
        sectionId: string,
        blockId: string,
        direction: "up" | "down"
    ) => {
        const section = content.sections.find((s) => s.id === sectionId)
        if (!section) return

        const index = section.blocks.findIndex((b) => b.id === blockId)
        if (
            (direction === "up" && index === 0) ||
            (direction === "down" && index === section.blocks.length - 1)
        ) {
            return
        }

        const newBlocks = [...section.blocks]
        const targetIndex = direction === "up" ? index - 1 : index + 1
            ;[newBlocks[index], newBlocks[targetIndex]] = [
                newBlocks[targetIndex],
                newBlocks[index],
            ]

        setContent({
            ...content,
            sections: content.sections.map((s) =>
                s.id === sectionId ? { ...s, blocks: newBlocks } : s
            ),
        })
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header - Simplified */}
            <div className="border-b bg-white shadow-sm px-6 py-3 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Page Builder</h1>
                    <p className="text-xs text-muted-foreground">
                        Hover over any element to edit • Changes save automatically
                    </p>
                </div>
            </div>

            {/* Floating Toolbar */}
            <PageBuilderToolbar
                onSave={handleSave}
                onAddSection={() => setIsSectionSelectorOpen(true)}
                onLoadDefault={handleLoadDefault}
                saving={saving}
                loading={loading}
            />

            {/* Full-Width Live Preview */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-7xl mx-auto py-8 px-4">
                    <LivePreview
                        content={content}
                        onBlockClick={(sectionId: string, blockId: string) => {
                            const section = content.sections.find(s => s.id === sectionId)
                            const block = section?.blocks.find(b => b.id === blockId)
                            if (block) {
                                setSelectedBlock({ sectionId, block })
                                setIsBlockEditorOpen(true)
                            }
                        }}
                        onSectionClick={(sectionId: string) => {
                            const section = content.sections.find(s => s.id === sectionId)
                            if (section) {
                                setSelectedSection(section)
                                setIsSectionSettingsOpen(true)
                            }
                        }}
                    />
                </div>
            </div>

            {/* Modals */}
            {isBlockEditorOpen && selectedBlock && (
                <BlockEditor
                    block={selectedBlock.block}
                    onSave={handleSaveBlock}
                    onClose={() => {
                        setIsBlockEditorOpen(false)
                        setSelectedBlock(null)
                    }}
                />
            )}

            {isSectionSettingsOpen && selectedSection && (
                <SectionSettings
                    open={isSectionSettingsOpen}
                    section={selectedSection}
                    onClose={() => {
                        setIsSectionSettingsOpen(false)
                        setSelectedSection(null)
                    }}
                    onToggleVisibility={() => handleToggleSectionVisibility(selectedSection.id)}
                    onRemove={() => handleRemoveSection(selectedSection.id)}
                    onReorder={(direction) => handleReorderSection(selectedSection.id, direction)}
                    onAddBlock={(blockType) => handleAddBlock(selectedSection.id, blockType)}
                    isFirst={content.sections.findIndex(s => s.id === selectedSection.id) === 0}
                    isLast={content.sections.findIndex(s => s.id === selectedSection.id) === content.sections.length - 1}
                />
            )}

            <SectionTypeSelector
                open={isSectionSelectorOpen}
                onClose={() => setIsSectionSelectorOpen(false)}
                onSelect={(type) => handleAddSection(type)}
            />
        </div>
    )
}
