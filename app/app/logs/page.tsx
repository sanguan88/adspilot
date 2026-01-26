"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Download, AlertCircle, CheckCircle, Clock, XCircle, Loader2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react"
import { toast } from "sonner"
import { format, subDays } from "date-fns"
import { LogDetailModal } from "@/components/log-detail-modal"
import { DateRangePicker } from "@/components/date-range-picker"
import { Skeleton } from "@/components/ui/skeleton"

interface Log {
  id: string
  timestamp: string
  rule: string
  action: string
  target: string
  status: "success" | "failed" | "pending"
  details: string
  account: string
  category?: string
  rule_id?: string
  campaign_id?: string
  campaign_name?: string
  toko_id?: string
  isSkipped?: boolean
  errorMessage?: string
}

type SortField = "timestamp" | "status" | "rule" | "action" | "target"
type SortOrder = "asc" | "desc"

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ruleFilter, setRuleFilter] = useState("all-rules")
  const [tokoFilter, setTokoFilter] = useState("all-tokos")
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [sortField, setSortField] = useState<SortField>("timestamp")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const pageSize = 50

  // Fetch logs from API
  const fetchLogs = async (resetPage: boolean = false) => {
    try {
      setLoading(true)
      const currentPage = resetPage ? 1 : page

      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (ruleFilter !== "all-rules") {
        params.append("ruleFilter", ruleFilter)
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (dateRange?.from) {
        params.append("dateFrom", format(dateRange.from, "yyyy-MM-dd"))
      }
      if (dateRange?.to) {
        params.append("dateTo", format(dateRange.to, "yyyy-MM-dd"))
      }
      if (tokoFilter !== "all-tokos") {
        params.append("tokoFilter", tokoFilter)
      }
      params.append("sortField", sortField)
      params.append("sortOrder", sortOrder)
      params.append("page", currentPage.toString())
      params.append("limit", pageSize.toString())

      const response = await authenticatedFetch(`/api/logs?${params.toString()}`)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }

      const result = await response.json()

      if (result.success) {
        const newLogs = result.data || []
        const total = result.total || 0

        if (resetPage) {
          setLogs(newLogs)
          setPage(1)
        } else {
          setLogs(prev => [...prev, ...newLogs])
        }

        setHasMore(newLogs.length === pageSize)
        setTotalCount(total)
      } else {
        throw new Error(result.error || 'Failed to fetch logs')
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
      toast.error("Gagal memuat logs", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memuat data"
      })
      if (resetPage) {
        setLogs([])
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs on mount and when filters change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    fetchLogs(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, ruleFilter, tokoFilter, dateRange, sortField, sortOrder])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setHasMore(true)
      fetchLogs(true)
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Load more (infinite scroll)
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1)
    }
  }

  useEffect(() => {
    if (page > 1 && !loading) {
      fetchLogs(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // Handle refresh button
  const handleRefresh = () => {
    setPage(1)
    setHasMore(true)
    fetchLogs(true)
  }

  const handleViewDetail = (logId: string) => {
    setSelectedLogId(logId)
    setIsDetailModalOpen(true)
  };

  const tokoMap = new Map<string, string>()
  logs.forEach(log => {
    if (log.toko_id) {
      const name = log.account || log.toko_id
      const existingName = tokoMap.get(log.toko_id)
      if (!existingName || name.length > existingName.length) {
        tokoMap.set(log.toko_id, name)
      }
    }
  })

  const tokoOptions = Array.from(tokoMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  // Export logs to CSV
  const exportToCSV = () => {
    try {
      if (logs.length === 0) {
        toast.error("Tidak ada data untuk diekspor")
        return
      }

      const headers = ["Timestamp", "Account", "Rule", "Action", "Target", "Status", "Details"]
      const rows = logs.map(log => [
        log.timestamp,
        log.account,
        log.rule,
        log.action,
        log.target,
        log.status,
        log.details.replace(/,/g, ";") // Replace comma to avoid CSV issues
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `logs_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Logs berhasil diekspor", {
        description: `File CSV berisi ${logs.length} entri`
      })
    } catch (error) {
      console.error("Error exporting logs:", error)
      toast.error("Gagal mengekspor logs", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat mengekspor data"
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
      case "Berhasil Trigger":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case "failed":
      case "Gagal Trigger":
        return <XCircle className="w-4 h-4 text-rose-600" />
      case "pending":
      case "Menunggu":
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-slate-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    if (status === "Berhasil Trigger") return "Berhasil Trigger"
    if (status === "Gagal Trigger") return "Gagal Trigger"

    switch (status) {
      case "success":
        return "Berhasil Trigger"
      case "failed":
        return "Gagal Trigger"
      case "pending":
        return "Menunggu"
      default:
        return status
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === "Berhasil Trigger" || status === "success") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    }
    if (status === "Gagal Trigger" || status === "failed") {
      return "bg-rose-50 text-rose-700 border-rose-200"
    }
    if (status === "pending" || status === "Menunggu") {
      return "bg-amber-50 text-amber-700 border-amber-200"
    }
    return "bg-slate-50 text-slate-700 border-slate-200"
  }
  const getActionLabel = (action: string) => {
    switch (action) {
      case "add_budget":
      case "increase_budget":
        return "Naikkan budget"
      case "reduce_budget":
      case "decrease_budget":
        return "Turunkan budget"
      case "set_budget":
      case "update_budget":
        return "Setel budget"
      case "start_campaign":
      case "start":
      case "resume":
        return "Nyalakan iklan"
      case "pause_campaign":
      case "pause":
        return "Jeda / pause iklan"
      case "stop_campaign":
      case "stop":
        return "Hentikan iklan"
      case "telegram_notification":
      case "notify":
        return "Kirim notifikasi Telegram"
      default:
        // fallback: rapikan snake_case menjadi teks
        return action
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />
    }
    return sortOrder === "asc"
      ? <ArrowUp className="w-4 h-4 ml-1 text-gray-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-gray-600" />
  };

  // Parse and format details for better display
  const formatDetails = (log: Log) => {
    const details = log.details || ''

    const isSkipped = details.includes('Dilewati')
    const isSuccess = details.includes('Berhasil')
    const isFailed = details.includes('Gagal Eksekusi') || log.status === 'failed'

    // Extract counts if available
    const conditionMatch = details.match(/(\d+)\s*Kondisi:\s*Terpenuhi\s*(\d+),\s*Gagal\s*(\d+)/)

    if (conditionMatch) {
      return {
        isSkipped,
        isSuccess,
        isFailed,
        conditionCount: parseInt(conditionMatch[1]),
        passedCount: parseInt(conditionMatch[2]),
        failedCount: parseInt(conditionMatch[3]),
        description: details.split(' - ')[1] || details
      }
    }

    return {
      isSkipped,
      isSuccess,
      isFailed,
      description: log.errorMessage || details
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Log Aktivitas Otomasi</h1>
                <p className="text-sm text-gray-500 mt-1.5">Pantau semua eksekusi rule otomatis dan aktivitas sistem di akun Anda secara real-time</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={loading || logs.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm z-10">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari log aktivitas..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="success">Berhasil</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ruleFilter} onValueChange={setRuleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-rules">Semua Kategori</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Budget Management">Budget Management</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                  <SelectItem value="Scaling">Scaling</SelectItem>
                  <SelectItem value="Scheduling">Scheduling</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tokoFilter} onValueChange={setTokoFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua Toko" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-tokos">Semua Toko</SelectItem>
                  {tokoOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="flex-1 overflow-auto p-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("timestamp")}
                      >
                        <div className="flex items-center">
                          Waktu
                          {getSortIcon("timestamp")}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("rule")}
                      >
                        <div className="flex items-center">
                          Aturan & Aksi
                          {getSortIcon("rule")}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Iklan
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("status")}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon("status")}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && page === 1 ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16 mt-2" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-32 mt-2" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md" /></td>
                        </tr>
                      ))
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="p-3 bg-gray-50 rounded-full text-gray-400">
                              <Search className="w-8 h-8" />
                            </div>
                            <p className="text-base font-medium text-gray-900">Tidak ada log ditemukan</p>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">Coba ubah filter atau kata kunci pencarian Anda untuk melihat aktivitas lainnya.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{log.timestamp}</div>
                              <div className="text-xs text-gray-500">{log.account}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{log.rule}</div>
                              <div className="text-sm text-gray-500">{getActionLabel(log.action)}</div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col max-w-[250px]">
                                <div className="text-sm text-gray-900 font-semibold">{log.target}</div>
                                {log.campaign_name && (
                                  <div
                                    className="text-xs text-gray-500 truncate mt-0.5"
                                    title={log.campaign_name}
                                  >
                                    {log.campaign_name.length > 30
                                      ? log.campaign_name.substring(0, 27) + "..."
                                      : log.campaign_name
                                    }
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <Badge className={getStatusBadge(log.status)}>{getStatusLabel(log.status)}</Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="max-w-xs">
                                {(() => {
                                  const formatted = formatDetails(log)
                                  const details = log.details || ''

                                  if (!details) {
                                    return <span className="text-gray-400 italic">Tidak ada detail</span>
                                  }

                                  if (formatted && (formatted.isSuccess || formatted.isFailed || formatted.isSkipped)) {
                                    const statusText = formatted.isSuccess ? 'Berhasil' : formatted.isFailed ? 'Gagal' : 'Dilewati'
                                    const statusColor = formatted.isSuccess ? 'text-emerald-600' : formatted.isFailed ? 'text-rose-600' : 'text-amber-600'

                                    return (
                                      <div className="text-sm leading-relaxed">
                                        <span className={`font-semibold ${statusColor}`}>
                                          {statusText}
                                        </span>
                                        {formatted.passedCount !== undefined && formatted.failedCount !== undefined ? (
                                          <span className="text-gray-500 ml-1.5">
                                            ({formatted.conditionCount} Kondisi: Terpenuhi {formatted.passedCount}, Gagal {formatted.failedCount})
                                          </span>
                                        ) : formatted.description && (
                                          <span className="text-gray-500 ml-1.5">{formatted.description}</span>
                                        )}
                                      </div>
                                    )
                                  }

                                  // Fallback for other detail formats or if formatDetails didn't apply
                                  return (
                                    <div className="text-sm text-gray-600 line-clamp-2">
                                      {details}
                                    </div>
                                  )
                                })()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetail(log.id)}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Lihat Detail
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {hasMore && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={loadMore}
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  "Load More"
                                )}
                              </Button>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              {totalCount > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 text-sm text-gray-600">
                  Showing {logs.length} of {totalCount} logs
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Log Detail Modal */}
        <LogDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedLogId(null)
          }}
          logId={selectedLogId}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
