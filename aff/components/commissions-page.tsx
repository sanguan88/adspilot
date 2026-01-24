"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign, Search, Calendar, TrendingUp } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"

interface Commission {
  id: string
  referralId: string
  referralName: string
  transactionId: string
  type: 'first_payment' | 'recurring'
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'cancelled'
  createdAt: string
  paidAt?: string
  payoutId?: string
}

export function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    firstPayment: 0,
    recurring: 0,
  })

  useEffect(() => {
    fetchCommissions()
  }, [statusFilter, typeFilter])

  const fetchCommissions = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all_status') params.append('status', statusFilter)
      if (typeFilter && typeFilter !== 'all_types') params.append('type', typeFilter)

      const response = await authenticatedFetch(`/api/commissions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCommissions(data.data || [])
          if (data.summary) {
            setSummary(data.summary)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching commissions:', error)
      toast.error('Gagal memuat commissions')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCommissions = commissions.filter((comm) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        comm.referralName.toLowerCase().includes(searchLower) ||
        comm.transactionId.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
        <p className="text-sm text-muted-foreground">
          Riwayat komisi dari first payment dan recurring payments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{summary.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{summary.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Akan dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{summary.paid.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Sudah dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{summary.firstPayment.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Komisi pertama</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recurring</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp{summary.recurring.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Komisi berulang</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cari referral atau order ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_status">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_types">All Types</SelectItem>
                  <SelectItem value="first_payment">First Payment</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commissions List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : filteredCommissions.length === 0 ? (
            <EmptyState
              icon={<DollarSign className="w-12 h-12" />}
              title="Belum ada commissions"
              description="Commissions akan muncul setelah referral melakukan pembayaran"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referral</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Paid At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">{commission.referralName}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {commission.transactionId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={commission.type === 'first_payment' ? 'default' : 'secondary'}>
                        {commission.type === 'first_payment' ? 'First Payment' : 'Recurring'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      Rp{commission.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(commission.status)}>
                        {commission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(commission.createdAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {commission.paidAt
                        ? format(new Date(commission.paidAt), 'dd MMM yyyy HH:mm')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

