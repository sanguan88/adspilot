"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DateRangePicker } from "@/components/date-range-picker"
import { format } from "date-fns"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Zap,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  MousePointer,
  ShoppingCart,
  RefreshCw,
  Calendar,
  Wallet,
  Store,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GlobalBanner } from "@/components/global-banner"
import { useCookiesHealth } from "@/contexts/CookiesHealthContext"

interface AccountMetrics {
  accountName: string
  status: "active" | "paused" | "error"
  spend: number
  gmv: number
  budget: number
  impressions: number
  clicks: number
  pesanan: number
  conversions: number
  roas: number
  activeCampaigns: number
  activeRules: number
}

interface TrendData {
  spend?: number
  impressions?: number
  clicks?: number
  conversions?: number
}

interface UsernameOption {
  id_toko: string
  nama_toko: string
}

export function GeneralOverviewPage() {
  const { tokos } = useCookiesHealth()
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [accounts, setAccounts] = useState<AccountMetrics[]>([])
  const [usernames, setUsernames] = useState<UsernameOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalMetrics, setTotalMetrics] = useState({
    spend: 0,
    budget: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    pesanan: 0,
    campaigns: 0,
    rules: 0,
    gmv: 0,
  })
  const [avgPesanan, setAvgPesanan] = useState(0)
  const [avgROAS, setAvgROAS] = useState(0)
  const [avgActiveCampaigns, setAvgActiveCampaigns] = useState(0)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [trends, setTrends] = useState<TrendData>({})

  // Date range states
  // Helper to create date in local timezone without time component
  const createLocalDate = (year: number, month: number, day: number): Date => {
    const date = new Date()
    date.setFullYear(year, month, day)
    date.setHours(0, 0, 0, 0)
    return date
  }

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const today = new Date()
    const todayDay = today.getDate()
    let defaultStart: Date
    if (todayDay === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      lastMonth.setHours(0, 0, 0, 0)
      defaultStart = lastMonth
    } else {
      defaultStart = createLocalDate(today.getFullYear(), today.getMonth(), 1)
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    return { from: defaultStart, to: yesterday }
  })

  // Calculate date range limits
  const getMaxDate = () => {
    // Allow today to be selected (for Indonesia timezone)
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

  // Function to disable dates outside the allowed range
  const isDateDisabled = (date: Date) => {
    // Normalize dates to compare only date components (ignore time)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Disable dates before minDate
    if (dateOnly < minDateOnly) {
      return true
    }

    // Disable dates after today (future dates)
    if (dateOnly > todayOnly) {
      return true
    }

    return false
  }

  // Helper function to format date to YYYY-MM-DD without timezone issues
  const formatDateForAPI = (date: Date): string => {
    // Use toLocaleDateString with 'en-CA' locale to get YYYY-MM-DD format
    // This avoids timezone conversion issues
    return date.toLocaleDateString('en-CA')
  }

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Build query parameters
        const params = new URLSearchParams()
        if (selectedAccount !== "all") {
          params.append('account', selectedAccount)
        }
        if (dateRange.from) {
          params.append('start_date', formatDateForAPI(dateRange.from))
        }
        if (dateRange.to) {
          params.append('end_date', formatDateForAPI(dateRange.to))
        }

        const queryString = params.toString()
        const url = queryString ? `/api/overview?${queryString}` : '/api/overview'
        const response = await authenticatedFetch(url)

        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          throw new Error('Unauthorized')
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch overview data')
        }

        const result = await response.json()

        if (result.success && result.data) {
          const {
            accounts: fetchedAccounts,
            usernames: fetchedUsernames,
            totals,
            averages,
            recentActivities: fetchedActivities,
            trends: fetchedTrends
          } = result.data

          setUsernames(fetchedUsernames || [])
          setAccounts(fetchedAccounts || [])
          setTotalMetrics({
            spend: totals?.spend || 0,
            budget: totals?.budget || 0,
            impressions: totals?.impressions || 0,
            clicks: totals?.clicks || 0,
            conversions: totals?.conversions || 0,
            pesanan: totals?.pesanan || 0,
            campaigns: totals?.campaigns || 0,
            rules: totals?.rules || 0,
            gmv: totals?.gmv || 0,
          })
          setAvgPesanan(averages?.pesanan || 0)
          setAvgROAS(averages?.roas || 0)
          setAvgActiveCampaigns(averages?.activeCampaigns || 0)
          setRecentActivities(fetchedActivities || [])
          setTrends(fetchedTrends || {})
        } else {
          throw new Error(result.error || 'Failed to fetch overview data')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data'
        console.error('Error fetching overview data:', error)
        setError(errorMessage)
        toast.error("Gagal memuat data overview", {
          description: errorMessage
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOverviewData()
  }, [selectedAccount, dateRange])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20"
      case "paused":
        return "bg-warning/10 text-warning border-warning/20"
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-gray-50 text-gray-700 border-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "paused":
        return <Clock className="h-4 w-4 text-warning" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const renderTrend = (current: number, previous?: number) => {
    if (previous === undefined || previous === null || previous === 0) {
      return null
    }

    const change = ((current - previous) / previous) * 100
    const isPositive = change >= 0
    const absChange = Math.abs(change)

    return (
      <div className="flex items-center">
        {isPositive ? (
          <TrendingUp className="h-2.5 w-2.5 text-success mr-1" />
        ) : (
          <TrendingDown className="h-2.5 w-2.5 text-destructive mr-1" />
        )}
        <span className={`text-xs ${isPositive ? 'text-success' : 'text-destructive'}`}>
          {isPositive ? '+' : ''}{absChange.toFixed(1)}%
        </span>
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8 min-h-full">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Key Metrics Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border rounded-sm p-6 shadow-sm">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>

          {/* Performance Metrics Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8 min-h-full">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Data</h3>
              <p className="text-sm text-gray-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-primary">Overview</h1>
            <p className="text-gray-700 text-sm lg:text-base">
              Pantau performa iklan di semua toko
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span>Semua Toko</span>
                  </div>
                </SelectItem>
                {usernames.map((username) => {
                  const health = tokos[username.id_toko]
                  const isExpired = health === 'expired' || health === 'no_cookies'
                  return (
                    <SelectItem key={username.id_toko} value={username.id_toko} disabled={isExpired}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span>{username.nama_toko}</span>
                        </div>
                        {isExpired && (
                          <Badge variant="destructive" className="h-4 px-1 text-[8px] font-bold uppercase">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>

            {/* Date Range Picker terpadu */}
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              minDate={minDate}
              maxDate={maxDate}
              className="w-full sm:w-[260px] border-slate-200 shadow-none"
            />
          </div>
        </div>

        <GlobalBanner />

        {selectedAccount !== 'all' && (tokos[selectedAccount] === 'expired' || tokos[selectedAccount] === 'no_cookies') ? (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">Sesi Toko Berakhir</h3>
              <p className="text-gray-600 max-w-md">
                Data real-time dan metrik performa tidak tersedia untuk toko ini karena sesi login Shopee telah berakhir atau cookies tidak ditemukan.
              </p>
            </div>
            <Link href="/accounts">
              <Button variant="destructive" className="font-bold">
                Perbarui Cookies Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-white to-slate-50/50 border rounded-sm p-4 sm:p-6 w-full shadow-sm relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group animate-fade-in-up delay-100">
                <div className="absolute top-4 right-4 p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Total Spend</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900 truncate w-full" title={`Rp${Math.round(totalMetrics.spend).toLocaleString('id-ID')}`}>
                    Rp{Math.round(totalMetrics.spend).toLocaleString('id-ID')}
                  </p>
                  {renderTrend(totalMetrics.spend, trends.spend)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50/50 border rounded-sm p-4 sm:p-6 w-full shadow-sm relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group animate-fade-in-up delay-200">
                <div className="absolute top-4 right-4 p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Impressions</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={`${((totalMetrics.impressions || 0) / 1000).toFixed(0)}K`}>
                    {((totalMetrics.impressions || 0) / 1000).toFixed(0)}K
                  </p>
                  {renderTrend(totalMetrics.impressions || 0, trends.impressions)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50/50 border rounded-sm p-4 sm:p-6 w-full shadow-sm relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group animate-fade-in-up delay-300">
                <div className="absolute top-4 right-4 p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <MousePointer className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Clicks</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={(totalMetrics.clicks || 0).toLocaleString('id-ID')}>
                    {(totalMetrics.clicks || 0).toLocaleString('id-ID')}
                  </p>
                  {renderTrend(totalMetrics.clicks || 0, trends.clicks)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50/50 border rounded-sm p-4 sm:p-6 w-full shadow-sm relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer group animate-fade-in-up delay-400">
                <div className="absolute top-4 right-4 p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Conversions</p>
                  <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={(totalMetrics.conversions || 0).toLocaleString('id-ID')}>{(totalMetrics.conversions || 0).toLocaleString('id-ID')}</p>
                  {renderTrend(totalMetrics.conversions || 0, trends.conversions)}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-bold">
                    <BarChart3 className="h-5 w-5" />
                    Performance Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="p-4 sm:p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs text-primary font-medium">PESANAN</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={Math.round(avgPesanan).toLocaleString('id-ID')}>{Math.round(avgPesanan).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs text-primary font-medium">Average ROAS</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={avgROAS.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}>{avgROAS.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs text-primary font-medium">Active Campaigns</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={Math.round(avgActiveCampaigns).toString()}>{Math.round(avgActiveCampaigns)}</p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs text-primary font-medium">Active Rules</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900" title={(totalMetrics.rules || 0).toString()}>{totalMetrics.rules || 0}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-bold">
                    <Wallet className="h-5 w-5" />
                    Saldo Iklan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center pt-2">
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 truncate w-full" title={`Rp${Math.round(totalMetrics.budget || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`}>
                        Rp{Math.round(totalMetrics.budget || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-700 mt-1">Total Budget Tersedia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Account Status / Active Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-bold">
                  <Users className="h-5 w-5" />
                  {selectedAccount !== "all" ? "Iklan Aktif" : "Status Toko"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {accounts.length > 0 ? (
                    accounts.map((account, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(account.status)}
                            <span className="font-medium text-gray-900 text-sm">{account.accountName}</span>
                            <Badge className={getStatusColor(account.status)}>{account.status}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center lg:space-x-4 gap-2 text-xs">
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">Rp{account.spend.toLocaleString('id-ID')}</p>
                            <p className="text-gray-700">Spend</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">Rp{(account.gmv || 0).toLocaleString('id-ID')}</p>
                            <p className="text-gray-700">GMV</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">{(account.pesanan || 0).toLocaleString('id-ID')}</p>
                            <p className="text-gray-700">Pesanan</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">{account.roas.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x</p>
                            <p className="text-gray-700">ROAS</p>
                          </div>
                          {selectedAccount === "all" && (
                            <>
                              <div className="text-center sm:text-right">
                                <p className="font-medium text-gray-900">{account.activeCampaigns}</p>
                                <p className="text-gray-700">Campaigns</p>
                              </div>
                              <div className="text-center sm:text-right">
                                <p className="font-medium text-gray-900">{account.activeRules}</p>
                                <p className="text-gray-700">Rules</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-600">
                      {selectedAccount !== "all" ? "Tidak ada iklan aktif ditemukan" : "Tidak ada toko ditemukan"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg lg:text-xl font-bold">
                  <Zap className="h-5 w-5" />
                  Recent Automation Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${activity.status === "success"
                              ? "bg-success"
                              : activity.status === "warning"
                                ? "bg-warning"
                                : activity.status === "info"
                                  ? "bg-info"
                                  : "bg-gray-400"
                              }`}
                          />
                          <div>
                            <p className="text-xs font-medium text-gray-900">{activity.action}</p>
                            <p className="text-xs text-gray-700">{activity.campaign}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 sm:ml-auto">{activity.time}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-600">
                      No recent automation activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}