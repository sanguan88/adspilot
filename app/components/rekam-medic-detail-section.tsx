"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Star, DollarSign, HelpCircle, AlertTriangle, ExternalLink, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Copy, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface BCGData {
    campaign_id: string
    title: string
    status: string
    growthRate: number
    marketShare: number
    category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs'
    spend: number
    revenue: number
    roas: number
    image?: string
    id_toko?: string
}

interface DetailSectionProps {
    bcgData: BCGData[]
    categoryCounts: {
        stars: number
        cash_cows: number
        question_marks: number
        dogs: number
    }
    totalCampaigns: number
    imageMap: Map<string, string>
}

const COLORS = {
    stars: '#059669',
    cash_cows: '#2563EB',
    question_marks: '#D97706',
    dogs: '#DC2626',
}

const CATEGORY_LABELS = {
    stars: 'TOP PERFORM',
    cash_cows: 'REVENUE STABIL',
    question_marks: 'FASE TESTING',
    dogs: 'UNDER PERFORM',
}

const CATEGORY_INFO = {
    stars: {
        icon: Star,
        label: 'TOP PERFORM',
        description: 'Iklan Anda menunjukkan pertumbuhan tinggi dengan performa di atas rata-rata (Iklan Andalan).',
        action: [
            'Pertahankan budget dan tingkatkan investasi pada iklan TOP PERFORM',
            'Monitor performa secara berkala untuk memastikan konsistensi',
            'Scale up iklan TOP PERFORM yang menunjukkan ROI/ROAS terbaik',
            'Gunakan data TOP PERFORM sebagai benchmark untuk optimasi iklan lain'
        ],
        color: COLORS.stars,
        lightColor: '#ecfdf5',
    },
    cash_cows: {
        icon: DollarSign,
        label: 'REVENUE STABIL',
        description: 'Iklan stabil dengan menghasilkan omzet besar secara konsisten.',
        action: [
            'Pertahankan budget dan optimasi untuk efisiensi',
            'Monitor untuk memastikan tidak turun ke kategori UNDER PERFORM',
            'Gunakan sebagai sumber pendapatan stabil untuk operasional'
        ],
        color: COLORS.cash_cows,
        lightColor: '#eff6ff',
    },
    question_marks: {
        icon: HelpCircle,
        label: 'FASE TESTING',
        description: 'Iklan menunjukkan potensi (sedang diuji) tapi perlu optimasi lebih lanjut untuk naik kelas.',
        action: [
            'Berikan waktu 1-2 minggu untuk optimasi kreatif dan targeting',
            'Monitor metrik utama (CTR, Conversion, ROAS) secara ketat',
            'Set deadline: jika tidak membaik setelah optimasi, pertimbangkan stop',
            'Pelajari dari TOP PERFORM untuk strategi optimasi'
        ],
        color: COLORS.question_marks,
        lightColor: '#fffbeb',
    },
    dogs: {
        icon: AlertTriangle,
        label: 'UNDER PERFORM',
        description: 'Iklan masuk kategori UNDER PERFORM yang memerlukan evaluasi segera karena biaya tinggi vs hasil rendah.',
        action: [
            'Evaluasi satu per satu iklan UNDER PERFORM untuk menentukan penyebab performa rendah',
            'Pertimbangkan pause atau stop iklan yang jelas tidak efektif',
            'Lakukan optimasi besar (kreatif, targeting, budget) sebelum stop',
            'Alihkan budget dari UNDER PERFORM ke TOP PERFORM untuk efisiensi'
        ],
        color: COLORS.dogs,
        lightColor: '#fef2f2',
    },
}

// Status badge helper
const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
    ongoing: { label: 'Aktif', color: '#059669', bgColor: '#ecfdf5' },
    active: { label: 'Aktif', color: '#059669', bgColor: '#ecfdf5' },
    paused: { label: 'Dijeda', color: '#D97706', bgColor: '#fffbeb' },
    pause: { label: 'Dijeda', color: '#D97706', bgColor: '#fffbeb' },
    ended: { label: 'Berhenti', color: '#DC2626', bgColor: '#fef2f2' },
    expired: { label: 'Berhenti', color: '#DC2626', bgColor: '#fef2f2' },
    deleted: { label: 'Dihapus', color: '#6B7280', bgColor: '#f3f4f6' },
}

function getStatusBadge(status: string) {
    const normalizedStatus = status?.toLowerCase() || 'paused'
    const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG['paused']
    return config
}

