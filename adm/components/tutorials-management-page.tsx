"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ImageUploader } from "@/components/ui/image-uploader"
import { toast } from "sonner"
import {
    Plus,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    Search,
    BookOpen,
    Video,
    FileText,
    GripVertical,
    ChevronUp,
    ChevronDown,
    X,
    Save,
    ExternalLink,
    Loader2,
    RefreshCw,
    Lightbulb,
    AlertTriangle,
    HelpCircle
} from "lucide-react"

interface TutorialSection {
    id?: number
    title: string
    content: string
    image_url?: string
    image_caption?: string
}

interface TutorialFAQ {
    question: string
    answer: string
}

interface Tutorial {
    id: number
    slug: string
    title: string
    description: string
    duration: string
    type: "video" | "article"
    category: string
    icon: string
    cover_image: string
    video_url: string
    is_published: boolean
    order_index: number
    created_at: string
    updated_at: string
    section_count?: number
    tip_count?: number
    warning_count?: number
    faq_count?: number
    sections?: TutorialSection[]
    tips?: string[]
    warnings?: string[]
    faqs?: TutorialFAQ[]
}

const CATEGORIES = ["Dasar", "Setup", "Automation", "Analisis", "Optimization", "Monitoring", "Billing"]
const ICONS = ["BookOpen", "Store", "Zap", "Activity", "Target", "RotateCcw", "MessageSquare", "CreditCard", "Settings", "Shield", "FileText"]

