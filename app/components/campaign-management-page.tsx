"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search, Filter, Plus, MoreHorizontal, BarChart3, Loader2, AlertCircle, X, Play, Pause, Square, Ban, PlayCircle, PauseCircle, CheckCircle, RefreshCw, CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, Info, Download, Store, ChevronDown, ChevronRight, Star, TrendingUp, HelpCircle, AlertTriangle, TrendingDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "@/components/date-range-picker"
import { CampaignMetrics } from "./campaign-metrics"
import { AccountMultiSelect } from "./account-multi-select"
import { EditableBudget } from "./editable-budget"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useCookiesHealth } from "@/contexts/CookiesHealthContext"

interface Campaign {
  id: string
  title: string
  state: 'ongoing' | 'paused' | 'ended' | 'unknown'
  daily_budget: number
  cost: number
  impression: number
  click: number
  view: number
  broad_order: number
  broad_gmv: number
  objective: string
  spend_percentage: number
  cpc: number
  conversion_rate: number
  cpm: number
  roas: number
  ctr: number
  account_username: string
  account_id: string
  account_email: string
  kode_tim: string
  nama_tim: string
  pic_akun: string
  image?: string
  isGroupCampaign?: boolean
  groupImages?: string[]
  totalItems?: number
  subtype?: string | null
  start_time?: number | null
}

interface CampaignsResponse {
  success: boolean
  data: Campaign[]
  meta: {
    start_time: string
    end_time: string
    total_campaigns: number
    active_campaigns: number
    paused_campaigns: number
    ended_campaigns: number
    total_spend: number
    total_budget: number
    total_gmv: number
  }
  error?: string
}

