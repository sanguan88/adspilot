"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Calendar, RefreshCw, Edit, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Users, MousePointer, ShoppingCart, Package, Target, DollarSign, Wallet, CreditCard, Percent } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { authenticatedFetch } from '@/lib/api-client'

interface Account {
  id: string
  username: string
  email: string | null
  cookies: string
  id_affiliate: string
  kode_tim: string
  kode_site: string
  pic_akun: string
  nama_tim: string
  nama_site: string
  created_at: string
  updated_at: string
  performa_data: {
    total_gmv: number
    total_komisi: number
    total_biaya_iklan: number
    nett_komisi: number
    rasio_iklan: number
    target_roas_low: number
    target_roas_high: number
    roas: number
    profitable: number
    total_sold: number
    total_clicks: number
    total_orders: number
    impression: number
    view: number
    // New additional columns
    persentasi: number
    avg_gmv: number
    avg_komisi: number
  }
  cookie_status: string
  data_source?: string // 'database', 'api', 'default', 'api_refresh'
  last_affiliate_sync?: string | null
}

interface SummaryData {
  total_gmv: number
  total_komisi: number
  total_biaya_iklan: number
  nett_komisi: number
  total_sold: number
  total_clicks: number
  total_orders: number
  total_accounts: number
  avg_roas: number
  profitable_percentage: number
  rasio_iklan_avg: number
}

interface FilterOptions {
  tim_options: string[]
  pic_options: string[]
}

