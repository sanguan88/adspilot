"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
    value?: string
    onChange: (url: string) => void
    disabled?: boolean
    className?: string
}

export function ImageUploader({ value, onChange, disabled, className }: ImageUploaderProps) {
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar (JPG, PNG, GIF, WebP)')
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 5MB')
            return
        }

        try {
            setIsUploading(true)
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/uploads/tutorials', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Upload failed')
            }

            const data = await response.json()
            onChange(data.url)
            toast.success('Gambar berhasil diupload')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error(error.message || 'Gagal mengupload gambar')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleRemove = () => {
        onChange('')
    }

    return (
        <div className={cn("space-y-3", className)}>
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={disabled || isUploading}
                />

                {!value ? (
                    <div
                        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors",
                            (disabled || isUploading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                        )}
                    >
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                        ) : (
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        )}
                        <p className="text-xs text-slate-500 font-medium">
                            {isUploading ? 'Mengupload...' : 'Klik untuk upload gambar'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Max 5MB (JPG, PNG, GIF)
                        </p>
                    </div>
                ) : (
                    <div className="relative w-full group">
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-slate-100">
                            <Image
                                src={value}
                                alt="Section Image"
                                fill
                                className="object-cover"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleRemove}
                            disabled={disabled}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Fallback Input URL (Optional, hidden by default but can be nice for debugging) */}
            {/* <Input 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value)} 
                placeholder="https://..." 
                className="text-xs text-muted-foreground"
                readOnly
            /> */}
        </div>
    )
}
