"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
      if (statusFilter) params.append('status', statusFilter)
      
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
      r.revenue.toString(),
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="converted">Converted</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
                      <Badge variant={getStatusBadgeVariant(referral.status)}>
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>Rp{referral.revenue.toLocaleString()}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Referral Details</DialogTitle>
            <DialogDescription>
              Detail informasi dan activity history
            </DialogDescription>
          </DialogHeader>
          {selectedReferral && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="activity">Activity History</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-sm font-medium">{selectedReferral.userName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-sm font-medium">{selectedReferral.userEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plan</label>
                    <p className="text-sm font-medium">{selectedReferral.planName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={getStatusBadgeVariant(selectedReferral.status)}>
                      {selectedReferral.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Revenue</label>
                    <p className="text-sm font-medium">Rp{selectedReferral.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm font-medium">
                      {format(new Date(selectedReferral.createdAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  {selectedReferral.convertedAt && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Converted At</label>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedReferral.convertedAt), 'dd MMM yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="activity" className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity history available
                  </p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.timestamp), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

