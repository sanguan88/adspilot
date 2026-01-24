"use client"

import { Button } from "@/components/ui/button"
import { Save, Plus, Download, RefreshCw } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface PageBuilderToolbarProps {
    onSave: () => void
    onAddSection: () => void
    onLoadDefault?: () => void
    saving?: boolean
    loading?: boolean
}

export function PageBuilderToolbar({
    onSave,
    onAddSection,
    onLoadDefault,
    saving,
    loading
}: PageBuilderToolbarProps) {
    return (
        <div className="fixed top-20 right-8 z-50 flex gap-2 items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-lg">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onAddSection}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Section
                    </DropdownMenuItem>
                    {onLoadDefault && (
                        <DropdownMenuItem onClick={onLoadDefault}>
                            <Download className="mr-2 h-4 w-4" />
                            Load Default Content
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                size="sm"
                onClick={onSave}
                disabled={saving || loading}
                className="gap-2"
            >
                {saving ? (
                    <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4" />
                        Save & Publish
                    </>
                )}
            </Button>
        </div>
    )
}
