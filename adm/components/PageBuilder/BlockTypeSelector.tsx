"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { BlockType } from "@/types/page-builder"
import { BLOCK_DEFINITIONS } from "@/types/page-builder"
import * as Icons from "lucide-react"
import { Plus } from "lucide-react"

interface BlockTypeSelectorProps {
    open: boolean
    onSelect: (blockType: BlockType) => void
    onOpenChange: (open: boolean) => void
}

export function BlockTypeSelector({ open, onSelect, onOpenChange }: BlockTypeSelectorProps) {
    return (
        <Popover open={open} onOpenChange={onOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-3 h-3 mr-1" />
                    Add Block
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-4" align="start">
                <div className="space-y-2">
                    <h4 className="font-medium text-sm">Pilih Tipe Block</h4>
                    <p className="text-xs text-muted-foreground">
                        Pilih tipe block yang ingin Anda tambahkan
                    </p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                    {(Object.keys(BLOCK_DEFINITIONS) as BlockType[]).map((blockType) => {
                        const def = BLOCK_DEFINITIONS[blockType]
                        const IconComponent = (Icons as any)[def.icon] || Icons.Box

                        return (
                            <Card
                                key={blockType}
                                className="cursor-pointer hover:shadow-md hover:border-primary transition-all"
                                onClick={() => {
                                    onSelect(blockType)
                                    onOpenChange(false)
                                }}
                            >
                                <CardContent className="p-3 text-center">
                                    <IconComponent className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <div className="font-medium text-xs leading-tight">{def.label}</div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </PopoverContent>
        </Popover>
    )
}
