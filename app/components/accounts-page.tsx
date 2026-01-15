"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Calendar, RefreshCw, Edit, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Users, MousePointer, ShoppingCart, Package, Target, DollarSign, Wallet, CreditCard, Percent, ArrowRight, Info, X, Trash2, Zap, Activity, MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { DateRangePicker } from "@/components/date-range-picker"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ToastAction } from "@/components/ui/toast"
import { authenticatedFetch } from '@/lib/api-client'
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AddonPurchaseModal } from "@/components/addon-purchase-modal"

interface Account {
  id: string
  username: string
  email: string | null
  nama_toko: string | null
  username_toko: string | null
  email_toko: string | null
  profile_toko: string | null
  cookies: string
  status_toko?: string
  kode_tim: string
  kode_site: string
  pic_akun: string
  nama_tim: string
  nama_site: string
  created_at: string
  updated_at: string
  performa_data: {
    total_gmv: number
    total_biaya_iklan: number
    rasio_iklan: number
    target_roas_low: number
    target_roas_high: number
    roas: number
    total_clicks: number
    total_orders: number
    impression: number
    view: number
    // New additional columns
    persentasi: number
    avg_gmv: number
    avg_komisi: number
    // Report aggregate detail fields
    broad_cir?: number
    broad_order_amount?: number
    broad_roi?: number
    checkout?: number
    checkout_rate?: number
    cpc?: number
    cpdc?: number
    cr?: number
    ctr?: number
    direct_cr?: number
    direct_cir?: number
    direct_gmv?: number
    direct_order?: number
    direct_order_amount?: number
    direct_roi?: number
    avg_rank?: number
    product_click?: number
    product_impression?: number
    product_ctr?: number
    reach?: number
    page_views?: number
    unique_visitors?: number
    cpm?: number
    unique_click_user?: number
  }
  cookie_status: string
  data_source?: string // 'database', 'api', 'default', 'api_refresh'
  last_affiliate_sync?: string | null
  missing_dates?: string[] // Array of missing dates that need to be synced
  cookie_health?: string // 'healthy', 'warning', 'expired', 'no_cookies', 'never_tested'
  cookie_needs_update?: boolean
}

interface SummaryData {
  total_gmv: number
  total_biaya_iklan: number
  total_checkout: number
  total_clicks: number
  total_orders: number
  total_accounts: number
  avg_roas: number
  rasio_iklan_avg: number
  connected_count?: number
  disconnected_count?: number
}

interface CookiesHealthSummary {
  total: number
  healthy: number
  warning: number
  sync: number
  expired: number
  no_cookies: number
  never_tested: number
  needs_update: number
}

interface CookiesHealthData {
  summary: CookiesHealthSummary
  tokos: {
    id_toko: string
    nama_toko: string
    health: string
    needs_update: boolean
    last_sync: string | null
    last_check_hours: number | null
    has_cookies: boolean
  }[]
}


