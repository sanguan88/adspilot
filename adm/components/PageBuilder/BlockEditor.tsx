"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import type { Block, BlockComponents } from "@/types/page-builder"
import { BLOCK_DEFINITIONS } from "@/types/page-builder"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { Upload, X } from "lucide-react"

interface BlockEditorProps {
    block: Block
    onSave: (components: BlockComponents) => void
    onClose: () => void
}

export function BlockEditor({ block, onSave, onClose }: BlockEditorProps) {
    const blockDef = BLOCK_DEFINITIONS[block.type]
    const [formData, setFormData] = useState<BlockComponents>(
        block.components || blockDef?.defaultComponents || {}
    )
    const [uploading, setUploading] = useState(false)

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }))
    }

    const handleImageUpload = async (key: string, file: File) => {
        try {
            setUploading(true)
            const formData = new FormData()
            formData.append("file", file)

            const res = await authenticatedFetch("/api/page-builder/upload", {
                method: "POST",
                body: formData,
            })

            const data = await res.json()
            if (data.success) {
                handleChange(key, data.url)
                toast.success("Gambar berhasil diupload")
            } else {
                toast.error(data.error || "Gagal upload gambar")
            }
        } catch (error) {
            console.error("Error uploading image:", error)
            toast.error("Terjadi kesalahan saat upload gambar")
        } finally {
            setUploading(false)
        }
    }

    const handleSave = () => {
        // Special handling for features list (comma-separated to array)
        if (formData.features && typeof formData.features === "string") {
            const featuresArray = (formData.features as string)
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean)
            onSave({ ...formData, features: featuresArray })
        } else if (formData.logos && typeof formData.logos === "string") {
            const logosArray = (formData.logos as string)
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean)
            onSave({ ...formData, logos: logosArray })
        } else {
            onSave(formData)
        }
    }

    if (!blockDef) {
        return null
    }

    // Promo banner reference - no editing
    if (block.type === "promo-banner-ref") {
        return (
            <Dialog open onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{blockDef.icon} {blockDef.label}</DialogTitle>
                        <DialogDescription>
                            Content untuk promo banner dikelola di tab "Promo Banner" pada halaman Subscriptions.
                            Block ini hanya mengontrol posisi dan visibility.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={onClose}>Tutup</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {blockDef.icon} Edit {blockDef.label}
                    </DialogTitle>
                    <DialogDescription>
                        Edit content untuk block ini
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {blockDef.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                            <Label htmlFor={field.key}>{field.label}</Label>

                            {field.type === "text" && (
                                <Input
                                    id={field.key}
                                    value={(formData[field.key] as string) || ""}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.type === "textarea" && (
                                <Textarea
                                    id={field.key}
                                    value={(formData[field.key] as string) || ""}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={3}
                                />
                            )}

                            {field.type === "url" && (
                                <Input
                                    id={field.key}
                                    type="url"
                                    value={(formData[field.key] as string) || ""}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                />
                            )}

                            {field.type === "color" && (
                                <div className="flex gap-2">
                                    <Input
                                        id={field.key}
                                        type="color"
                                        value={(formData[field.key] as string) || "#3b82f6"}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        className="w-20 h-10"
                                    />
                                    <Input
                                        value={(formData[field.key] as string) || "#3b82f6"}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        placeholder="#3b82f6"
                                        className="flex-1"
                                    />
                                </div>
                            )}

                            {field.type === "select" && field.options && (
                                <Select
                                    value={String(formData[field.key] || field.options[0])}
                                    onValueChange={(value) => handleChange(field.key, value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options.map((opt) => (
                                            <SelectItem key={opt} value={opt}>
                                                {opt}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {field.type === "image" && (
                                <div className="space-y-2">
                                    {formData[field.key] && (
                                        <div className="relative inline-block">
                                            <img
                                                src={formData[field.key] as string}
                                                alt="Preview"
                                                className="max-w-xs h-32 object-cover rounded border"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={() => handleChange(field.key, "")}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                    <div>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    handleImageUpload(field.key, file)
                                                }
                                            }}
                                            disabled={uploading}
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Maksimal 5MB. Format: JPG, PNG, WebP, SVG
                                        </p>
                                    </div>
                                </div>
                            )}

                            {field.type === "richtext" && (
                                <Textarea
                                    id={field.key}
                                    value={(formData[field.key] as string) || ""}
                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={5}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button onClick={handleSave} disabled={uploading}>
                        {uploading ? "Uploading..." : "Simpan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
