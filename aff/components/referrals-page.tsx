"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Download, Eye, Calendar } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"

interface Referral {
  id: string
  userId: string
  userName: string
  userEmail: string
  planName: string
  status: 'pending' | 'converted' | 'cancelled'
  convertedAt?: string
  createdAt: string
  revenue: number
}

interface Activity {
  id: string
  type: string
  description: string
  timestamp: string
}

export function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  useEffect(() => {
    fetchReferrals()
  }, [statusFilter])

  const fetchReferrals = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== 'all_status') params.append('status', statusFilter)

      const response = await authenticatedFetch(`/api/referrals?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReferrals(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
      toast.error('Gagal memuat referrals')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActivities = async (referralId: string) => {
    try {
      const response = await authenticatedFetch(`/api/referrals/${referralId}/activities`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setActivities(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const handleViewDetails = (referral: Referral) => {
    setSelectedReferral(referral)
    setIsDialogOpen(true)
    fetchActivities(referral.id)
  }

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Plan', 'Status', 'Revenue', 'Converted At', 'Created At']
    const rows = referrals.map(r => [
      r.userName,
      r.userEmail,
      r.planName,
      r.status,
      (r.revenue || 0).toString(),
      r.convertedAt ? format(new Date(r.convertedAt), 'yyyy-MM-dd HH:mm') : '-',
      format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm'),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `referrals_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Data berhasil diekspor ke CSV')
  }

  const filteredReferrals = referrals.filter((ref) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        ref.userName.toLowerCase().includes(searchLower) ||
        ref.userEmail.toLowerCase().includes(searchLower) ||
        ref.planName.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Daftar user yang direfer beserta data dan activity history
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
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
                  placeholder="Cari nama, email, atau plan..."
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
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referrals List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : filteredReferrals.length === 0 ? (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Belum ada referrals"
              description="Mulai promosikan link Anda untuk mendapatkan referrals"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Converted At</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReferrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell className="font-medium">{referral.userName}</TableCell>
                    <TableCell>{referral.userEmail}</TableCell>
                    <TableCell>{referral.planName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeVariant(referral.status)}>
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>Rp{(referral.revenue || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {referral.convertedAt
                        ? format(new Date(referral.convertedAt), 'dd MMM yyyy HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(referral.createdAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(referral)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl min-h-[550px] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              Detail informasi dan activity history
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6">
            {selectedReferral && (
              <Tabs defaultValue="info" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="activity">Activity History</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-1">
                  <TabsContent value="info" className="mt-0 h-full">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Name</label>
                        <p className="text-sm font-medium text-foreground">{selectedReferral.userName}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email</label>
                        <p className="text-sm font-medium text-foreground break-all">{selectedReferral.userEmail}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Plan</label>
                        <p className="text-sm font-medium text-foreground">{selectedReferral.planName}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</label>
                        <div>
                          <Badge variant="outline" className={`${getStatusBadgeVariant(selectedReferral.status)} mt-1`}>
                            {selectedReferral.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Revenue</label>
                        <p className="text-sm font-medium text-emerald-600 font-mono">Rp{(selectedReferral.revenue || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1">
                        <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Created At</label>
                        <p className="text-sm font-medium text-foreground">
                          {format(new Date(selectedReferral.createdAt), 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                      {selectedReferral.convertedAt && (
                        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm space-y-1 col-span-2">
                          <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Converted At</label>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(selectedReferral.convertedAt), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0 h-full">
                    {activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center border-2 border-dashed rounded-lg bg-muted/20">
                        <Calendar className="w-10 h-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Belum ada riwayat aktivitas
                        </p>
                      </div>
                    ) : (
                      <div className="relative space-y-6 pt-2 pb-6 pl-2 before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {activities.map((activity, index) => (
                          <div key={activity.id} className="relative flex gap-4 group">
                            {/* Icon/Dot */}
                            <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border bg-background shadow-sm shrink-0 group-hover:border-primary/50 transition-colors">
                              {activity.type === 'purchase' ? (
                                <Download className="w-4 h-4 text-emerald-500" />
                              ) : activity.type === 'signup' ? (
                                <Users className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Calendar className="w-4 h-4 text-orange-500" />
                              )}
                            </div>

                            {/* Content Card */}
                            <div className="flex-1 p-4 rounded-lg border bg-card text-card-foreground shadow-sm group-hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-sm">
                                  {activity.type === 'purchase' ? 'Pembelian' : activity.type === 'signup' ? 'Registrasi' : 'Checkout'}
                                </span>
                                <time className="text-xs text-muted-foreground font-mono">
                                  {format(new Date(activity.timestamp), 'dd MMM HH:mm')}
                                </time>
                              </div>
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
