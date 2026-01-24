"use client"

import { useState, useEffect, useMemo } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DollarSign,
  Target,
  MousePointer,
  ShoppingCart,
  Star,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Download,
  Filter,
  Search,
  Table as TableIcon,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  X,
  Info,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { RekamMedicLabHeader } from "./rekam-medic-lab-header"

import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { RekamMedicCategoryModal } from "./rekam-medic-category-modal"
import { RekamMedicDetailSection } from "./rekam-medic-detail-section"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface FunnelMetrics {
  campaign_id: string
  title: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  ctr: number
  conversionRate: number
  revenuePerConversion: number
  roas: number
}

interface BCGData {
  campaign_id: string
  title: string
  growthRate: number
  marketShare: number
  category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs'
  spend: number
  revenue: number
  roas: number
  image?: string
  id_toko?: string
}

interface SummaryData {
  totalCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  totalSpend: number
  avgCTR: number
  avgConversionRate: number
  avgROAS: number
  categoryCounts: {
    stars: number
    cash_cows: number
    question_marks: number
    dogs: number
  }
  statusCounts?: {
    active: number
    paused: number
    ended: number
  }
}

const CATEGORY_LABELS = {
  stars: 'TOP PERFORM',
  cash_cows: 'REVENUE STABIL',
  question_marks: 'FASE TESTING',
  dogs: 'UNDER PERFORM',
}

const COLORS = {
  stars: '#059669',
  cash_cows: '#2563EB',
  question_marks: '#D97706',
  dogs: '#DC2626',
}

// Generate report number
function generateReportNumber(): string {
  const now = new Date()
  const dateStr = format(now, 'yyyy-MM-dd')
  const timeStr = format(now, 'HHmmss')
  return `RM - ${dateStr} -${timeStr} `
}

import { useCookiesHealth } from "@/contexts/CookiesHealthContext"

