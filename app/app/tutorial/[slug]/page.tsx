"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    ArrowLeft,
    Clock,
    BookOpen,
    Video,
    FileText,
    ExternalLink,
    ChevronRight,
    Lightbulb,
    AlertTriangle,
    HelpCircle,
    Play,
    Store,
    Zap,
    Activity,
    Target,
    RotateCcw,
    MessageSquare,
    CreditCard,
    ThumbsUp,
    ThumbsDown
} from "lucide-react"
import { getTutorialBySlug, getRelatedTutorials, TutorialArticle } from "@/lib/tutorials"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"

// Icon mapping
const iconMap: Record<string, any> = {
    BookOpen,
    Store,
    Zap,
    Activity,
    Target,
    RotateCcw,
    MessageSquare,
    CreditCard
}

// Check if content is HTML (from TipTap) or markdown-like (legacy)
function isHtmlContent(content: string): boolean {
    return content.startsWith('<') || content.includes('<p>') || content.includes('<h')
}

// Simple markdown-like content renderer (for legacy content)
function RenderMarkdownContent({ content }: { content: string }) {
    const paragraphs = content.split('\n\n')

    return (
        <>
            {paragraphs.map((paragraph, i) => {
                // Handle tables
                if (paragraph.includes(' | ') && paragraph.includes('\n')) {
                    const lines = paragraph.split('\n').filter(l => l.trim())
                    const headerLine = lines.find(l => l.includes('|'))
                    if (headerLine) {
                        const headers = headerLine.split('|').map(h => h.trim()).filter(Boolean)
                        const dataLines = lines.filter(l => !l.match(/^[\-\|]+$/) && l !== headerLine)

                        return (
                            <div key={i} className="overflow-x-auto my-4">
                                <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {headers.map((h, j) => (
                                                <th key={j} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {dataLines.map((row, j) => {
                                            const cells = row.split('|').map(c => c.trim()).filter(Boolean)
                                            return (
                                                <tr key={j}>
                                                    {cells.map((cell, k) => (
                                                        <td key={k} className="px-4 py-3 text-sm text-gray-700">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    }
                }

                // Handle numbered lists
                if (paragraph.match(/^\d+\./m)) {
                    const items = paragraph.split('\n').filter(item => item.trim())
                    return (
                        <ol key={i} className="list-decimal list-inside space-y-2 my-4">
                            {items.map((item, j) => {
                                const cleaned = item.replace(/^\d+\.\s*/, '')
                                if (!cleaned) return null
                                return (
                                    <li key={j} className="text-gray-700">
                                        <RenderBoldText text={cleaned} />
                                    </li>
                                )
                            })}
                        </ol>
                    )
                }

                // Handle bullet lists
                if (paragraph.startsWith('- ') || paragraph.match(/^- /m)) {
                    const items = paragraph.split('\n').filter(item => item.trim())
                    return (
                        <ul key={i} className="list-disc list-inside space-y-2 my-4">
                            {items.map((item, j) => {
                                const cleaned = item.replace(/^-\s*/, '')
                                if (!cleaned) return null
                                return (
                                    <li key={j} className="text-gray-700">
                                        <RenderBoldText text={cleaned} />
                                    </li>
                                )
                            })}
                        </ul>
                    )
                }

                // Regular paragraph
                return (
                    <p key={i} className="text-gray-700 my-3 leading-relaxed">
                        <RenderBoldText text={paragraph} />
                    </p>
                )
            })}
        </>
    )
}

// Render text with bold formatting (for legacy markdown)
function RenderBoldText({ text }: { text: string }) {
    const parts = text.split(/(\*\*.*?\*\*)/)
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="text-gray-900">{part.replace(/\*\*/g, '')}</strong>
                }
                return <span key={i}>{part}</span>
            })}
        </>
    )
}

// Helper to resolving image URLs to Admin Portal
function resolveImageUrl(url: string | null | undefined): string {
    if (!url) return ""
    if (url.startsWith('/uploads/')) {
        return `http://localhost:3001${url}`
    }
    return url
}

// Unified content renderer that supports both HTML and markdown
function RenderContent({ content }: { content: string }) {
    if (!content) return null

    // If content is HTML (from TipTap editor)
    if (isHtmlContent(content)) {
        // Fix image URLs in HTML content
        const processedContent = content.replace(
            /src="\/uploads\//g,
            'src="http://localhost:3001/uploads/'
        )

        return (
            <div
                className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-a:text-primary prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-blockquote:text-gray-600 prose-blockquote:border-primary/50"
                dangerouslySetInnerHTML={{ __html: processedContent }}
            />
        )
    }

    // Fallback to legacy markdown-like content
    return <RenderMarkdownContent content={content} />
}

export default function TutorialArticlePage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    const [tutorial, setTutorial] = useState<TutorialArticle | null>(null)
    const [relatedTutorials, setRelatedTutorials] = useState<TutorialArticle[]>([])
    const [activeSection, setActiveSection] = useState<string>("")
    const [feedback, setFeedback] = useState<"helpful" | "not-helpful" | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTutorial = async () => {
            try {
                setLoading(true)
                const response = await fetch(`/api/tutorials/${slug}`)
                const data = await response.json()

                if (data.tutorial) {
                    setTutorial(data.tutorial)
                    if (data.tutorial.related && data.tutorial.related.length > 0) {
                        setRelatedTutorials(data.tutorial.related)
                    }
                    if (data.tutorial.sections && data.tutorial.sections.length > 0) {
                        setActiveSection(data.tutorial.sections[0].id)
                    }
                } else {
                    // Fallback to static data
                    const t = getTutorialBySlug(slug)
                    if (t) {
                        setTutorial(t)
                        if (t.relatedSlugs) {
                            setRelatedTutorials(getRelatedTutorials(t.relatedSlugs))
                        }
                        if (t.sections.length > 0) {
                            setActiveSection(t.sections[0].id)
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching tutorial:', error)
                // Fallback to static data
                const t = getTutorialBySlug(slug)
                if (t) {
                    setTutorial(t)
                    if (t.relatedSlugs) {
                        setRelatedTutorials(getRelatedTutorials(t.relatedSlugs))
                    }
                    if (t.sections.length > 0) {
                        setActiveSection(t.sections[0].id)
                    }
                }
            } finally {
                setLoading(false)
            }
        }

        fetchTutorial()
    }, [slug])

    useEffect(() => {
        const handleScroll = () => {
            if (!tutorial) return
            const sections = tutorial.sections
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i].id)
                if (el) {
                    const rect = el.getBoundingClientRect()
                    if (rect.top <= 150) {
                        setActiveSection(sections[i].id)
                        break
                    }
                }
            }
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [tutorial])

    if (!tutorial) {
        return (
            <ProtectedRoute>
                <DashboardLayout>
                    <div className="p-6">
                        <div className="text-center py-20">
                            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">Tutorial Tidak Ditemukan</h1>
                            <p className="text-gray-600 mb-4">Artikel yang Anda cari tidak tersedia.</p>
                            <Link href="/tutorial">
                                <Button>Kembali ke Tutorial</Button>
                            </Link>
                        </div>
                    </div>
                </DashboardLayout>
            </ProtectedRoute>
        )
    }

    const Icon = iconMap[tutorial.icon] || BookOpen

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <div className="min-h-screen bg-gray-50">
                    {/* Hero Section */}
                    {/* Hero Section */}
                    <div className="relative bg-slate-900 overflow-hidden">
                        {tutorial.coverImage && (
                            <div className="absolute inset-0">
                                <img
                                    src={tutorial.coverImage}
                                    alt={tutorial.title}
                                    className="w-full h-full object-cover opacity-60"
                                />
                                {/* Strong gradient overlay to ensure text readability */}
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/80 to-transparent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-50/10 to-transparent" />
                            </div>
                        )}

                        <div className="relative z-10 pt-10 pb-12 px-6 max-w-7xl mx-auto">
                            {/* Breadcrumb */}
                            <nav className="flex items-center gap-2 text-sm mb-6 flex-wrap">
                                <Link href="/tutorial" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium">
                                    <ArrowLeft className="w-4 h-4" />
                                    Tutorial
                                </Link>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{tutorial.category}</span>
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                <span className="text-white font-medium truncate max-w-[200px] lg:max-w-md">{tutorial.title}</span>
                            </nav>

                            {/* Title & Meta */}
                            <div className="max-w-4xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-inner">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge variant="outline" className={`gap-1 border-white/20 text-white ${tutorial.type === "video" ? "bg-red-500/20 text-red-100 border-red-500/30" : "bg-emerald-500/20 text-emerald-100 border-emerald-500/30"}`}>
                                        {tutorial.type === "video" ? (
                                            <>
                                                <Video className="w-3 h-3" />
                                                Video Tutorial
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-3 h-3" />
                                                Artikel Panduan
                                            </>
                                        )}
                                    </Badge>
                                </div>

                                <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight drop-shadow-sm">
                                    {tutorial.title}
                                </h1>

                                <p className="text-lg text-gray-300 mb-6 leading-relaxed max-w-2xl border-l-4 border-emerald-500/50 pl-4">
                                    {tutorial.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-6 text-gray-400 font-medium text-sm">
                                    <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-3 py-1 border border-white/5">
                                        <Clock className="w-4 h-4 text-emerald-400" />
                                        <span>Estimasi baca: <span className="text-gray-200">{tutorial.duration}</span></span>
                                    </div>

                                    {tutorial.type === "video" && tutorial.videoUrl && (
                                        <Button
                                            size="sm"
                                            className="gap-2 bg-white text-slate-900 hover:bg-gray-100 border-0 font-semibold"
                                            onClick={() => window.open(tutorial.videoUrl, "_blank")}
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            Tonton Video
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="max-w-7xl mx-auto px-6 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Table of Contents - Sidebar */}
                            <aside className="lg:col-span-1">
                                <div className="sticky top-6">
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                                Daftar Isi
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <nav className="space-y-1">
                                                {tutorial.sections.map((section) => (
                                                    <a
                                                        key={section.id}
                                                        href={`#${section.id}`}
                                                        className={`block py-2 px-3 text-sm rounded-lg transition-colors ${activeSection === section.id
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-gray-600 hover:bg-gray-100"
                                                            }`}
                                                    >
                                                        {section.title}
                                                    </a>
                                                ))}
                                            </nav>
                                        </CardContent>
                                    </Card>
                                </div>
                            </aside>

                            {/* Main Content */}
                            <main className="lg:col-span-3 space-y-8">
                                {/* Article Sections */}
                                {tutorial.sections.map((section, index) => (
                                    <section
                                        key={section.id}
                                        id={section.id}
                                        className="scroll-mt-6 animate-fade-in-up"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <Card>
                                            <CardContent className="p-6 lg:p-8">
                                                <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">
                                                    {section.title}
                                                </h2>
                                                <div className="prose prose-gray max-w-none">
                                                    <RenderContent content={section.content} />
                                                </div>
                                                {section.image && (
                                                    <figure className="mt-6">
                                                        <img
                                                            src={resolveImageUrl(section.image)}
                                                            alt={section.imageCaption || section.title}
                                                            className="w-full rounded-lg border shadow-sm"
                                                        />
                                                        {section.imageCaption && (
                                                            <figcaption className="mt-2 text-sm text-center text-gray-500">
                                                                {section.imageCaption}
                                                            </figcaption>
                                                        )}
                                                    </figure>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </section>
                                ))}

                                {/* Tips Section */}
                                {tutorial.tips && tutorial.tips.length > 0 && (
                                    <Card className="border-emerald-200 bg-emerald-50/50">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <Lightbulb className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-emerald-900 mb-2">💡 Tips</h3>
                                                    <ul className="space-y-2">
                                                        {tutorial.tips.map((tip, i) => (
                                                            <li key={i} className="text-emerald-800 flex items-start gap-2">
                                                                <span className="text-emerald-500 mt-1">•</span>
                                                                {tip}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Warnings Section */}
                                {tutorial.warnings && tutorial.warnings.length > 0 && (
                                    <Card className="border-amber-200 bg-amber-50/50">
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-amber-900 mb-2">⚠️ Perhatian</h3>
                                                    <ul className="space-y-2">
                                                        {tutorial.warnings.map((warning, i) => (
                                                            <li key={i} className="text-amber-800 flex items-start gap-2">
                                                                <span className="text-amber-500 mt-1">•</span>
                                                                {warning}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* FAQ Section */}
                                {tutorial.faqs && tutorial.faqs.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <HelpCircle className="w-5 h-5 text-primary" />
                                                Pertanyaan Umum (FAQ)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {tutorial.faqs.map((faq, i) => (
                                                <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                                                    <h4 className="font-semibold text-gray-900 mb-2">Q: {faq.question}</h4>
                                                    <p className="text-gray-700">A: {faq.answer}</p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Feedback Section */}
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="text-center">
                                            <p className="text-gray-700 mb-4">Apakah artikel ini membantu?</p>
                                            <div className="flex items-center justify-center gap-4">
                                                <Button
                                                    variant={feedback === "helpful" ? "default" : "outline"}
                                                    className="gap-2"
                                                    onClick={() => setFeedback("helpful")}
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Ya, Membantu
                                                </Button>
                                                <Button
                                                    variant={feedback === "not-helpful" ? "destructive" : "outline"}
                                                    className="gap-2"
                                                    onClick={() => setFeedback("not-helpful")}
                                                >
                                                    <ThumbsDown className="w-4 h-4" />
                                                    Kurang Membantu
                                                </Button>
                                            </div>
                                            {feedback && (
                                                <p className="mt-4 text-sm text-gray-500">
                                                    Terima kasih atas feedback Anda!
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Related Tutorials */}
                                {relatedTutorials.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tutorial Terkait</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {relatedTutorials.map((related) => {
                                                const RelatedIcon = iconMap[related.icon] || BookOpen
                                                return (
                                                    <Link key={related.slug} href={`/tutorial/${related.slug}`}>
                                                        <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                        <RelatedIcon className="w-5 h-5 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-semibold text-gray-900 line-clamp-1">{related.title}</h4>
                                                                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{related.description}</p>
                                                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                                                            <Clock className="w-3 h-3" />
                                                                            <span>{related.duration}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Back to Tutorial List */}
                                <div className="text-center pt-4">
                                    <Link href="/tutorial">
                                        <Button variant="outline" className="gap-2">
                                            <ArrowLeft className="w-4 h-4" />
                                            Kembali ke Daftar Tutorial
                                        </Button>
                                    </Link>
                                </div>
                            </main>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </ProtectedRoute>
    )
}
