"use client"

import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Quote,
    Code,
    Undo,
    Redo,
    Link as LinkIcon,
    Image as ImageIcon,
    Minus,
    Pilcrow
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface RichTextEditorProps {
    content: string
    onChange: (html: string) => void
    placeholder?: string
    className?: string
}

// Toolbar Button Component
function ToolbarButton({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title
}: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={cn(
                "p-2 rounded-md transition-colors hover:bg-slate-100",
                isActive && "bg-slate-200 text-primary",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            {children}
        </button>
    )
}

// Toolbar Component
function Toolbar({ editor }: { editor: Editor }) {
    const [linkUrl, setLinkUrl] = useState('')
    const [imageUrl, setImageUrl] = useState('')
    const [showLinkPopover, setShowLinkPopover] = useState(false)
    const [showImagePopover, setShowImagePopover] = useState(false)

    const addLink = useCallback(() => {
        if (linkUrl) {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
            setLinkUrl('')
            setShowLinkPopover(false)
        }
    }, [editor, linkUrl])

    const removeLink = useCallback(() => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
        setShowLinkPopover(false)
    }, [editor])

    const addImage = useCallback(() => {
        if (imageUrl) {
            editor.chain().focus().setImage({ src: imageUrl }).run()
            setImageUrl('')
            setShowImagePopover(false)
        }
    }, [editor, imageUrl])

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 rounded-t-md">
            {/* Text Formatting */}
            <div className="flex items-center gap-0.5 pr-2 border-r">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Strikethrough"
                >
                    <Strikethrough className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Headings */}
            <div className="flex items-center gap-0.5 px-2 border-r">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                >
                    <Heading1 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    isActive={editor.isActive('heading', { level: 3 })}
                    title="Heading 3"
                >
                    <Heading3 className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    isActive={editor.isActive('paragraph')}
                    title="Paragraph"
                >
                    <Pilcrow className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 px-2 border-r">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Block Elements */}
            <div className="flex items-center gap-0.5 px-2 border-r">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Quote"
                >
                    <Quote className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Code Block"
                >
                    <Code className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Horizontal Rule"
                >
                    <Minus className="w-4 h-4" />
                </ToolbarButton>
            </div>

            {/* Link */}
            <div className="flex items-center gap-0.5 px-2 border-r">
                <Popover open={showLinkPopover} onOpenChange={setShowLinkPopover}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className={cn(
                                "p-2 rounded-md transition-colors hover:bg-slate-100",
                                editor.isActive('link') && "bg-slate-200 text-primary"
                            )}
                            title="Add Link"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL</label>
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={addLink}>Add Link</Button>
                                {editor.isActive('link') && (
                                    <Button size="sm" variant="outline" onClick={removeLink}>Remove</Button>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Image */}
                <Popover open={showImagePopover} onOpenChange={setShowImagePopover}>
                    <PopoverTrigger asChild>
                        <button
                            type="button"
                            className="p-2 rounded-md transition-colors hover:bg-slate-100"
                            title="Add Image"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-4">
                            <Tabs defaultValue="upload" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="upload">Upload</TabsTrigger>
                                    <TabsTrigger value="url">URL</TabsTrigger>
                                </TabsList>
                                <TabsContent value="upload" className="space-y-3 pt-2">
                                    <div className="grid w-full max-w-sm items-center gap-1.5">
                                        <Label htmlFor="image-upload">File Gambar</Label>
                                        <Input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return

                                                try {
                                                    const formData = new FormData()
                                                    formData.append('file', file)

                                                    const toastId = toast.loading('Uploading image...')

                                                    const response = await fetch('/api/uploads/tutorials', {
                                                        method: 'POST',
                                                        body: formData,
                                                    })

                                                    if (!response.ok) {
                                                        const error = await response.json()
                                                        throw new Error(error.error || 'Upload failed')
                                                    }

                                                    const data = await response.json()

                                                    editor.chain().focus().setImage({ src: data.url }).run()
                                                    setShowImagePopover(false)
                                                    toast.success('Image uploaded successfully', { id: toastId })
                                                } catch (error: any) {
                                                    toast.error(error.message || 'Failed to upload image')
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-muted-foreground">Max 5MB. JPG, PNG, GIF, WebP.</p>
                                    </div>
                                </TabsContent>
                                <TabsContent value="url" className="space-y-3 pt-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="image-url">Image URL</Label>
                                        <Input
                                            id="image-url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            onKeyDown={(e) => e.key === 'Enter' && addImage()}
                                        />
                                    </div>
                                    <Button size="sm" onClick={addImage} className="w-full">Insert Image</Button>
                                </TabsContent>
                            </Tabs>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 pl-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo className="w-4 h-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo className="w-4 h-4" />
                </ToolbarButton>
            </div>
        </div>
    )
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false, // Fix for Next.js SSR hydration mismatch
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline hover:text-primary/80',
                },
            }),
            Image.configure({
                inline: false,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto my-4',
                },
            }),
            Placeholder.configure({
                placeholder: placeholder || 'Tulis konten di sini...',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-slate max-w-none focus:outline-none min-h-[200px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update content when prop changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    if (!editor) {
        return (
            <div className={cn("border rounded-md bg-slate-50 animate-pulse", className)}>
                <div className="h-10 border-b bg-slate-100" />
                <div className="h-[200px]" />
            </div>
        )
    }

    return (
        <div className={cn("border rounded-md bg-white", className)}>
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    )
}