export function RekamMedicPage() {
  const { tokos } = useCookiesHealth()
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [accounts, setAccounts] = useState<Array<{ id_toko: string; nama_toko: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics[]>([])
  const [bcgData, setBcgData] = useState<BCGData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [reportNumber] = useState(() => generateReportNumber())
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map())
  const [modalOpen, setModalOpen] = useState(false)
  const [infoBannerVisible, setInfoBannerVisible] = useState(true)
  const [showBannerConfirm, setShowBannerConfirm] = useState(false)

  // Check localStorage for banner preference
  useEffect(() => {
    const hideBanner = localStorage.getItem('hideRekamMedicBanner')
    if (hideBanner === 'true') {
      setInfoBannerVisible(false)
    }
  }, [])

  const handleCloseBanner = () => {
    setShowBannerConfirm(true)
  }

  const confirmCloseBanner = (hideForever: boolean) => {
    if (hideForever) {
      localStorage.setItem('hideRekamMedicBanner', 'true')
    }
    setInfoBannerVisible(false)
    setShowBannerConfirm(false)
  }
  const [selectedCategory, setSelectedCategory] = useState<'stars' | 'cash_cows' | 'question_marks' | 'dogs' | null>(null)
  const [isHowToReadOpen, setIsHowToReadOpen] = useState(false)

  // Date range states
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Default: 1 Minggu Terakhir
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    return { from: sevenDaysAgo, to: yesterday }
  })

  // ... (keep existing helper functions like getMaxDate, formatDateForAPI, etc.)

  // Fetch accounts - only toko owned by current user
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await authenticatedFetch('/api/accounts?limit=1000&page=1&filter_cookies=all')
        if (!response.ok) {
          setAccounts([])
          return
        }
        const result = await response.json()
        if (result.success && result.data?.accounts) {
          const mappedAccounts = result.data.accounts
            .filter((acc: any) => !!(acc.id || acc.id_toko || acc.username) && acc.status_toko !== 'deleted')
            .map((acc: any) => ({
              id_toko: acc.id_toko || acc.id || acc.username || '',
              nama_toko: acc.nama_toko || acc.username || 'Unknown'
            }))
          setAccounts(mappedAccounts)
        }
      } catch (error) {
        console.error('[Rekam Medic] Error fetching accounts:', error)
        setError('Gagal memuat daftar toko')
      }
    }
    fetchAccounts()
  }, [])

  // Fetch rekam medic data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!dateRange.from || !dateRange.to) return

        const params = new URLSearchParams()
        params.append('start_time', dateRange.from.toLocaleDateString('en-CA'))
        params.append('end_time', dateRange.to.toLocaleDateString('en-CA'))

        if (selectedAccount !== "all") {
          params.append('account_ids', selectedAccount)
        } else {
          // Ketika mode "Semua Akun", hanya ambil data dari akun yang cookies-nya sehat
          const healthyAccountIds = accounts
            .map(acc => acc.id_toko)
            .filter(id => {
              const health = tokos[id]
              return health !== 'expired' && health !== 'no_cookies'
            })

          // Jika ada akun sehat, kirim sebagai parameter
          if (healthyAccountIds.length > 0) {
            params.append('account_ids', healthyAccountIds.join(','))
          } else {
            // Jika tidak ada akun sehat, jangan fetch data
            setFunnelMetrics([])
            setBcgData([])
            setSummary(null)
            setLoading(false)
            return
          }
        }

        const response = await authenticatedFetch(`/api/rekam-medic?${params.toString()}`)

        if (response.status === 401) {
          if (typeof window !== 'undefined') window.location.href = '/auth/login'
          throw new Error('Unauthorized')
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch rekam medic data')
        }

        const result = await response.json()

        if (result.success && result.data) {
          setFunnelMetrics(result.data.funnelMetrics || [])
          setBcgData(result.data.bcgData || [])

          // Calculate operational status counts from campaigns
          const campaigns = result.data.campaigns || []
          const active = campaigns.filter((c: any) => c.status === 'enabled').length
          const paused = campaigns.filter((c: any) => c.status === 'paused').length
          const ended = campaigns.filter((c: any) => c.status === 'ended' || c.status === 'finished').length

          setSummary({
            ...result.data.summary,
            statusCounts: { active, paused, ended }
          })
        } else {
          throw new Error(result.error || 'Failed to fetch rekam medic data')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data'
        setError(errorMessage)
        toast.error("Gagal memuat data Rekam Medic", { description: errorMessage })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedAccount, dateRange])

  // Fetch images for BCG chart
  useEffect(() => {
    if (bcgData.length === 0) return
    const fetchImages = async () => {
      try {
        const tokoIds = Array.from(new Set(bcgData.map(c => c.id_toko).filter(Boolean)))
        const campaignIds = bcgData.map(c => c.campaign_id)
        if (tokoIds.length === 0) return

        const response = await authenticatedFetch('/api/rekam-medic/images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_ids: campaignIds,
            toko_ids: tokoIds,
            start_time: dateRange.from?.toLocaleDateString('en-CA'),
            end_time: dateRange.to?.toLocaleDateString('en-CA'),
          }),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const images = new Map<string, string>()
            Object.entries(result.data).forEach(([campaignId, imageUrl]) => {
              if (imageUrl && typeof imageUrl === 'string') images.set(campaignId, imageUrl)
            })
            setImageMap(images)
          }
        }
      } catch (error) {
        console.error('Error fetching campaign images for chart:', error)
      }
    }
    fetchImages()
  }, [bcgData, dateRange])

  const bcgScatterData = useMemo(() => {
    return bcgData.map(item => ({
      x: item.marketShare,
      y: item.growthRate,
      z: item.spend,
      name: item.title,
      category: item.category,
      campaign_id: item.campaign_id,
      roas: item.roas,
      image: imageMap.get(item.campaign_id) || item.image || null,
    }))
  }, [bcgData, imageMap])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      let imageUrl = data.image ? (data.image.startsWith('http') ? data.image : `https://down-id.img.susercontent.com/${data.image}`) : null
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl max-w-md">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {imageUrl ? <img src={imageUrl} alt={data.name} className="w-24 h-24 object-cover rounded" /> : <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No img</div>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 mb-2 text-sm line-clamp-2 leading-tight">{data.name}</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>Performa:</span><span className="font-semibold">{data.x.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span>Pertumbuhan:</span><span className="font-semibold">{data.y.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span>ROAS:</span><span className="font-semibold">{data.roas?.toFixed(2)}x</span></div>
                <div className="flex justify-between pt-1 border-t mt-1"><span>Spend:</span><span className="font-semibold">Rp {Math.round(data.z || 0).toLocaleString('id-ID')}</span></div>
                <div className="mt-2"><Badge variant="outline" style={{ borderColor: COLORS[data.category as keyof typeof COLORS], color: COLORS[data.category as keyof typeof COLORS] }}>{CATEGORY_LABELS[data.category as keyof typeof COLORS]}</Badge></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const handleDownloadPDF = async () => {
    toast.info("Fitur download PDF sedang dalam pengembangan")
  }

  const isSelectedAccountExpired = selectedAccount !== 'all' && (tokos[selectedAccount] === 'expired' || tokos[selectedAccount] === 'no_cookies')

  return (
    <div className="h-full overflow-y-auto bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <RekamMedicLabHeader
          selectedAccount={selectedAccount}
          accounts={accounts}
          onAccountChange={setSelectedAccount}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          minDate={new Date(new Date().setMonth(new Date().getMonth() - 3))}
          maxDate={new Date()}
          onDownloadPDF={handleDownloadPDF}
          reportNumber={reportNumber}
        />

        {isSelectedAccountExpired ? (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Sesi Toko Berakhir</h3>
                <p className="text-gray-600 max-w-md">
                  Data real-time dan analisis tidak tersedia untuk toko ini karena sesi login Shopee telah berakhir atau cookies tidak ditemukan.
                </p>
              </div>
              <Link href="/accounts">
                <Button variant="destructive" className="font-bold">
                  Perbarui Cookies Sekarang
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="border-red-200"><CardContent className="p-6 flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-red-600" /><p className="text-red-600 font-medium">{error}</p></CardContent></Card>
        ) : (
          <>
            {/* Section I: Informasi Umum */}
            <Card className="border-gray-300 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-gray-200 bg-white">
                <CardTitle className="text-lg font-bold text-gray-900">I. INFORMASI UMUM</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-white space-y-8">
                {/* Info Banner */}
                <AnimatePresence>
                  {infoBannerVisible && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="overflow-hidden"
                    >
                      <Alert className="bg-blue-50 border-blue-200 relative">
                        <Info className="h-5 w-5 text-blue-600" />
                        <button
                          onClick={handleCloseBanner}
                          className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 transition-colors p-1"
                          title="Tutup & Jangan Tampilkan Lagi"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <AlertTitle className="text-blue-800 font-bold mb-2 text-base">Apa itu Rekam Medic & BCG Matrix?</AlertTitle>
                        <AlertDescription className="text-blue-700 text-sm leading-relaxed max-w-[95%]">
                          <p className="mb-2">
                            <strong>Rekam Medic</strong> adalah fitur diagnosis kesehatan iklan toko Anda yang menggunakan framework standar industri global, <strong>BCG Matrix (Boston Consulting Group)</strong>.
                          </p>
                          <p>
                            Sistem ini mengelompokkan iklan berdasarkan dua faktor: <strong>Tingkat Pertumbuhan (Growth)</strong> dan <strong>Penguasaan Pasar (Market Share)</strong>,
                            BUKAN semata-mata berdasarkan profit (ROAS) saat ini. Oleh karena itu, iklan dengan ROAS positif mungkin masuk kategori <em>'Under Perform'</em>
                            jika tren pertumbuhannya menurun drastis. Tujuannya adalah mendeteksi risiko lebih dini sebelum profit benar-benar hilang.
                          </p>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {summary && (
                  <>
                    {/* Primary Summary - 3 Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {[
                        { label: 'Avg CTR', value: `${summary.avgCTR.toFixed(2)}%`, icon: MousePointer, desc: 'Click-through rate' },
                        { label: 'Avg Conversion', value: `${summary.avgConversionRate.toFixed(2)}%`, icon: ShoppingCart, desc: 'Conversion rate' },
                        { label: 'Avg ROAS', value: `${summary.avgROAS.toFixed(2)}x`, icon: DollarSign, desc: 'Return on ad spend' },
                      ].map((item, i) => (
                        <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <Card className="p-6 border-gray-200 shadow-none hover:border-primary/50 transition-colors relative">
                            <item.icon className="w-5 h-5 text-primary absolute top-4 right-4" />
                            <div className="flex flex-col gap-1">
                              <p className="text-primary text-xs font-medium">{item.label}</p>
                              <p className="text-3xl font-bold text-gray-900">{item.value}</p>
                              <p className="text-xs text-gray-500">{item.desc}</p>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* Sub-Summary - 8 Compact Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Operational Status Group */}
                      {[
                        { label: 'TOTAL IKLAN', value: summary.totalCampaigns, icon: Target, hasLink: false },
                        { label: 'ACTIVE', value: summary.statusCounts?.active || 0, icon: MousePointer, hasLink: false },
                        { label: 'PAUSE', value: summary.statusCounts?.paused || 0, icon: AlertTriangle, hasLink: false },
                        { label: 'BERAKHIR', value: summary.statusCounts?.ended || 0, icon: ShoppingCart, hasLink: false },

                        // Performance Diagnostic Group
                        { label: 'FASE TESTING', value: summary.categoryCounts.question_marks, icon: HelpCircle, color: COLORS.question_marks, category: 'question_marks', hasLink: true },
                        { label: 'TOP PERFORM', value: summary.categoryCounts.stars, icon: Star, color: COLORS.stars, category: 'stars', hasLink: true },
                        { label: 'REVENUE STABIL', value: summary.categoryCounts.cash_cows, icon: DollarSign, color: COLORS.cash_cows, category: 'cash_cows', hasLink: true },
                        { label: 'UNDER PERFORM', value: summary.categoryCounts.dogs, icon: AlertTriangle, color: COLORS.dogs, category: 'dogs', hasLink: true },
                      ].map((sub, i) => (
                        <motion.div key={sub.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (i * 0.05) }}>
                          <div
                            className="bg-white p-3 border border-gray-200 rounded-md shadow-sm relative group hover:border-gray-300 transition-all flex flex-col justify-between h-20"
                            style={{
                              borderLeftWidth: '4px',
                              borderLeftColor: (sub as any).color || '#059669' // Default green accent
                            }}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <sub.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: (sub as any).color || '#059669' }} />
                              <span className="text-[10px] font-semibold text-gray-600 tracking-tight truncate uppercase">{sub.label}</span>
                            </div>
                            <div className="flex items-baseline justify-between mt-auto">
                              <span className="text-2xl font-bold text-gray-900">{sub.value}</span>
                              {sub.hasLink && (
                                <span
                                  onClick={() => {
                                    setSelectedCategory((sub as any).category)
                                    setModalOpen(true)
                                  }}
                                  className="text-[8px] text-gray-400 font-medium group-hover:text-primary transition-colors cursor-pointer"
                                >
                                  Pelajari Selengkapnya &gt;&gt;
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Section II: Hasil Analisis Rekam Medic */}
            <Card className="border-gray-300 shadow-sm">
              <Collapsible open={isHowToReadOpen} onOpenChange={setIsHowToReadOpen}>
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900 uppercase">II. Hasil Analisis Rekam Medic</CardTitle>
                      <CardDescription className="mt-1">Kategorisasi iklan berdasarkan Pertumbuhan dan Performa</CardDescription>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Info className="w-4 h-4" />
                        <span className="hidden sm:inline">Cara Membaca</span>
                        {isHowToReadOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </CardHeader>

                <CollapsibleContent className="border-b border-gray-100 bg-blue-50/30">
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div className="space-y-2">
                      <div className="font-bold flex items-center gap-2 text-blue-800">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        SUMBU X (PERFORMA)
                      </div>
                      <p className="text-gray-600 leading-tight">Menunjukkan kinerja relatif iklan dibanding rata-rata. Semakin ke <strong>Kanan</strong>, semakin baik performanya.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold flex items-center gap-2 text-blue-800">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        SUMBU Y (PERTUMBUHAN)
                      </div>
                      <p className="text-gray-600 leading-tight">Menunjukkan tingkat kenaikan revenue. Semakin ke <strong>Atas</strong>, semakin cepat pertumbuhannya.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold flex items-center gap-2 text-blue-800">
                        <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                        UKURAN TITIK
                      </div>
                      <p className="text-gray-600 leading-tight">Mewakili besaran spend iklan. Semakin <strong>Besar</strong> titik, semakin besar investasi Anda.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <CardContent className="pt-6">
                {bcgScatterData.length > 0 ? (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={450}>
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Performa"
                          label={{ value: 'Performa (%)', position: 'insideBottom', offset: -15, style: { fill: '#374151', fontSize: 12, fontWeight: 700 } }}
                          domain={[0, 'auto']}
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          tickFormatter={(value) => Number(value).toFixed(0)}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Pertumbuhan"
                          label={{ value: 'Pertumbuhan (%)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontSize: 12, fontWeight: 700 } }}
                          domain={['auto', 'auto']}
                          tick={{ fill: '#6b7280', fontSize: 11 }}
                          tickFormatter={(value) => Number(value).toFixed(0)}
                        />
                        <ZAxis type="number" dataKey="z" range={[50, 600]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter name="Iklan" data={bcgScatterData}>
                          {bcgScatterData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.category as keyof typeof COLORS]} />)}
                        </Scatter>
                        <ReferenceLine x={100} stroke="#94a3b8" strokeDasharray="5 5" />
                        <ReferenceLine y={10} stroke="#94a3b8" strokeDasharray="5 5" />
                      </ScatterChart>
                    </ResponsiveContainer>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-gray-100">
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                        const color = COLORS[key as keyof typeof COLORS]
                        const count = summary?.categoryCounts[key as keyof typeof summary.categoryCounts] || 0
                        return (
                          <Badge key={key} variant="outline" className="px-3 py-1.5 border-2 font-bold text-[10px]" style={{ borderColor: color, backgroundColor: `${color}10`, color: color }}>
                            {label}: {count}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ) : <div className="text-center py-20 text-gray-400 italic">Data tidak tersedia untuk periode ini</div>}
              </CardContent>
            </Card>

            {/* Section III: Detail Rincian Iklan */}
            {summary && (
              <RekamMedicDetailSection
                bcgData={bcgData}
                categoryCounts={summary.categoryCounts}
                totalCampaigns={summary.totalCampaigns}
                imageMap={imageMap}
              />
            )}



            {/* Global Category Detail Modal */}
            {selectedCategory && (
              <RekamMedicCategoryModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                category={selectedCategory}
                campaigns={bcgData}
                categoryLabel={CATEGORY_LABELS[selectedCategory as keyof typeof CATEGORY_LABELS] || ''}
                categoryColor={COLORS[selectedCategory as keyof typeof COLORS] || '#000'}
                dateRange={dateRange}
              />
            )}

            {/* Footer */}
            <Card className="border-gray-300 shadow-sm bg-gray-50/50">
              <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-500 gap-2">
                <span>Sistem Analis: <strong>Rekam Medic v1.1 Premium</strong></span>
                <span className="italic">Laporan ini dibuat secara otomatis berdasarkan data real-time Shopee Seller API</span>
                <span className="font-mono bg-gray-200 px-2 py-0.5 rounded text-gray-700">SIG: {reportNumber}</span>
              </CardContent>
            </Card>

            {/* Banner Confirmation Dialog */}
            <AlertDialog open={showBannerConfirm} onOpenChange={setShowBannerConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmasi</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda ingin menyembunyikan informasi ini selamanya? Jika Ya, banner ini tidak akan muncul lagi di masa mendatang.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <AlertDialogCancel onClick={() => setShowBannerConfirm(false)} className="mt-0 w-full sm:w-auto">Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => confirmCloseBanner(false)}
                    className="bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-200 w-full sm:w-auto"
                  >
                    Tutup Sementara
                  </AlertDialogAction>
                  <AlertDialogAction
                    onClick={() => confirmCloseBanner(true)}
                    className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
                  >
                    Jangan Tampilkan Lagi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}
