"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Search, 
  RefreshCw, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Store,
  Wallet,
  Percent
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Account {
  username: string
  email: string
  kode_tim: string
  nama_tim: string
  kode_site?: string
  nama_site?: string
  pic_akun: string
  id_affiliate: string
  cookies?: string
  cookie_status: "connected" | "no_cookies" | "checking"
  data_source: "database" | "pending"
  performa_data: {
    total_gmv: number
    total_komisi: number
    total_biaya_iklan: number
    nett_komisi: number
    roas: number
    profitable: number
    total_sold: number
    total_clicks: number
    total_orders: number
    impression: number
    view: number
    persentasi: number
    last_affiliate_sync?: string
  }
  last_affiliate_sync?: string
}

interface AccountMetrics {
  total_akun: number
  akun_aktif: number
  total_gmv: number
  total_komisi?: number
  avg_roas: number
  avg_komisi_percent?: number
  connected_count?: number
  disconnected_count?: number
}

interface AccountTableProps {
  onAccountSelect: (selectedAccountIds: string[]) => void
  selectedAccountIds: string[]
  showTable: boolean
  onToggleShowTable: () => void
}

export function AccountTable({ 
  onAccountSelect, 
  selectedAccountIds, 
  showTable, 
  onToggleShowTable 
}: AccountTableProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [metrics, setMetrics] = useState<AccountMetrics>({
    total_akun: 0,
    akun_aktif: 0,
    total_gmv: 0,
    total_komisi: 0,
    avg_roas: 0,
    avg_komisi_percent: 0,
    connected_count: 0,
    disconnected_count: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPIC, setSelectedPIC] = useState("all")
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [teamOptions, setTeamOptions] = useState<string[]>([])
  const [picOptions, setPicOptions] = useState<string[]>([])
  const [searchDebounce, setSearchDebounce] = useState("")

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch accounts data
  const fetchAccounts = async (page: number = currentPage, limit: number = itemsPerPage) => {
    try {
      setLoading(true)
      setError(null)
      
      // Build query parameters for accounts
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: searchDebounce,
        filter_tim: selectedTeam,
        filter_pic: selectedPIC,
        filter_cookies: 'connected' // Only show accounts with status_cookies = 'aktif'
      })
      
      // Build query parameters for metrics (get all accounts)
      const metricsParams = new URLSearchParams({
        page: '1',
        limit: '1000',
        search: searchDebounce,
        filter_tim: selectedTeam,
        filter_pic: selectedPIC,
        filter_cookies: 'all' // Get all accounts for metrics
      })
      
      // Fetch both accounts and metrics in parallel
      const [accountsResponse, metricsResponse] = await Promise.all([
        authenticatedFetch(`/api/accounts?${params.toString()}`),
        authenticatedFetch(`/api/accounts?${metricsParams.toString()}`)
      ])
      
      if (accountsResponse.status === 401 || metricsResponse.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      
      const accountsResult = await accountsResponse.json()
      const metricsResult = await metricsResponse.json()
      
      if (accountsResult.success) {
        // API accounts returns data in format: { accounts: [...], summary: {...}, ... }
        const accountsData = accountsResult.data?.accounts || []
        const pagination = accountsResult.data?.pagination || {}
        const filterOptions = accountsResult.data?.filter_options || {}
        
        setAccounts(accountsData)
        setTotalPages(pagination.total_pages || 1)
        setTotalRecords(pagination.total_records || 0)
        setTeamOptions(filterOptions.tim_options || [])
        setPicOptions(filterOptions.pic_options || [])
        
        // Get summary from metrics result
        const summary = metricsResult.data?.summary || {}
        
        // Calculate metrics from accountsData (connected accounts only)
        const totalGmv = accountsData.reduce((sum: number, acc: Account) => sum + safeNumber(acc.performa_data?.total_gmv), 0)
        const totalKomisi = accountsData.reduce((sum: number, acc: Account) => sum + safeNumber(acc.performa_data?.total_komisi), 0)
        const totalPersentasi = accountsData.reduce((sum: number, acc: Account) => sum + safeNumber(acc.performa_data?.persentasi), 0)
        const avgKomisiPercent = accountsData.length > 0 ? (totalPersentasi / accountsData.length) : 0
        const avgRoas = accountsData.length > 0 
          ? accountsData.reduce((sum: number, acc: Account) => sum + safeNumber(acc.performa_data?.target_roas_high || acc.performa_data?.target_roas_low), 0) / accountsData.length 
          : 0
        
        setMetrics({
          total_akun: summary.total_accounts || 0,
          akun_aktif: accountsData.length, // All accounts shown are connected
          total_gmv: totalGmv,
          total_komisi: totalKomisi,
          avg_roas: avgRoas,
          avg_komisi_percent: avgKomisiPercent,
          connected_count: summary.connected_count || 0,
          disconnected_count: summary.disconnected_count || 0
        })
      } else {
        setError(accountsResult.error || 'Failed to fetch accounts data')
      }
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts(1) // Reset to page 1 when filters change
  }, [searchDebounce, selectedTeam, selectedPIC])

  useEffect(() => {
    fetchAccounts(currentPage)
  }, [currentPage, itemsPerPage])

  // Helper function to safely convert to number
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to format currency
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

  // Helper function to get commission badge color
  const getCommissionBadgeColor = (percentage: number) => {
    const rounded = Math.round(percentage)
    if (rounded < 5) {
      return "bg-destructive/10 text-destructive border-destructive/20"
    } else if (rounded < 10) {
      return "bg-warning/10 text-warning border-warning/20"
    } else if (rounded < 15) {
      return "bg-info/10 text-info border-info/20"
    } else if (rounded < 20) {
      return "bg-success/10 text-success border-success/20"
    } else {
      return "bg-primary/10 text-primary border-primary/20"
    }
  }

  // Data is already filtered on the server side
  const filteredAccounts = accounts || []

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onAccountSelect(filteredAccounts.map(acc => acc.id_affiliate))
    } else {
      onAccountSelect([])
    }
  }

  const handleSelectAccount = (accountId: string, checked: boolean) => {
    if (checked) {
      onAccountSelect([...selectedAccountIds, accountId])
    } else {
      onAccountSelect(selectedAccountIds.filter(id => id !== accountId))
    }
  }


  return (
    <div className="space-y-4">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <Users className="w-5 h-5 text-primary absolute top-4 right-4" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Total Akun</p>
            <p className="text-3xl font-bold text-gray-900">{metrics.total_akun}</p>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <Users className="w-5 h-5 text-primary absolute top-4 right-4" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Cookies</p>
            <div className="flex items-center gap-2">
              <Badge className="bg-success/10 text-success border-success/20 text-xl font-bold px-3 py-1">
                {metrics.connected_count || 0}
              </Badge>
              <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xl font-bold px-3 py-1">
                {metrics.disconnected_count || 0}
              </Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <TrendingUp className="w-5 h-5 text-primary absolute top-4 right-4" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Total GMV (Rp)</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.total_gmv)}</p>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <Wallet className="w-5 h-5 text-primary absolute top-4 right-4" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Total Komisi (Rp)</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.total_komisi)}</p>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <Percent className="w-5 h-5 text-primary absolute top-4 right-4" />
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Avg Komisi (%)</p>
            <Badge className={`${getCommissionBadgeColor(safeNumber(metrics.avg_komisi_percent))} text-xl font-bold px-3 py-1`}>
              {Math.round(safeNumber(metrics.avg_komisi_percent))}%
            </Badge>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <div className="flex items-center gap-1 absolute top-4 right-4">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col items-start gap-2">
            <p className="text-primary text-xs font-medium">Avg Target ROAS</p>
            <p className="text-3xl font-bold text-gray-900">{safeNumber(metrics.avg_roas).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Account Table */}
      <Card className="p-4">
        {/* Search and Filters */}
        {showTable ? (
          <>
            <div className="flex items-center gap-4">
              <Button
                variant="tertiary"
                onClick={onToggleShowTable}
                title="Sembunyikan Akun"
              >
                <EyeOff className="w-4 h-4" />
                Hide
              </Button>
              <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari akun, email, tim, atau site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery !== searchDebounce && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tim</SelectItem>
                {teamOptions.map((team) => (
                  <SelectItem key={team} value={team}>{team}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPIC} onValueChange={setSelectedPIC}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PIC</SelectItem>
                {picOptions.map((pic) => (
                  <SelectItem key={pic} value={pic}>{pic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Accounts Info */}
          {selectedAccountIds.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>{selectedAccountIds.length}</strong> akun dipilih untuk melihat campaign
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
              <span className="ml-2 text-gray-600">Memuat data akun...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center justify-center py-8 text-red-600">
              <AlertCircle className="w-6 h-6 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Table */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">
                          <Checkbox
                            checked={filteredAccounts.length > 0 && selectedAccountIds.length === filteredAccounts.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm">AKUN</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">TIM/SITE</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">PIC</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">GMV</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">KOMISI</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">KOMISI (%)</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">TARGET ROAS</th>
                      </tr>
                    </thead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium text-gray-500 mb-2">Tidak ada akun ditemukan</p>
                        <p className="text-sm text-gray-400">Belum ada data akun yang terhubung di database.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr 
                        key={account.username} 
                        className="border-b hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleSelectAccount(account.id_affiliate, !selectedAccountIds.includes(account.id_affiliate))}
                      >
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedAccountIds.includes(account.id_affiliate)}
                            onCheckedChange={(checked) => handleSelectAccount(account.id_affiliate, checked as boolean)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm">{account.username}</p>
                            <p className="text-xs text-gray-500">{account.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {account.nama_site ? account.nama_site.charAt(0).toUpperCase() : <Store className="w-4 h-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm">{account.nama_tim || '-'}</p>
                              <p className="text-xs text-primary">{account.nama_site || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">{account.pic_akun}</td>
                        <td className="py-3 px-4 text-right text-sm">{formatCurrency(account.performa_data?.total_gmv)}</td>
                        <td className="py-3 px-4 text-right text-sm">{formatCurrency(account.performa_data?.total_komisi)}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end">
                            <Badge className={getCommissionBadgeColor(safeNumber(account.performa_data?.persentasi || 0)) + " text-sm px-3 py-1"}>
                              {Math.round(safeNumber(account.performa_data?.persentasi || 0))}%
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-sm">{safeNumber(account.performa_data?.target_roas_high || account.performa_data?.target_roas_low).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalRecords)} dari {totalRecords} akun</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
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
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Per halaman:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="flex items-center">
            <Button
              variant="tertiary"
              onClick={onToggleShowTable}
              title="Tampilkan Akun"
            >
              <Eye className="w-4 h-4" />
              Show Accounts
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
