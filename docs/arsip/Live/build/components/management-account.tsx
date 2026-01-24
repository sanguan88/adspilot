"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { shopeeApiService } from "@/lib/shopee-api"
import { useAuth } from "@/contexts/AuthContext"
import { 
  Search, 
  RefreshCw, 
  Users, 
  Trash2, 
  Edit, 
  Eye, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Settings, 
  MoreVertical,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { SummaryCard } from "@/components/dashboard-helpers"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface ManagementAccountProps {
  onBack: () => void
}

interface AccountData {
  no?: number
  id_affiliate?: string
  nama_akun: string
  username: string
  email?: string
  nama_toko_affiliate?: string
  kode_tim: string
  nama_tim?: string
  team?: string
  kode_site?: string
  nama_site?: string
  pic_akun?: string
  cookies?: string | any[]
  status_akun?: 'aktif' | 'nonaktif'
  last_sync?: string
  last_api_sync?: string
  api_sync_status?: 'pending' | 'success' | 'failed' | 'never'
  no_whatsapp?: string
  team_logo?: string | null
}

interface TeamData {
  kode_tim: string
  nama_tim: string
}

interface SiteData {
  kode_site: string
  nama_site: string
}

export function ManagementAccount({ onBack }: ManagementAccountProps) {
  // Get user from AuthContext to check role
  const { user } = useAuth()
  const isAdminOrSuperAdmin = user?.role && (
    user.role.toLowerCase() === 'admin' || 
    user.role.toLowerCase() === 'superadmin' || 
    user.role.toLowerCase() === 'super_admin'
  )
  const isSuperAdmin = user?.role && (
    user.role.toLowerCase() === 'superadmin' || 
    user.role.toLowerCase() === 'super_admin'
  )

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("all")
  const [siteFilter, setSiteFilter] = useState("all")
  const [cookieFilter, setCookieFilter] = useState("all")
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Fetch accounts from database using API
  const buildAccountsUrl = () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
      search: debouncedSearchTerm,
      status: statusFilter === 'all' ? 'all' : (statusFilter === 'active' ? 'active' : 'inactive'),
      team: teamFilter,
      cookie: cookieFilter
    })
    // Add site parameter only for admin/superadmin
    if (isAdminOrSuperAdmin && siteFilter !== 'all') {
      params.append('site', siteFilter)
    }
    return `/api/accounts?${params.toString()}`
  }

  const { data: accountsResponse, isLoading: loadingAccounts, mutate: mutateAccounts } = useSWR(
    buildAccountsUrl(),
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  // Tidak mengambil stats dari database
  const statsData = null
  const loadingStats = false
  const mutateStats = async () => {}

  // Fetch filter options (no site parameter - server filters by user's site)
  const { data: filtersData, isLoading: loadingFilters } = useSWR(
    `/api/accounts/filters`,
    fetcher
  )

  // Extract accounts from API response
  const localAccounts: AccountData[] = accountsResponse?.data?.accounts || []
  const pagination = accountsResponse?.data?.pagination || {
    page: currentPage,
    limit: itemsPerPage,
    total: 0,
    totalPages: 0
  }
  
  // Track mount state to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Log accounts data for debugging
  useEffect(() => {
    if (accountsResponse?.data) {
      console.log('📋 ManagementAccount: Loaded', localAccounts.length, 'accounts from database')
      console.log('📋 ManagementAccount: Accounts data:', localAccounts.slice(0, 3).map(acc => ({
          username: acc.username,
          kode_tim: acc.kode_tim,
          nama_tim: acc.nama_tim,
          kode_site: acc.kode_site,
          status: acc.status_akun
        })))
    }
  }, [accountsResponse, localAccounts.length])

  // @ts-ignore - SWR returns unknown type
  const statsDataSafe: any = statsData
  // @ts-ignore - SWR returns unknown type
  const filtersDataSafe: any = filtersData

  // Accounts are already filtered and paginated by the API
  // No need for client-side filtering/pagination
  const filteredAccounts = localAccounts
  const paginatedAccounts = localAccounts

  // Debug logging untuk filter
  useEffect(() => {
    console.log('🔍 ManagementAccount: Filter results', {
      totalAccounts: pagination.total,
      filteredAccounts: localAccounts.length,
      paginatedAccounts: localAccounts.length,
      currentPage: pagination.page,
      totalPages: pagination.totalPages,
      filters: {
        search: debouncedSearchTerm,
        status: statusFilter,
        team: teamFilter,
        site: siteFilter,
        cookie: cookieFilter
      }
    })
  }, [pagination.total, localAccounts.length, pagination.page, pagination.totalPages, debouncedSearchTerm, statusFilter, teamFilter, siteFilter, cookieFilter])
  
  // Update current page when pagination changes from API
  useEffect(() => {
    if (pagination.page && pagination.page !== currentPage) {
      setCurrentPage(pagination.page)
    }
  }, [pagination.page])

  // Hitung stats dari localAccounts (client-side calculation for displayed accounts)
  // Note: This is only for the current page, not all accounts
  const summaryStats = {
    total: pagination.total || 0,
    active: localAccounts.filter(acc => acc.status_akun === 'aktif').length,
    inactive: localAccounts.filter(acc => acc.status_akun === 'nonaktif').length,
    connected: localAccounts.filter(acc => {
      const cookiesStr = typeof acc.cookies === 'string' ? acc.cookies : ''
      return cookiesStr.includes('SPC_F') && cookiesStr.includes('SPC_T')
    }).length
  }

  // Use accounts from API response
  const accountsResponseSafe: any = accountsResponse
  // Gunakan paginatedAccounts untuk ditampilkan di tabel
  const accounts: AccountData[] = paginatedAccounts

  // Debug: Log accounts yang akan ditampilkan
  useEffect(() => {
    console.log('📊 ManagementAccount: Accounts to display', {
      localAccountsCount: localAccounts.length,
      filteredAccountsCount: filteredAccounts.length,
      paginatedAccountsCount: paginatedAccounts.length,
      accountsToDisplay: accounts.length,
      currentPage,
      itemsPerPage,
      totalPages: pagination.totalPages,
      filters: {
        search: debouncedSearchTerm,
        status: statusFilter,
        team: teamFilter,
        site: siteFilter,
        cookie: cookieFilter
      },
      localAccountsData: localAccounts.map(acc => ({
        username: acc.username,
        kode_tim: acc.kode_tim,
        nama_tim: acc.nama_tim,
        kode_site: acc.kode_site,
        status: acc.status_akun
      }))
    })
  }, [localAccounts, filteredAccounts, paginatedAccounts, accounts, currentPage, itemsPerPage, pagination.totalPages, debouncedSearchTerm, statusFilter, teamFilter, siteFilter, cookieFilter])

  const teams: TeamData[] = filtersDataSafe?.success && filtersDataSafe?.data?.teams
    ? filtersDataSafe.data.teams
    : []

  const sites: SiteData[] = filtersDataSafe?.success && filtersDataSafe?.data?.sites
    ? filtersDataSafe.data.sites
    : []
  
  const [loading, setLoading] = useState(false)
  
  // Modal states
  const [editModal, setEditModal] = useState<{open: boolean, account?: AccountData}>({open: false})
  const [viewModal, setViewModal] = useState<{open: boolean, account?: AccountData}>({open: false})
  const [statusModal, setStatusModal] = useState<{open: boolean, account?: AccountData, status?: string}>({open: false})
  const [deleteModal, setDeleteModal] = useState<{open: boolean, account?: AccountData}>({open: false})
  
  const { toast } = useToast()
  const [cookieStatus, setCookieStatus] = useState<{ [key: string]: string }>({})
  const [loadingStatus, setLoadingStatus] = useState<{ [key: string]: boolean }>({})
  const [syncingAccounts, setSyncingAccounts] = useState<Set<number>>(new Set())

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, statusFilter, teamFilter, siteFilter, cookieFilter])

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setDebouncedSearchTerm("")
    setStatusFilter("all")
    setTeamFilter("all")
    setSiteFilter("all")
    setCookieFilter("all")
    setCurrentPage(1)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [])


  // Update Account
  const handleUpdateAccount = async () => {
    if (!editModal.account?.no) return

    setLoading(true)
    try {
      // Update di database (jika ada no yang valid)
      if (editModal.account.no && typeof editModal.account.no === 'number') {
        try {
          await fetch(`/api/accounts/${editModal.account.no}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cookies: editModal.account.cookies
            })
          })
        } catch (dbError) {
          console.warn('Error updating in database (continuing with local update):', dbError)
        }
      }
      
      // Refresh data from API
      await mutateAccounts()
      
      toast({ title: "Berhasil", description: "Cookies berhasil diupdate!", variant: "default" })
      setEditModal({open: false})
    } catch (error: any) {
      console.error('Error updating account:', error)
      toast({ 
        title: "Gagal", 
        description: `Error: ${error.message}`, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  // Update Status
  const handleUpdateStatus = async () => {
    if (!statusModal.account?.no || !statusModal.status) return

    setLoading(true)
    try {
      // Update di database (jika ada no yang valid)
      if (statusModal.account.no && typeof statusModal.account.no === 'number') {
        try {
          await fetch(`/api/accounts/${statusModal.account.no}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status_akun: statusModal.status
            })
          })
        } catch (dbError) {
          console.warn('Error updating status in database (continuing with local update):', dbError)
        }
      }
      
      // Refresh data from API
      await mutateAccounts()
      
      toast({ title: "Berhasil", description: "Status akun berhasil diupdate!", variant: "default" })
      setStatusModal({open: false})
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast({ 
        title: "Gagal", 
        description: `Error: ${error.message}`, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!deleteModal.account?.no) return

    setLoading(true)
    try {
      // Hapus di database (jika ada no yang valid)
      if (deleteModal.account.no && typeof deleteModal.account.no === 'number') {
        try {
          const response = await fetch(`/api/accounts/${deleteModal.account.no}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })
          
          const result = await response.json()
          
          if (!response.ok) {
            if (response.status === 403) {
              throw new Error('Anda tidak memiliki izin untuk menghapus akun. Hanya superadmin yang dapat menghapus akun.')
            } else if (response.status === 401) {
              throw new Error('Sesi Anda telah berakhir. Silakan login kembali.')
            } else {
              throw new Error(result.error || 'Gagal menghapus akun dari database')
            }
          }
        } catch (dbError: any) {
          console.error('Error deleting from database:', dbError)
          throw dbError
        }
      }
      
      // Refresh data from API
      await mutateAccounts()
      
      toast({ title: "Berhasil", description: "Akun berhasil dihapus!", variant: "default" })
      setDeleteModal({open: false})
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast({ 
        title: "Gagal", 
        description: `Error: ${error.message}`, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  // Sync Account
  const handleSyncAccount = async (account: AccountData) => {
    if (!account.no) return

    setSyncingAccounts(prev => new Set(prev).add(account.no!))
    setLoadingStatus(prev => ({ ...prev, [account.username]: true }))
    
    try {
      // Simulate API call - bisa diganti dengan actual Shopee API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check cookie status
      const cookiesStr = typeof account.cookies === 'string' 
        ? account.cookies 
        : Array.isArray(account.cookies) 
          ? JSON.stringify(account.cookies) 
          : ''
      const hasValidCookies = cookiesStr.includes('SPC_F') && cookiesStr.includes('SPC_T')
      
      setCookieStatus(prev => ({ 
        ...prev, 
        [account.username]: hasValidCookies ? "Connected" : "Expire" 
      }))
      
      // Update last_sync in database
      const syncTimestamp = new Date().toISOString()
      await fetch(`/api/accounts/${account.no}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          last_sync: syncTimestamp
        })
      })
      
      // Refresh data from API
      await mutateAccounts()
      await mutateStats()
      
      toast({ 
        title: "Berhasil", 
        description: `Account ${account.username} berhasil di-sync!`, 
        variant: "default" 
      })
    } catch (error) {
      toast({ 
        title: "Gagal", 
        description: `Gagal sync account ${account.username}`, 
        variant: "destructive" 
      })
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev)
        newSet.delete(account.no!)
        return newSet
      })
      setLoadingStatus(prev => ({ ...prev, [account.username]: false }))
    }
  }

  // Check cookie status
  const checkCookieStatus = (account: AccountData) => {
    const cookiesStr = typeof account.cookies === 'string' 
      ? account.cookies 
      : Array.isArray(account.cookies) 
        ? JSON.stringify(account.cookies) 
        : ''
    const hasValidCookies = cookiesStr.includes('SPC_F') && cookiesStr.includes('SPC_T')
    setCookieStatus(prev => ({ 
      ...prev, 
      [account.username]: hasValidCookies ? "Connected" : "Expire" 
    }))
  }

  // Copy cookies to clipboard
  const copyCookies = (cookies: string) => {
    navigator.clipboard.writeText(cookies)
    toast({ title: "Berhasil", description: "Cookies berhasil disalin!", variant: "default" })
  }

  // Check cookie status saat accounts berubah
  useEffect(() => {
    accounts.forEach(account => {
      if (account.cookies) {
        checkCookieStatus(account)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length])

  // Check for errors (hanya untuk filters karena masih mengambil dari database)
  const hasError = filtersDataSafe?.success === false
  const errorMessage = filtersDataSafe?.error

  // Show loading (hanya untuk filters karena masih mengambil dari database)
  if (loadingFilters) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
          <p className="text-lg text-white font-medium">Sabar my Boss...🤣 Data management akun sedang dimuat!</p>
        </div>
      </div>
    )
  }

  // Show error if any (hanya untuk filters)
  if (hasError && !loadingFilters) {
    return (
      <div className="w-full max-w-full grid grid-cols-12 gap-3 md:gap-4 lg:gap-6">
        <div className="col-span-12">
          <Card className="glass-card border-red-500/30 bg-red-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-red-300 mb-2">Error Memuat Data</h3>
                  <p className="text-red-200">{errorMessage || 'Terjadi kesalahan saat memuat data dari database'}</p>
                  <p className="text-sm text-red-300 mt-2">Pastikan:</p>
                  <ul className="text-sm text-red-200 mt-1 list-disc list-inside">
                    <li>Database connection sudah benar</li>
                    <li>Tabel data_akun, data_tim, dan data_site sudah ada</li>
                    <li>Environment variables (DB_HOST, DB_USER, dll) sudah di-set</li>
                  </ul>
                  <Button
                    onClick={() => {
                      mutateAccounts()
                      mutateStats()
                    }}
                    className="mt-4 bg-red-600 hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Coba Lagi
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full grid grid-cols-12 gap-3 md:gap-4 lg:gap-6">
      {/* Summary Cards */}
      <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-3 md:mb-4">
        <SummaryCard
          title="Total Akun"
          value={summaryStats.total.toLocaleString("id-ID")}
          icon={UserCheck}
          color="text-blue-500"
          description="Jumlah seluruh akun yang terdaftar"
        />
        <SummaryCard
          title="Akun Aktif"
          value={summaryStats.active.toLocaleString("id-ID")}
          icon={CheckCircle}
          color="text-green-500"
          description="Akun dengan status aktif"
        />
        <SummaryCard
          title="Akun Nonaktif"
          value={summaryStats.inactive.toLocaleString("id-ID")}
          icon={XCircle}
          color="text-red-500"
          description="Akun dengan status nonaktif"
        />
        <SummaryCard
          title="Connected"
          value={summaryStats.connected.toLocaleString("id-ID")}
          icon={CheckCircle2}
          color="text-cyan-500"
          description="Akun dengan cookies valid"
        />
      </div>

      {/* Main Card */}
      <div className="col-span-12">
        <Card className="glass-card border-white/10 overflow-hidden">
          <CardHeader className="border-b border-white/10 pb-3 md:pb-4 px-3 md:px-6 pt-3 md:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center text-xl font-semibold">
                <Users className="mr-2 h-6 w-6 text-cyan-400" />
                Management Akun & Team
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    mutateAccounts()
                    mutateStats()
                  }}
                  className="glass-card border-white/10 bg-white/5 text-white rounded-lg shadow hover:bg-white/10 hover:border-white/20 transition-all duration-150 px-4 py-2"
                  title="Sync All"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Sync All
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-3 md:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/80" />
                <Input
                  ref={searchInputRef}
                  placeholder="Cari akun (nama, username, atau toko)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-card border-white/10 text-white bg-white/5 placeholder:text-white/60 focus:ring-cyan-500 text-sm md:text-base"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Site Filter - Only for Admin/SuperAdmin */}
                {isAdminOrSuperAdmin && (
                <Select value={siteFilter} onValueChange={setSiteFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 text-sm">
                    <SelectValue placeholder="Semua Site" />
                  </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                    <SelectItem value="all">Semua Site</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.kode_site} value={site.kode_site}>
                        {site.nama_site}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                )}

                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 text-sm">
                    <SelectValue placeholder="Semua Team" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                    <SelectItem value="all">Semua Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.kode_tim} value={team.kode_tim}>
                        {team.nama_tim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 text-sm">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={cookieFilter} onValueChange={setCookieFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10 text-sm">
                    <SelectValue placeholder="Status Cookies" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                    <SelectItem value="all">Semua Cookies</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="no_cookies">No Cookies</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="glass-card border-white/10 text-white bg-white/5 hover:bg-white/10"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="custom-scrollbar table-container relative -mx-6 overflow-x-hidden">
              <div className="px-4 md:px-6">
                <div className="w-full overflow-x-hidden">
                  <Table className="relative z-10 w-full table-auto">
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-b border-white/10">
                      <TableHead className="text-white/90 font-semibold uppercase tracking-wide text-xs px-3 md:px-4 py-3 min-w-[150px] max-w-[200px]">Username - Email</TableHead>
                      <TableHead className="text-white/90 font-semibold uppercase tracking-wide text-xs px-3 md:px-4 py-3 min-w-[140px] max-w-[180px]">Team - Site</TableHead>
                      <TableHead className="text-white/90 font-semibold uppercase tracking-wide text-xs text-center px-2 md:px-4 py-3 w-[80px]">Status</TableHead>
                      <TableHead className="text-white/90 font-semibold uppercase tracking-wide text-xs text-center px-2 md:px-4 py-3 w-[100px]">Cookies</TableHead>
                      <TableHead className="hidden md:table-cell text-white/90 font-semibold uppercase tracking-wide text-xs text-center px-3 md:px-4 py-3 min-w-[120px] max-w-[140px]">Last Sync</TableHead>
                      <TableHead className="text-white/90 font-semibold uppercase tracking-wide text-xs text-center px-2 md:px-4 py-3 w-[90px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAccounts ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={6} className="text-center py-12 px-3 md:px-4">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mb-4" />
                          <p className="text-lg font-medium text-gray-300 mb-2">Memuat data akun...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-white/90 py-12 px-4">
                        <div className="flex flex-col items-center">
                          <Users className="h-12 w-12 text-white/60 mb-4" />
                          <p className="text-lg font-medium text-white">Tidak ada akun ditemukan</p>
                          <p className="text-sm text-white/80">Coba ubah filter atau tambahkan akun baru</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.no || account.username} className="border-b border-white/10 bg-white/5 hover:bg-white/10 transition-colors duration-150">
                        <TableCell className="px-3 md:px-4 py-3 min-w-[150px] max-w-[200px]">
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">@{account.username}</div>
                            {account.email && (
                              <div className="text-xs text-white/80 mt-1 truncate" title={account.email}>{account.email}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 md:px-4 py-3 min-w-[140px] max-w-[180px]">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <Avatar className="h-8 w-8 md:h-10 md:w-10 border border-white/20 flex-shrink-0">
                              {account.team_logo ? (
                                <AvatarImage 
                                  src={account.team_logo} 
                                  alt={account.nama_tim || account.team || 'Team'} 
                                  className="object-cover"
                                />
                              ) : null}
                              <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                                {(account.nama_tim || account.team) ? ((account.nama_tim || account.team || '').substring(0, 2).toUpperCase()) : 'TM'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate" title={account.nama_tim || account.team || 'N/A'}>{account.nama_tim || account.team || 'N/A'}</div>
                          {account.nama_site && (
                                <div className="text-xs text-white/80 mt-0.5 truncate" title={account.nama_site}>{account.nama_site}</div>
                          )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-2 md:px-4 py-3 w-[80px]">
                          <Badge 
                            variant="outline"
                            className={`text-xs px-1.5 md:px-2 py-1 whitespace-nowrap ${
                              account.status_akun === 'aktif' 
                                ? 'text-green-400 border-green-500/40 bg-green-500/20' 
                                : 'text-gray-400 border-gray-500/40 bg-gray-500/20'
                            }`}
                          >
                            {account.status_akun === 'aktif' ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center px-2 md:px-4 py-3 w-[100px]">
                          {loadingStatus[account.username] ? (
                            <RefreshCw className="animate-spin h-4 w-4 text-cyan-400 mx-auto" />
                          ) : (
                            <Badge 
                              variant="outline"
                              className={`text-xs px-1.5 md:px-2 py-1 whitespace-nowrap ${
                                cookieStatus[account.username] === "Connected"
                                  ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/20'
                                  : cookieStatus[account.username] === "Expire"
                                  ? 'text-orange-400 border-orange-500/40 bg-orange-500/20'
                                  : 'text-gray-400 border-gray-500/40 bg-gray-500/20'
                              }`}
                            >
                              {cookieStatus[account.username] || "Unknown"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-center text-white/90 text-sm px-3 md:px-4 py-3 min-w-[120px] max-w-[140px]">
                          <div className="truncate" title={account.last_sync ? new Date(account.last_sync).toLocaleDateString('id-ID', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never'}>
                          {account.last_sync
                            ? new Date(account.last_sync).toLocaleDateString('id-ID', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Never'
                          }
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-2 md:px-4 py-3 w-[90px]">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSyncAccount(account)}
                              disabled={syncingAccounts.has(account.no!) || !account.cookies}
                              className="h-8 w-8 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                              title="Sync Account"
                            >
                              {syncingAccounts.has(account.no!) ? (
                                <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                              ) : (
                                <RefreshCw className="h-4 w-4 text-white/80" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  title="More Actions"
                                >
                                  <MoreVertical className="h-4 w-4 text-white/80" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass-card border-white/10 bg-[#1A1A1A]">
                                <DropdownMenuItem 
                                  onClick={() => setEditModal({open: true, account})}
                                  className="text-white hover:bg-white/10"
                                >
                                  <Edit className="h-4 w-4 mr-2 text-cyan-400" /> Edit Cookies
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setViewModal({open: true, account})}
                                  className="text-white hover:bg-white/10"
                                >
                                  <Eye className="h-4 w-4 mr-2 text-cyan-400" /> View Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setStatusModal({open: true, account, status: account.status_akun})}
                                  className="text-white hover:bg-white/10"
                                >
                                  <Settings className="h-4 w-4 mr-2 text-cyan-400" /> Edit Status
                                </DropdownMenuItem>
                                {isSuperAdmin && (
                                  <DropdownMenuItem 
                                    onClick={() => setDeleteModal({open: true, account})}
                                    className="text-red-400 hover:bg-red-500/20"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Hapus Akun
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
                </div>
              </div>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/90">Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-[80px] glass-card border-white/10 text-white bg-white/5 hover:bg-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-white/90">entries</span>
                </div>

                <div className="text-sm text-white/90">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    «
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    ‹
                  </Button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-9 w-9 p-0 ${
                          currentPage === pageNum
                            ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/30"
                            : "glass-card border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= (pagination.totalPages || 1)}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    ›
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(pagination.totalPages || 1)}
                    disabled={currentPage >= (pagination.totalPages || 1)}
                    className="h-9 w-9 p-0 glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>


      {/* Modal Edit Cookies */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal((prev) => ({...prev, open}))}>
        <DialogContent className="glass-card border-white/10 bg-[#1A1A1A] max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">Edit Cookies Akun</DialogTitle>
            <DialogDescription className="text-white/80">
              Edit cookies untuk akun <b className="text-white">{editModal.account?.username}</b>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={typeof editModal.account?.cookies === 'string' 
              ? editModal.account.cookies 
              : Array.isArray(editModal.account?.cookies) 
                ? JSON.stringify(editModal.account.cookies) 
                : ''}
            onChange={(e) => setEditModal(prev => ({
              ...prev, 
              account: prev.account ? {
                ...prev.account,
                cookies: e.target.value
              } : undefined
            }))}
            className="glass-card border-white/10 bg-white/5 text-white placeholder:text-white/60 focus:ring-cyan-500 min-h-[200px] font-mono text-sm"
            placeholder="Paste cookies di sini..."
          />
          <DialogFooter>
            <Button
              onClick={handleUpdateAccount}
              className="glass-card border-cyan-500/30 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/50"
              disabled={loading}
            >
              {loading && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal View Detail */}
      <Dialog open={viewModal.open} onOpenChange={(open) => setViewModal((prev) => ({...prev, open}))}>
        <DialogContent className="glass-card border-white/10 bg-[#1A1A1A] max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">Detail Akun</DialogTitle>
            <DialogDescription className="text-white/80">Informasi lengkap akun</DialogDescription>
          </DialogHeader>
          {viewModal.account && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Username</Label>
                  <p className="text-white font-medium">@{viewModal.account.username}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Email</Label>
                  <p className="text-white font-medium">{viewModal.account.email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Nama Akun</Label>
                  <p className="text-white font-medium">{viewModal.account.nama_akun || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Team</Label>
                  <p className="text-white font-medium">{viewModal.account.nama_tim || viewModal.account.team || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Site</Label>
                  <p className="text-white font-medium">{viewModal.account.nama_site || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-white/90 text-xs">Status</Label>
                  <Badge 
                    variant="outline"
                    className={`${
                      viewModal.account.status_akun === 'aktif' 
                        ? 'text-green-400 border-green-500/40 bg-green-500/20' 
                        : 'text-gray-400 border-gray-500/40 bg-gray-500/20'
                    }`}
                  >
                    {viewModal.account.status_akun === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
              </div>
              {viewModal.account.cookies && (
                <div className="space-y-2">
                  <Label className="text-white/90 text-xs">Cookies</Label>
                  <div className="glass-card bg-white/5 p-3 rounded border border-white/10">
                    <p className="text-xs font-mono text-white/90 break-all max-h-32 overflow-y-auto custom-scrollbar">
                      {typeof viewModal.account.cookies === 'string' 
                        ? viewModal.account.cookies
                        : Array.isArray(viewModal.account.cookies)
                          ? JSON.stringify(viewModal.account.cookies)
                          : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyCookies(
                      typeof viewModal.account?.cookies === 'string' 
                        ? viewModal.account.cookies
                        : Array.isArray(viewModal.account?.cookies)
                          ? JSON.stringify(viewModal.account.cookies)
                          : ''
                    )}
                    className="glass-card border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copy Cookies
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Change Status */}
      <Dialog open={statusModal.open} onOpenChange={(open) => setStatusModal((prev) => ({...prev, open}))}>
        <DialogContent className="glass-card border-white/10 bg-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">Ubah Status Akun</DialogTitle>
            <DialogDescription className="text-white/80">
              Update status untuk akun <b className="text-white">{statusModal.account?.username}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Status</Label>
              <Select 
                value={statusModal.status} 
                onValueChange={(value) => setStatusModal((prev) => ({...prev, status: value}))}
              >
                <SelectTrigger className="glass-card border-white/10 bg-white/5 text-white hover:bg-white/10">
                  <SelectValue placeholder="Pilih Status" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-[#1A1A1A]">
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleUpdateStatus}
              className="glass-card border-cyan-500/30 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 hover:border-cyan-500/50"
              disabled={loading}
            >
              {loading && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Akun */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal((prev) => ({...prev, open}))}>
        <DialogContent className="glass-card border-white/10 bg-[#1A1A1A] text-white">
          <DialogHeader>
            <DialogTitle className="text-white font-semibold">Konfirmasi Hapus Akun</DialogTitle>
            <DialogDescription className="text-white/80">
              Yakin ingin menghapus akun <b className="text-white">{deleteModal.account?.username}</b>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              className="glass-card border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:border-red-500/50"
              disabled={loading}
            >
              {loading && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
              Hapus
            </Button>
            <Button onClick={() => setDeleteModal({open: false})} variant="outline" className="glass-card border-white/10 bg-white/5 text-white hover:bg-white/10">
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
