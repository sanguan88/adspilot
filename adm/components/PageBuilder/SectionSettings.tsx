"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import type { Section, BlockType } from "@/types/page-builder"
import { BLOCK_DEFINITIONS, SECTION_TYPE_LABELS, SECTION_BLOCK_MAP } from "@/types/page-builder"
import * as Icons from "lucide-react"
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Layers } from "lucide-react"

interface SectionSettingsProps {
    open: boolean
    section: Section
    onClose: () => void
    onToggleVisibility: () => void
    onRemove: () => void
    onReorder: (direction: "up" | "down") => void
    onAddBlock: (blockType: BlockType) => void
    isFirst: boolean
    isLast: boolean
}

export function SectionSettings({
    open,
    section,
    onClose,
    onToggleVisibility,
    onRemove,
    onReorder,
    onAddBlock,
    isFirst,
    isLast,
}: SectionSettingsProps) {
    const [showBlockSelector, setShowBlockSelector] = useState(false)

    const sectionLabel = SECTION_TYPE_LABELS[section.type] || section.type

    // Get relevant block types for this section type
    const getRelevantBlockTypes = (): BlockType[] => {
        return SECTION_BLOCK_MAP[section.type] || (Object.keys(BLOCK_DEFINITIONS) as BlockType[])
    }

    const relevantBlockTypes = getRelevantBlockTypes()

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        {sectionLabel}
                    </DialogTitle>
                    <DialogDescription>
                        Kelola section ini: tambah block, atur visibilitas, atau hapus section.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Section Info */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                Order: {section.order}
                            </Badge>
                            <Badge variant={section.enabled ? "default" : "secondary"} className="text-xs">
                                {section.enabled ? "Visible" : "Hidden"}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {section.blocks?.length || 0} blocks
                        </div>
                    </div>

                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {section.enabled ? (
                                <Eye className="w-4 h-4 text-green-600" />
                            ) : (
                                <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Label htmlFor="visibility">Tampilkan di Landing Page</Label>
                        </div>
                        <Switch
                            id="visibility"
                            checked={section.enabled}
                            onCheckedChange={onToggleVisibility}
                        />
                    </div>

                    <Separator />

                    {/* Reorder Buttons */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Urutan Section</Label>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onReorder("up")}
                                disabled={isFirst}
                                className="flex-1"
                            >
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Pindah ke Atas
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onReorder("down")}
                                disabled={isLast}
                                className="flex-1"
                            >
                                <ChevronDown className="w-4 h-4 mr-1" />
                                Pindah ke Bawah
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Add Block Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Tambah Block</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowBlockSelector(!showBlockSelector)}
                            >
                                {showBlockSelector ? "Tutup" : "Pilih Block"}
                                <Plus className="w-4 h-4 ml-1" />
                            </Button>
                        </div>

                        {showBlockSelector && (
                            <div className="grid grid-cols-2 gap-2">
                                {relevantBlockTypes.map((blockType) => {
                                    const def = BLOCK_DEFINITIONS[blockType]
                                    const IconComponent = (Icons as any)[def.icon] || Icons.Box

                                    return (
                                        <Card
                                            key={blockType}
                                            className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
                                            onClick={() => {
                                                onAddBlock(blockType)
                                                setShowBlockSelector(false)
                                            }}
                                        >
                                            <CardContent className="p-3 flex items-center gap-2">
                                                <IconComponent className="w-5 h-5 text-primary" />
                                                <span className="text-sm font-medium">{def.label}</span>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Danger Zone */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-destructive">Danger Zone</Label>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                onRemove()
                                onClose()
                            }}
                            className="w-full"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus Section Ini
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
