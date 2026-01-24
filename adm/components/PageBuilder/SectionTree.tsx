"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Eye,
    EyeOff,
    Trash2,
    Edit,
    Copy,
    ChevronUp,
    ChevronDown as ChevronDownIcon,
} from "lucide-react"
import { useState } from "react"
import type { Section, Block, BlockType } from "@/types/page-builder"
import { BLOCK_DEFINITIONS, SECTION_TYPE_LABELS } from "@/types/page-builder"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useConfirm } from "@/components/providers/confirmation-provider"
import { BlockTypeSelector } from "./BlockTypeSelector"

interface SectionTreeProps {
    sections: Section[]
    onAddSection: (type: string) => void
    onAddAllSections: () => void
    onRemoveSection: (sectionId: string) => void
    onToggleVisibility: (sectionId: string) => void
    onReorder: (sectionId: string, direction: "up" | "down") => void
    onAddBlock: (sectionId: string, blockType: BlockType) => void
    onEditBlock: (sectionId: string, block: Block) => void
    onRemoveBlock: (sectionId: string, blockId: string) => void
    onDuplicateBlock: (sectionId: string, block: Block) => void
    onReorderBlock: (sectionId: string, blockId: string, direction: "up" | "down") => void
}

export function SectionTree({
    sections,
    onAddSection,
    onAddAllSections,
    onRemoveSection,
    onToggleVisibility,
    onReorder,
    onAddBlock,
    onEditBlock,
    onRemoveBlock,
    onDuplicateBlock,
    onReorderBlock,
}: SectionTreeProps) {
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
    const [newSectionType, setNewSectionType] = useState<string>("hero")
    const [blockSelectorOpen, setBlockSelectorOpen] = useState<Record<string, boolean>>({})
    const confirm = useConfirm()

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }))
    }

    const handleRemoveSection = async (sectionId: string) => {
        const confirmed = await confirm({
            title: "Hapus Section?",
            description: "Apakah Anda yakin ingin menghapus section ini?",
            confirmText: "Ya, Hapus",
            cancelText: "Batal",
            variant: "destructive",
        })
        if (confirmed) {
            onRemoveSection(sectionId)
        }
    }

    const handleRemoveBlock = async (sectionId: string, blockId: string) => {
        const confirmed = await confirm({
            title: "Hapus Block?",
            description: "Apakah Anda yakin ingin menghapus block ini?",
            confirmText: "Ya, Hapus",
            cancelText: "Batal",
            variant: "destructive",
        })
        if (confirmed) {
            onRemoveBlock(sectionId, blockId)
        }
    }

    return (
        <div className="p-4 space-y-4">
            {/* Add Section */}
            <Card className="p-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Tambah Section Baru</label>
                    <div className="flex gap-2">
                        <Select value={newSectionType} onValueChange={setNewSectionType}>
                            <SelectTrigger className="flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(SECTION_TYPE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => onAddSection(newSectionType)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onAddAllSections}
                            title="Add all section types at once"
                        >
                            Add All
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Sections List */}
            <div className="space-y-2">
                {sections.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            Belum ada section. Tambahkan section pertama Anda!
                        </p>
                    </Card>
                ) : (
                    sections.map((section, index) => (
                        <Card key={section.id} className="overflow-hidden">
                            {/* Section Header */}
                            <div className="bg-gray-100 p-3 flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => toggleSection(section.id)}
                                >
                                    {expandedSections[section.id] ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </Button>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">
                                            {SECTION_TYPE_LABELS[section.type]}
                                        </span>
                                        {!section.enabled && (
                                            <span className="text-xs text-muted-foreground">(Hidden)</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {section.blocks.length} block(s)
                                    </span>
                                </div>

                                {/* Section Actions */}
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => onReorder(section.id, "up")}
                                        disabled={index === 0}
                                        title="Move Up"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => onReorder(section.id, "down")}
                                        disabled={index === sections.length - 1}
                                        title="Move Down"
                                    >
                                        <ChevronDownIcon className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => onToggleVisibility(section.id)}
                                        title={section.enabled ? "Hide" : "Show"}
                                    >
                                        {section.enabled ? (
                                            <Eye className="w-3.5 h-3.5" />
                                        ) : (
                                            <EyeOff className="w-3.5 h-3.5" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={() => handleRemoveSection(section.id)}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Blocks */}
                            {expandedSections[section.id] && (
                                <div className="p-3 space-y-2">
                                    {section.blocks.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-muted-foreground">
                                            No blocks yet
                                        </div>
                                    ) : (
                                        section.blocks.map((block, blockIndex) => (
                                            <div
                                                key={block.id}
                                                className="border rounded p-2 flex items-center gap-2 hover:bg-gray-50"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {BLOCK_DEFINITIONS[block.type]?.icon}{" "}
                                                        {BLOCK_DEFINITIONS[block.type]?.label || block.type}
                                                    </div>
                                                </div>

                                                {/* Block Actions */}
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => onEditBlock(section.id, block)}
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => onReorderBlock(section.id, block.id, "up")}
                                                        disabled={blockIndex === 0}
                                                        title="Move Up"
                                                    >
                                                        <ChevronUp className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => onReorderBlock(section.id, block.id, "down")}
                                                        disabled={blockIndex === section.blocks.length - 1}
                                                        title="Move Down"
                                                    >
                                                        <ChevronDownIcon className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => onDuplicateBlock(section.id, block)}
                                                        title="Duplicate"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                                        onClick={() => handleRemoveBlock(section.id, block.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}

                                    <BlockTypeSelector
                                        open={blockSelectorOpen[section.id] || false}
                                        onSelect={(blockType) => onAddBlock(section.id, blockType)}
                                        onOpenChange={(open) =>
                                            setBlockSelectorOpen(prev => ({ ...prev, [section.id]: open }))
                                        }
                                    />
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