// Fungsi untuk mengambil data dari API
async function fetchAccountsData(params: {
  search?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()

  if (params.search) searchParams.append('search', params.search)
  if (params.start_date) searchParams.append('start_date', params.start_date)
  if (params.end_date) searchParams.append('end_date', params.end_date)
  if (params.page) searchParams.append('page', params.page.toString())
  if (params.limit) searchParams.append('limit', params.limit.toString())

  const response = await authenticatedFetch(`/api/accounts?${searchParams.toString()}`)

  if (response.status === 401) {
    // Unauthorized - redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    throw new Error('Unauthorized')
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch accounts data')
  }

  return data.data
}

export function AccountsPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    records_per_page: 10,
    has_next_page: false,
    has_prev_page: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limitsData, setLimitsData] = useState<{
    maxAccounts: number
    usage: number
    limitReached: boolean
    planName: string | null
  } | null>(null)
  const [limitsLoading, setLimitsLoading] = useState(true)
  const [showLimitsBanner, setShowLimitsBanner] = useState(false)
  const [showAddonModal, setShowAddonModal] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "connected" | "expired">("all")

  // Cookies health states
  const [cookiesHealth, setCookiesHealth] = useState<CookiesHealthData | null>(null)
  const [cookiesHealthLoading, setCookiesHealthLoading] = useState(true)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    const today = new Date()
    const todayDay = today.getDate()
    let defaultStart: Date
    if (todayDay === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      defaultStart = lastMonth
    } else {
      defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
    }
    // Ensure it's not before minDate (3 months ago)
    const minDate = new Date()
    minDate.setMonth(minDate.getMonth() - 3)
    minDate.setDate(1)
    minDate.setHours(0, 0, 0, 0)

    const finalStart = defaultStart < minDate ? minDate : defaultStart

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    yesterday.setHours(23, 59, 59, 999)

    return { from: finalStart, to: yesterday }
  })

  // Calculate date range limits
  const getMaxDate = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(23, 59, 59, 999)
    return yesterday
  }

  const getMinDate = () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    threeMonthsAgo.setDate(1) // Start from first day of that month
    threeMonthsAgo.setHours(0, 0, 0, 0)
    return threeMonthsAgo
  }

  const maxDate = getMaxDate()
  const minDate = getMinDate()

  // Function to disable dates outside the allowed range
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Disable today and future dates
    if (date >= today) {
      return true
    }

    // Disable dates before 3 months ago
    if (date < minDate) {
      return true
    }

    return false
  }

  // UI states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [newCookies, setNewCookies] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null)
  const [hardDelete, setHardDelete] = useState(false)

  // Add Toko modal states
  const [addTokoModalOpen, setAddTokoModalOpen] = useState(false)
  const [addTokoCookies, setAddTokoCookies] = useState('')
  const [addingToko, setAddingToko] = useState(false)

  // Individual refresh states
  const [checkingHealth, setCheckingHealth] = useState<Set<string>>(new Set())
  const [syncingData, setSyncingData] = useState<Set<string>>(new Set())
  const [refreshingStatus, setRefreshingStatus] = useState(false)
  const [syncingAllData, setSyncingAllData] = useState(false)

  const [deleting, setDeleting] = useState(false)
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState(false)
  const [accountsToRefreshCount, setAccountsToRefreshCount] = useState(0)

  // Detail per date states
  const [detailPerDate, setDetailPerDate] = useState<Record<string, any[]>>({})
  const [loadingDetail, setLoadingDetail] = useState<Set<string>>(new Set())

  // Clear detail per date when date range changes
  useEffect(() => {
    setDetailPerDate({})
    setExpandedRows(new Set())
  }, [dateRange])

  // Refresh all accounts
  // Refresh all accounts
  const handleSyncAllDataClick = () => {
    if (!dateRange.from || !dateRange.to) {
      toast({ title: "Pilih Tanggal", description: "Silakan pilih tanggal terlebih dahulu!", variant: "destructive" })
      return
    }

    if (!accounts || accounts.length === 0) {
      toast({ title: "Tabel Kosong", description: "Tidak ada toko yang bisa di-sync", variant: "destructive" })
      return
    }

    const accountsToRefresh = accounts.filter(acc => {
      // Kecualikan toko yang sudah dihapus
      if (acc.status_toko === 'deleted') return false;

      // Jika ada health dari auto-detect, gunakan itu
      if (acc.cookie_health) {
        return acc.cookie_health === 'healthy' ||
          acc.cookie_health === 'warning' ||
          acc.cookie_health === 'sync' ||
          acc.cookie_health === 'never_tested';
      }

      // Fallback ke cookie_status dasar
      return acc.cookie_status === 'connected' ||
        acc.cookie_status === 'sync' ||
        acc.cookie_status === 'disconnected';
    })

    if (accountsToRefresh.length === 0) {
      toast({ title: "Tabel Kosong", description: "Tidak ada toko dengan cookies yang bisa di-sync.", variant: "destructive" })
      return
    }

    setAccountsToRefreshCount(accountsToRefresh.length)
    setRefreshConfirmOpen(true)
  }

  const handleRefreshStatusAll = async () => {
    if (refreshingStatus || syncingAllData) return

    setRefreshingStatus(true)
    const tokosToCheck = accounts.filter(acc => acc.status_toko !== 'deleted')

    if (tokosToCheck.length === 0) {
      toast({ title: "Tabel Kosong", description: "Tidak ada toko untuk dicek statusnya." })
      setRefreshingStatus(false)
      return
    }

    let successCount = 0
    let failCount = 0

    try {
      for (const account of tokosToCheck) {
        try {
          setCheckingHealth(prev => new Set(prev).add(account.id))
          const response = await authenticatedFetch('/api/accounts/check-health', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_toko: account.id })
          })
          if (response.ok) successCount++
          else failCount++
        } catch (err) {
          failCount++
        } finally {
          setCheckingHealth(prev => {
            const newSet = new Set(prev)
            newSet.delete(account.id)
            return newSet
          })
        }
        // Small delay to prevent burst
        await new Promise(r => setTimeout(r, 150))
      }

      await loadData()
      toast({ title: "Update Status Selesai", description: `Berhasil mengecek ${successCount} toko dari total ${tokosToCheck.length}.` })
    } catch (error) {
      toast({ title: "Error", description: "Gagal memperbarui status toko.", variant: "destructive" })
    } finally {
      setRefreshingStatus(false)
    }
  }

  const confirmSyncAllData = async () => {
    setRefreshConfirmOpen(false)
    setSyncingAllData(true)

    // Filter again to be safe
    const accountsToRefresh = accounts.filter(acc => {
      if (acc.status_toko === 'deleted') return false;
      if (acc.cookie_health) {
        return acc.cookie_health === 'healthy' ||
          acc.cookie_health === 'warning' ||
          acc.cookie_health === 'sync' ||
          acc.cookie_health === 'never_tested';
      }
      return acc.cookie_status === 'connected' ||
        acc.cookie_status === 'sync' ||
        acc.cookie_status === 'disconnected';
    })

    let successCount = 0
    let failCount = 0
    let skippedCount = 0

    try {
      if (!dateRange.from || !dateRange.to) {
        toast({ title: "Pilih Tanggal", description: "Silakan pilih tanggal terlebih dahulu!", variant: "destructive" })
        setSyncingAllData(false)
        return
      }

      const startDateStr = format(dateRange.from, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.to, 'yyyy-MM-dd')

      // Refresh semua toko secara berurutan dengan delay
      for (let i = 0; i < accountsToRefresh.length; i++) {
        const account = accountsToRefresh[i]

        try {
          setCheckingHealth(prev => new Set(prev).add(account.id))
          setSyncingData(prev => new Set(prev).add(account.id))

          // Lakukan parallel: Sync Report dan Save Campaign Data (Rekam Medic)
          const [syncResponse] = await Promise.all([
            authenticatedFetch('/api/accounts/sync-report-aggregate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_toko: account.id,
                start_date: startDateStr,
                end_date: endDateStr
              })
            }),
            authenticatedFetch('/api/accounts/save-campaign-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id_toko: account.id,
                start_date: startDateStr,
                end_date: endDateStr
              })
            }).catch(() => null) // Silent catch for parallel save
          ])

          if (syncResponse.status === 401) {
            if (typeof window !== 'undefined') {
              window.location.href = '/auth/login'
            }
            throw new Error('Unauthorized')
          }

          const data = await syncResponse.json()

          if (data.success) {
            const syncedCount = data.synced_dates?.length || 0
            if (syncedCount > 0) {
              successCount++
            }
          } else {
            failCount++
          }
        } catch (error) {
          failCount++
        } finally {
          setCheckingHealth(prev => {
            const newSet = new Set(prev)
            newSet.delete(account.id)
            return newSet
          })
          setSyncingData(prev => {
            const newSet = new Set(prev)
            newSet.delete(account.id)
            return newSet
          })
        }

        // Delay antara request untuk menghindari rate limiting (1 detik)
        if (i < accountsToRefresh.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Reload data setelah semua selesai
      await loadData()

      // Tampilkan summary
      toast({
        title: "Refresh All Selesai",
        description: `✅ ${successCount} Berhasil, ❌ ${failCount} Gagal${skippedCount > 0 ? `, ⏭️ ${skippedCount} Dilewati` : ""}`
      })

    } catch (error) {
      toast({ title: "Error", description: 'Terjadi kesalahan saat me-refresh semua toko.', variant: "destructive" })
    } finally {
      setSyncingAllData(false)
    }
  }

  // Check individual account health (Fast Ping)
  const handleCheckHealth = async (account: Account) => {
    try {
      setCheckingHealth(prev => new Set(prev).add(account.id))

      const response = await authenticatedFetch('/api/accounts/check-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_toko: account.id })
      })

      const data = await response.json()

      if (data.success) {
        if (data.health === 'healthy') {
          toast({ title: "Session Valid", description: data.message })
        } else {
          toast({ title: "Session Expired", description: data.message, variant: "destructive" })
        }
        await loadData()
      } else {
        toast({ title: "Error", description: data.error || "Gagal mengecek kesehatan cookies", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Terjadi kesalahan sistem", variant: "destructive" })
    } finally {
      setCheckingHealth(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.id)
        return newSet
      })
    }
  }

  // Get Data (Heavy Sync per date)
  const handleGetData = async (account: Account) => {
    if (!dateRange.from || !dateRange.to) {
      toast({ title: "Tanggal Belum Dipilih", description: "Silakan pilih rentang tanggal di filter atas.", variant: "destructive" })
      return
    }

    const isExpired = account.cookie_health === 'expired' || account.cookie_health === 'no_cookies' || account.cookie_status === 'disconnected'
    if (isExpired) {
      toast({ title: "Koneksi Terputus", description: "Harap update cookies atau cek koneksi (Status: Expired).", variant: "destructive" })
      return
    }

    try {
      setSyncingData(prev => new Set(prev).add(account.id))

      const startDateStr = format(dateRange.from, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.to, 'yyyy-MM-dd')

      // Jalankan Save Campaign Data (untuk Rekam Medic) dan Sync Report secara parallel
      // agar proses lebih cepat
      const [syncResponse, saveResponse] = await Promise.all([
        authenticatedFetch('/api/accounts/sync-report-aggregate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_toko: account.id,
            start_date: startDateStr,
            end_date: endDateStr
          })
        }),
        authenticatedFetch('/api/accounts/save-campaign-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_toko: account.id,
            start_date: startDateStr,
            end_date: endDateStr
          })
        }).catch(err => {
          console.error("Failed to save campaign data:", err)
          return null
        })
      ])

      const data = await syncResponse.json()

      if (data.success) {
        const syncedCount = data.synced_dates?.length || 0
        const failedCount = data.failed_dates?.length || 0
        const displayName = account.nama_toko || account.username_toko || (account.username !== account.id ? account.username : null) || `Toko #${account.id}`
        let message = `Data akun ${displayName} berhasil di-sync!\n`
        message += `✅ Berhasil: ${syncedCount} tanggal\n`
        if (failedCount > 0) message += `❌ Gagal: ${failedCount} tanggal`

        // Cek if saveResponse was successful (optional silent check)
        const saveResult = saveResponse ? await saveResponse.json().catch(() => ({})) : null
        if (saveResult && saveResult.success) {
          message += `\n✨ Data Rekam Medic juga telah diperbarui.`
        }

        toast({ title: "Sync Selesai", description: message })
        await loadData()
      } else {
        toast({ title: "Sync Gagal", description: data.error || "Terjadi kesalahan saat menarik data.", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Sync Gagal", description: "Kesalahan jaringan.", variant: "destructive" })
    } finally {
      setSyncingData(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.id)
        return newSet
      })
    }
  }

  // Fungsi untuk menyimpan data campaign per tanggal
  const saveCampaignData = async () => {
    if (!dateRange.from || !dateRange.to) {
      return
    }

    if (!accounts || accounts.length === 0) {
      return
    }

    try {
      // Loop untuk setiap account yang aktif
      const activeAccounts = accounts.filter(acc => acc.cookie_status === 'connected')

      if (activeAccounts.length === 0) {
        return
      }

      for (const account of activeAccounts) {
        try {
          // Validasi data sebelum mengirim
          if (!account.id) {
            continue
          }

          if (!dateRange.from || !dateRange.to) {
            continue
          }

          const startDateStr = format(dateRange.from, 'yyyy-MM-dd')
          const endDateStr = format(dateRange.to, 'yyyy-MM-dd')

          const response = await authenticatedFetch('/api/accounts/save-campaign-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id_toko: account.id,
              start_date: startDateStr,
              end_date: endDateStr
            })
          })

          if (!response.ok) {
            await response.json().catch(() => ({}))
          }
        } catch (error) {
          // Silent error handling
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Load data dari API
  // Fetch cookies health status
  const fetchCookiesHealth = async () => {
    try {
      setCookiesHealthLoading(true)
      const response = await authenticatedFetch('/api/accounts/check-cookies-health')

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return null
      }

      const result = await response.json()
      if (result.success) {
        return result.data as CookiesHealthData
      }
      return null
    } catch (error) {
      console.error('Error fetching cookies health:', error)
      return null
    } finally {
      setCookiesHealthLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch cookies health dan accounts data secara parallel
      const [healthData, accountsData] = await Promise.all([
        fetchCookiesHealth(),
        fetchAccountsData({
          search: searchQuery || undefined,
          start_date: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
          end_date: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          page: currentPage,
          limit: itemsPerPage
        })
      ])

      // Merge cookies health data dengan fallback status_toko / cookie_status
      if (healthData) {
        setCookiesHealth(healthData)

        const healthMap = new Map(
          healthData.tokos.map(t => [t.id_toko, t])
        )

        const accountsWithHealth = accountsData.accounts.map((acc: Account) => {
          const healthEntry = healthMap.get(acc.id)
          let health = healthEntry?.health

          // Fallback jika tidak ada entry di health map:
          // - Jika punya cookies (tidak kosong) → anggap Connected (healthy)
          // - Jika tidak punya cookies → Expired
          if (!health || health === 'unknown') {
            if (acc.cookies && acc.cookies.trim().length > 0) {
              health = 'healthy'
            } else if (acc.status_toko === 'active' || acc.cookie_status === 'connected') {
              health = 'healthy'
            } else {
              health = 'expired'
            }
          }

          return {
            ...acc,
            cookie_health: health,
            cookie_needs_update: healthEntry?.needs_update || false
          }
        })

        setAccounts(accountsWithHealth)
      } else {
        setAccounts(accountsData.accounts)
      }

      setSummary(accountsData.summary)
      setPagination(accountsData.pagination || {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        records_per_page: 10,
        has_next_page: false,
        has_prev_page: false
      })

      // Save user role from response
      if (accountsData.user_role) {
        setUserRole(accountsData.user_role)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
    } finally {
      setLoading(false)
    }
  }


  // Initialize mounted state after component mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load data saat component mount dan saat filter berubah
  useEffect(() => {
    if (mounted && dateRange.from && dateRange.to) {
      loadData()
      fetchLimits()
      // Reset ke halaman 1 saat filter berubah
      setCurrentPage(1)
    }
  }, [mounted, searchQuery, dateRange])

  // Load data saat pagination berubah
  useEffect(() => {
    if (dateRange.from && dateRange.to && mounted) {
      loadData()
    }
  }, [currentPage, itemsPerPage])

  const totalPages = pagination.total_pages
  const currentAccounts = accounts.filter(acc => {
    if (filterStatus === "all") return true
    const isExpired = acc.cookie_health === 'expired' || acc.cookie_health === 'no_cookies' || acc.cookie_status === 'disconnected'
    if (filterStatus === "expired") return isExpired
    if (filterStatus === "connected") return !isExpired
    return true
  })

  const fetchDetailPerDate = async (accountId: string) => {
    if (detailPerDate[accountId] || loadingDetail.has(accountId)) {
      return // Already loaded or loading
    }

    const account = accounts.find(acc => acc.id === accountId)
    if (!account || !dateRange.from || !dateRange.to) {
      return
    }

    setLoadingDetail(prev => new Set(prev).add(accountId))

    try {
      const startDateStr = dateRange.from.toISOString().split('T')[0]
      const endDateStr = dateRange.to.toISOString().split('T')[0]

      const response = await fetch(
        `/api/accounts/detail-per-date?id_toko=${accountId}&start_date=${startDateStr}&end_date=${endDateStr}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return
      }

      const data = await response.json()

      if (data.success && data.data) {
        setDetailPerDate(prev => ({
          ...prev,
          [accountId]: data.data
        }))
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoadingDetail(prev => {
        const newSet = new Set(prev)
        newSet.delete(accountId)
        return newSet
      })
    }
  }

  const toggleRowExpansion = (accountId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
        // Fetch detail per date when expanding
        fetchDetailPerDate(accountId)
      }
      return newSet
    })
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (!amount && amount !== 0) {
      return 'Rp 0'
    }

    // Handle very large numbers
    if (amount >= 1000000000000) {
      return `Rp ${(amount / 1000000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}T`
    } else if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`
    } else if (amount >= 1000) {
      return `Rp ${(amount / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}rb`
    } else {
      return `Rp ${amount.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
    }
  }

  const formatLastSync = (dateString: string) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'Never'
    }

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Never'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return `${Math.floor(diffDays / 7)}w ago`
    }
  }

  // Status cookies yang ditampilkan ke user:
  // - Connected  (cookies masih sehat / bisa dipakai)
  // - Sync       (perlu sync, > 3 hari sejak last sync)
  // - Expired    (cookies expired, login=false dari response Shopee)
  // - Deleted    (toko sudah dihapus - soft delete)
  const getCookieStatusBadge = (account: Account) => {
    // Cek apakah toko sudah di-delete (soft delete)
    if (account.status_toko === 'deleted') {
      return (
        <Badge className="min-w-[90px] justify-center bg-gray-100 text-gray-700 border-gray-300 text-xs font-medium px-3 py-1 rounded-full">
          Deleted
        </Badge>
      )
    }

    // Prioritaskan informasi dari cookie_health (hasil auto-detect)
    const health = account.cookie_health

    // Handle status berdasarkan health
    if (health) {
      if (health === 'expired') {
        // Expired: login=false dari response Shopee
        return (
          <Badge className="min-w-[90px] justify-center bg-red-50 text-red-700 border-red-200 text-xs font-medium px-3 py-1 rounded-full">
            Expired
          </Badge>
        )
      } else if (health === 'sync') {
        // Sync: > 3 hari sejak last sync, perlu sync
        return (
          <Badge className="min-w-[90px] justify-center bg-yellow-50 text-yellow-700 border-yellow-200 text-xs font-medium px-3 py-1 rounded-full">
            Sync
          </Badge>
        )
      } else if (health === 'healthy' || health === 'warning' || health === 'never_tested') {
        // Connected: cookies masih sehat
        return (
          <Badge className="min-w-[90px] justify-center bg-success/10 text-success border-success/20 text-xs font-medium px-3 py-1 rounded-full">
            Connected
          </Badge>
        )
      } else {
        // no_cookies atau lainnya -> dianggap Expired
        return (
          <Badge className="min-w-[90px] justify-center bg-red-50 text-red-700 border-red-200 text-xs font-medium px-3 py-1 rounded-full">
            Expired
          </Badge>
        )
      }
    } else {
      // Fallback ke status_cookies lama jika belum ada health
      if (account.cookie_status === 'connected') {
        return (
          <Badge className="min-w-[90px] justify-center bg-success/10 text-success border-success/20 text-xs font-medium px-3 py-1 rounded-full">
            Connected
          </Badge>
        )
      } else {
        return (
          <Badge className="min-w-[90px] justify-center bg-red-50 text-red-700 border-red-200 text-xs font-medium px-3 py-1 rounded-full">
            Expired
          </Badge>
        )
      }
    }
  }

  const handleRefreshAccount = async (account: Account) => {
    if (!dateRange.from || !dateRange.to) {
      toast({ title: "Pilih Tanggal", description: 'Silakan pilih tanggal terlebih dahulu!', variant: "destructive" })
      return
    }

    try {
      setSyncingData(prev => new Set(prev).add(account.id))

      const startDateStr = format(dateRange.from, 'yyyy-MM-dd')
      const endDateStr = format(dateRange.to, 'yyyy-MM-dd')

      const response = await authenticatedFetch('/api/accounts/sync-report-aggregate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_toko: account.id, // VERIFIED: accounts.id = data_toko.id_toko, cookies akan diambil dari data_toko.cookies di backend
          start_date: startDateStr,
          end_date: endDateStr
        })
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      const data = await response.json()

      if (data.success) {
        const syncedCount = data.synced_dates?.length || 0
        const failedCount = data.failed_dates?.length || 0
        const displayName = account.nama_toko || account.username_toko || (account.username !== account.id ? account.username : null) || `Toko #${account.id}`
        let message = `Data untuk akun ${displayName} berhasil di-sync!\n`
        message += `✅ Berhasil: ${syncedCount} tanggal\n`
        if (failedCount > 0) {
          message += `❌ Gagal: ${failedCount} tanggal`
        }
        toast({ title: "Sync Berhasil", description: message })
        await loadData() // Reload data
      } else {
        toast({ title: "Sync Gagal", description: data.error || 'Gagal me-sync data akun', variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: 'Gagal me-sync data akun', variant: "destructive" })
    } finally {
      setSyncingData(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.id)
        return newSet
      })
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setNewCookies("")
    setEditModalOpen(true)
  }

  const handleSaveCookies = async () => {
    if (!editingAccount || !newCookies.trim()) {
      toast({ title: "Input Error", description: "Cookies tidak boleh kosong!", variant: "destructive" })
      return
    }

    try {
      setSaving(true)

      const response = await authenticatedFetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_cookies',
          username: editingAccount.id,
          cookies: newCookies.trim()
        })
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      let data: any = null
      try {
        data = await response.json()
      } catch (parseErr) {
        // ignore parse error; will fallback to generic message
      }

      if (data && data.success) {
        toast({ title: "Berhasil", description: data.data_refreshed ? 'Cookies berhasil diupdate dan data telah diperbarui dari API!' : 'Cookies berhasil diupdate!' })
        setEditModalOpen(false)
        setEditingAccount(null)
        setNewCookies("")
        await loadData() // Reload data
      } else {
        const errorMsg = data?.message || data?.error || 'Gagal mengupdate cookies'
        toast({ title: "Gagal", description: errorMsg, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : 'Gagal mengupdate cookies', variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account)
    // Reset hard delete option - default to soft delete
    setHardDelete(false)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return

    // Pastikan user biasa hanya bisa soft delete
    const shouldHardDelete = userRole === 'superadmin' && hardDelete

    try {
      setDeleting(true)
      const response = await authenticatedFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_toko',
          id_toko: accountToDelete.id,
          hard_delete: shouldHardDelete, // Send hard delete option (hanya untuk superadmin)
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || data?.error || 'Gagal menghapus toko')
      }

      toast({
        title: 'Berhasil',
        description: shouldHardDelete
          ? `Toko ${accountToDelete.nama_toko || accountToDelete.username_toko || (accountToDelete.username !== accountToDelete.id ? accountToDelete.username : null) || accountToDelete.id} berhasil dihapus permanen dari database.`
          : `Toko ${accountToDelete.nama_toko || accountToDelete.username_toko || (accountToDelete.username !== accountToDelete.id ? accountToDelete.username : null) || accountToDelete.id} berhasil dihapus.`,
      })

      await loadData()
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
      setHardDelete(false)
    } catch (error) {
      toast({
        title: 'Gagal menghapus toko',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus toko',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // Fetch subscription limits
  const fetchLimits = async () => {
    try {
      setLimitsLoading(true)
      const response = await authenticatedFetch('/api/user/effective-limits')

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return null
      }

      const data = await response.json()

      if (data.success && data.data) {
        const { effectiveLimits, usage, planName } = data.data
        const maxAccounts = effectiveLimits.maxAccounts === -1 ? Infinity : effectiveLimits.maxAccounts
        const accountsUsage = usage.accounts || 0
        const limitReached = maxAccounts !== Infinity && accountsUsage >= maxAccounts

        const limitsInfo = {
          maxAccounts,
          usage: accountsUsage,
          limitReached,
          planName: planName || null
        }

        console.log('Processed Limits Info:', limitsInfo) // Debug log
        setLimitsData(limitsInfo)
        return limitsInfo
      }
      return null
    } catch (err) {
      console.error('Error fetching limits:', err)
      return null
    } finally {
      setLimitsLoading(false)
    }
  }

  const handleAddToko = async () => {
    if (!addTokoCookies.trim()) {
      toast({
        title: "Error",
        description: "Cookies wajib diisi!",
        variant: "destructive",
      })
      return
    }

    try {
      setAddingToko(true)

      const response = await authenticatedFetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add_toko',
          cookies: addTokoCookies.trim()
        })
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      // Parse response even if status is not OK (400, 403, etc.)
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        throw new Error('Failed to parse response')
      }

      if (!response.ok || !data.success) {
        // Handle error response (400, 403, etc.)
        const errorMessage = data.error || data.message || 'Gagal menambahkan toko'
        const usage = data.usage ?? limitsData?.usage ?? 0
        const limit = data.limit ?? limitsData?.maxAccounts ?? 0
        const limitText = limit === -1 || limit === Infinity ? 'Unlimited' : limit.toString()

        let errorDescription = errorMessage
        if (limit !== -1 && limit !== Infinity && usage !== undefined) {
          errorDescription = `Anda telah mencapai batas maksimal toko. Usage: ${usage}/${limitText}. ${errorMessage} Upgrade plan untuk menambah lebih banyak toko.`
        } else {
          errorDescription = `${errorMessage} Upgrade plan untuk menambah lebih banyak toko.`
        }

        toast({
          title: "Limitasi Toko",
          description: errorDescription,
          variant: "destructive",
          duration: 8000, // Show longer for important message
          action: (
            <ToastAction
              altText="Upgrade plan"
              onClick={() => router.push('/dashboard/subscription')}
            >
              Upgrade
              <ArrowRight className="ml-1 h-3 w-3" />
            </ToastAction>
          ),
        })
        return
      }

      // Success case
      toast({
        title: "Berhasil",
        description: "Toko berhasil ditambahkan!",
      })
      setAddTokoModalOpen(false)
      setAddTokoCookies('')
      await loadData() // Reload data
      await fetchLimits() // Refresh limits data
    } catch (err) {
      console.error('Error adding toko:', err)
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Gagal menambahkan toko. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setAddingToko(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Manajemen Toko</h1>
            <div className="text-gray-600">Loading...</div>
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
            <h1 className="text-2xl lg:text-3xl font-bold text-primary">Manajemen Toko</h1>
            <p className="text-gray-700 text-sm lg:text-base">
              Kelola toko Shopee Anda dan pantau performa
            </p>
          </div>
          <Button
            onClick={async () => {
              console.log('ADD TOKO button clicked')

              try {
                console.log('Fetching limits...')
                // Fetch limits data terbaru sebelum validasi
                const latestLimits = await fetchLimits()
                console.log('Latest limits:', latestLimits)

                // Check limit sebelum buka modal
                if (latestLimits && latestLimits.limitReached) {
                  console.log('Limit reached, showing toast')
                  const usage = latestLimits.usage
                  const limit = latestLimits.maxAccounts === Infinity ? 'Unlimited' : latestLimits.maxAccounts.toString()
                  const errorDescription = `Penggunaan toko sudah mencapai batas. Usage: ${usage}/${limit}. Silakan upgrade.`

                  // Show toast dengan pink pastel background
                  toast({
                    title: "Limitasi Toko",
                    description: errorDescription,
                    variant: "destructive",
                    duration: 8000,
                    className: "!bg-pink-50 !border-red-300 !border-2 [&>div]:!text-red-900 [&_.text-sm]:!text-red-800",
                  })

                  // Show info banner setelah toast muncul
                  setShowLimitsBanner(true)
                  return
                }

                // Jika limit belum tercapai atau data tidak ada, buka modal
                console.log('Opening modal')
                setAddTokoCookies('')
                setAddTokoModalOpen(true)
              } catch (error) {
                console.error('Error checking limits:', error)
                // Jika error, tetap buka modal (fallback behavior)
                setAddTokoCookies('')
                setAddTokoModalOpen(true)
              }
            }}
            // Disable button if limit is reached
            disabled={limitsData?.limitReached}
            className={`flex items-center gap-2 ${limitsData?.limitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4" />
            ADD TOKO
          </Button>
        </div>

        {/* Limits Info Banner - Only show after toast appears */}
        {showLimitsBanner && !limitsLoading && limitsData && limitsData.limitReached && (
          <Alert className="border-orange-200 bg-orange-50 relative">
            <Info className="h-4 w-4 text-orange-600" />
            <button
              onClick={() => setShowLimitsBanner(false)}
              className="absolute right-2 top-2 rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-orange-700" />
            </button>
            <AlertTitle className="text-base font-semibold text-orange-900 pr-6">
              Limitasi Toko
            </AlertTitle>
            <AlertDescription className="mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-orange-800">
                    Penggunaan toko saat ini: <span className="font-semibold">{limitsData.usage}</span>
                    {limitsData.maxAccounts === Infinity ? (
                      <span className="font-semibold text-green-600"> / Unlimited</span>
                    ) : (
                      <span> / {limitsData.maxAccounts}</span>
                    )}
                    {limitsData.planName && (
                      <span className="text-gray-500 ml-2">({limitsData.planName})</span>
                    )}
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    Anda telah mencapai batas maksimal toko. Upgrade plan untuk menambah lebih banyak toko.
                  </p>
                </div>

                {/* Replaced Upgrade Plan link with Addon Modal trigger */}
                <Button
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                  size="sm"
                  onClick={() => {
                    setShowAddonModal(true)
                    setShowLimitsBanner(false)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Addon
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 max-w-full">
          {/* KPI Overview */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading data...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-destructive">Error: {error}</div>
              <Button onClick={loadData} className="mt-2">Retry</Button>
            </div>
          ) : summary ? (
            <div className="flex flex-col gap-4 pt-4">
              {/* Primary Summary Cards - Account Management Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Total Accounts */}
                <div
                  onClick={() => setFilterStatus("all")}
                  className={cn(
                    "bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer",
                    filterStatus === "all" && "border-primary ring-1 ring-primary/20 bg-primary/5"
                  )}
                >
                  <Users className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium uppercase tracking-wider">Total Toko</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {summary.total_accounts || 0}
                      {limitsData && limitsData.maxAccounts !== Infinity && (
                        <span className="text-lg text-gray-500 ml-1">/ {limitsData.maxAccounts}</span>
                      )}
                    </p>
                    {limitsData && (
                      <>
                        {limitsData.planName && (
                          <p className="text-xs text-gray-500">
                            Paket: {limitsData.planName}
                          </p>
                        )}
                        {limitsData.limitReached ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowAddonModal(true)
                            }}
                            className="absolute bottom-5 right-5 text-[10px] uppercase tracking-wide font-bold text-white bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-full shadow-sm transition-all flex items-center gap-1 z-10 hover:shadow-md active:scale-95"
                          >
                            <Plus className="w-3 h-3" />
                            Tambah Addon
                          </button>
                        ) : (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Bisa tambah {limitsData.maxAccounts === Infinity ? '∞' : limitsData.maxAccounts - limitsData.usage} toko lagi
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Cookies Status */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer overflow-hidden">
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary opacity-20" />
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium uppercase tracking-wider">Cookies Health</p>
                    <div className="flex items-center gap-2 mt-1 w-full">
                      <div
                        onClick={() => setFilterStatus("connected")}
                        className={cn(
                          "flex-1 flex flex-col items-center p-2 rounded-md transition-all hover:bg-success/5 border border-transparent",
                          filterStatus === "connected" && "bg-success/5 border-success/30 ring-1 ring-success/20"
                        )}
                      >
                        <span className="text-2xl font-bold text-success">
                          {(() => {
                            if (cookiesHealth && cookiesHealth.summary) {
                              return (cookiesHealth.summary.healthy || 0) +
                                (cookiesHealth.summary.warning || 0) +
                                (cookiesHealth.summary.sync || 0) +
                                (cookiesHealth.summary.never_tested || 0)
                            }
                            return 0
                          })()}
                        </span>
                        <span className="text-[10px] text-success/70 font-bold uppercase">Connected</span>
                      </div>
                      <div className="w-[1px] h-10 bg-gray-100"></div>
                      <div
                        onClick={() => setFilterStatus("expired")}
                        className={cn(
                          "flex-1 flex flex-col items-center p-2 rounded-md transition-all hover:bg-destructive/5 border border-transparent",
                          filterStatus === "expired" && "bg-destructive/5 border-destructive/30 ring-1 ring-destructive/20"
                        )}
                      >
                        <span className="text-2xl font-bold text-destructive">
                          {(() => {
                            if (cookiesHealth && cookiesHealth.summary) {
                              return (cookiesHealth.summary.expired || 0) +
                                (cookiesHealth.summary.no_cookies || 0)
                            }
                            return 0
                          })()}
                        </span>
                        <span className="text-[10px] text-destructive/70 font-bold uppercase">Expired</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total GMV */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <TrendingUp className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Total GMV (Rp)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.total_gmv)}</p>
                  </div>
                </div>
              </div>

              {/* Secondary Summary Cards - Performance Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {/* Total Biaya Iklan */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Biaya Iklan</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.total_biaya_iklan)}</p>
                  </div>
                </div>

                {/* ACOS */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">ACOS</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{Number(summary.rasio_iklan_avg || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</p>
                  </div>
                </div>

                {/* Avg ROAS */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Avg ROAS</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{Number(summary.avg_roas || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
                  </div>
                </div>

                {/* Total Orders */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Orders</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{(summary.total_orders || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Total Checkout */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Checkout</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{(summary.total_checkout || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filter and Table Container */}
          <Card className="!p-0">
            {/* Search and Filter */}
            <div className="flex items-center gap-4 p-6 pb-0 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari toko berdasarkan nama atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {filterStatus !== "all" && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 gap-1 px-3 py-1.5"
                  onClick={() => setFilterStatus("all")}
                >
                  Filter: <span className="font-bold underline uppercase">{filterStatus}</span>
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              )}

              {/* Date Range Picker terpadu */}
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                minDate={minDate}
                maxDate={maxDate}
                className="w-full sm:w-[260px] border-slate-200"
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRefreshStatusAll}
                  disabled={refreshingStatus || syncingAllData || accounts.length === 0}
                  className="flex items-center gap-2"
                  title="Update status kesehatan cookies semua toko"
                >
                  {refreshingStatus ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Sync All Cookies</span>
                </Button>

                <Button
                  variant="default"
                  onClick={handleSyncAllDataClick}
                  disabled={syncingAllData || refreshingStatus || accounts.length === 0}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                  title="Sinkronisasi data Campaign & Report semua toko (Proses Berat)"
                >
                  {syncingAllData ? (
                    <Zap className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Sync All Data</span>
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="px-6 pb-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>TOKO</TableHead>
                      <TableHead>TOTAL GMV</TableHead>
                      <TableHead>TOTAL BIAYA IKLAN</TableHead>
                      <TableHead>ACOS</TableHead>
                      <TableHead>KLIK</TableHead>
                      <TableHead>CTR</TableHead>
                      <TableHead>CPS</TableHead>
                      <TableHead>ROAS</TableHead>
                      <TableHead>COOKIE STATUS</TableHead>
                      <TableHead>DATA STATUS</TableHead>
                      <TableHead className="text-right sticky right-0 bg-white shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 border-b border-gray-200">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8">
                          <div className="text-gray-500">Loading accounts...</div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8">
                          <div className="text-destructive">Error: {error}</div>
                          <Button onClick={loadData} className="mt-2">Retry</Button>
                        </TableCell>
                      </TableRow>
                    ) : currentAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center py-8">
                          <div className="text-gray-600">Tidak ada data akun yang ditemukan</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentAccounts.map((account, index) => (
                        <React.Fragment key={account.id || account.username || `account-${index}`}>
                          <TableRow className={cn(
                            (account.cookie_health === 'expired' || account.cookie_health === 'no_cookies') && "bg-destructive/[0.02]"
                          )}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(account.id)}
                                className="h-6 w-6 p-0"
                              >
                                {expandedRows.has(account.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {account.profile_toko ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white flex-shrink-0">
                                  <img
                                    src={account.profile_toko}
                                    alt={account.nama_toko || account.username || 'Toko'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const parent = target.parentElement
                                      if (parent) {
                                        parent.innerHTML = `
                                    <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                      <span class="text-gray-400 text-xs font-medium">No</span>
                                    </div>
                                  `
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center flex-shrink-0">
                                  <span className="text-gray-400 text-xs font-medium">No</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {account.nama_toko || account.username_toko || (account.username !== account.id ? account.username : null) || account.id}
                                </div>
                                <div className="text-sm text-gray-600">{account.email_toko || account.email || 'N/A'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{formatCurrency(account.performa_data.total_gmv)}</TableCell>
                            <TableCell>{formatCurrency(account.performa_data.total_biaya_iklan)}</TableCell>
                            <TableCell>{Number(account.performa_data?.rasio_iklan || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>
                            <TableCell>{(account.performa_data?.total_clicks || 0).toLocaleString()}</TableCell>
                            <TableCell>{account.performa_data?.ctr ? ((account.performa_data.ctr * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })) + '%' : '-'}</TableCell>
                            <TableCell>{account.performa_data?.cpc ? formatCurrency(account.performa_data.cpc) : '-'}</TableCell>
                            <TableCell>{Number(account.performa_data?.roas || 0) > 0 ? Number(account.performa_data?.roas || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "-"}</TableCell>
                            <TableCell>
                              {getCookieStatusBadge(account)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">
                                  {formatLastSync(account.last_affiliate_sync || account.updated_at)}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase">Last successful sync</span>
                              </div>
                            </TableCell>
                            <TableCell className={cn(
                              "text-right sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10 border-b border-gray-200",
                              (account.cookie_health === 'expired' || account.cookie_health === 'no_cookies')
                                ? "bg-[#fffbfb]" // Solid very light red to mimic transparent red on white
                                : "bg-white group-hover:bg-[#f8fafc]"
                            )}>
                              <div className="flex items-center justify-end gap-2">
                                {account.status_toko !== 'deleted' && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className={cn(
                                        "h-8 px-4 text-xs font-bold transition-all shadow-sm active:scale-95",
                                        (account.cookie_health === 'expired' || account.cookie_health === 'no_cookies')
                                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200 hover:bg-gray-100"
                                          : "hover:shadow-md"
                                      )}
                                      onClick={() => handleGetData(account)}
                                      disabled={syncingData.has(account.id) || checkingHealth.has(account.id) || syncingAllData || refreshingStatus || (account.cookie_health === 'expired' || account.cookie_health === 'no_cookies')}
                                      title="Sync data report dari Shopee"
                                    >
                                      {syncingData.has(account.id) && (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                      )}
                                      GET DATA
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={cn(
                                        "h-8 w-8 p-0 border border-gray-200",
                                        (syncingData.has(account.id) || checkingHealth.has(account.id)) && "pointer-events-none opacity-50"
                                      )}
                                      onClick={() => handleCheckHealth(account)}
                                      disabled={syncingData.has(account.id) || checkingHealth.has(account.id) || syncingAllData || refreshingStatus}
                                      title="Check session health saja (Fast Ping)"
                                    >
                                      <RefreshCw className={cn("w-4 h-4", checkingHealth.has(account.id) && "animate-spin")} />
                                    </Button>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 border border-gray-200">
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditAccount(account)} className="cursor-pointer">
                                          <Edit className="w-4 h-4 mr-2" />
                                          <span>Edit Cookies</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteAccount(account)}
                                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          <span>{account.status_toko === 'deleted' && userRole === 'superadmin' ? "Hapus Permanen" : "Hapus Toko"}</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Detail Row */}
                          {expandedRows.has(account.id) && (
                            <TableRow>
                              <TableCell colSpan={13} className="p-0">
                                <div className="bg-gray-50 p-6">
                                  <div className="bg-white rounded-lg shadow-sm p-6">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                                      <h4 className="text-lg font-semibold text-gray-900">
                                        Detail Performance - {account.nama_toko || account.username_toko || (account.username !== account.id ? account.username : null) || account.id}
                                      </h4>
                                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                        Active
                                      </Badge>
                                    </div>

                                    {/* Tabel Report Aggregate Per Tanggal */}
                                    {loadingDetail.has(account.id) ? (
                                      <div className="text-center py-8">
                                        <div className="text-gray-500">Loading detail data...</div>
                                      </div>
                                    ) : detailPerDate[account.id] && detailPerDate[account.id].length > 0 ? (
                                      <div className="w-[85vw] md:w-[calc(100vw-22rem)] overflow-x-auto pb-4">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[100px] align-bottom">Tanggal</TableHead>

                                              {/* TRAFFIC & ENGAGEMENT */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Impression</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Click</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">CTR</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Avg Rank</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">View</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Page Views</TableHead>

                                              {/* COST */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Cost</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">CPC</TableHead>

                                              {/* GENERAL CONVERSION */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Checkout</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Checkout Rate</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">CR</TableHead>

                                              {/* DIRECT PERFORMANCE */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct CR</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct Order</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct Order Amount</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct GMV</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct ROI</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Direct CIR</TableHead>

                                              {/* BROAD PERFORMANCE */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Broad Order</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Broad Order Amount</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Broad GMV</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Broad ROI</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">Broad CIR</TableHead>

                                              {/* OTHER METRICS */}
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">CPS</TableHead>
                                              <TableHead className="text-right text-xs h-auto px-3 py-2 bg-gray-50/80 min-w-[90px] align-bottom">CPDC</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {detailPerDate[account.id].map((row: any, idx: number) => (
                                              <TableRow key={idx} className="hover:bg-gray-50/50">
                                                <TableCell className="font-medium whitespace-nowrap text-xs py-2 px-3">
                                                  {new Date(row.tanggal).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                  })}
                                                </TableCell>

                                                {/* TRAFFIC & ENGAGEMENT */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.impression) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.click) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.ctr) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseFloat(row.avg_rank) || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.view) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.page_views) || 0).toLocaleString('id-ID')}</TableCell>

                                                {/* COST */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.cost) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.cpc) || 0)}</TableCell>

                                                {/* GENERAL CONVERSION */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.checkout) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.checkout_rate) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.cr) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>

                                                {/* DIRECT PERFORMANCE */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.direct_cr) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.direct_order) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.direct_order_amount) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.direct_gmv) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseFloat(row.direct_roi) || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.direct_cir) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>

                                                {/* BROAD PERFORMANCE */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseInt(row.broad_order) || 0).toLocaleString('id-ID')}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.broad_order_amount) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.broad_gmv) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{(parseFloat(row.broad_roi) || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{((parseFloat(row.broad_cir) || 0) * 100).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</TableCell>

                                                {/* OTHER METRICS */}
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.cps) || 0)}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap text-xs py-2 px-3">{formatCurrency(parseFloat(row.cpdc) || 0)}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <div className="text-gray-600">No data available for the selected date range</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.current_page - 1) * pagination.records_per_page) + 1} to {Math.min(pagination.current_page * pagination.records_per_page, pagination.total_records)} of {pagination.total_records} accounts
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={!pagination.has_prev_page}
                    >
                      Previous
                    </Button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={!pagination.has_next_page}
                    >
                      Next
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Go to page:</span>
                    <Input
                      type="number"
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
                      className="w-16 h-8 text-sm"
                    />
                    <span className="text-sm text-gray-600">of {totalPages}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Items per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Edit Cookies Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Cookies</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCookies">Cookies:</Label>
                <Textarea
                  id="editCookies"
                  placeholder="Masukkan cookies baru untuk akun ini..."
                  value={newCookies}
                  onChange={(e) => setNewCookies(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Untuk keamanan, cookies lama tidak ditampilkan. Masukkan cookies baru yang valid.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => setEditModalOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button onClick={handleSaveCookies} disabled={saving}>
                {saving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Toko Modal */}
        <Dialog open={addTokoModalOpen} onOpenChange={setAddTokoModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Toko Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="addTokoCookies">Cookies <span className="text-destructive">*</span>:</Label>
                <Textarea
                  id="addTokoCookies"
                  placeholder="Masukkan cookies Shopee"
                  value={addTokoCookies}
                  onChange={(e) => setAddTokoCookies(e.target.value)}
                  className="min-h-[150px]"
                />
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Data toko akan diambil otomatis dari API Shopee menggunakan cookies yang Anda masukkan.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => setAddTokoModalOpen(false)} disabled={addingToko}>
                Batal
              </Button>
              <Button onClick={handleAddToko} disabled={addingToko}>
                {addingToko && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {addingToko ? "Menambahkan..." : "Tambah Toko"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Toko Modal */}
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setAccountToDelete(null)
            setHardDelete(false)
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hapus Toko</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Anda yakin ingin menghapus toko{" "}
                <span className="font-semibold">
                  {accountToDelete?.nama_toko || accountToDelete?.username_toko || (accountToDelete?.username !== accountToDelete?.id ? accountToDelete?.username : null) || accountToDelete?.id}
                </span>
                {" "}?
              </p>

              {/* Pilihan Hard/Soft Delete - Hanya untuk Superadmin */}
              {userRole === 'superadmin' ? (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pilih jenis penghapusan:</Label>
                  <RadioGroup
                    value={hardDelete ? "hard" : "soft"}
                    onValueChange={(value) => setHardDelete(value === "hard")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="soft" id="soft-delete" />
                      <Label htmlFor="soft-delete" className="font-normal cursor-pointer">
                        <div>
                          <div className="font-medium">Soft Delete (Disarankan)</div>
                          <div className="text-xs text-gray-500">
                            Toko disembunyikan dari daftar, namun data tetap tersimpan di database. Dapat dikembalikan nanti.
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="hard" id="hard-delete" />
                      <Label htmlFor="hard-delete" className="font-normal cursor-pointer">
                        <div>
                          <div className="font-medium text-destructive">Hard Delete (Permanen)</div>
                          <div className="text-xs text-gray-500">
                            Data toko akan dihapus permanen dari database. Tindakan ini tidak dapat dibatalkan.
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Catatan:</strong> Toko akan disembunyikan dari daftar, namun data tetap tersimpan di database untuk keperluan log dan histori. Jika diperlukan, toko dapat dikembalikan oleh administrator.
                  </p>
                </div>
              )}

              {hardDelete && userRole === 'superadmin' && (
                <Alert className="border-destructive text-destructive bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Peringatan!</AlertTitle>
                  <AlertDescription>
                    Tindakan ini akan menghapus data toko secara permanen dari database. Data tidak dapat dikembalikan.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => {
                setDeleteDialogOpen(false)
                setAccountToDelete(null)
                setHardDelete(false)
              }} disabled={deleting}>
                Batal
              </Button>
              <Button variant="destructive" onClick={confirmDeleteAccount} disabled={deleting}>
                {deleting && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {deleting ? "Menghapus..." : (hardDelete ? 'Hapus Permanen' : 'Hapus')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {/* Refresh Confirmation Dialog */}
      <AlertDialog open={refreshConfirmOpen} onOpenChange={setRefreshConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Sync All Data</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin me-sync seluruh data untuk {accountsToRefreshCount} toko? Proses ini akan mengambil data Campaign & Report terbaru untuk setiap toko dan mungkin memakan waktu beberapa menit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSyncAllData} className="bg-primary hover:bg-primary/90">
              Ya, Sync Semua Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Addon Purchase Modal */}
      <AddonPurchaseModal
        open={showAddonModal}
        onClose={() => setShowAddonModal(false)}
        onSuccess={() => {
          fetchLimits()
          loadData()
        }}
      />
    </div >
  )
}