export function CampaignManagementPage() {
  const { tokos } = useCookiesHealth()
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ongoing")

  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    mode: 'manual', // 'automatic' or 'manual' - default to manual
    strategi: 'max_gmv', // 'max_gmv' or 'max_gmv_roi_two'
    daily_budget: '',
    account_username: '',
    roas: '',
    rapid_boost: false, // Akselerasi Performa (hanya untuk GMV Max ROAS)
    periode_type: 'unlimited', // 'unlimited' or 'custom' - default to unlimited
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    selected_products: [] as string[] // Array of product IDs
  })
  const [selectedProductsCount, setSelectedProductsCount] = useState(0)
  const [showProductModal, setShowProductModal] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [productSortColumn, setProductSortColumn] = useState<string | null>(null)
  const [productSortDirection, setProductSortDirection] = useState<'asc' | 'desc'>('asc')
  const [productPagination, setProductPagination] = useState({ last_token: "", has_more: false })
  const [connectedAccounts, setConnectedAccounts] = useState<{ username: string, nama_toko: string, nama_tim: string }[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [hasAutomaticCampaign, setHasAutomaticCampaign] = useState(false) // Check if account already has "iklan produk otomatis"

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(() => {
    // Set default to today (always current date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return {
      from: today, // today
      to: today // today
    }
  })
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const expiredAccountIds = selectedAccountIds.filter(id => tokos[id] === 'expired' || tokos[id] === 'no_cookies')
  const isAllSelectedExpired = selectedAccountIds.length > 0 && expiredAccountIds.length === selectedAccountIds.length

  const [refreshing, setRefreshing] = useState(false)
  const [createDateRangeOpen, setCreateDateRangeOpen] = useState(false)

  // Helper function to convert Date to YYYY-MM-DD string
  const formatDateForAPI = (date: Date | undefined): string => {
    if (!date) return ''
    return format(date, 'yyyy-MM-dd')
  }

  // Read URL query parameters on initial load
  useEffect(() => {
    if (typeof window !== 'undefined' && searchParams) {
      // Read account_ids parameter
      const accountIdsParam = searchParams.get('account_ids')
      if (accountIdsParam) {
        const accountIds = accountIdsParam.split(',').filter(id => id && id.trim() !== '')
        if (accountIds.length > 0) {
          setSelectedAccountIds(accountIds)
        }
      }

      // Read search parameter
      const searchParam = searchParams.get('search')
      if (searchParam) {
        setSearchQuery(searchParam)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Check if account has "iklan produk otomatis" campaign
  useEffect(() => {
    const checkAutomaticCampaign = async () => {
      if (!createFormData.account_username) {
        setHasAutomaticCampaign(false)
        return
      }

      try {
        // Get account ID from username
        const account = connectedAccounts.find(acc => acc.username === createFormData.account_username)
        if (!account) {
          setHasAutomaticCampaign(false)
          return
        }

        // Fetch campaigns for this account
        const startTime = formatDateForAPI(dateRange.from)
        const endTime = formatDateForAPI(dateRange.to)
        const response = await authenticatedFetch(`/api/campaigns/shopee?start_time=${startTime}&end_time=${endTime}&account_ids=${account.username}`)
        const result = await response.json()

        if (result.success && result.data) {
          // Check if any campaign title contains "iklan produk otomatis" AND status is ongoing/aktif
          const hasAuto = result.data.some((campaign: Campaign) =>
            campaign.title &&
            campaign.title.toLowerCase().includes('iklan produk otomatis') &&
            campaign.state === 'ongoing'
          )
          setHasAutomaticCampaign(hasAuto)

          // If has automatic campaign and current mode is automatic, switch to manual
          if (hasAuto && createFormData.mode === 'automatic') {
            setCreateFormData(prev => ({ ...prev, mode: 'manual' }))
            toast.warning('Mode Otomatis tidak tersedia', {
              description: 'Toko ini sudah memiliki iklan "iklan produk otomatis" yang aktif. Mode diubah ke Manual.'
            })
          }
        } else {
          setHasAutomaticCampaign(false)
        }
      } catch (error) {
        console.error('Error checking automatic campaign:', error)
        setHasAutomaticCampaign(false)
      }
    }

    checkAutomaticCampaign()
  }, [createFormData.account_username, connectedAccounts, dateRange.from, dateRange.to])

  // Operation log modal states
  const [operationLogModalOpen, setOperationLogModalOpen] = useState(false)
  const [selectedCampaignForLog, setSelectedCampaignForLog] = useState<{ id: string, account_username: string } | null>(null)
  const [operationLogs, setOperationLogs] = useState<any[]>([])
  const [operationLogLoading, setOperationLogLoading] = useState(false)
  const [operationLogError, setOperationLogError] = useState<string | null>(null)

  // Group campaign products states
  const [expandedGroupCampaigns, setExpandedGroupCampaigns] = useState<Set<string>>(new Set())
  const [groupProducts, setGroupProducts] = useState<{ [key: string]: any[] }>({})
  const [groupProductsLoading, setGroupProductsLoading] = useState<{ [key: string]: boolean }>({})
  const [groupProductsError, setGroupProductsError] = useState<{ [key: string]: string | null }>({})

  // Function to fetch campaigns data from Shopee API
  const fetchCampaigns = async (startDate: Date | undefined, endDate: Date | undefined, accountIds?: string[]) => {
    const startTime = formatDateForAPI(startDate)
    const endTime = formatDateForAPI(endDate)

    try {
      setLoading(true)
      setError(null)

      let url = `/api/campaigns/shopee?start_time=${startTime}&end_time=${endTime}`
      if (accountIds && accountIds.length > 0) {
        url += `&account_ids=${accountIds.join(',')}`
      }

      const response = await authenticatedFetch(url)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result: CampaignsResponse = await response.json()

      if (result.success) {
        setCampaigns(result.data)
      } else {
        setError(result.error || 'Failed to fetch campaigns data')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch summary data
  const fetchSummaryData = async (accountIds: string[], startDate: Date | undefined, endDate: Date | undefined) => {
    const startTime = formatDateForAPI(startDate)
    const endTime = formatDateForAPI(endDate)

    // Filter out empty strings and null values
    const validAccountIds = accountIds.filter(id => id && id.trim() !== '' && id !== 'null' && id !== 'undefined')

    if (validAccountIds.length === 0) {
      setSummaryData(null)
      return
    }

    try {
      setSummaryLoading(true)
      const url = `/api/campaigns/summary?account_ids=${validAccountIds.join(',')}&start_time=${startTime}&end_time=${endTime}`
      const response = await authenticatedFetch(url)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()

      if (result.success) {
        setSummaryData(result.data)

        // Auto-update to database after fetching summary data
        await updateSummaryToDatabase(validAccountIds, startTime, endTime)
      } else {
        setSummaryData(null)
      }
    } catch (err) {
      setSummaryData(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  // Function to update summary data to database
  const updateSummaryToDatabase = async (accountIds: string[], startTime: string, endTime: string) => {
    try {
      const response = await authenticatedFetch('/api/campaigns/update-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_ids: accountIds,
          start_time: startTime,
          end_time: endTime
        })
      })

      const data = await response.json()
    } catch (error) {
    }
  }

  // Load campaigns only when accounts are selected
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds)
      fetchSummaryData(selectedAccountIds, dateRange.from, dateRange.to)
    } else {
      // Clear campaigns when no accounts selected
      setCampaigns([])
      setSummaryData(null)
      setLoading(false)
    }
  }, [selectedAccountIds])

  // Removed auto-fetch on date range change - now only fetches when Apply Filter is clicked

  // Auto-refresh campaigns every 5 minutes (only if accounts are selected)
  useEffect(() => {
    if (selectedAccountIds.length === 0) {
      return // Don't start auto-refresh if no accounts selected
    }

    const interval = setInterval(() => {
      if (!loading && selectedAccountIds.length > 0) {
        fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds)
        fetchSummaryData(selectedAccountIds, dateRange.from, dateRange.to)
      }
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [dateRange.from, dateRange.to, selectedAccountIds, loading])

  // Function to handle Apply Filter button click
  const handleApplyFilter = async () => {
    // Validate dates
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Ensure end date is not more than 1 day in the future
    if (dateRange.to && dateRange.to > tomorrow) {
      setDateRange(prev => ({ ...prev, to: today }))
      return
    }

    // Ensure start date is not after end date
    if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
      setDateRange(prev => ({ ...prev, from: prev.to }))
      return
    }

    // Only fetch if accounts are selected
    if (selectedAccountIds.length > 0) {
      setLoading(true)
      try {
        await Promise.all([
          fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds),
          fetchSummaryData(selectedAccountIds, dateRange.from, dateRange.to)
        ])

        // Refresh expanded group products with new date range
        if (expandedGroupCampaigns.size > 0) {
          await refreshExpandedGroupProducts()
        }
      } catch (error) {
      } finally {
        setLoading(false)
      }
    }
  }

  // Function to handle manual refresh
  const handleRefresh = async () => {
    if (selectedAccountIds.length === 0) {
      return // Don't refresh if no accounts selected
    }

    try {
      setRefreshing(true)
      setError(null)

      // Refresh both campaigns and summary data
      await Promise.all([
        fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds),
        fetchSummaryData(selectedAccountIds, dateRange.from, dateRange.to)
      ])
    } catch (err) {
      setError('Error refreshing data. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  // Function to handle account selection
  const handleAccountSelect = (accountIds: string[]) => {
    // Filter out null/undefined values
    const validAccountIds = accountIds.filter(id => id && id.trim() !== '' && id !== 'null' && id !== 'undefined')
    setSelectedAccountIds(validAccountIds)
  }


  // Function to calculate BCG category for a campaign
  const calculateBCGCategory = (campaign: Campaign, allCampaigns: Campaign[]): 'stars' | 'cash_cows' | 'question_marks' | 'dogs' => {
    if (allCampaigns.length === 0) return 'dogs'

    // Calculate average ROAS for market share
    const avgROAS = allCampaigns.reduce((sum, c) => {
      const roas = c.cost > 0 ? (c.broad_gmv / c.cost) : 0
      return sum + roas
    }, 0) / allCampaigns.length || 1

    // Calculate campaign ROAS
    const campaignROAS = campaign.cost > 0 ? (campaign.broad_gmv / campaign.cost) : 0
    const marketShare = avgROAS > 0 ? (campaignROAS / avgROAS) * 100 : 0

    // Calculate growth rate using CTR as proxy (higher CTR = higher growth potential)
    // For campaigns with no historical data, use CTR and conversion rate
    const growthRate = campaign.ctr > 0 ? (campaign.ctr * 10) + (campaign.conversion_rate * 5) : 0

    // Categorize based on BCG Matrix
    // Thresholds: Growth Rate > 10% = High, Market Share > 100% = High
    if (growthRate > 10 && marketShare > 100) {
      return 'stars'
    } else if (growthRate <= 10 && marketShare > 100) {
      return 'cash_cows'
    } else if (growthRate > 10 && marketShare <= 100) {
      return 'question_marks'
    } else {
      return 'dogs'
    }
  }

  // Function to get BCG icon with tooltip
  const getBCGIcon = (category: 'stars' | 'cash_cows' | 'question_marks' | 'dogs') => {
    const config = {
      stars: {
        icon: Star,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Top Perform',
        description: 'Iklan andalan dengan performa tinggi'
      },
      cash_cows: {
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Revenue Stabil',
        description: 'Menghasilkan omzet besar secara konsisten'
      },
      question_marks: {
        icon: HelpCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Fase Testing',
        description: 'Sedang diuji, perlu optimasi lebih lanjut'
      },
      dogs: {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Under Perform',
        description: 'Perlu evaluasi segera'
      }
    }

    const { icon: Icon, color, bgColor, label, description } = config[category]

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${bgColor} cursor-help`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-primary-foreground/90">{description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Filter campaigns based on search query and status
  let filteredCampaigns = campaigns.filter((campaign) => {
    const searchLower = searchQuery.toLowerCase()
    const campaignIdStr = campaign.id ? String(campaign.id) : ''
    const matchesSearch =
      (campaign.title || '').toLowerCase().includes(searchLower) ||
      (campaign.account_username || '').toLowerCase().includes(searchLower) ||
      campaignIdStr.toLowerCase().includes(searchLower)
    const matchesStatus = selectedStatus === "all" || campaign.state === selectedStatus
    return matchesSearch && matchesStatus
  })

  // Sort campaigns
  if (sortColumn) {
    filteredCampaigns = [...filteredCampaigns].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'budget':
          aValue = a.daily_budget || 0
          bValue = b.daily_budget || 0
          break
        case 'spend':
          aValue = a.cost || 0
          bValue = b.cost || 0
          break
        case 'spend_percentage':
          aValue = a.spend_percentage || 0
          bValue = b.spend_percentage || 0
          break
        case 'impressions':
          aValue = a.impression || 0
          bValue = b.impression || 0
          break
        case 'clicks':
          aValue = a.click || 0
          bValue = b.click || 0
          break
        case 'ctr':
          aValue = a.ctr || 0
          bValue = b.ctr || 0
          break
        case 'view':
          aValue = a.view || 0
          bValue = b.view || 0
          break
        case 'orders':
          aValue = a.broad_order || 0
          bValue = b.broad_order || 0
          break
        case 'conversion_rate':
          aValue = a.conversion_rate || 0
          bValue = b.conversion_rate || 0
          break
        case 'cps':
          aValue = a.cpc || 0
          bValue = b.cpc || 0
          break
        case 'cpm':
          aValue = a.cpm || 0
          bValue = b.cpm || 0
          break
        case 'sales':
          aValue = a.broad_gmv || 0
          bValue = b.broad_gmv || 0
          break
        case 'roas':
          aValue = a.roas || 0
          bValue = b.roas || 0
          break
        case 'acos':
          // Calculate ACOS: (spend / sales) * 100
          const aSpend = (a.cost || 0) / 100000
          const aSales = (a.broad_gmv || 0) / 100000
          const bSpend = (b.cost || 0) / 100000
          const bSales = (b.broad_gmv || 0) / 100000
          aValue = aSales > 0 ? (aSpend / aSales) * 100 : 0
          bValue = bSales > 0 ? (bSpend / bSales) * 100 : 0
          break
        default:
          return 0
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortDirection === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }
    })
  }

  // Pagination logic
  const totalFilteredCampaigns = filteredCampaigns.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex)

  // Calculate total pages
  const calculatedTotalPages = Math.ceil(totalFilteredCampaigns / itemsPerPage)

  // Update pagination states when filtered campaigns change
  useEffect(() => {
    setTotalRecords(totalFilteredCampaigns)
    setTotalPages(calculatedTotalPages)

    // Reset to page 1 if current page is greater than total pages
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalFilteredCampaigns, calculatedTotalPages, currentPage])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, sortColumn, sortDirection])

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new column with ascending direction
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />
  }


  const getStatusColor = (state: string) => {
    switch (state) {
      case "ongoing":
        return "bg-success/10 text-success"
      case "paused":
        return "bg-warning/10 text-warning"
      case "ended":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case "ongoing":
        return "Active"
      case "paused":
        return "Paused"
      case "ended":
        return "Ended"
      default:
        return "Unknown"
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case "ongoing":
        return <PlayCircle className="w-5 h-5 text-success" />
      case "paused":
        return <PauseCircle className="w-5 h-5 text-warning" />
      case "ended":
        return <CheckCircle className="w-5 h-5 text-gray-700" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-700" />
    }
  }

  const getObjectiveColor = (objective: string) => {
    switch (objective?.toUpperCase()) {
      case "AUTO":
        return "text-info"
      case "GMV MAX":
        return "text-success"
      case "CUSTOM":
        return "text-warning"
      default:
        return "text-gray-700"
    }
  }

  // Function to fetch connected accounts (status_cookies = 'aktif')
  const fetchConnectedAccounts = async () => {
    try {
      const response = await authenticatedFetch('/api/accounts?filter_cookies=connected&limit=1000')

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()

      if (result.success && result.data?.accounts) {
        const connected = result.data.accounts.map((account: any) => ({
          username: account.username,
          nama_toko: account.nama_toko || account.username,
          nama_tim: account.nama_tim || ''
        }))
        setConnectedAccounts(connected)
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Function to fetch products from Shopee API
  const fetchProducts = async (lastToken: string = "") => {
    if (!createFormData.account_username) {
      toast.error('Validasi Gagal', {
        description: 'Pilih toko terlebih dahulu!'
      })
      setProductsLoading(false)
      return
    }

    try {
      setProductsLoading(true)

      // Build query parameters
      const params = new URLSearchParams({
        id_toko: createFormData.account_username
      })

      if (lastToken) {
        params.append('last_token', lastToken)
      }

      if (productSearchQuery.trim()) {
        params.append('search', productSearchQuery.trim())
      }

      // Call backend API route to avoid CORS issues
      const response = await authenticatedFetch(`/api/campaigns/products?${params.toString()}`)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        setProductsLoading(false)
        return
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Gagal mengambil data produk')
      }

      const products = result.data?.products || []
      const pagination = result.data?.pagination || {}

      if (products && Array.isArray(products) && products.length > 0) {
        if (lastToken) {
          setProducts(prev => [...prev, ...products])
        } else {
          setProducts(products)
        }

        setProductPagination({
          last_token: pagination.last_token || "",
          has_more: pagination.has_more || false
        })
      } else {
        if (!lastToken) {
          setProducts([])
        }
        setProductPagination({
          last_token: "",
          has_more: false
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil data produk. Silakan coba lagi.'
      toast.error('Gagal mengambil data produk', {
        description: errorMessage
      })
      setProducts([])
    } finally {
      setProductsLoading(false)
    }
  }

  // Function to handle product modal open
  const handleOpenProductModal = () => {
    if (!createFormData.account_username) {
      toast.error('Validasi Gagal', {
        description: 'Pilih toko terlebih dahulu di form Buat Iklan!'
      })
      return
    }

    // Initialize selected products from createFormData
    const initialSelected = new Set(createFormData.selected_products)
    setSelectedProducts(initialSelected)
    setSelectedProductsCount(initialSelected.size)
    setProductSearchQuery("")
    setProducts([])
    setProductPagination({ last_token: "", has_more: false })
    setShowProductModal(true)
    // Fetch products using cookies from the selected account
    fetchProducts()
  }

  // Function to handle product selection
  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts)

    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      // Unlimited: no validation limit
      newSelected.add(productId)
    }

    setSelectedProducts(newSelected)
    setSelectedProductsCount(newSelected.size)
  }

  // Function to handle select all products
  const handleSelectAllProducts = () => {
    if (selectedProducts.size === products.length && products.length > 0) {
      // Deselect all
      setSelectedProducts(new Set())
      setSelectedProductsCount(0)
    } else {
      // Select all (unlimited)
      const newSelected = new Set(Array.from(products.map((p: any) => p.product_id)))
      setSelectedProducts(newSelected)
      setSelectedProductsCount(newSelected.size)
    }
  }

  // Function to confirm product selection
  const handleConfirmProducts = () => {
    const productArray = Array.from(selectedProducts)
    setCreateFormData(prev => {
      // If more than 1 product selected, auto-switch to GMV Max ROAS
      const newStrategi = productArray.length > 1 ? 'max_gmv_roi_two' : prev.strategi
      return {
        ...prev,
        selected_products: productArray,
        strategi: newStrategi
      }
    })
    setSelectedProductsCount(selectedProducts.size)
    setShowProductModal(false)
  }

  // Function to handle product search
  const handleProductSearch = () => {
    fetchProducts()
  }

  // Function to handle create campaign modal
  const handleCreateCampaign = async () => {
    await fetchConnectedAccounts()
    setShowCreateModal(true)
    setCreateFormData({
      mode: 'manual', // Default to manual
      strategi: 'max_gmv',
      daily_budget: '',
      account_username: selectedAccountIds.length > 0 ? campaigns.find(c => selectedAccountIds.includes(c.account_id))?.account_username || '' : '',
      roas: '',
      rapid_boost: false, // Akselerasi Performa (hanya untuk GMV Max ROAS)
      periode_type: 'unlimited', // Default to unlimited
      start_date: undefined,
      end_date: undefined,
      selected_products: []
    })
    setSelectedProductsCount(0)
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setCreateFormData({
      mode: 'manual', // Default to manual
      strategi: 'max_gmv',
      daily_budget: '',
      account_username: '',
      roas: '',
      rapid_boost: false, // Akselerasi Performa (hanya untuk GMV Max ROAS)
      periode_type: 'unlimited', // Default to unlimited
      start_date: undefined,
      end_date: undefined,
      selected_products: []
    })
    setSelectedProductsCount(0)
  }

  const handleCreateFormChange = (field: string, value: any) => {
    setCreateFormData(prev => {
      const updated = { ...prev, [field]: value }

      // If strategi is changed to GMV Max Auto, set rapid_boost to false
      if (field === 'strategi' && value === 'max_gmv') {
        updated.rapid_boost = false
      }

      return updated
    })
  }

  // Helper function to check if date should be disabled (before today)
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    return dateOnly < today
  }

  // Helper function to check if end date should be disabled (before today or before start date)
  const isEndDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    // Disable dates before today
    if (dateOnly < today) {
      return true
    }

    // Disable dates before start date if start date is set
    if (createFormData.start_date) {
      const startDateOnly = new Date(
        createFormData.start_date.getFullYear(),
        createFormData.start_date.getMonth(),
        createFormData.start_date.getDate()
      )
      if (dateOnly < startDateOnly) {
        return true
      }
    }

    return false
  }

  const handleCreateCampaignSubmit = async () => {
    if (!createFormData.account_username) {
      toast.error('Validasi Gagal', {
        description: 'Account username harus diisi!'
      })
      return
    }

    // Validate: If more than 1 product, must use GMV Max ROAS
    if (createFormData.selected_products.length > 1 && createFormData.strategi === 'max_gmv') {
      toast.error('Validasi Gagal', {
        description: 'Untuk lebih dari 1 produk, hanya GMV Max ROAS yang dapat digunakan!'
      })
      return
    }

    // Validate ROAS for GMV Max ROAS strategi
    if (createFormData.strategi === 'max_gmv_roi_two' && createFormData.roas === '') {
      toast.error('Validasi Gagal', {
        description: 'ROAS harus diisi untuk strategi GMV Max ROAS!'
      })
      return
    }

    // Validate periode if custom
    if (createFormData.periode_type === 'custom') {
      if (!createFormData.start_date || !createFormData.end_date) {
        toast.error('Validasi Gagal', {
          description: 'Start date dan End date harus diisi untuk periode custom!'
        })
        return
      }
      if (createFormData.start_date >= createFormData.end_date) {
        toast.error('Validasi Gagal', {
          description: 'Start date harus lebih kecil dari End date!'
        })
        return
      }
    }

    // Parse budget: if empty or undefined, default to 0
    const budgetValue = createFormData.daily_budget === '' || createFormData.daily_budget === undefined
      ? 0
      : parseFloat(createFormData.daily_budget)

    if (isNaN(budgetValue) || budgetValue < 0) {
      toast.error('Validasi Gagal', {
        description: 'Budget tidak boleh negatif'
      })
      return
    }

    const budget = budgetValue

    // Validasi budget minimal berdasarkan mode
    if (createFormData.mode === 'automatic') {
      // Mode otomatis: minimal Rp50.000 atau 0
      if (budget > 0 && budget < 50000) {
        toast.error('Validasi Gagal', {
          description: 'Budget minimal Rp50.000 atau 0 (tak terbatas) untuk mode otomatis'
        })
        return
      }
    } else {
      // Mode manual: minimal Rp25.000 atau 0
      if (budget > 0 && budget < 25000) {
        toast.error('Validasi Gagal', {
          description: 'Budget minimal Rp25.000 atau 0 (tak terbatas)'
        })
        return
      }
    }

    // Budget validation: must be positive integer (no longer requires multiple of 5000)
    if (budget > 0 && !Number.isInteger(budget)) {
      toast.error('Validasi Gagal', {
        description: 'Budget harus berupa bilangan bulat positif'
      })
      return
    }

    // Validate ROAS value
    if (createFormData.strategi === 'max_gmv_roi_two' && createFormData.roas !== '') {
      const roas = parseFloat(createFormData.roas)
      if (isNaN(roas) || roas < 0) {
        toast.error('Validasi Gagal', {
          description: 'ROAS tidak boleh negatif'
        })
        return
      }
    }

    try {
      // Generate title dengan timestamp
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const year = String(now.getFullYear()).slice(-2)
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      const timestamp = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`

      // Generate title based on mode and strategi
      const modeText = createFormData.mode === 'automatic' ? 'Otomatis' : 'Manual'
      const strategiText = createFormData.strategi === 'max_gmv' ? 'GMV Max Auto' : 'GMV Max ROAS'
      const titleWithTimestamp = `${modeText} - ${strategiText} ${timestamp}`

      // Convert budget to API format (multiply by 100000)
      // Budget can be 0 (unlimited) or minimum 25000
      const budgetForAPI = budget * 100000

      // Convert dates to timestamps
      let startTime: number
      let endTime: number

      if (createFormData.periode_type === 'unlimited') {
        // For unlimited: start_time = hari ini (midnight WIB), end_time = 0
        const now = new Date()
        const jakartaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        const [year, month, day] = jakartaDateStr.split('-').map(Number)
        const todayJakarta = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`)
        startTime = Math.floor(todayJakarta.getTime() / 1000)
        endTime = 0
      } else {
        // For custom periode
        if (!createFormData.start_date || !createFormData.end_date) {
          toast.error('Validasi Gagal', {
            description: 'Start date dan End date harus diisi untuk periode custom!'
          })
          return
        }
        const startDate = new Date(createFormData.start_date)
        startDate.setHours(0, 0, 0, 0)
        startTime = Math.floor(startDate.getTime() / 1000)

        const endDate = new Date(createFormData.end_date)
        endDate.setHours(23, 59, 59, 999)
        endTime = Math.floor(endDate.getTime() / 1000)
      }

      // Calculate roi_two_target based on strategi
      let roiTwoTarget = 0
      let roasValue: number | undefined = undefined

      if (createFormData.strategi === 'max_gmv_roi_two') {
        // Parse ROAS value - handle both string and number
        const roasInput = createFormData.roas
        if (roasInput !== '' && roasInput !== undefined && roasInput !== null) {
          roasValue = typeof roasInput === 'string' ? parseFloat(roasInput.trim()) : Number(roasInput)
          if (!isNaN(roasValue) && isFinite(roasValue)) {
            roiTwoTarget = roasValue * 100000
          } else {
            roasValue = undefined
          }
        }
      }
      // If strategi is 'max_gmv', roiTwoTarget = 0 (already set)

      // Prepare payload based on mode
      // Ensure daily_budget is always a number (0 if empty)
      const payload: any = {
        action: 'create_campaign',
        mode: createFormData.mode,
        strategi: createFormData.strategi,
        daily_budget: budgetForAPI, // Already converted, will be 0 if budget is 0
        account_username: createFormData.account_username,
        selected_products: createFormData.selected_products || [],
        periode_type: createFormData.periode_type,
        start_time: startTime,
        end_time: endTime,
        roi_two_target: roiTwoTarget
      }

      // Add roas field for validation (backend expects this for GMV Max ROAS)
      // Always include roas if strategi is max_gmv_roi_two
      if (createFormData.strategi === 'max_gmv_roi_two') {
        if (roasValue !== undefined && !isNaN(roasValue) && isFinite(roasValue)) {
          payload.roas = roasValue
        } else if (createFormData.roas !== '' && createFormData.roas !== undefined && createFormData.roas !== null) {
          // Fallback: try to parse again from createFormData.roas
          const parsed = parseFloat(String(createFormData.roas).trim())
          if (!isNaN(parsed) && isFinite(parsed)) {
            payload.roas = parsed
          }
        }
        // Log for debugging
        console.log('[handleCreateCampaignSubmit] ROAS value:', {
          createFormData_roas: createFormData.roas,
          roasValue: roasValue,
          payload_roas: payload.roas,
          strategi: createFormData.strategi
        })
        // Log for debugging
        console.log('[handleCreateCampaignSubmit] ROAS value:', {
          createFormData_roas: createFormData.roas,
          roasValue: roasValue,
          payload_roas: payload.roas
        })
      }

      // Add rapid_boost if Mode Manual + GMV Max ROAS and rapid_boost is enabled
      if (createFormData.mode === 'manual' && createFormData.strategi === 'max_gmv_roi_two' && createFormData.rapid_boost) {
        payload.rapid_boost = true
      }

      const response = await authenticatedFetch('/api/campaigns/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Iklan berhasil dibuat!')
        handleCloseCreateModal()
        // Refresh campaigns data
        await fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds)
      } else {
        // Show detailed error message from backend
        const errorMessage = result.error || 'Gagal membuat campaign. Silakan coba lagi.'
        toast.error('Gagal membuat campaign', {
          description: errorMessage
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal membuat campaign. Silakan coba lagi.'
      toast.error('Error', {
        description: errorMessage
      })
    }
  }

  // Function to fetch operation log
  const fetchOperationLog = async (campaignId: string, accountUsername: string) => {
    try {
      setOperationLogLoading(true)
      setOperationLogError(null)

      // Always use 30 days range (using GMT+7 / Asia/Jakarta timezone)
      const now = new Date()
      const jakartaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) // Returns YYYY-MM-DD
      const [year, month, day] = jakartaDateStr.split('-').map(Number)

      // Calculate 30 days ago in Jakarta timezone
      const todayJakarta = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`)
      const startDateJakarta = new Date(todayJakarta)
      startDateJakarta.setDate(startDateJakarta.getDate() - 30)
      const startTime = Math.floor(startDateJakarta.getTime() / 1000)

      const endDateJakarta = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59+07:00`)
      const endTime = Math.floor(endDateJakarta.getTime() / 1000)

      const response = await authenticatedFetch('/api/campaigns/operation-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          account_username: accountUsername,
          start_time: startTime,
          end_time: endTime
        })
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      const result = await response.json()

      if (result.success && result.data) {
        const logs = result.data.operation_list || []
        setOperationLogs(logs)
      } else {
        throw new Error(result.error || 'Failed to fetch operation log')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch operation log'
      setOperationLogError(errorMessage)
      setOperationLogs([])
    } finally {
      setOperationLogLoading(false)
    }
  }

  // Function to open operation log modal
  const handleOpenOperationLog = (campaignId: string, accountUsername: string) => {
    setSelectedCampaignForLog({ id: campaignId, account_username: accountUsername })
    setOperationLogModalOpen(true)
    setOperationLogs([])
    setOperationLogError(null)
    // Fetch data when modal opens
    fetchOperationLog(campaignId, accountUsername)
  }

  // Function to fetch group campaign products (always fetch, no cache)
  const fetchGroupProducts = async (campaignId: string, accountUsername: string) => {
    const cacheKey = `${campaignId}-${accountUsername}`

    try {
      setGroupProductsLoading(prev => ({ ...prev, [cacheKey]: true }))
      setGroupProductsError(prev => ({ ...prev, [cacheKey]: null }))

      const response = await authenticatedFetch('/api/campaigns/group-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          account_username: accountUsername,
          start_time: formatDateForAPI(dateRange.from),
          end_time: formatDateForAPI(dateRange.to)
        })
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      const result = await response.json()

      if (result.success && result.data) {
        setGroupProducts(prev => ({
          ...prev,
          [cacheKey]: result.data.products || []
        }))
      } else {
        throw new Error(result.error || 'Failed to fetch group products')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch group products'
      setGroupProductsError(prev => ({ ...prev, [cacheKey]: errorMessage }))
      setGroupProducts(prev => ({ ...prev, [cacheKey]: [] }))
    } finally {
      setGroupProductsLoading(prev => ({ ...prev, [cacheKey]: false }))
    }
  }

  // Function to refresh all expanded group products (when date range changes)
  const refreshExpandedGroupProducts = async () => {
    // Get all expanded campaigns
    const expandedKeys = Array.from(expandedGroupCampaigns)

    // Fetch products for each expanded campaign
    const fetchPromises = expandedKeys.map(cacheKey => {
      const [campaignId, accountUsername] = cacheKey.split('-')
      return fetchGroupProducts(campaignId, accountUsername)
    })

    // Wait for all fetches to complete
    await Promise.all(fetchPromises)
  }

  // Function to toggle group campaign expansion
  const handleToggleGroupCampaign = (campaignId: string, accountUsername: string, isGroupCampaign: boolean) => {
    if (!isGroupCampaign) return

    const cacheKey = `${campaignId}-${accountUsername}`
    const isExpanded = expandedGroupCampaigns.has(cacheKey)

    if (isExpanded) {
      // Collapse
      setExpandedGroupCampaigns(prev => {
        const newSet = new Set(prev)
        newSet.delete(cacheKey)
        return newSet
      })
    } else {
      // Expand - always fetch products (no cache)
      setExpandedGroupCampaigns(prev => new Set(prev).add(cacheKey))
      fetchGroupProducts(campaignId, accountUsername)
    }
  }

  const performCampaignAction = async (action: string, campaignId: string, accountUsername: string, newBudget?: number) => {
    const actionKey = `${action}-${campaignId}`

    try {
      // Set loading state
      setActionLoading(prev => ({ ...prev, [actionKey]: true }))

      const response = await authenticatedFetch('/api/campaigns/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          campaign_id: campaignId,
          account_username: accountUsername,
          new_budget: newBudget
        })
      })

      const result = await response.json()

      if (result.success) {
        // Show success message based on action
        const actionMessages: { [key: string]: string } = {
          pause: 'Campaign berhasil di-pause!',
          resume: 'Campaign berhasil di-resume!',
          stop: 'Campaign berhasil di-stop!',
          edit_budget: `Budget campaign berhasil diupdate!`
        }
        toast.success(actionMessages[action] || 'Action berhasil!')

        // Refresh campaigns data
        await fetchCampaigns(dateRange.from, dateRange.to, selectedAccountIds)
        return true
      } else {
        const errorMessage = result.error || 'Gagal melakukan action. Silakan coba lagi.'
        toast.error('Action Gagal', {
          description: errorMessage
        })
        return false
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal melakukan action. Silakan coba lagi.'
      toast.error('Error', {
        description: errorMessage
      })
      return false
    } finally {
      // Clear loading state
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">Manajemen Iklan</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>Auto-refresh ON</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm lg:text-base">
              Kelola dan pantau iklan Shopee Anda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing || loading || selectedAccountIds.length === 0}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateCampaign}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Iklan
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Selection - Modern Dropdown */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[400px] max-w-2xl">
              <AccountMultiSelect
                selectedAccountIds={selectedAccountIds}
                onAccountSelect={handleAccountSelect}
                placeholder="Pilih toko untuk melihat iklan..."
              />
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="p-4 border-destructive/20 bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error loading campaigns:</span>
                <span>{error}</span>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="p-8">
              <div className="flex items-center justify-center gap-2 text-gray-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading campaigns...</span>
              </div>
            </Card>
          )}

          {/* Campaign Metrics Overview - MOVED TO TOP */}
          <div className="mb-6">
            <CampaignMetrics
              campaigns={selectedAccountIds.length > 0 ? filteredCampaigns.map((campaign) => ({
                id: campaign.id,
                name: campaign.title,
                status: campaign.state === 'ongoing' ? 'active' : campaign.state === 'paused' ? 'paused' : 'ended',
                objective: campaign.objective,
                budget: campaign.daily_budget,
                spend: campaign.cost,
                sales: campaign.broad_gmv,
                roas: campaign.roas,
                adBalance: campaign.daily_budget - campaign.cost, // Calculate remaining balance
                impressions: campaign.impression,
                clicks: campaign.click,
                view: campaign.view,
                orders: campaign.broad_order,
                conversions: campaign.broad_order,
                ctr: campaign.ctr || 0,
                cpc: campaign.cpm,
                startDate: '',
                endDate: '',
                adSets: [],
              })) : []}
              loading={loading || summaryLoading}
              error={error}
              summaryData={selectedAccountIds.length > 0 ? summaryData : undefined}
              totalCampaigns={selectedAccountIds.length > 0 ? filteredCampaigns.length : 0}
            />
          </div>

          {/* Filters and Search - MOVED BELOW SUMMARY, NO CARD CONTAINER */}
          <div className="mt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search ads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ongoing">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  maxDate={new Date()}
                />
                <Button
                  onClick={handleApplyFilter}
                  disabled={loading || refreshing}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Apply Filter
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing || loading || selectedAccountIds.length === 0}
                title="Refresh data"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Campaign List */}
          {!loading && !error && (
            <Card className="!p-0">
              {selectedAccountIds.length === 0 ? (
                <div className="text-center py-8 px-6 text-gray-600">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Pilih Toko Terlebih Dahulu</p>
                  <p className="text-sm">Gunakan tabel toko di atas untuk memilih toko yang ingin dilihat iklannya</p>
                </div>
              ) : isAllSelectedExpired ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-4 bg-destructive/10 rounded-full">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">Sesi Toko Berakhir</h3>
                    <p className="text-gray-600 max-w-md">
                      Data real-time tidak tersedia untuk toko yang dipilih karena sesi login Shopee telah berakhir.
                    </p>
                  </div>
                  <Button variant="destructive" className="font-bold" asChild>
                    <a href="/accounts">Perbarui Cookies Sekarang</a>
                  </Button>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-8 px-6 text-gray-600">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Tidak ada iklan ditemukan</p>
                  <p className="text-sm">Coba sesuaikan filter atau rentang tanggal</p>
                </div>
              ) : (
                <>
                  {expiredAccountIds.length > 0 && (
                    <div className="bg-destructive/10 border-b border-destructive/20 p-3 flex items-center justify-center gap-2 text-destructive text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      <span>{expiredAccountIds.length} Toko yang dipilih memiliki sesi berakhir. Data dari toko tersebut mungkin tidak lengkap atau sudah usang.</span>
                      <a href="/accounts" className="underline hover:opacity-80 ml-2">Perbarui Cookies</a>
                    </div>
                  )}
                  <div className="relative">
                    <div
                      className="overflow-x-auto overflow-y-auto"
                      style={{
                        maxHeight: 'calc(100vh - 300px)',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#cbd5e0 #f7fafc'
                      }}
                    >
                      <table className="w-full min-w-[1200px]">
                        <thead className="sticky top-0 z-30">
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-medium text-sm sticky left-0 z-30 bg-gray-50" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.1)', minWidth: '260px' }}>
                              <div className="flex items-center justify-between">
                                <span>IKLAN</span>
                                <button onClick={() => handleSort('title')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('title')}
                                </button>
                              </div>
                            </th>
                            <th className="text-center py-3 px-4 font-medium text-sm">Performance</th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>BUDGET</span>
                                <button onClick={() => handleSort('budget')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('budget')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>SPEND</span>
                                <button onClick={() => handleSort('spend')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('spend')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>IMPRESSIONS</span>
                                <button onClick={() => handleSort('impressions')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('impressions')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>KLIK</span>
                                <button onClick={() => handleSort('clicks')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('clicks')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>CTR</span>
                                <button onClick={() => handleSort('ctr')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('ctr')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>VIEW</span>
                                <button onClick={() => handleSort('view')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('view')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>PESANAN</span>
                                <button onClick={() => handleSort('orders')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('orders')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm" style={{ minWidth: '120px' }}>
                              <div className="flex items-center justify-end">
                                <span>CONV. RATE</span>
                                <button onClick={() => handleSort('conversion_rate')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('conversion_rate')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>CPS</span>
                                <button onClick={() => handleSort('cps')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('cps')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>CPM</span>
                                <button onClick={() => handleSort('cpm')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('cpm')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>SALES</span>
                                <button onClick={() => handleSort('sales')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('sales')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>ROAS</span>
                                <button onClick={() => handleSort('roas')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('roas')}
                                </button>
                              </div>
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-sm">
                              <div className="flex items-center justify-end">
                                <span>ACOS</span>
                                <button onClick={() => handleSort('acos')} className="ml-2 hover:opacity-70">
                                  {getSortIcon('acos')}
                                </button>
                              </div>
                            </th>
                            <th className="text-center py-3 px-4 font-medium text-sm sticky right-0 z-30 bg-gray-50" style={{ boxShadow: '-2px 0 4px rgba(0,0,0,0.1)' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCampaigns.map((campaign) => {
                            // Check if this is a group campaign
                            const isGroupCampaign = campaign.isGroupCampaign || false
                            const groupImages = campaign.groupImages || []
                            const totalItems = campaign.totalItems || 0

                            // Build image URL for regular campaigns
                            const imageUrl = campaign.image
                              ? `https://down-id.img.susercontent.com/${campaign.image}`
                              : null

                            // Build image URLs for group campaigns
                            const groupImageUrls = groupImages.slice(0, 3).map(imgId =>
                              `https://down-id.img.susercontent.com/${imgId}`
                            )

                            const cacheKey = `${campaign.id}-${campaign.account_username}`
                            const isExpanded = expandedGroupCampaigns.has(cacheKey)
                            const products = groupProducts[cacheKey] || []
                            const productsLoading = groupProductsLoading[cacheKey] || false
                            const productsError = groupProductsError[cacheKey]

                            return (
                              <>
                                <tr
                                  key={campaign.id}
                                  className={`border-b hover:bg-gray-50 ${isGroupCampaign ? 'cursor-pointer' : ''}`}
                                  onClick={() => isGroupCampaign && handleToggleGroupCampaign(campaign.id, campaign.account_username, isGroupCampaign)}
                                >
                                  <td className="py-3 px-4 sticky left-0 z-10 bg-white" style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.1)', minWidth: '260px' }}>
                                    <div className="flex items-center gap-3">
                                      {/* Expand/Collapse Icon for Group Campaigns */}
                                      {isGroupCampaign && (
                                        <div className="flex-shrink-0">
                                          {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                          )}
                                        </div>
                                      )}
                                      {/* Status Icon */}
                                      <div className="flex-shrink-0">
                                        {getStatusIcon(campaign.state)}
                                      </div>
                                      {/* Thumbnail Image - Grid for group campaigns, single for regular */}
                                      <div className="flex-shrink-0">
                                        {isGroupCampaign ? (
                                          <div className="w-12 h-12 grid grid-cols-2 gap-0.5 rounded overflow-hidden">
                                            {groupImageUrls.length > 0 ? (
                                              <>
                                                {/* Top left */}
                                                <img
                                                  src={groupImageUrls[0]}
                                                  alt={`${campaign.title || 'Campaign'} image 1`}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    e.currentTarget.style.display = 'none'
                                                  }}
                                                />
                                                {/* Top right */}
                                                {groupImageUrls[1] ? (
                                                  <img
                                                    src={groupImageUrls[1]}
                                                    alt={`${campaign.title || 'Campaign'} image 2`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                      e.currentTarget.style.display = 'none'
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-full h-full bg-gray-200"></div>
                                                )}
                                                {/* Bottom left */}
                                                {groupImageUrls[2] ? (
                                                  <img
                                                    src={groupImageUrls[2]}
                                                    alt={`${campaign.title || 'Campaign'} image 3`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                      e.currentTarget.style.display = 'none'
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-full h-full bg-gray-200"></div>
                                                )}
                                                {/* Bottom right - Total count info */}
                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] font-semibold text-gray-600">
                                                  {totalItems > 3 ? `+${totalItems - 3}` : totalItems}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs col-span-2 row-span-2">
                                                No img
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          imageUrl ? (
                                            <img
                                              src={imageUrl}
                                              alt={campaign.title || 'Campaign image'}
                                              className="w-12 h-12 object-cover rounded"
                                              onError={(e) => {
                                                // Hide image on error
                                                e.currentTarget.style.display = 'none'
                                              }}
                                            />
                                          ) : (
                                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                              No img
                                            </div>
                                          )
                                        )}
                                      </div>
                                      {/* Campaign Name and ID */}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm line-clamp-1" title={campaign.title}>{campaign.title || 'N/A'}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{campaign.id || 'N/A'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          {(() => {
                                            const subtype = campaign.subtype
                                            if (subtype === 'product_homepage__roi_two__simple') {
                                              return 'Auto'
                                            } else if (subtype === 'product_homepage__roi_two__target') {
                                              return 'GMV Max'
                                            } else {
                                              return '-'
                                            }
                                          })()}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                          {(() => {
                                            if (campaign.start_time) {
                                              // Convert timestamp to date (start_time is in seconds)
                                              const date = new Date(campaign.start_time * 1000)
                                              const day = String(date.getDate()).padStart(2, '0')
                                              const month = String(date.getMonth() + 1).padStart(2, '0')
                                              const year = date.getFullYear()
                                              return `${day}/${month}/${year}`
                                            }
                                            return '-'
                                          })()}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {getBCGIcon(calculateBCGCategory(campaign, filteredCampaigns))}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                    <EditableBudget
                                      campaign={campaign}
                                      onBudgetChange={performCampaignAction}
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {Math.round(campaign.cost / 100000).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {campaign.impression.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {(campaign.click || 0).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {((campaign.ctr || 0) > 0 ? (campaign.ctr || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0')}%
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {campaign.view.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {campaign.broad_order.toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm" style={{ minWidth: '120px', whiteSpace: 'nowrap' }}>
                                    {campaign.conversion_rate.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {Math.round(campaign.cpc / 100000).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {Math.round(campaign.cpm / 100000).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {Math.round(campaign.broad_gmv / 100000).toLocaleString('id-ID')}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {campaign.roas.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                  </td>
                                  <td className="py-3 px-4 text-right text-sm">
                                    {(() => {
                                      const campaignSpend = campaign.cost / 100000
                                      const campaignSales = campaign.broad_gmv / 100000
                                      const campaignACOS = campaignSales > 0 ? (campaignSpend / campaignSales) * 100 : 0
                                      return campaignACOS.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                                    })()}%
                                  </td>
                                  <td className="py-3 px-4 text-center sticky right-0 z-10 bg-white" style={{ boxShadow: '-2px 0 4px rgba(0,0,0,0.1)' }}>
                                    <div className="flex items-center justify-center gap-1">
                                      {campaign.state === 'ongoing' && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-warning"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              performCampaignAction('pause', campaign.id, campaign.account_username)
                                            }}
                                            disabled={actionLoading[`pause-${campaign.id}`]}
                                            title="Jeda Iklan"
                                          >
                                            {actionLoading[`pause-${campaign.id}`] ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Pause className="w-4 h-4" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              performCampaignAction('stop', campaign.id, campaign.account_username)
                                            }}
                                            disabled={actionLoading[`stop-${campaign.id}`]}
                                            title="Hentikan Iklan"
                                          >
                                            {actionLoading[`stop-${campaign.id}`] ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Square className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </>
                                      )}
                                      {campaign.state === 'paused' && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-success"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              performCampaignAction('resume', campaign.id, campaign.account_username)
                                            }}
                                            disabled={actionLoading[`resume-${campaign.id}`]}
                                            title="Lanjutkan Iklan"
                                          >
                                            {actionLoading[`resume-${campaign.id}`] ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Play className="w-4 h-4" />
                                            )}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              performCampaignAction('stop', campaign.id, campaign.account_username)
                                            }}
                                            disabled={actionLoading[`stop-${campaign.id}`]}
                                            title="Hentikan Iklan"
                                          >
                                            {actionLoading[`stop-${campaign.id}`] ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <Square className="w-4 h-4" />
                                            )}
                                          </Button>
                                        </>
                                      )}
                                      {campaign.state === 'ended' && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          disabled
                                          title="No Actions Available"
                                        >
                                          <Ban className="w-4 h-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-info"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleOpenOperationLog(campaign.id, campaign.account_username)
                                        }}
                                        title="Lihat Detail Riwayat"
                                      >
                                        <Info className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                                {/* Expanded row for group campaign products */}
                                {isGroupCampaign && isExpanded && (
                                  <tr>
                                    <td colSpan={15} className="px-0 py-0 bg-gray-50">
                                      <div className="px-6 py-4">
                                        {productsLoading ? (
                                          <div className="flex items-center justify-center py-8">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                                            <span className="text-sm text-gray-600">Memuat data produk...</span>
                                          </div>
                                        ) : productsError ? (
                                          <div className="flex items-center justify-center py-8 text-destructive">
                                            <AlertCircle className="w-5 h-5 mr-2" />
                                            <span className="text-sm">{productsError}</span>
                                          </div>
                                        ) : products.length === 0 ? (
                                          <div className="text-center py-8 text-gray-500 text-sm">
                                            Tidak ada data produk
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <h5 className="font-semibold text-sm mb-3">Produk dalam Campaign ({products.length})</h5>
                                            <div className="overflow-x-auto">
                                              <table className="w-full text-sm">
                                                <thead className="bg-gray-100">
                                                  <tr>
                                                    <th className="text-left py-2 px-3 font-medium text-xs">PRODUK</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">SPEND</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">IMPRESSIONS</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">KLIK</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">CTR</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">VIEW</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">PESANAN</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">CONV. RATE</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">CPS</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">CPM</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">SALES</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">ROAS</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">ACOS</th>
                                                    <th className="text-right py-2 px-3 font-medium text-xs">AVG RANK</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                  {products.map((product: any) => {
                                                    const productImageUrl = product.image
                                                      ? `https://down-id.img.susercontent.com/${product.image}`
                                                      : null
                                                    const productSpend = product.cost / 100000
                                                    const productSales = product.broad_gmv / 100000

                                                    return (
                                                      <tr key={product.item_id} className="hover:bg-gray-50">
                                                        <td className="py-2 px-3">
                                                          <div className="flex items-center gap-2">
                                                            {productImageUrl ? (
                                                              <img
                                                                src={productImageUrl}
                                                                alt={product.name}
                                                                className="w-10 h-10 object-cover rounded"
                                                                onError={(e) => {
                                                                  e.currentTarget.style.display = 'none'
                                                                }}
                                                              />
                                                            ) : (
                                                              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                                                                No img
                                                              </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                              <p className="font-medium text-xs line-clamp-1" title={product.name}>
                                                                {product.name || 'N/A'}
                                                              </p>
                                                              <p className="text-xs text-gray-500 mt-0.5">ID: {product.item_id}</p>
                                                            </div>
                                                          </div>
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {Math.round(productSpend).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.impression.toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.click.toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.ctr.toFixed(2)}%
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.view.toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.broad_order.toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.conversion_rate.toFixed(1)}%
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {Math.round(product.cpc / 100000).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {Math.round(product.cpm / 100000).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {Math.round(productSales).toLocaleString('id-ID')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.roas.toFixed(1)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.acos ? product.acos.toFixed(2) : '0.00'}%
                                                        </td>
                                                        <td className="py-2 px-3 text-right text-xs">
                                                          {product.avg_rank || '-'}
                                                        </td>
                                                      </tr>
                                                    )
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalRecords > 0 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">
                          Menampilkan {startIndex + 1} sampai {Math.min(endIndex, totalRecords)} dari {totalRecords} campaign
                        </span>
                        <select
                          value={itemsPerPage}
                          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                          className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value={5}>5 per halaman</option>
                          <option value={10}>10 per halaman</option>
                          <option value={20}>20 per halaman</option>
                          <option value={50}>50 per halaman</option>
                        </select>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1"
                          >
                            Previous
                          </Button>

                          {/* Page Numbers */}
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNumber;
                            if (totalPages <= 5) {
                              pageNumber = i + 1;
                            } else if (currentPage <= 3) {
                              pageNumber = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNumber = totalPages - 4 + i;
                            } else {
                              pageNumber = currentPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNumber}
                                variant={currentPage === pageNumber ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNumber)}
                                className="px-3 py-1"
                              >
                                {pageNumber}
                              </Button>
                            );
                          })}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Create Campaign Modal */}
          <Dialog open={showCreateModal} onOpenChange={handleCloseCreateModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Buat Iklan Baru</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="space-y-4">
                  {/* Account Username */}
                  <div>
                    <Label htmlFor="account-username">Account Username (Connected Only)</Label>
                    <Select value={createFormData.account_username} onValueChange={(value) => handleCreateFormChange('account_username', value)}>
                      <SelectTrigger id="account-username">
                        <SelectValue placeholder="Select Connected Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedAccounts.map((account) => (
                          <SelectItem key={account.username} value={account.username}>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4 text-muted-foreground" />
                              <span>{account.nama_toko || account.username} {account.nama_tim ? `(${account.nama_tim})` : ''}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hanya menampilkan toko dengan status cookies "Connected"
                    </p>
                  </div>

                  {/* Pilih Mode - HIDDEN, default to manual */}
                  {/* <div>
                <Label htmlFor="mode">Pilih Mode</Label>
                <Select 
                  value={createFormData.mode} 
                  onValueChange={(value) => {
                    // Prevent switching to automatic if has automatic campaign
                    if (value === 'automatic' && hasAutomaticCampaign) {
                      toast.warning('Mode Otomatis tidak tersedia', {
                        description: 'Toko ini sudah memiliki iklan "iklan produk otomatis" yang aktif.'
                      })
                      return
                    }
                    handleCreateFormChange('mode', value)
                  }}
                >
                  <SelectTrigger id="mode" className={hasAutomaticCampaign ? 'opacity-50 cursor-not-allowed' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="automatic" disabled={hasAutomaticCampaign}>Otomatis</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              {hasAutomaticCampaign && (
                <p className="text-xs text-muted-foreground mt-1 text-destructive">
                  Mode Otomatis tidak tersedia karena toko ini sudah memiliki iklan "iklan produk otomatis" yang aktif
                </p>
              )}
            </div> */}

                  {/* Tambah Produk (hanya untuk manual) */}
                  {createFormData.mode === 'manual' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Pilih Produk</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenProductModal}
                          className="border-orange-500 text-orange-500 hover:bg-orange-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Tambah Produk
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-orange-500">{createFormData.selected_products.length}</span> produk dipilih <span className="text-green-600 font-medium">(Unlimited)</span>
                      </p>
                    </div>
                  )}

                  {/* Pilih Strategi */}
                  <div>
                    <Label htmlFor="strategi">Pilih Strategi</Label>
                    <Select
                      value={createFormData.strategi}
                      onValueChange={(value) => handleCreateFormChange('strategi', value)}
                      disabled={createFormData.selected_products.length > 1}
                    >
                      <SelectTrigger id="strategi" disabled={createFormData.selected_products.length > 1}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="max_gmv"
                          disabled={createFormData.selected_products.length > 1}
                        >
                          GMV Max Auto
                        </SelectItem>
                        <SelectItem value="max_gmv_roi_two">GMV Max ROAS</SelectItem>
                      </SelectContent>
                    </Select>
                    {createFormData.selected_products.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        GMV Max Auto tidak tersedia untuk lebih dari 1 produk. Hanya GMV Max ROAS yang dapat digunakan.
                      </p>
                    )}
                  </div>

                  {/* Target ROAS (hanya untuk GMV Max ROAS) */}
                  {createFormData.strategi === 'max_gmv_roi_two' && (
                    <div>
                      <Label htmlFor="roas">Target ROAS <span className="text-destructive">*</span></Label>
                      <Input
                        id="roas"
                        type="number"
                        value={createFormData.roas}
                        onChange={(e) => handleCreateFormChange('roas', e.target.value)}
                        placeholder="Enter target ROAS"
                        min="0"
                        step="0.1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        ROAS diperlukan untuk objective GMV MAX
                      </p>
                    </div>
                  )}

                  {/* Akselerasi Performa (hanya untuk Mode Manual + GMV Max ROAS) */}
                  {createFormData.mode === 'manual' && createFormData.strategi === 'max_gmv_roi_two' && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rapid_boost">Akselerasi Performa</Label>
                      <Switch
                        id="rapid_boost"
                        checked={createFormData.rapid_boost}
                        onCheckedChange={(checked) => handleCreateFormChange('rapid_boost', checked)}
                      />
                    </div>
                  )}

                  {/* Daily Budget - Moved below Akselerasi Performa */}
                  <div>
                    <Label htmlFor="daily-budget">Daily Budget (Rp)</Label>
                    <Input
                      id="daily-budget"
                      type="number"
                      value={createFormData.daily_budget}
                      onChange={(e) => handleCreateFormChange('daily_budget', e.target.value)}
                      placeholder={createFormData.mode === 'automatic' ? "0 (tak terbatas) atau minimal 50000" : "0 (tak terbatas) atau minimal 25000"}
                      min="0"
                      step="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {createFormData.mode === 'automatic'
                        ? 'Budget: 0 (tak terbatas) atau minimal Rp50.000'
                        : 'Budget: 0 (tak terbatas) atau minimal Rp25.000'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-4 flex-shrink-0">
                <Button variant="tertiary" onClick={handleCloseCreateModal}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaignSubmit}>
                  Buat Iklan
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Product Selection Modal */}
          <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
            <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
                <DialogTitle>Pilih Produk</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
                {/* Search Bar */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Cari produk..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleProductSearch()
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleProductSearch} disabled={productsLoading}>
                    <Search className="w-4 h-4 mr-2" />
                    Cari
                  </Button>
                </div>

                {/* Products Table */}
                {productsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2">Memuat produk...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    Tidak ada produk ditemukan
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedProducts.size === products.length && products.length > 0}
                              onCheckedChange={handleSelectAllProducts}
                              className="border-orange-500 data-[state=checked]:bg-orange-500"
                            />
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              Produk
                              <button
                                onClick={() => {
                                  setProductSortColumn('name')
                                  setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                }}
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              Penjualan Sebulan
                              <button
                                onClick={() => {
                                  setProductSortColumn('monthly_sales')
                                  setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                }}
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              Harga
                              <button
                                onClick={() => {
                                  setProductSortColumn('price')
                                  setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                }}
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              Stok
                              <button
                                onClick={() => {
                                  setProductSortColumn('stock')
                                  setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                }}
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </div>
                          </TableHead>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              Tanggal Ditambahkan
                              <button
                                onClick={() => {
                                  setProductSortColumn('date_added')
                                  setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                                }}
                              >
                                <ArrowUpDown className="w-4 h-4" />
                              </button>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products
                          .sort((a, b) => {
                            if (!productSortColumn) return 0
                            const aVal = a[productSortColumn] || 0
                            const bVal = b[productSortColumn] || 0
                            if (productSortDirection === 'asc') {
                              return aVal > bVal ? 1 : -1
                            } else {
                              return aVal < bVal ? 1 : -1
                            }
                          })
                          .map((product) => (
                            <TableRow key={product.product_id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedProducts.has(product.product_id)}
                                  onCheckedChange={() => handleProductToggle(product.product_id)}
                                  className="border-orange-500 data-[state=checked]:bg-orange-500"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {product.image && (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-12 h-12 object-cover rounded"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm mb-1" title={product.name}>
                                      {product.name && product.name.length > 50
                                        ? `${product.name.substring(0, 50)}...`
                                        : product.name}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-0.5">
                                      No.: {product.product_id}
                                    </div>
                                    <div className="text-xs text-gray-600 mb-1">
                                      Penilaian: {product.rating || 0}
                                    </div>
                                    {product.has_ongoing_promotion && (
                                      <button
                                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                        onClick={() => {
                                          // TODO: Navigate to campaign details or show tooltip
                                          toast.info('Produk ini sedang di iklan', {
                                            description: `Produk ${product.name} memiliki iklan yang sedang berjalan`
                                          })
                                        }}
                                      >
                                        Produk dengan iklan <span className="text-blue-600">{'>'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{product.monthly_sales?.toLocaleString() || 0}</TableCell>
                              <TableCell>Rp{product.price?.toLocaleString() || 0}</TableCell>
                              <TableCell>{product.stock?.toLocaleString() || 0}</TableCell>
                              <TableCell>
                                {product.date_added || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Load More Button */}
                {productPagination.has_more && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fetchProducts(productPagination.last_token)}
                      disabled={productsLoading}
                    >
                      {productsLoading ? 'Memuat...' : 'Muat Lebih Banyak'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Footer Actions - Sticky */}
              <div className="flex items-center justify-between pt-4 pb-6 px-6 border-t bg-white flex-shrink-0">
                <div className="text-sm text-gray-700">
                  <span className="text-orange-500 font-semibold">{selectedProductsCount}</span> Produk dipilih <span className="text-green-600 font-medium">(Unlimited)</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowProductModal(false)}>
                    Batal
                  </Button>
                  <Button
                    onClick={handleConfirmProducts}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Konfirmasi
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Operation Log Modal */}
          <Dialog open={operationLogModalOpen} onOpenChange={setOperationLogModalOpen}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Riwayat Pengaturan Iklan</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Table */}
                {operationLogLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-gray-600">Memuat data...</span>
                  </div>
                ) : operationLogError ? (
                  <div className="flex items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>{operationLogError}</span>
                  </div>
                ) : operationLogs.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-gray-500">
                    <span>Tidak ada data riwayat</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Diperbarui Pada (GMT+7)</TableHead>
                          <TableHead>Operator</TableHead>
                          <TableHead>Perangkat</TableHead>
                          <TableHead>Aktivitas</TableHead>
                          <TableHead>Rincian Perubahan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {operationLogs.map((log, index) => {
                          const updateDate = new Date(log.update_time * 1000)
                          const formattedDate = updateDate.toLocaleString('id-ID', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: 'Asia/Jakarta'
                          })

                          // Map event_type to readable activity name
                          const activityMap: { [key: string]: string } = {
                            'rapid_boost_toggle_change': 'Akselerasi Performa',
                            'change_budget': 'Perubahan Modal',
                            'target_roas_change': 'Perubahan Target ROAS',
                            'pause': 'Jeda Iklan',
                            'resume': 'Lanjutkan Iklan',
                            'stop': 'Hentikan Iklan'
                          }

                          const activityName = activityMap[log.event_type] || log.event_type

                          // Map device to readable name
                          const deviceMap: { [key: string]: string } = {
                            'pc': 'PC',
                            'app': 'Aplikasi',
                            'other': 'Lainnya'
                          }

                          const deviceName = deviceMap[log.device] || log.device

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-xs">{formattedDate}</TableCell>
                              <TableCell>{log.operator?.name || 'N/A'}</TableCell>
                              <TableCell>{deviceName}</TableCell>
                              <TableCell>{activityName}</TableCell>
                              <TableCell>
                                {log.pretty_detail_list && log.pretty_detail_list.length > 0 ? (
                                  <div className="space-y-1">
                                    {log.pretty_detail_list.map((detail: string, idx: number) => (
                                      <div key={idx} className="text-sm">{detail}</div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