export function TutorialsManagementPage() {
    const [tutorials, setTutorials] = useState<Tutorial[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterCategory, setFilterCategory] = useState("all")
    const [filterType, setFilterType] = useState("all")
    const [filterPublished, setFilterPublished] = useState("all")

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [formData, setFormData] = useState({
        slug: "",
        title: "",
        description: "",
        duration: "",
        type: "article" as "video" | "article",
        category: "Dasar",
        icon: "BookOpen",
        cover_image: "",
        video_url: "",
        is_published: false,
        order_index: 0,
        sections: [] as TutorialSection[],
        tips: [] as string[],
        warnings: [] as string[],
        faqs: [] as TutorialFAQ[]
    })

    useEffect(() => {
        fetchTutorials()
    }, [filterCategory, filterType, filterPublished])

    const fetchTutorials = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (filterCategory !== "all") params.append("category", filterCategory)
            if (filterType !== "all") params.append("type", filterType)
            if (filterPublished !== "all") params.append("published", filterPublished)
            if (searchQuery) params.append("search", searchQuery)

            const response = await fetch(`/api/tutorials?${params.toString()}`)
            const data = await response.json()
            if (data.tutorials) {
                setTutorials(data.tutorials)
            }
        } catch (error) {
            console.error("Error fetching tutorials:", error)
            toast.error("Gagal memuat data tutorial")
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = () => {
        fetchTutorials()
    }

    const resetForm = () => {
        setFormData({
            slug: "",
            title: "",
            description: "",
            duration: "",
            type: "article",
            category: "Dasar",
            icon: "BookOpen",
            cover_image: "",
            video_url: "",
            is_published: false,
            order_index: 0,
            sections: [],
            tips: [],
            warnings: [],
            faqs: []
        })
    }

    const openCreateModal = () => {
        resetForm()
        setIsCreateModalOpen(true)
    }

    const openEditModal = async (tutorial: Tutorial) => {
        try {
            const response = await fetch(`/api/tutorials/${tutorial.id}`)
            const data = await response.json()
            if (data.tutorial) {
                const t = data.tutorial
                setFormData({
                    slug: t.slug,
                    title: t.title,
                    description: t.description || "",
                    duration: t.duration || "",
                    type: t.type,
                    category: t.category,
                    icon: t.icon || "BookOpen",
                    cover_image: t.cover_image || "",
                    video_url: t.video_url || "",
                    is_published: t.is_published,
                    order_index: t.order_index || 0,
                    sections: t.sections || [],
                    tips: t.tips || [],
                    warnings: t.warnings || [],
                    faqs: t.faqs || []
                })
                setSelectedTutorial(t)
                setIsEditModalOpen(true)
            }
        } catch (error) {
            console.error("Error fetching tutorial details:", error)
            toast.error("Gagal memuat detail tutorial")
        }
    }

    const openDeleteModal = (tutorial: Tutorial) => {
        setSelectedTutorial(tutorial)
        setIsDeleteModalOpen(true)
    }

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim()
    }

    const handleTitleChange = (title: string) => {
        setFormData(prev => ({
            ...prev,
            title,
            slug: prev.slug || generateSlug(title)
        }))
    }

    const handleCreate = async () => {
        if (!formData.slug || !formData.title || !formData.category) {
            toast.error("Slug, judul, dan kategori wajib diisi")
            return
        }

        try {
            setSaving(true)
            const response = await fetch("/api/tutorials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to create tutorial")
            }

            toast.success("Tutorial berhasil dibuat")
            setIsCreateModalOpen(false)
            fetchTutorials()
        } catch (error: any) {
            console.error("Error creating tutorial:", error)
            toast.error(error.message || "Gagal membuat tutorial")
        } finally {
            setSaving(false)
        }
    }

    const handleUpdate = async () => {
        if (!selectedTutorial) return

        try {
            setSaving(true)
            const response = await fetch(`/api/tutorials/${selectedTutorial.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Failed to update tutorial")
            }

            toast.success("Tutorial berhasil diupdate")
            setIsEditModalOpen(false)
            fetchTutorials()
        } catch (error: any) {
            console.error("Error updating tutorial:", error)
            toast.error(error.message || "Gagal mengupdate tutorial")
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedTutorial) return

        try {
            setSaving(true)
            const response = await fetch(`/api/tutorials/${selectedTutorial.id}`, {
                method: "DELETE"
            })

            if (!response.ok) {
                throw new Error("Failed to delete tutorial")
            }

            toast.success("Tutorial berhasil dihapus")
            setIsDeleteModalOpen(false)
            fetchTutorials()
        } catch (error: any) {
            console.error("Error deleting tutorial:", error)
            toast.error("Gagal menghapus tutorial")
        } finally {
            setSaving(false)
        }
    }

    const togglePublished = async (tutorial: Tutorial) => {
        try {
            const response = await fetch(`/api/tutorials/${tutorial.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_published: !tutorial.is_published })
            })

            if (!response.ok) {
                throw new Error("Failed to toggle published status")
            }

            toast.success(tutorial.is_published ? "Tutorial di-unpublish" : "Tutorial dipublish")
            fetchTutorials()
        } catch (error) {
            console.error("Error toggling published:", error)
            toast.error("Gagal mengubah status publish")
        }
    }

    // Section management
    const addSection = () => {
        setFormData(prev => ({
            ...prev,
            sections: [...prev.sections, { title: "", content: "", image_url: "", image_caption: "" }]
        }))
    }

    const updateSection = (index: number, field: keyof TutorialSection, value: string) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
        }))
    }

    const removeSection = (index: number) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== index)
        }))
    }

    const moveSection = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return
        if (direction === "down" && index === formData.sections.length - 1) return

        const newSections = [...formData.sections]
        const newIndex = direction === "up" ? index - 1 : index + 1;
        [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]]
        setFormData(prev => ({ ...prev, sections: newSections }))
    }

    // Tips management
    const addTip = () => {
        setFormData(prev => ({ ...prev, tips: [...prev.tips, ""] }))
    }

    const updateTip = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            tips: prev.tips.map((t, i) => i === index ? value : t)
        }))
    }

    const removeTip = (index: number) => {
        setFormData(prev => ({
            ...prev,
            tips: prev.tips.filter((_, i) => i !== index)
        }))
    }

    // Warnings management
    const addWarning = () => {
        setFormData(prev => ({ ...prev, warnings: [...prev.warnings, ""] }))
    }

    const updateWarning = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            warnings: prev.warnings.map((w, i) => i === index ? value : w)
        }))
    }

    const removeWarning = (index: number) => {
        setFormData(prev => ({
            ...prev,
            warnings: prev.warnings.filter((_, i) => i !== index)
        }))
    }

    // FAQ management
    const addFAQ = () => {
        setFormData(prev => ({ ...prev, faqs: [...prev.faqs, { question: "", answer: "" }] }))
    }

    const updateFAQ = (index: number, field: "question" | "answer", value: string) => {
        setFormData(prev => ({
            ...prev,
            faqs: prev.faqs.map((f, i) => i === index ? { ...f, [field]: value } : f)
        }))
    }

    const removeFAQ = (index: number) => {
        setFormData(prev => ({
            ...prev,
            faqs: prev.faqs.filter((_, i) => i !== index)
        }))
    }

    const filteredTutorials = tutorials.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Tutorial Management</h1>
                    <p className="text-slate-600 mt-1">Kelola konten tutorial dan panduan untuk user portal</p>
                </div>
                <Button onClick={openCreateModal} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Tambah Tutorial
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <Label className="text-xs text-slate-500">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Cari tutorial..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="w-40">
                            <Label className="text-xs text-slate-500">Kategori</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    {CATEGORIES.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-32">
                            <Label className="text-xs text-slate-500">Tipe</Label>
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="video">Video</SelectItem>
                                    <SelectItem value="article">Artikel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-32">
                            <Label className="text-xs text-slate-500">Status</Label>
                            <Select value={filterPublished} onValueChange={setFilterPublished}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua</SelectItem>
                                    <SelectItem value="true">Published</SelectItem>
                                    <SelectItem value="false">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={fetchTutorials} className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tutorials Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : filteredTutorials.length === 0 ? (
                        <div className="p-12 text-center">
                            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">Belum ada tutorial</h3>
                            <p className="text-slate-500 mb-4">Mulai dengan membuat tutorial pertama</p>
                            <Button onClick={openCreateModal} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Tambah Tutorial
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Tutorial</TableHead>
                                    <TableHead className="w-24">Tipe</TableHead>
                                    <TableHead className="w-28">Kategori</TableHead>
                                    <TableHead className="w-24 text-center">Sections</TableHead>
                                    <TableHead className="w-24 text-center">Status</TableHead>
                                    <TableHead className="w-32 text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTutorials.map((tutorial, index) => (
                                    <TableRow key={tutorial.id}>
                                        <TableCell className="text-slate-500">{index + 1}</TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900">{tutorial.title}</p>
                                                <p className="text-sm text-slate-500 line-clamp-1">{tutorial.description}</p>
                                                <p className="text-xs text-slate-400 mt-1">/{tutorial.slug}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={tutorial.type === "video" ? "default" : "secondary"} className="gap-1">
                                                {tutorial.type === "video" ? <Video className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                {tutorial.type === "video" ? "Video" : "Artikel"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{tutorial.category}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-sm text-slate-600">{tutorial.section_count || 0}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => togglePublished(tutorial)}
                                                className={tutorial.is_published ? "text-emerald-600" : "text-slate-400"}
                                            >
                                                {tutorial.is_published ? (
                                                    <Eye className="w-4 h-4" />
                                                ) : (
                                                    <EyeOff className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditModal(tutorial)}
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openDeleteModal(tutorial)}
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Modal */}
            <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsCreateModalOpen(false)
                    setIsEditModalOpen(false)
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditModalOpen ? "Edit Tutorial" : "Tambah Tutorial Baru"}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditModalOpen ? "Edit konten tutorial yang sudah ada" : "Buat tutorial baru untuk user portal"}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="basic" className="mt-4">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="sections">Sections ({formData.sections.length})</TabsTrigger>
                            <TabsTrigger value="tips">Tips & Warnings</TabsTrigger>
                            <TabsTrigger value="faq">FAQ ({formData.faqs.length})</TabsTrigger>
                        </TabsList>

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Judul</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => handleTitleChange(e.target.value)}
                                        placeholder="Judul tutorial"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Slug (URL)</Label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-500">/tutorial/</span>
                                        <Input
                                            value={formData.slug}
                                            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                            placeholder="url-slug"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <Label>Deskripsi</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Deskripsi singkat tutorial"
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <Label>Tipe</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value: "video" | "article") => setFormData(prev => ({ ...prev, type: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="article">Artikel</SelectItem>
                                            <SelectItem value="video">Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Kategori</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Durasi</Label>
                                    <Input
                                        value={formData.duration}
                                        onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                                        placeholder="5 menit"
                                    />
                                </div>
                                <div>
                                    <Label>Icon</Label>
                                    <Select
                                        value={formData.icon}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICONS.map(icon => (
                                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.type === "video" && (
                                    <div className="col-span-2">
                                        <Label>Video URL (YouTube)</Label>
                                        <Input
                                            value={formData.video_url}
                                            onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                                            placeholder="https://youtube.com/watch?v=..."
                                        />
                                    </div>
                                )}
                                <div className="col-span-2 flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={formData.is_published}
                                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                                        />
                                        <Label>Published</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label>Order:</Label>
                                        <Input
                                            type="number"
                                            value={formData.order_index}
                                            onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                                            className="w-20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Sections Tab */}
                        <TabsContent value="sections" className="space-y-4 mt-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-slate-500">Kelola section/bagian konten tutorial</p>
                                <Button onClick={addSection} size="sm" variant="outline" className="gap-2">
                                    <Plus className="w-4 h-4" />
                                    Tambah Section
                                </Button>
                            </div>
                            {formData.sections.length === 0 ? (
                                <div className="text-center py-8 border rounded-lg bg-slate-50">
                                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">Belum ada section</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.sections.map((section, index) => (
                                        <Card key={index}>
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <GripVertical className="w-4 h-4 text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-500">Section {index + 1}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => moveSection(index, "up")}
                                                            disabled={index === 0}
                                                            className="h-7 w-7"
                                                        >
                                                            <ChevronUp className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => moveSection(index, "down")}
                                                            disabled={index === formData.sections.length - 1}
                                                            className="h-7 w-7"
                                                        >
                                                            <ChevronDown className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => removeSection(index)}
                                                            className="h-7 w-7 text-red-500 hover:text-red-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div>
                                                    <Label className="text-xs">Judul Section</Label>
                                                    <Input
                                                        value={section.title}
                                                        onChange={(e) => updateSection(index, "title", e.target.value)}
                                                        placeholder="Judul section"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Konten</Label>
                                                    <RichTextEditor
                                                        content={section.content}
                                                        onChange={(html) => updateSection(index, "content", html)}
                                                        placeholder="Tulis konten section di sini..."
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-xs mb-2 block">Gambar Ilustrasi</Label>
                                                        <ImageUploader
                                                            value={section.image_url || ""}
                                                            onChange={(url) => updateSection(index, "image_url", url)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Image Caption</Label>
                                                        <Input
                                                            value={section.image_caption || ""}
                                                            onChange={(e) => updateSection(index, "image_caption", e.target.value)}
                                                            placeholder="Caption gambar"
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Tips & Warnings Tab */}
                        <TabsContent value="tips" className="space-y-6 mt-4">
                            {/* Tips */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-emerald-600" />
                                        <Label>Tips ({formData.tips.length})</Label>
                                    </div>
                                    <Button onClick={addTip} size="sm" variant="outline" className="gap-1">
                                        <Plus className="w-3 h-3" />
                                        Tambah
                                    </Button>
                                </div>
                                {formData.tips.map((tip, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            value={tip}
                                            onChange={(e) => updateTip(index, e.target.value)}
                                            placeholder="Tips untuk user"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeTip(index)}
                                            className="h-9 w-9 text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Warnings */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        <Label>Warnings ({formData.warnings.length})</Label>
                                    </div>
                                    <Button onClick={addWarning} size="sm" variant="outline" className="gap-1">
                                        <Plus className="w-3 h-3" />
                                        Tambah
                                    </Button>
                                </div>
                                {formData.warnings.map((warning, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            value={warning}
                                            onChange={(e) => updateWarning(index, e.target.value)}
                                            placeholder="Peringatan untuk user"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeWarning(index)}
                                            className="h-9 w-9 text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        {/* FAQ Tab */}
                        <TabsContent value="faq" className="space-y-4 mt-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-600" />
                                    <p className="text-sm text-slate-500">Pertanyaan yang sering diajukan</p>
                                </div>
                                <Button onClick={addFAQ} size="sm" variant="outline" className="gap-1">
                                    <Plus className="w-3 h-3" />
                                    Tambah FAQ
                                </Button>
                            </div>
                            {formData.faqs.length === 0 ? (
                                <div className="text-center py-8 border rounded-lg bg-slate-50">
                                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500">Belum ada FAQ</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.faqs.map((faq, index) => (
                                        <Card key={index}>
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-500">FAQ {index + 1}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeFAQ(index)}
                                                        className="h-7 w-7 text-red-500"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Pertanyaan</Label>
                                                    <Input
                                                        value={faq.question}
                                                        onChange={(e) => updateFAQ(index, "question", e.target.value)}
                                                        placeholder="Pertanyaan"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Jawaban</Label>
                                                    <Textarea
                                                        value={faq.answer}
                                                        onChange={(e) => updateFAQ(index, "answer", e.target.value)}
                                                        placeholder="Jawaban"
                                                        rows={2}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsCreateModalOpen(false)
                                setIsEditModalOpen(false)
                            }}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={isEditModalOpen ? handleUpdate : handleCreate}
                            disabled={saving}
                            className="gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isEditModalOpen ? "Simpan Perubahan" : "Buat Tutorial"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus Tutorial</DialogTitle>
                        <DialogDescription>
                            Apakah Anda yakin ingin menghapus tutorial "{selectedTutorial?.title}"?
                            Tindakan ini tidak dapat dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                            Batal
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={saving}
                            className="gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Hapus
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