export function RekamMedicDetailSection({ bcgData, categoryCounts, totalCampaigns, imageMap }: DetailSectionProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<keyof typeof CATEGORY_LABELS>('question_marks')
    const [currentPage, setCurrentPage] = useState(1)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set(['all']))
    const itemsPerPage = 10

    // Toggle status filter
    const toggleStatusFilter = (status: string) => {
        setStatusFilters(prev => {
            const next = new Set(prev)
            if (status === 'all') {
                // If clicking "all", select only "all"
                return new Set(['all'])
            } else {
                // Remove "all" if clicking specific status
                next.delete('all')
                if (next.has(status)) {
                    next.delete(status)
                    // If no filter selected, go back to "all"
                    if (next.size === 0) return new Set(['all'])
                } else {
                    next.add(status)
                }
            }
            return next
        })
        setCurrentPage(1)
    }

    // Check if a status matches the filter
    const matchesStatusFilter = (campaignStatus: string) => {
        if (statusFilters.has('all')) return true
        const normalizedStatus = campaignStatus?.toLowerCase() || 'paused'
        if (statusFilters.has('ongoing') && (normalizedStatus === 'ongoing' || normalizedStatus === 'active')) return true
        if (statusFilters.has('paused') && (normalizedStatus === 'paused' || normalizedStatus === 'pause')) return true
        if (statusFilters.has('ended') && (normalizedStatus === 'ended' || normalizedStatus === 'expired' || normalizedStatus === 'deleted')) return true
        return false
    }

    const filteredCampaigns = bcgData
        .filter(c => c.category === activeTab)
        .filter(c => matchesStatusFilter(c.status))
        .sort((a, b) => b.revenue - a.revenue)

    const currentInfo = CATEGORY_INFO[activeTab]
    const count = categoryCounts[activeTab]
    const percentage = totalCampaigns > 0 ? (count / totalCampaigns) * 100 : 0

    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + itemsPerPage)

    const handleTabChange = (value: string) => {
        setActiveTab(value as any)
        setCurrentPage(1)
    }

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopiedId(id)
        toast.success("ID Kampanye disalin ke clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleRedirect = (campaignId: string, tokoId?: string) => {
        const params = new URLSearchParams()
        if (tokoId) {
            params.append('account_ids', tokoId)
        }
        params.append('search', campaignId)
        window.open(`/campaigns?${params.toString()}`, '_blank')
    }

    return (
        <Card className="border-gray-300 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-900 uppercase">III. Detail Rincian Iklan Per Kategori</CardTitle>
                    {/* Status Filter Badges */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium mr-1">Status:</span>
                        {[
                            { key: 'all', label: 'Semua', color: '#6B7280' },
                            { key: 'ongoing', label: 'Aktif', color: '#059669' },
                            { key: 'paused', label: 'Dijeda', color: '#D97706' },
                            { key: 'ended', label: 'Berhenti', color: '#DC2626' },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => toggleStatusFilter(key)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase transition-all border ${statusFilters.has(key)
                                        ? 'text-white shadow-sm'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                                style={{
                                    backgroundColor: statusFilters.has(key) ? color : undefined,
                                    borderColor: color,
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="w-full h-auto p-0 bg-gray-100 rounded-none border-b">
                        {(['question_marks', 'stars', 'cash_cows', 'dogs'] as const).map((cat) => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className={`flex-1 py-3 px-4 rounded-none border-b-2 border-transparent transition-all data-[state=active]:bg-white data-[state=active]:border-[${COLORS[cat]}]`}
                                style={{
                                    '--active-color': COLORS[cat],
                                } as any}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[cat] }} />
                                    <span className="text-xs font-bold uppercase tracking-tight">{CATEGORY_LABELS[cat]}</span>
                                    <Badge variant="secondary" className="ml-1 text-[10px] font-bold">{categoryCounts[cat]}</Badge>
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="p-6 space-y-6"
                        >
                            {/* Category Summary Header */}
                            <div
                                className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border"
                                style={{ backgroundColor: currentInfo.lightColor, borderColor: `${currentInfo.color}30` }}
                            >
                                <div className="md:col-span-2 space-y-3">
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Jumlah Iklan</p>
                                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Persentase</p>
                                        <p className="text-2xl font-bold text-gray-900">{percentage.toFixed(1)}%</p>
                                    </div>
                                </div>

                                <div className="md:col-span-5 bg-white p-4 rounded-lg border shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <currentInfo.icon className="w-4 h-4" style={{ color: currentInfo.color }} />
                                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: currentInfo.color }}>
                                            Analisis {currentInfo.label}
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                        {currentInfo.description}
                                    </p>
                                </div>

                                <div className="md:col-span-5 bg-white p-4 rounded-lg border shadow-sm">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Tindakan Yang Direkomendasikan:</p>
                                    <ul className="space-y-1.5">
                                        {currentInfo.action.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                                                <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: currentInfo.color }} />
                                                <span className="leading-tight">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Campaign Table */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-16 font-bold text-[11px] uppercase">Gambar</TableHead>
                                            <TableHead className="font-bold text-[11px] uppercase">Judul Iklan</TableHead>
                                            <TableHead className="text-center font-bold text-[11px] uppercase">Performa</TableHead>
                                            <TableHead className="text-center font-bold text-[11px] uppercase">Pertumbuhan</TableHead>
                                            <TableHead className="text-center font-bold text-[11px] uppercase">ROAS</TableHead>
                                            <TableHead className="text-right font-bold text-[11px] uppercase">Spend Iklan</TableHead>
                                            <TableHead className="text-right font-bold text-[11px] uppercase">Revenue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCampaigns.length > 0 ? (
                                            paginatedCampaigns.map((campaign) => {
                                                const imageUrl = imageMap.get(campaign.campaign_id) || campaign.image
                                                const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://down-id.img.susercontent.com/${imageUrl}`) : null

                                                return (
                                                    <TableRow key={campaign.campaign_id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <TableCell className="p-3">
                                                            <div className="w-12 h-12 rounded-lg border bg-gray-100 overflow-hidden flex items-center justify-center">
                                                                {fullImageUrl ? (
                                                                    <img src={fullImageUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[10px] text-gray-400">No img</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-3">
                                                            <div className="flex flex-col gap-1 w-[220px] sm:w-[280px] lg:w-[350px]">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        onClick={() => handleRedirect(campaign.campaign_id, campaign.id_toko)}
                                                                        className="text-[13px] font-bold text-gray-900 leading-tight cursor-pointer hover:text-primary hover:underline transition-all truncate"
                                                                        title={campaign.title}
                                                                    >
                                                                        {campaign.title}
                                                                    </span>
                                                                    {/* Status Badge */}
                                                                    {(() => {
                                                                        const statusConfig = getStatusBadge(campaign.status)
                                                                        return (
                                                                            <span
                                                                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase whitespace-nowrap flex-shrink-0"
                                                                                style={{
                                                                                    backgroundColor: statusConfig.bgColor,
                                                                                    color: statusConfig.color,
                                                                                    border: `1px solid ${statusConfig.color}30`
                                                                                }}
                                                                            >
                                                                                {statusConfig.label}
                                                                            </span>
                                                                        )
                                                                    })()}
                                                                </div>
                                                                <div className="flex items-center gap-2 group/id">
                                                                    <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                                                                        ID: {campaign.campaign_id}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => handleCopy(campaign.campaign_id)}
                                                                        className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-700 flex-shrink-0"
                                                                        title="Copy ID"
                                                                    >
                                                                        {copiedId === campaign.campaign_id ? (
                                                                            <Check className="w-3 h-3 text-green-600" />
                                                                        ) : (
                                                                            <Copy className="w-3 h-3" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="p-3 text-center min-w-[100px]">
                                                            <span className="text-xs font-bold text-gray-700">{campaign.marketShare.toFixed(1)}%</span>
                                                        </TableCell>
                                                        <TableCell className="p-3 text-center min-w-[100px]">
                                                            <span className="text-xs font-bold text-gray-700">{campaign.growthRate.toFixed(1)}%</span>
                                                        </TableCell>
                                                        <TableCell className="p-3 text-center min-w-[80px]">
                                                            <Badge variant="outline" className={`font-bold text-[10px] ${campaign.roas >= 2 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600'}`}>
                                                                {campaign.roas.toFixed(2)}x
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="p-3 text-right min-w-[120px]">
                                                            <span className="text-xs font-bold text-gray-900">
                                                                Rp {Math.round(campaign.spend).toLocaleString('id-ID')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="p-3 text-right min-w-[120px]">
                                                            <span className="text-xs font-bold text-primary">
                                                                Rp {Math.round(campaign.revenue).toLocaleString('id-ID')}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-20 text-gray-400 italic text-sm">
                                                    Tidak ada iklan dalam kategori ini
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {filteredCampaigns.length > 0 && (
                                <div className="flex items-center justify-between px-2 pt-2 border-t">
                                    <div className="text-[11px] text-gray-500 font-medium">
                                        Menampilkan <span className="font-bold text-gray-900">{startIndex + 1}</span> - <span className="font-bold text-gray-900">{Math.min(startIndex + itemsPerPage, filteredCampaigns.length)}</span> dari <span className="font-bold text-gray-900">{filteredCampaigns.length}</span> iklan
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        <div className="flex items-center justify-center px-3 h-8 border rounded-md min-w-[32px] text-xs font-bold bg-white">
                                            {currentPage} / {totalPages}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage(totalPages)}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Tabs>
            </CardContent>
        </Card>
    )
}
