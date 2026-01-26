"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ShoppingCart,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard, filterPanel } from "@/lib/design-tokens"

interface Order {
  id: string
  transactionId?: string
  orderNumber: string
  userId: string
  username: string
  email: string
  namaLengkap?: string
  planId: string
  planName: string
  durationMonths?: number
  billingCycle?: string
  amount: number
  baseAmount?: number
  ppnAmount?: number
  uniqueCode?: number
  totalAmount?: number
  status: string
  paymentStatus: string
  paymentMethod: string
  paymentProofUrl?: string | null
  source: string
  voucherCode?: string | null
  referralCode?: string | null
  affiliateName?: string | null
  affiliateId?: string | null
  userStatus?: string
  paymentConfirmedAt?: string | null
  paymentConfirmedBy?: string | null
  paymentNotes?: string | null
  createdAt: string
  paidAt?: string | null
  activatedAt?: string | null
}

interface OrderAnalytics {
  funnel: {
    registrations: number
    orders: number
    paid: number
    activated: number
    conversionRates: {
      registrationToOrder: number
      orderToPaid: number
      paidToActivated: number
    }
  }
  ordersByStatus: Record<string, number>
  ordersBySource: Record<string, number>
  revenue: {
    total: number
    average: number
  }
}

export function OrdersManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [analytics, setAnalytics] = useState<OrderAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [planFilter, setPlanFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [orderBy, setOrderBy] = useState("created_at")
  const [orderDir, setOrderDir] = useState<"ASC" | "DESC">("DESC")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'confirm' | 'reject' | 'request_proof' | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [processing, setProcessing] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchOrders()
    fetchAnalytics()
  }, [page, statusFilter, planFilter, startDate, endDate, orderBy, orderDir])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "20")
      if (statusFilter) params.append("status", statusFilter)
      if (planFilter) params.append("planId", planFilter)
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (orderBy) params.append("orderBy", orderBy)
      if (orderDir) params.append("orderDir", orderDir)

      const response = await authenticatedFetch(`/api/orders?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setOrders(data.data.orders || [])
        setTotal(data.data.total || 0)
        setTotalPages(data.data.totalPages || 1)
      } else {
        toast.error(data.error || "Gagal memuat data orders")
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: string) => {
    if (orderBy === field) {
      setOrderDir(orderDir === "ASC" ? "DESC" : "ASC")
    } else {
      setOrderBy(field)
      setOrderDir("DESC")
    }
    setPage(1)
  }

  const fetchAnalytics = async () => {
    try {
      const response = await authenticatedFetch("/api/orders/analytics")
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  const handleViewDetail = async (order: Order) => {
    try {
      const response = await authenticatedFetch(`/api/orders/${order.id}`)
      const data = await response.json()

      if (data.success) {
        setSelectedOrder({ ...order, ...data.data })
        setIsDetailDialogOpen(true)
      }
    } catch (error) {
      console.error("Error fetching order detail:", error)
      toast.error("Gagal memuat detail order")
    }
  }

  const handleActionPayment = (order: Order) => {
    setSelectedOrder(order)
    setActionType(null)
    setActionNotes("")
    setIsActionDialogOpen(true)
  }

  const handleDownloadInvoice = async (transactionId: string) => {
    try {
      const response = await authenticatedFetch(`/api/invoices/${transactionId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Gagal mengunduh invoice')
      }

      // Get PDF blob
      const blob = await response.blob()

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${transactionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Invoice berhasil diunduh!')
    } catch (error: any) {
      console.error('Download invoice error:', error)
      toast.error(error.message || 'Gagal mengunduh invoice')
    }
  }

  const handleActionSubmit = async () => {
    if (!selectedOrder || !actionType) return

    // Validate notes for reject and request_proof
    if ((actionType === 'reject' || actionType === 'request_proof') && !actionNotes.trim()) {
      toast.error("Catatan wajib diisi untuk action ini")
      return
    }

    try {
      setProcessing(true)
      const response = await authenticatedFetch(`/api/orders/${selectedOrder.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          notes: actionNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const messages = {
          confirm: "Pembayaran berhasil dikonfirmasi",
          reject: "Pembayaran ditolak",
          request_proof: "Request bukti pembayaran berhasil dikirim",
        }
        toast.success(messages[actionType])
        setIsActionDialogOpen(false)
        setActionType(null)
        setActionNotes("")
        fetchOrders() // Refresh orders list
        if (isDetailDialogOpen) {
          handleViewDetail(selectedOrder) // Refresh detail
        }
      } else {
        toast.error(data.error || "Gagal memproses action")
      }
    } catch (error) {
      console.error("Error processing action:", error)
      toast.error("Terjadi kesalahan saat memproses action")
    } finally {
      setProcessing(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const getStatusBadge = (status: string) => {
    return getStatusBadgeVariant(status)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4 text-success" />
      case "failed":
        return <XCircle className="w-4 h-4 text-destructive" />
      case "processing":
        return <Clock className="w-4 h-4 text-info" />
      default:
        return <Clock className="w-4 h-4 text-warning" />
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.username.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        {/* Header */}
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Order Management</h1>
            <p className={pageLayout.headerDescription}>
              Track orders dari registrasi hingga payment sukses
            </p>
          </div>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className={gridLayouts.stats}>
            <Card className={summaryCard.container}>
              <CardContent className={summaryCard.content}>
                <div className={summaryCard.layoutVertical}>
                  <Users className={summaryCard.iconTop} />
                  <p className={summaryCard.label}>Registrations</p>
                  <p className={summaryCard.value}>{analytics.funnel.registrations}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={summaryCard.container}>
              <CardContent className={summaryCard.content}>
                <div className={summaryCard.layoutVertical}>
                  <ShoppingCart className={summaryCard.iconTop} />
                  <p className={summaryCard.label}>Orders</p>
                  <p className={summaryCard.value}>{analytics.funnel.orders}</p>
                  <p className={summaryCard.description}>
                    {analytics.funnel.conversionRates.registrationToOrder.toFixed(1)}% conversion
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={summaryCard.container}>
              <CardContent className={summaryCard.content}>
                <div className={summaryCard.layoutVertical}>
                  <CheckCircle className={`${componentSizes.cardIcon} text-success mb-2`} />
                  <p className={summaryCard.label}>Paid</p>
                  <p className={summaryCard.value}>{analytics.funnel.paid}</p>
                  <p className={summaryCard.description}>
                    {analytics.funnel.conversionRates.orderToPaid.toFixed(1)}% conversion
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={summaryCard.container}>
              <CardContent className={summaryCard.content}>
                <div className={summaryCard.layoutVertical}>
                  <DollarSign className={summaryCard.iconTop} />
                  <p className={summaryCard.label}>Total Revenue</p>
                  <p className={summaryCard.value}>{formatPrice(analytics.revenue.total)}</p>
                  <p className={summaryCard.description}>
                    Avg: {formatPrice(analytics.revenue.average)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Conversion Funnel */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={typography.labelSmall}>Registrations</span>
                    <span className="text-xs font-semibold">{analytics.funnel.registrations}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={typography.labelSmall}>Orders Created</span>
                    <span className="text-xs font-semibold">
                      {analytics.funnel.orders} ({analytics.funnel.conversionRates.registrationToOrder.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{
                        width: `${analytics.funnel.conversionRates.registrationToOrder}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={typography.labelSmall}>Paid</span>
                    <span className="text-xs font-semibold">
                      {analytics.funnel.paid} ({analytics.funnel.conversionRates.orderToPaid.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-success h-1.5 rounded-full"
                      style={{
                        width: `${analytics.funnel.conversionRates.orderToPaid}%`,
                      }}
                    ></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={typography.labelSmall}>Activated</span>
                    <span className="text-xs font-semibold">
                      {analytics.funnel.activated} ({analytics.funnel.conversionRates.paidToActivated.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-success h-1.5 rounded-full"
                      style={{
                        width: `${analytics.funnel.conversionRates.paidToActivated}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className={filterPanel.container}>
          <CardContent className={filterPanel.content}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Order ID / Username"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter || "all"} onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="waiting_confirmation">Menunggu Verifikasi</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Plan Filter */}
              <Select value={planFilter || "all"} onValueChange={(value) => {
                setPlanFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Paket</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="basic">Basic (Monthly)</SelectItem>
                  <SelectItem value="silver">Silver (Monthly)</SelectItem>
                  <SelectItem value="gold">Gold (Monthly)</SelectItem>
                  <SelectItem value="1-month">Paket 1 Bulan</SelectItem>
                  <SelectItem value="3-month">Paket 3 Bulan</SelectItem>
                  <SelectItem value="6-month">Paket 6 Bulan</SelectItem>
                  <SelectItem value="12-month">Paket 12 Bulan</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filters */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setPage(1)
                    }}
                    className="text-xs"
                    title="Start Date"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setPage(1)
                    }}
                    className="text-xs"
                    title="End Date"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className={typography.muted}>
                Total: <span className="font-semibold text-foreground ml-1">{total}</span> orders
              </div>

              {(search || statusFilter || planFilter || startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("")
                    setPlanFilter("")
                    setStartDate("")
                    setEndDate("")
                    setPage(1)
                  }}
                  className="text-xs h-8"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={9} />
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingCart className="w-12 h-12" />}
                title="Tidak ada order ditemukan"
                description={
                  search || statusFilter
                    ? "Coba ubah filter atau kata kunci pencarian"
                    : "Belum ada order yang dibuat"
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('transaction_id')}>
                        Transaction ID {orderBy === 'transaction_id' && (orderDir === 'ASC' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('plan_id')}>
                        Plan {orderBy === 'plan_id' && (orderDir === 'ASC' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('total_amount')}>
                        Total {orderBy === 'total_amount' && (orderDir === 'ASC' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Kupon</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('payment_status')}>
                        Status {orderBy === 'payment_status' && (orderDir === 'ASC' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Bukti</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort('created_at')}>
                        Created At {orderBy === 'created_at' && (orderDir === 'ASC' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium font-mono text-xs">
                          {order.transactionId || order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.username}</div>
                            <div className={typography.muted}>{order.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.planName}</div>
                          {order.durationMonths && (
                            <div className="text-[10px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded w-fit mt-1">
                              {order.durationMonths} {order.billingCycle === 'monthly' ? 'Bulan' : order.billingCycle === 'annually' ? 'Tahun' : 'Bulan'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {formatPrice(order.totalAmount || order.amount)}
                        </TableCell>
                        <TableCell>
                          {order.voucherCode ? (
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {order.voucherCode}
                            </Badge>
                          ) : (
                            <span className={typography.muted}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.referralCode ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-blue-600 text-xs">{order.referralCode}</span>
                              </div>
                              {order.affiliateName && (
                                <div className="text-[10px] text-muted-foreground font-medium">
                                  {order.affiliateName}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className={typography.muted}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(order.paymentStatus)}>
                            {order.paymentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.paymentProofUrl ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ada
                            </Badge>
                          ) : order.paymentStatus === 'pending' ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <Clock className="w-3 h-3 mr-1" />
                              Belum
                            </Badge>
                          ) : (
                            <span className={typography.muted}>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(order.paymentStatus === 'pending' || order.paymentStatus === 'waiting_confirmation') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleActionPayment(order)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Tindakan
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className={typography.muted}>
                      Halaman {page} dari {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3">
              <DialogTitle className="text-lg">Order Details</DialogTitle>
              <DialogDescription className="text-xs font-mono">
                {selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
                    <div>
                      <p className="text-sm font-medium">{selectedOrder.username}</p>
                      <p className="text-xs text-muted-foreground">{selectedOrder.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan</label>
                    <p className="text-sm">{selectedOrder.planName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                    <Badge className={getStatusBadge(selectedOrder.status)} variant="outline">
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Status</label>
                    <Badge className={getStatusBadge(selectedOrder.paymentStatus)} variant="outline">
                      {selectedOrder.paymentStatus}
                    </Badge>
                  </div>
                  <div className="col-span-3 border-t pt-3">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Payment Breakdown</label>
                    <div className="space-y-1.5">
                      {selectedOrder.baseAmount && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Harga Paket:</span>
                          <span>{formatPrice(selectedOrder.baseAmount)}</span>
                        </div>
                      )}
                      {selectedOrder.ppnAmount && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">PPN (11%):</span>
                          <span>{formatPrice(selectedOrder.ppnAmount)}</span>
                        </div>
                      )}
                      {selectedOrder.uniqueCode && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Kode Unik:</span>
                          <span className="font-mono font-semibold">{selectedOrder.uniqueCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                        <span>Total Amount:</span>
                        <span>{formatPrice(selectedOrder.totalAmount || selectedOrder.amount)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
                    <p className="text-sm capitalize">{selectedOrder.paymentMethod}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                    <p className="text-sm capitalize">{selectedOrder.source}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Created At</label>
                    <p className="text-xs">
                      {format(new Date(selectedOrder.createdAt), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                  {selectedOrder.paymentProofUrl && (
                    <div className="col-span-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bukti Pembayaran</label>
                      <div
                        className="border rounded-md p-2 bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => {
                          setPreviewImageUrl(selectedOrder.paymentProofUrl || null)
                          setIsImagePreviewOpen(true)
                        }}
                      >
                        {(() => {
                          // Payment proofs are uploaded to User Portal (app.adspilot.id)
                          // Need to use absolute URL since we're on Admin Portal (adm.adspilot.id)
                          const userPortalUrl = process.env.NEXT_PUBLIC_USER_PORTAL_URL || 'https://app.adspilot.id'
                          let imageUrl = selectedOrder.paymentProofUrl

                          if (imageUrl?.startsWith('/api/uploads') || imageUrl?.startsWith('/uploads')) {
                            imageUrl = `${userPortalUrl}${imageUrl}`
                          }

                          return (
                            <img
                              src={imageUrl}
                              alt="Bukti Pembayaran"
                              className="max-w-full h-auto max-h-32 rounded"
                              onError={(e) => {
                                console.error('Image load error:', imageUrl, selectedOrder.paymentProofUrl)
                                  ; (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          )
                        })()}
                      </div>
                    </div>
                  )}
                  {selectedOrder.paidAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Paid At</label>
                      <p className="text-xs">
                        {format(new Date(selectedOrder.paidAt), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                  {selectedOrder.activatedAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Activated At</label>
                      <p className="text-xs">
                        {format(new Date(selectedOrder.activatedAt), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timeline - Compact */}
                {(selectedOrder.paidAt || selectedOrder.activatedAt) && (
                  <div className="border-t pt-3">
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Timeline</label>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Order created</span>
                        <span className="text-muted-foreground ml-auto">
                          {format(new Date(selectedOrder.createdAt), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                      {selectedOrder.paidAt && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">Payment completed</span>
                          <span className="text-muted-foreground ml-auto">
                            {format(new Date(selectedOrder.paidAt), "dd MMM yyyy HH:mm")}
                          </span>
                        </div>
                      )}
                      {selectedOrder.activatedAt && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className="text-muted-foreground">Subscription activated</span>
                          <span className="text-muted-foreground ml-auto">
                            {format(new Date(selectedOrder.activatedAt), "dd MMM yyyy HH:mm")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedOrder && (selectedOrder.paymentStatus === 'pending' || selectedOrder.paymentStatus === 'waiting_confirmation') && (
                <Button
                  variant="default"
                  onClick={() => {
                    setIsDetailDialogOpen(false)
                    handleActionPayment(selectedOrder)
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Tindakan Pembayaran
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedOrder?.transactionId) {
                    handleDownloadInvoice(selectedOrder.transactionId)
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Action Dialog */}
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tindakan Pembayaran</DialogTitle>
              <DialogDescription>
                Pilih tindakan untuk transaksi: {selectedOrder?.transactionId || selectedOrder?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Transaction Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">User</Label>
                    <p className="text-sm font-medium">{selectedOrder.username}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Paket</Label>
                    <p className="text-sm font-medium">{selectedOrder.planName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Pembayaran</Label>
                    <p className="text-sm font-semibold">{formatPrice(selectedOrder.totalAmount || selectedOrder.amount)}</p>
                  </div>
                  {selectedOrder.uniqueCode && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Kode Unik</Label>
                      <p className="text-sm font-mono font-semibold">{selectedOrder.uniqueCode}</p>
                    </div>
                  )}
                </div>

                {/* Action Selection */}
                <div className="space-y-3">
                  <Label>Pilih Tindakan</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Confirm Action */}
                    <button
                      type="button"
                      onClick={() => setActionType('confirm')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${actionType === 'confirm'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-border hover:border-green-300'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${actionType === 'confirm' ? 'bg-green-500' : 'bg-muted'
                          }`}>
                          <CheckCircle className={`w-5 h-5 ${actionType === 'confirm' ? 'text-white' : 'text-muted-foreground'
                            }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-green-700 dark:text-green-400">
                            Konfirmasi Pembayaran
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Pembayaran valid dan sesuai. User akan diaktifkan.
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Reject Action */}
                    <button
                      type="button"
                      onClick={() => setActionType('reject')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${actionType === 'reject'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-border hover:border-red-300'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${actionType === 'reject' ? 'bg-red-500' : 'bg-muted'
                          }`}>
                          <XCircle className={`w-5 h-5 ${actionType === 'reject' ? 'text-white' : 'text-muted-foreground'
                            }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-red-700 dark:text-red-400">
                            Tolak Pembayaran
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Pembayaran invalid/tidak sesuai. User tetap pending.
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Request Proof Action */}
                    <button
                      type="button"
                      onClick={() => setActionType('request_proof')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${actionType === 'request_proof'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-border hover:border-blue-300'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${actionType === 'request_proof' ? 'bg-blue-500' : 'bg-muted'
                          }`}>
                          <Clock className={`w-5 h-5 ${actionType === 'request_proof' ? 'text-white' : 'text-muted-foreground'
                            }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-blue-700 dark:text-blue-400">
                            Request Bukti Ulang
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Minta bukti pembayaran yang lebih jelas. Status tetap pending.
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Notes Input */}
                {actionType && (
                  <div className="space-y-2">
                    <Label htmlFor="actionNotes">
                      Catatan {actionType === 'confirm' ? '(Opsional)' : '(Wajib)'}
                    </Label>
                    <Textarea
                      id="actionNotes"
                      placeholder={
                        actionType === 'confirm'
                          ? 'Tambahkan catatan untuk konfirmasi pembayaran...'
                          : actionType === 'reject'
                            ? 'Jelaskan alasan penolakan pembayaran...'
                            : 'Jelaskan bukti pembayaran yang dibutuhkan...'
                      }
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows={3}
                      required={actionType !== 'confirm'}
                    />
                  </div>
                )}

                {/* Warning for Confirm */}
                {actionType === 'confirm' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-900 dark:text-yellow-200">
                      <strong>Peringatan:</strong> Setelah dikonfirmasi, status user akan berubah menjadi aktif dan user dapat mengakses aplikasi.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsActionDialogOpen(false)
                  setActionType(null)
                  setActionNotes("")
                }}
                disabled={processing}
              >
                Batal
              </Button>
              <Button
                variant="default"
                onClick={handleActionSubmit}
                disabled={processing || !actionType || ((actionType === 'reject' || actionType === 'request_proof') && !actionNotes.trim())}
                className={
                  actionType === 'confirm'
                    ? 'bg-green-600 hover:bg-green-700'
                    : actionType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }
              >
                {processing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    {actionType === 'confirm' && (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Konfirmasi Pembayaran
                      </>
                    )}
                    {actionType === 'reject' && (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Tolak Pembayaran
                      </>
                    )}
                    {actionType === 'request_proof' && (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Request Bukti Ulang
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Modal */}
        <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>Preview Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            {previewImageUrl && (
              <div className="px-6 pb-6">
                <div className="border rounded-lg overflow-hidden bg-muted/50 flex items-center justify-center min-h-[400px]">
                  {/* Convert relative path to absolute URL if needed */}
                  {(() => {
                    // Payment proofs are uploaded to User Portal (app.adspilot.id)
                    // Need to use absolute URL since we're on Admin Portal (adm.adspilot.id)
                    const userPortalUrl = process.env.NEXT_PUBLIC_USER_PORTAL_URL || 'https://app.adspilot.id'
                    let imageUrl = previewImageUrl

                    if (imageUrl?.startsWith('/api/uploads') || imageUrl?.startsWith('/uploads')) {
                      imageUrl = `${userPortalUrl}${imageUrl}`
                    }

                    return (
                      <img
                        src={imageUrl}
                        alt="Bukti Pembayaran"
                        className="w-full h-auto max-h-[70vh] object-contain"
                        onError={(e) => {
                          console.error('Image load error:', imageUrl, previewImageUrl)
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          // Show error message
                          const parent = target.parentElement
                          if (parent && !parent.querySelector('.error-message')) {
                            const errorDiv = document.createElement('div')
                            errorDiv.className = 'error-message text-center p-4 text-muted-foreground'
                            errorDiv.textContent = 'Gagal memuat gambar. Pastikan file ada di server.'
                            parent.appendChild(errorDiv)
                          }
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', imageUrl)
                        }}
                      />
                    )
                  })()}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="default"
                    onClick={() => setIsImagePreviewOpen(false)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