// Fungsi untuk mengambil data dari API
async function fetchAccountsData(params: {
  search?: string
  filter_tim?: string
  filter_pic?: string
  filter_cookies?: string
  start_date?: string
  end_date?: string
  page?: number
  limit?: number
}) {
  const searchParams = new URLSearchParams()
  
  if (params.search) searchParams.append('search', params.search)
  if (params.filter_tim) searchParams.append('filter_tim', params.filter_tim)
  if (params.filter_pic) searchParams.append('filter_pic', params.filter_pic)
  if (params.filter_cookies) searchParams.append('filter_cookies', params.filter_cookies)
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
  const [accounts, setAccounts] = useState<Account[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ tim_options: [], pic_options: [] })
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
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTim, setSelectedTim] = useState("all")
  const [selectedPic, setSelectedPic] = useState("all")
  // Default filter cookies menjadi 'connected' untuk loading lebih cepat
  const [selectedCookies, setSelectedCookies] = useState("connected")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
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
  
  // Individual refresh states
  const [refreshingAccounts, setRefreshingAccounts] = useState<Set<string>>(new Set())

  // Refresh individual account
  const refreshAccount = async (account: Account) => {
    try {
      setRefreshingAccounts(prev => new Set(prev).add(account.id_affiliate))
      
      const response = await authenticatedFetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refresh_account',
          affiliate_id: account.id_affiliate,
          start_date: startDate,
          end_date: endDate
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
        // Update account data in the list
        setAccounts(prev => prev.map(acc => 
          acc.id_affiliate === account.id_affiliate 
            ? { ...data.data, data_source: 'api_refresh', last_affiliate_sync: new Date().toISOString() }
            : acc
        ))
        
        // Show success message
        console.log(`✅ Successfully refreshed data for ${account.username}`)
        alert(`Data untuk akun ${account.username} berhasil di-refresh!`)
      } else {
        console.error('Error refreshing account:', data.error)
        // Show error notification
        const errorMessage = data.message || data.error || 'Gagal me-refresh data akun'
        alert(`❌ ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error refreshing account:', error)
    } finally {
      setRefreshingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.id_affiliate)
        return newSet
      })
    }
  }

  // Load data dari API
  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await fetchAccountsData({
        search: searchQuery || undefined,
        filter_tim: selectedTim !== "all" ? selectedTim : undefined,
        filter_pic: selectedPic !== "all" ? selectedPic : undefined,
        filter_cookies: selectedCookies !== "all" ? selectedCookies : undefined,
        start_date: startDate,
        end_date: endDate,
        page: currentPage,
        limit: itemsPerPage
      })
      
      setAccounts(data.accounts)
      setSummary(data.summary)
      setFilterOptions(data.filter_options)
      setPagination(data.pagination || {
        current_page: 1,
        total_pages: 1,
        total_records: 0,
        records_per_page: 10,
        has_next_page: false,
        has_prev_page: false
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data')
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Helper function untuk menghitung start_date dinamis
  const getDynamicStartDate = (): string => {
    const today = new Date()
    const todayDay = today.getDate()
    
    let startDate: Date
    
    if (todayDay === 1) {
      // Jika hari ini tanggal 1, maka start_date = tanggal 1 bulan kemarin
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      startDate = lastMonth
    } else {
      // Jika hari ini bukan tanggal 1, maka start_date = tanggal 1 bulan ini
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
    }
    
    const year = startDate.getFullYear()
    const month = String(startDate.getMonth() + 1).padStart(2, '0')
    const day = String(startDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk menghitung end_date (kemarin)
  const getDynamicEndDate = (): string => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const year = yesterday.getFullYear()
    const month = String(yesterday.getMonth() + 1).padStart(2, '0')
    const day = String(yesterday.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  // Helper function untuk validasi dan normalisasi tanggal
  const normalizeDates = (start: string, end: string): { start: string, end: string } => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // Jika end_date kurang dari start_date, set keduanya ke tanggal yang sama (1 hari)
    if (endDate < startDate) {
      const singleDate = endDate
      const year = singleDate.getFullYear()
      const month = String(singleDate.getMonth() + 1).padStart(2, '0')
      const day = String(singleDate.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      return { start: dateStr, end: dateStr }
    }
    
    return { start, end }
  }

  // Initialize dates and mounted state after component mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    
    const startDateStr = getDynamicStartDate()
    const endDateStr = getDynamicEndDate()
    
    // Normalisasi tanggal untuk memastikan end_date >= start_date
    const normalized = normalizeDates(startDateStr, endDateStr)
    
    setStartDate(normalized.start)
    setEndDate(normalized.end)
  }, [])

  // Load data saat component mount dan saat filter berubah
  useEffect(() => {
    if (startDate && endDate) {
      loadData()
      // Reset ke halaman 1 saat filter berubah
      setCurrentPage(1)
    }
  }, [searchQuery, selectedTim, selectedPic, selectedCookies, startDate, endDate])

  // Load data saat pagination berubah
  useEffect(() => {
    if (startDate && endDate && mounted) {
      loadData()
    }
  }, [currentPage, itemsPerPage])

  // Gunakan pagination dari API, bukan frontend slicing
  const totalPages = pagination.total_pages
  const currentAccounts = accounts // Data sudah dipaginate di backend

  const toggleRowExpansion = (accountId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
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
      return `Rp ${(amount / 1000000000000).toFixed(1)}T`
    } else if (amount >= 1000000000) {
      return `Rp ${(amount / 1000000000).toFixed(1)}M`
    } else if (amount >= 1000000) {
      return `Rp ${(amount / 1000000).toFixed(1)}jt`
    } else if (amount >= 1000) {
      return `Rp ${(amount / 1000).toFixed(1)}k`
    } else {
      return `Rp ${amount.toLocaleString()}`
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

  const getCookieStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-success/10 text-success border-success/20">Connected</Badge>
      case 'disconnected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Disconnected</Badge>
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/20">No Cookies</Badge>
    }
  }

  const handleRefreshAccount = async (account: Account) => {
    try {
      await loadData()
      alert(`Data untuk akun ${account.username} berhasil di-refresh!`)
    } catch (err) {
      alert('Gagal me-refresh data akun')
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setNewCookies("")
    setEditModalOpen(true)
  }

  const handleSaveCookies = async () => {
    if (!editingAccount || !newCookies.trim()) {
      alert('Cookies tidak boleh kosong!')
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
          affiliate_id: editingAccount.id_affiliate,
          cookies: newCookies.trim(),
          start_date: startDate,
          end_date: endDate
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
        if (data.data_refreshed) {
          alert('Cookies berhasil diupdate dan data telah diperbarui dari API!')
        } else {
          alert('Cookies berhasil diupdate!')
        }
        setEditModalOpen(false)
        setEditingAccount(null)
        setNewCookies("")
        await loadData() // Reload data
      } else {
        alert('Error: ' + (data.message || data.error || 'Gagal mengupdate cookies'))
      }
    } catch (err) {
      alert('Gagal mengupdate cookies')
    } finally {
      setSaving(false)
    }
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">Account Management</h1>
            <div className="text-gray-500">Loading...</div>
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
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Account Management</h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Manage your Shopee affiliate accounts and monitor performance
            </p>
          </div>
        </div>

        <div className="space-y-6 max-w-full">
          {/* KPI Overview */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading data...</div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500">Error: {error}</div>
              <Button onClick={loadData} className="mt-2">Retry</Button>
            </div>
          ) : summary ? (
            <div className="flex flex-col gap-4 pt-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                {/* Total GMV */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <TrendingUp className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Total GMV (Rp)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.total_gmv)}</p>
                  </div>
                </div>
                
                {/* Total Commission */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <DollarSign className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Total Commission (Rp)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.total_komisi)}</p>
                  </div>
                </div>
                
                {/* Total Biaya Iklan */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <CreditCard className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Total Biaya Iklan (Rp)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.total_biaya_iklan)}</p>
                  </div>
                </div>
                
                {/* Rasio Iklan */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <Percent className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Rasio Iklan</p>
                    <p className="text-3xl font-bold text-gray-900">{Number(summary.rasio_iklan_avg || 0).toFixed(1)}%</p>
                  </div>
                </div>
                
                {/* Nett Commission */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <Wallet className="w-5 h-5 text-primary absolute top-4 right-4" />
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-primary text-xs font-medium">Nett Commission (Rp)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary.nett_komisi)}</p>
                  </div>
                </div>
              </div>

              {/* Secondary Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {/* Total Accounts */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Accounts</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{summary.total_accounts || 0}</p>
                  </div>
                </div>
                
                {/* Avg ROAS */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Avg ROAS</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{Number(summary.avg_roas || 0).toFixed(1)}</p>
                  </div>
                </div>
                
                {/* Profitable */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Profitable</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{Number(summary.profitable_percentage || 0).toFixed(0)}%</p>
                  </div>
                </div>
                
                {/* Total Clicks */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <MousePointer className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Clicks</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{(summary.total_clicks || 0).toLocaleString()}</p>
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
                
                {/* Total Sold */}
                <div className="bg-white border rounded-sm p-6 w-full shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <p className="text-primary text-xs font-medium">Total Sold</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{(summary.total_sold || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Filter and Table Container */}
          <Card className="!p-0">
            {/* Search and Filter */}
            <div className="flex items-center gap-4 p-6 pb-0">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search accounts by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                    />
                  </div>
              <Select value={selectedTim} onValueChange={setSelectedTim}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="-- Semua Tim --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- Semua Tim --</SelectItem>
                  {filterOptions?.tim_options?.filter(tim => tim && tim.trim() !== '').map((tim) => (
                    <SelectItem key={tim} value={tim}>{tim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPic} onValueChange={setSelectedPic}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="-- Semua PIC --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- Semua PIC --</SelectItem>
                  {filterOptions?.pic_options?.filter(pic => pic && pic.trim() !== '').map((pic) => (
                    <SelectItem key={pic} value={pic}>{pic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCookies} onValueChange={setSelectedCookies}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="-- Semua Status --" />
                    </SelectTrigger>
                    <SelectContent>
                  <SelectItem value="all">-- Semua Status --</SelectItem>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="disconnected">Disconnected</SelectItem>
                  <SelectItem value="no_cookies">No Cookies</SelectItem>
                    </SelectContent>
                  </Select>
            </div>

            {/* Table */}
            <div className="px-6 pb-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>USERNAME</TableHead>
                <TableHead>TOTAL GMV</TableHead>
                <TableHead>TOTAL KOMISI</TableHead>
                <TableHead>TOTAL BIAYA IKLAN</TableHead>
                <TableHead>NETT KOMISI</TableHead>
                <TableHead>RASIO IKLAN</TableHead>
                <TableHead>TARGET ROAS</TableHead>
                <TableHead>ROAS</TableHead>
                <TableHead>PROFITABLE</TableHead>
                <TableHead>COOKIE STATUS</TableHead>
                <TableHead>LAST SYNC</TableHead>
                <TableHead>ACTIONS</TableHead>
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
                    <div className="text-red-500">Error: {error}</div>
                    <Button onClick={loadData} className="mt-2">Retry</Button>
                  </TableCell>
                </TableRow>
              ) : currentAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8">
                    <div className="text-gray-500">Tidak ada data akun yang ditemukan</div>
                  </TableCell>
                </TableRow>
              ) : (
                currentAccounts.map((account, index) => (
                  <>
                    <TableRow key={account.id_affiliate || account.username || index}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(account.id_affiliate)}
                          className="h-6 w-6 p-0"
                        >
                          {expandedRows.has(account.id_affiliate) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                      <div>
                          <div className="font-medium flex items-center gap-2">
                            {account.username}
                            {account.data_source && account.data_source !== 'default' && account.data_source !== 'no_data' && account.data_source !== 'error' && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  account.data_source === 'database' 
                                    ? 'bg-primary/10 text-primary border-primary/20' 
                                    : account.data_source === 'api' 
                                    ? 'bg-success/10 text-success border-success/20'
                                    : account.data_source === 'api_refresh'
                                    ? 'bg-warning/10 text-warning border-warning/20'
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {account.data_source === 'database' ? 'DB' : 
                                 account.data_source === 'api' ? 'API' :
                                 account.data_source === 'api_refresh' ? 'NEW' : 'DEF'}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{account.email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(account.performa_data.total_gmv)}</TableCell>
                      <TableCell>{formatCurrency(account.performa_data.total_komisi)}</TableCell>
                      <TableCell>{formatCurrency(account.performa_data.total_biaya_iklan)}</TableCell>
                      <TableCell className="text-success">{formatCurrency(account.performa_data.nett_komisi)}</TableCell>
                      <TableCell>{Number(account.performa_data?.rasio_iklan || 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                            {Number(account.performa_data?.target_roas_low || 0).toFixed(1)}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
                            {Number(account.performa_data?.target_roas_high || 0).toFixed(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{Number(account.performa_data?.roas || 0) > 0 ? Number(account.performa_data?.roas || 0).toFixed(1) : "-"}</TableCell>
                      <TableCell>{Number(account.performa_data?.profitable || 0).toFixed(0)}%</TableCell>
                      <TableCell>
                        {getCookieStatusBadge(account.cookie_status)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatLastSync(account.last_affiliate_sync || account.updated_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => refreshAccount(account)}
                            disabled={refreshingAccounts.has(account.id_affiliate)}
                            title="Refresh data from API"
                          >
                            {refreshingAccounts.has(account.id_affiliate) ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditAccount(account)}
                            >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Detail Row */}
                    {expandedRows.has(account.id_affiliate) && (
                      <TableRow>
                        <TableCell colSpan={13} className="p-0">
                          <div className="bg-gray-50 p-6">
                            <div className="bg-white rounded-lg shadow-sm p-6">
                              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Detail Performance - {account.username}
                                </h4>
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                  Active
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Clicks:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(account.performa_data?.total_clicks || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Orders:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(account.performa_data?.total_orders || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Items Sold:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(account.performa_data?.total_sold || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Avg Commission:</span>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold text-gray-900">
                                        {(() => {
                                          const rasio_komisi = (account.performa_data?.total_gmv || 0) > 0 
                                            ? ((account.performa_data?.total_komisi || 0) / (account.performa_data?.total_gmv || 0)) 
                                            : 0
                                          const aov = (account.performa_data?.total_orders || 0) > 0 
                                            ? ((account.performa_data?.total_gmv || 0) / (account.performa_data?.total_orders || 0)) 
                                            : 0
                                          const avg_commission = rasio_komisi * aov
                                          return formatCurrency(avg_commission)
                                        })()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        ({(() => {
                                          const totalGmv = Number(account.performa_data?.total_gmv || 0)
                                          const totalKomisi = Number(account.performa_data?.total_komisi || 0)
                                          const percentage = totalGmv > 0 ? (totalKomisi / totalGmv) * 100 : 0
                                          return Number(percentage).toFixed(2)
                                        })()}%)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Impressions:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(account.performa_data?.impression || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">View:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(account.performa_data?.view || 0).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">AOV:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {(() => {
                                        const aov = (account.performa_data?.total_orders || 0) > 0 
                                          ? ((account.performa_data?.total_gmv || 0) / (account.performa_data?.total_orders || 0)) 
                                          : 0
                                        return formatCurrency(aov)
                                      })()}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Team:</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                      {account.nama_tim || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                      </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
                <Label htmlFor="editUsername">Username:</Label>
                <Input
                  id="editUsername"
                  value={editingAccount?.username || ''}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="editCookies">Cookies:</Label>
                <Textarea
                  id="editCookies"
                  placeholder="Masukkan cookies baru untuk akun ini..."
                  value={newCookies}
                  onChange={(e) => setNewCookies(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Untuk keamanan, cookies lama tidak ditampilkan. Masukkan cookies baru yang valid.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="tertiary" onClick={() => setEditModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSaveCookies} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
