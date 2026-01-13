"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
    BookOpen,
    Video,
    FileText,
    Search,
    Clock,
    ExternalLink,
    Zap,
    Target,
    Store,
    Activity,
    RotateCcw,
    MessageSquare,
    CreditCard,
    ArrowRight,
    RefreshCw,
    Settings,
    Shield
} from "lucide-react"
import { tutorials as staticTutorials } from "@/lib/tutorials"

// Icon mapping
const iconMap: Record<string, any> = {
    BookOpen,
    Store,
    Zap,
    Activity,
    Target,
    RotateCcw,
    MessageSquare,
    CreditCard,
    Settings,
    Shield,
    FileText
}

interface Tutorial {
    id?: number
    slug: string
    title: string
    description: string
    duration: string
    type: "video" | "article"
    category: string
    icon: string
    cover_image?: string
    video_url?: string
}

const categories = ["Semua", "Dasar", "Setup", "Automation", "Analisis", "Optimization", "Monitoring", "Billing"]

export function TutorialPage() {
    const [tutorials, setTutorials] = useState<Tutorial[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("Semua")

    useEffect(() => {
        fetchTutorials()
    }, [])

    const fetchTutorials = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/tutorials')
            const data = await response.json()

            if (data.tutorials && data.tutorials.length > 0) {
                // Use database tutorials
                setTutorials(data.tutorials)
            } else {
                // Fallback to static tutorials
                setTutorials(staticTutorials.map(t => ({
                    slug: t.slug,
                    title: t.title,
                    description: t.description,
                    duration: t.duration,
                    type: t.type,
                    category: t.category,
                    icon: t.icon,
                    cover_image: t.coverImage,
                    video_url: t.videoUrl
                })))
            }
        } catch (error) {
            console.error('Error fetching tutorials:', error)
            // Fallback to static tutorials on error
            setTutorials(staticTutorials.map(t => ({
                slug: t.slug,
                title: t.title,
                description: t.description,
                duration: t.duration,
                type: t.type,
                category: t.category,
                icon: t.icon,
                cover_image: t.coverImage,
                video_url: t.videoUrl
            })))
        } finally {
            setLoading(false)
        }
    }

    const filteredTutorials = tutorials.filter((tutorial) => {
        const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tutorial.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategory === "Semua" || tutorial.category === selectedCategory
        return matchesSearch && matchesCategory
    })

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-primary">Tutorial & Panduan</h1>
                <p className="text-gray-600 mt-1">Pelajari cara menggunakan ADSPILOT untuk mengoptimalkan iklan Shopee Anda</p>
            </div>

            {/* Search and Filter */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari tutorial..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="flex flex-wrap gap-2">
                            {categories.map((category) => (
                                <Button
                                    key={category}
                                    variant={selectedCategory === category ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(category)}
                                    className="rounded-full"
                                >
                                    {category}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <div className="flex items-start justify-between mb-2">
                                    <Skeleton className="w-12 h-12 rounded-lg" />
                                    <Skeleton className="w-16 h-6 rounded-full" />
                                </div>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-4 w-20" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <>
                    {/* Tutorial Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTutorials.map((tutorial, index) => {
                            const Icon = iconMap[tutorial.icon] || BookOpen
                            const delayClass = `delay-${((index % 5) + 1) * 100}`
                            return (
                                <Link key={tutorial.slug} href={`/tutorial/${tutorial.slug}`}>
                                    <Card
                                        className={`cursor-pointer group relative overflow-hidden border hover:border-primary/50 transition-all duration-300 hover:shadow-lg animate-fade-in-up h-full ${delayClass}`}
                                    >
                                        <CardHeader>
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-all duration-300">
                                                    <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                                                </div>
                                                <Badge
                                                    variant={tutorial.type === "video" ? "default" : "secondary"}
                                                    className="gap-1"
                                                >
                                                    {tutorial.type === "video" ? (
                                                        <>
                                                            <Video className="w-3 h-3" />
                                                            Video
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileText className="w-3 h-3" />
                                                            Artikel
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-lg group-hover:text-primary transition-colors duration-300">
                                                {tutorial.title}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
                                                {tutorial.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-gray-700 transition-colors duration-300">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{tutorial.duration}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <span className="text-sm font-medium">
                                                        {tutorial.type === "video" ? "Tonton" : "Baca"}
                                                    </span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </CardContent>

                                        {/* Subtle gradient overlay on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Empty State */}
                    {filteredTutorials.length === 0 && (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada tutorial ditemukan</h3>
                                <p className="text-gray-500">Coba ubah kata kunci pencarian atau filter kategori</p>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Help Section */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Butuh Bantuan Lebih Lanjut?</h3>
                            <p className="text-sm text-gray-600 mb-3">
                                Tim support kami siap membantu Anda melalui Telegram member group
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => window.open("https://t.me/adspilot_support", "_blank")}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Hubungi Support
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
