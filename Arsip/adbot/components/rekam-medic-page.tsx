"use client"

import { useState, useEffect, useMemo } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  Target,
  MousePointer,
  ShoppingCart,
  Star,
  AlertTriangle,
  HelpCircle,
  Info,
} from "lucide-react"
import { toast } from "sonner"
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { RekamMedicLabHeader } from "./rekam-medic-lab-header"
import { RekamMedicInterpretation } from "./rekam-medic-interpretation"
import { RekamMedicRecommendations } from "./rekam-medic-recommendations"
import { format } from "date-fns"
import { motion } from "framer-motion"

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
  return `RM-${dateStr}-${timeStr}`
}

export function RekamMedicPage() {
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [accounts, setAccounts] = useState<Array<{ id_toko: string; nama_toko: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics[]>([])
  const [bcgData, setBcgData] = useState<BCGData[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [reportNumber] = useState(() => generateReportNumber())
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map())
  
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

  const getMaxDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const getMinDate = () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    threeMonthsAgo.setDate(1)
    threeMonthsAgo.setHours(0, 0, 0, 0)
    return threeMonthsAgo
  }

  const minDate = getMinDate()
  const maxDate = getMaxDate()
  
  // Derived values for API calls
  const startDate = dateRange.from
  const endDate = dateRange.to

  const formatDateForAPI = (date: Date): string => {
    return date.toLocaleDateString('en-CA')
  }

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await authenticatedFetch('/api/overview?account=all')
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.usernames) {
            const mappedAccounts = result.data.usernames.map((acc: any) => ({
              id_toko: acc.id_toko || acc.username || '',
              nama_toko: acc.nama_toko || acc.username || 'Unknown'
            }))
            setAccounts(mappedAccounts)
            return
          }
        }
      } catch (error) {
        console.error('Error fetching accounts from overview:', error)
      }
      
      try {
        const fallbackResponse = await authenticatedFetch('/api/accounts?limit=1000&page=1')
        if (fallbackResponse.ok) {
          const fallbackResult = await fallbackResponse.json()
          if (fallbackResult.success && fallbackResult.data?.accounts) {
            const mappedAccounts = fallbackResult.data.accounts
              .filter((acc: any) => acc.id_toko)
              .map((acc: any) => ({
                id_toko: acc.id_toko || '',
                nama_toko: acc.nama_toko || acc.username || 'Unknown'
              }))
            setAccounts(mappedAccounts)
            return
          }
        }
      } catch (fallbackError) {
        console.error('Error fetching accounts from fallback:', fallbackError)
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
        
        if (!startDate || !endDate) return

        const params = new URLSearchParams()
        params.append('start_time', formatDateForAPI(startDate))
        params.append('end_time', formatDateForAPI(endDate))
        
        if (selectedAccount !== "all") {
          params.append('account_ids', selectedAccount)
        }
        
        const response = await authenticatedFetch(`/api/rekam-medic?${params.toString()}`)
        
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
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
          setSummary(result.data.summary || null)
        } else {
          throw new Error(result.error || 'Failed to fetch rekam medic data')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data'
        console.error('Error fetching rekam medic data:', error)
        setError(errorMessage)
        toast.error("Gagal memuat data Rekam Medic", {
          description: errorMessage
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedAccount, startDate, endDate])

  // Fetch images for BCG chart
  useEffect(() => {
    if (bcgData.length === 0) return

    const fetchImages = async () => {
      try {
        // Get unique toko IDs from campaigns
        const tokoIds = Array.from(new Set(
          bcgData
            .map(c => c.id_toko)
            .filter((id): id is string => !!id)
        ))

        if (tokoIds.length === 0) return

        // Get campaign IDs
        const campaignIds = bcgData.map(c => c.campaign_id)

        // Fetch from Shopee API via rekam-medic/images endpoint
        const requestBody: any = {
          campaign_ids: campaignIds,
          toko_ids: tokoIds,
        }
        
        // Add date range if available
        if (dateRange?.from && dateRange?.to) {
          requestBody.start_time = dateRange.from.toISOString().split('T')[0]
          requestBody.end_time = dateRange.to.toISOString().split('T')[0]
        }
        
        const response = await authenticatedFetch('/api/rekam-medic/images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const images = new Map<string, string>()
            Object.entries(result.data).forEach(([campaignId, imageUrl]) => {
              if (imageUrl && typeof imageUrl === 'string') {
                images.set(campaignId, imageUrl)
              }
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

  // Prepare data for BCG Matrix scatter plot
  const bcgScatterData = useMemo(() => {
    return bcgData.map(item => {
      // Get image from imageMap or fallback to item.image
      const fetchedImage = imageMap.get(item.campaign_id)
      const image = fetchedImage || item.image || null
      
      return {
        x: item.marketShare,
        y: item.growthRate,
        z: item.spend,
        name: item.title,
        category: item.category,
        campaign_id: item.campaign_id,
        roas: item.roas,
        image: image,
      }
    })
  }, [bcgData, imageMap])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      
      // Get image from data (already includes fetched image from imageMap)
      let imageUrl = null
      if (data.image) {
        imageUrl = data.image.startsWith('http') 
          ? data.image 
          : `https://down-id.img.susercontent.com/${data.image}`
      }
      
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl max-w-md">
          <div className="flex gap-4">
            {/* Image - Left Side */}
            <div className="flex-shrink-0">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={data.name || 'Gambar iklan'} 
                  className="w-24 h-24 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No img</span>
                </div>
              )}
            </div>
            
            {/* Information - Right Side */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className="font-semibold text-gray-900 mb-3 text-sm line-clamp-2 leading-tight">{data.name}</p>
              
              {/* Metrics */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Market Share:</span>
                  <span className="font-semibold text-gray-900">{data.x.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Growth Rate:</span>
                  <span className="font-semibold text-gray-900">{data.y.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">ROAS:</span>
                  <span className="font-semibold text-gray-900">{data.roas?.toFixed(2)}x</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-600">Spend:</span>
                  <span className="font-semibold text-gray-900">Rp {Math.round(data.z || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      toast.info("Fitur download PDF sedang dalam pengembangan", {
        description: "Fitur ini akan segera tersedia"
      })
      // TODO: Implement PDF generation with @react-pdf/renderer
    } catch (error) {
      toast.error("Gagal mengunduh PDF", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan"
      })
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Lab Header */}
        <RekamMedicLabHeader
          selectedAccount={selectedAccount}
          accounts={accounts}
          onAccountChange={setSelectedAccount}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          minDate={minDate}
          maxDate={maxDate}
          onDownloadPDF={handleDownloadPDF}
          reportNumber={reportNumber}
        />

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Card className="border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section I: Informasi Umum */}
            <Card className="border-gray-300 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-lg font-semibold text-gray-900">I. INFORMASI UMUM</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {summary && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="p-6">
                        <Target className="w-5 h-5 text-primary absolute top-4 right-4" />
                        <div className="flex flex-col items-start gap-2">
                          <p className="text-primary text-xs font-medium">Total Iklan</p>
                          <p className="text-3xl font-bold text-gray-900">{summary.totalCampaigns}</p>
                          <p className="text-xs text-gray-500">Iklan aktif</p>
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Card className="p-6">
                        <MousePointer className="w-5 h-5 text-primary absolute top-4 right-4" />
                        <div className="flex flex-col items-start gap-2">
                          <p className="text-primary text-xs font-medium">Avg CTR</p>
                          <p className="text-3xl font-bold text-gray-900">{summary.avgCTR.toFixed(2)}%</p>
                          <p className="text-xs text-gray-500">Click-through rate</p>
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="p-6">
                        <ShoppingCart className="w-5 h-5 text-primary absolute top-4 right-4" />
                        <div className="flex flex-col items-start gap-2">
                          <p className="text-primary text-xs font-medium">Avg Conversion</p>
                          <p className="text-3xl font-bold text-gray-900">{summary.avgConversionRate.toFixed(2)}%</p>
                          <p className="text-xs text-gray-500">Conversion rate</p>
                        </div>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="p-6">
                        <DollarSign className="w-5 h-5 text-primary absolute top-4 right-4" />
                        <div className="flex flex-col items-start gap-2">
                          <p className="text-primary text-xs font-medium">Avg ROAS</p>
                          <p className="text-3xl font-bold text-gray-900">{summary.avgROAS.toFixed(2)}x</p>
                          <p className="text-xs text-gray-500">Return on ad spend</p>
                        </div>
                      </Card>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section II: Hasil Analisis BCG Matrix */}
            <Card className="border-gray-300 shadow-sm">
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">II. HASIL ANALISIS BCG MATRIX</CardTitle>
                    <CardDescription className="mt-1">
                      Kategorisasi iklan berdasarkan Growth Rate dan Market Share
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // TODO: Show info modal
                      toast.info("Info: Hover pada titik untuk detail iklan")
                    }}
                  >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">Cara Membaca</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {bcgScatterData.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={450}>
                      <ScatterChart
                        margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          type="number" 
                          dataKey="x" 
                          name="Market Share"
                          label={{ value: 'Market Share (%)', position: 'insideBottom', offset: -5, style: { fill: '#374151', fontWeight: 500 } }}
                          domain={[0, 'dataMax + 50']}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            // Format Market Share: round to 1 decimal, add % if needed
                            if (value >= 1000) {
                              return `${(value / 1000).toFixed(1)}k`
                            }
                            return value.toFixed(0)
                          }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="y" 
                          name="Growth Rate"
                          label={{ value: 'Growth Rate (%)', angle: -90, position: 'insideLeft', style: { fill: '#374151', fontWeight: 500 } }}
                          domain={[0, 'dataMax + 10']}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => {
                            // Format Growth Rate: round to whole number, add %
                            return `${value.toFixed(0)}%`
                          }}
                        />
                        <ZAxis type="number" dataKey="z" range={[50, 400]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter name="Iklan" data={bcgScatterData} fill="#8884d8">
                          {bcgScatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[entry.category as keyof typeof COLORS]} />
                          ))}
                        </Scatter>
                        <ReferenceLine x={100} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1} />
                        <ReferenceLine y={10} stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1} />
                      </ScatterChart>
                    </ResponsiveContainer>

                    {/* Legend - Compact */}
                    <div className="flex flex-wrap gap-3 justify-center pt-2 border-t border-gray-200">
                      {Object.entries(summary?.categoryCounts || {}).map(([category, count]) => {
                        const getIcon = () => {
                          switch (category) {
                            case 'stars': return <Star className="w-4 h-4" />
                            case 'cash_cows': return <DollarSign className="w-4 h-4" />
                            case 'question_marks': return <HelpCircle className="w-4 h-4" />
                            case 'dogs': return <AlertTriangle className="w-4 h-4" />
                            default: return null
                          }
                        }
                        const getLabel = () => {
                          switch (category) {
                            case 'stars': return 'Stars'
                            case 'cash_cows': return 'Cash Cows'
                            case 'question_marks': return 'Question Marks'
                            case 'dogs': return 'Dogs'
                            default: return category
                          }
                        }
                        const categoryColor = COLORS[category as keyof typeof COLORS]
                        return (
                          <Badge 
                            key={category} 
                            variant="outline" 
                            className="flex items-center gap-2 px-3 py-1.5 border-2"
                            style={{ 
                              borderColor: categoryColor,
                              backgroundColor: `${categoryColor}15`,
                              color: categoryColor
                            }}
                          >
                            {getIcon()}
                            <span className="font-semibold">{getLabel()}:</span>
                            <span>{count}</span>
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section III: Interpretasi Hasil */}
            {summary && (
              <RekamMedicInterpretation
                categoryCounts={summary.categoryCounts}
                totalCampaigns={summary.totalCampaigns}
                bcgData={bcgData}
                dateRange={dateRange}
              />
            )}

            {/* Section IV: Rekomendasi */}
            {summary && (
              <RekamMedicRecommendations
                categoryCounts={summary.categoryCounts}
                totalCampaigns={summary.totalCampaigns}
                avgROAS={summary.avgROAS}
                avgCTR={summary.avgCTR}
                avgConversionRate={summary.avgConversionRate}
              />
            )}

            {/* Footer */}
            <Card className="border-gray-300 shadow-sm bg-gray-50">
              <CardContent className="p-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Sistem Analis: <strong>Rekam Medic v1.0</strong></span>
                    <span>Tanda Tangan Digital: <code className="text-gray-500">{reportNumber}</code></span>
                  </div>
                  <div className="text-gray-500 italic mt-2">
                    Catatan: Hasil analisis ini bersifat informatif dan berdasarkan data yang tersedia. 
                    Disarankan untuk melakukan evaluasi lebih lanjut sebelum mengambil keputusan penting.
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
