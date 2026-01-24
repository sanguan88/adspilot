"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Handshake, TrendingUp, DollarSign, Users, Search, Copy, CheckCircle, LogIn, Settings, Save, Edit } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard } from "@/lib/design-tokens"

interface Affiliate {
  id: string
  userId: string
  username: string
  email: string
  referralCode: string
  status: string
  totalReferrals: number
  totalCommissions: number
  pendingCommissions: number
  commissionRate: number | null
  createdAt: string
}

interface Referral {
  id: string
  affiliateId: string
  userId: string
  username: string
  email: string
  status: string
  convertedAt?: string
  createdAt: string
  affiliateName?: string
  affiliateEmail?: string
}

interface Commission {
  id: string
  affiliateId: string
  referralId: string
  amount: number
  type: string
  status: string
  createdAt: string
  affiliateName?: string
  affiliateEmail?: string
  username?: string
  email?: string
}

interface Payout {
  id: string
  affiliateId: string
  amount: number
  status: string
  processedAt?: string
  createdAt: string
  affiliateName?: string
  affiliateEmail?: string
}

export function AffiliatesManagementPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>("")
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState("")
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [globalSettings, setGlobalSettings] = useState({
    commissionRate: 10,
    minPayout: 50000,
    cookieExpiryDays: 30
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [isEditAffiliateOpen, setIsEditAffiliateOpen] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const handleImpersonate = async (affiliateId: string) => {
    try {
      const response = await authenticatedFetch(`/api/affiliates/${affiliateId}/impersonate`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.token) {
          // Store impersonation token
          localStorage.setItem('affiliate_impersonation_token', data.token)
          localStorage.setItem('affiliate_impersonation_id', affiliateId)

          // Open affiliate portal in new window/tab
          const affiliatePortalUrl = process.env.NEXT_PUBLIC_AFFILIATE_PORTAL_URL || 'https://aff.adspilot.id'
          window.open(`${affiliatePortalUrl}?impersonate=${data.token}`, '_blank')

          toast.success('Opening affiliate portal as this affiliate...')
        } else {
          toast.error(data.error || 'Failed to impersonate affiliate')
        }
      } else {
        toast.error('Failed to impersonate affiliate')
      }
    } catch (error) {
      console.error('Impersonation error:', error)
      toast.error('Failed to impersonate affiliate')
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch affiliates
      const affRes = await authenticatedFetch("/api/affiliates")
      const affData = await affRes.json()
      if (affData.success) {
        setAffiliates(affData.data.affiliates || [])
      }

      // Fetch referrals
      const refRes = await authenticatedFetch("/api/affiliates/referrals")
      const refData = await refRes.json()
      if (refData.success) {
        setReferrals(refData.data.referrals || [])
      }

      // Fetch commissions
      const commRes = await authenticatedFetch("/api/affiliates/commissions")
      const commData = await commRes.json()
      if (commData.success) {
        setCommissions(commData.data.commissions || [])
      }

      // Fetch payouts
      const payRes = await authenticatedFetch("/api/affiliates/payouts")
      const payData = await payRes.json()
      if (payData.success) {
        setPayouts(payData.data.payouts || [])
      }

      // Fetch Global Affiliate Settings
      const settingsRes = await authenticatedFetch("/api/settings")
      const settingsData = await settingsRes.json()
      if (settingsData.success && settingsData.data.affiliate) {
        setGlobalSettings(settingsData.data.affiliate)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGlobalSettings = async () => {
    try {
      setSavingSettings(true)
      const response = await authenticatedFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliate: globalSettings }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Affiliate configuration saved!")
      } else {
        toast.error(data.error || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Error saving configuration:", error)
      toast.error("An error occurred")
    } finally {
      setSavingSettings(false)
    }
  }

  const handleProcessPayout = async () => {
    if (!selectedAffiliate || !payoutAmount) {
      toast.error("Pilih affiliate dan masukkan amount")
      return
    }

    try {
      const response = await authenticatedFetch("/api/affiliates/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          affiliateId: selectedAffiliate,
          amount: parseFloat(payoutAmount),
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payout berhasil diproses")
        setIsPayoutDialogOpen(false)
        setPayoutAmount("")
        fetchData()
      } else {
        toast.error(data.error || "Gagal memproses payout")
      }
    } catch (error) {
      console.error("Error processing payout:", error)
      toast.error("Terjadi kesalahan saat memproses payout")
    }
  }

  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Referral code copied!")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleUpdateAffiliate = async () => {
    if (!editingAffiliate) return

    try {
      setUpdateLoading(true)
      const response = await authenticatedFetch(`/api/affiliates/${editingAffiliate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commissionRate: editingAffiliate.commissionRate,
          status: editingAffiliate.status
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Affiliate updated successfully")
        setIsEditAffiliateOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Failed to update affiliate")
      }
    } catch (error) {
      console.error("Update error:", error)
      toast.error("An error occurred")
    } finally {
      setUpdateLoading(false)
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

  const totalStats = {
    affiliates: affiliates.length,
    referrals: referrals.length,
    totalCommissions: commissions.reduce((sum, c) => sum + c.amount, 0),
    pendingPayouts: payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0),
  }

  const filteredAffiliates = affiliates.filter((aff) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        aff.username.toLowerCase().includes(searchLower) ||
        aff.email.toLowerCase().includes(searchLower) ||
        aff.referralCode.toLowerCase().includes(searchLower)
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
            <h1 className={pageLayout.headerTitle}>Affiliate Management</h1>
            <p className={pageLayout.headerDescription}>
              Kelola affiliate program dan commissions
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={gridLayouts.stats}>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Handshake className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Affiliates</p>
                <p className={summaryCard.value}>{totalStats.affiliates}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Users className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Referrals</p>
                <p className={summaryCard.value}>{totalStats.referrals}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <DollarSign className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Commissions</p>
                <p className={summaryCard.value}>{formatPrice(totalStats.totalCommissions)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <TrendingUp className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Pending Payouts</p>
                <p className={summaryCard.value}>{formatPrice(totalStats.pendingPayouts)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="affiliates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configurations
            </TabsTrigger>
          </TabsList>

          {/* Affiliates Tab */}
          <TabsContent value="affiliates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>All Affiliates</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search affiliates..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : filteredAffiliates.length === 0 ? (
                  <EmptyState
                    icon={<Handshake className="w-12 h-12" />}
                    title="No affiliates found"
                    description={
                      search
                        ? "Try adjusting your search terms"
                        : "No affiliates have been registered yet"
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead>Referrals</TableHead>
                        <TableHead>Total Commissions</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Comm. Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAffiliates.map((aff) => (
                        <TableRow key={aff.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{aff.username}</div>
                              <div className={typography.muted}>{aff.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {aff.referralCode}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyReferralCode(aff.referralCode)}
                                className="h-6 w-6 p-0"
                              >
                                {copiedCode === aff.referralCode ? (
                                  <CheckCircle className="w-3 h-3 text-success" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{aff.totalReferrals}</TableCell>
                          <TableCell>{formatPrice(aff.totalCommissions)}</TableCell>
                          <TableCell>{formatPrice(aff.pendingCommissions || 0)}</TableCell>
                          <TableCell>
                            {aff.commissionRate ? (
                              <Badge variant="outline" className="text-primary border-primary/20">
                                {aff.commissionRate}%
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">Default ({globalSettings.commissionRate}%)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(aff.status)}>
                              {aff.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAffiliate(aff)
                                  setIsEditAffiliateOpen(true)
                                }}
                                title="Edit Affiliate"
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImpersonate(aff.id)}
                                title="Login as this affiliate"
                                className="h-8 w-8 p-0"
                              >
                                <LogIn className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals">
            <Card>
              <CardHeader>
                <CardTitle>Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : referrals.length === 0 ? (
                  <EmptyState
                    icon={<Users className="w-12 h-12" />}
                    title="No referrals found"
                    description="No referrals have been tracked yet"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Converted At</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referrals.map((ref) => (
                        <TableRow key={ref.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{ref.username}</div>
                              <div className={typography.muted}>{ref.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {ref.affiliateName ? (
                              <div>
                                <div className="font-medium">{ref.affiliateName}</div>
                                <div className={typography.muted}>{ref.affiliateEmail}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">{ref.affiliateId}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(ref.status)}>
                              {ref.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ref.convertedAt
                              ? format(new Date(ref.convertedAt), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(ref.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : commissions.length === 0 ? (
                  <EmptyState
                    icon={<DollarSign className="w-12 h-12" />}
                    title="No commissions found"
                    description="No commissions have been generated yet"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((comm) => (
                        <TableRow key={comm.id}>
                          <TableCell>
                            {comm.affiliateName ? (
                              <div>
                                <div className="font-medium">{comm.affiliateName}</div>
                                <div className={typography.muted}>{comm.affiliateEmail}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">{comm.affiliateId}</span>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{comm.type}</TableCell>
                          <TableCell>{formatPrice(comm.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(comm.status)}>
                              {comm.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(comm.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payouts</CardTitle>
                  <Button onClick={() => setIsPayoutDialogOpen(true)}>
                    Process Payout
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : payouts.length === 0 ? (
                  <EmptyState
                    icon={<TrendingUp className="w-12 h-12" />}
                    title="No payouts found"
                    description="No payouts have been processed yet"
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout ID</TableHead>
                        <TableHead>Affiliate</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed At</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">{payout.id}</TableCell>
                          <TableCell>
                            {payout.affiliateName ? (
                              <div>
                                <div className="font-medium">{payout.affiliateName}</div>
                                <div className={typography.muted}>{payout.affiliateEmail}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">{payout.affiliateId}</span>
                            )}
                          </TableCell>
                          <TableCell>{formatPrice(payout.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(payout.status)}>
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payout.processedAt
                              ? format(new Date(payout.processedAt), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payout.createdAt), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Global Affiliate Configuration</CardTitle>
                    <p className={typography.mutedSmall}>Aturan standar untuk program affiliate</p>
                  </div>
                  <Button onClick={handleSaveGlobalSettings} disabled={savingSettings}>
                    <Save className="w-4 h-4 mr-2" />
                    {savingSettings ? "Saving..." : "Save Config"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className={gridLayouts.formGrid}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Commission Rate (%)</label>
                    <Input
                      type="number"
                      value={globalSettings.commissionRate}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, commissionRate: parseFloat(e.target.value) || 0 })}
                    />
                    <p className={typography.mutedSmall}>Berlaku untuk affiliate baru atau yang tidak memiliki rate khusus.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Minimum Payout (IDR)</label>
                    <Input
                      type="number"
                      value={globalSettings.minPayout}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, minPayout: parseInt(e.target.value) || 0 })}
                    />
                    <p className={typography.mutedSmall}>Batas minimum saldo untuk bisa ditarik.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cookie Expiry (Days)</label>
                    <Input
                      type="number"
                      value={globalSettings.cookieExpiryDays}
                      onChange={(e) => setGlobalSettings({ ...globalSettings, cookieExpiryDays: parseInt(e.target.value) || 30 })}
                    />
                    <p className={typography.mutedSmall}>Masa berlaku link referral setelah diklik user.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payout Dialog */}
        <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payout</DialogTitle>
              <DialogDescription>
                Process payout untuk affiliate
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Affiliate</label>
                <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.map((aff) => (
                      <SelectItem key={aff.id} value={aff.id}>
                        {aff.username} ({aff.referralCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (Rp)</label>
                <Input
                  type="number"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="Masukkan amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPayoutDialogOpen(false)}
              >
                Batal
              </Button>
              <Button onClick={handleProcessPayout}>Process</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Affiliate Dialog */}
        <Dialog open={isEditAffiliateOpen} onOpenChange={setIsEditAffiliateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Affiliate Settings</DialogTitle>
              <DialogDescription>
                Update individual settings for {editingAffiliate?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Commission Rate (%)</label>
                <Input
                  type="number"
                  placeholder={`Global Default: ${globalSettings.commissionRate}%`}
                  value={editingAffiliate?.commissionRate === null ? "" : editingAffiliate?.commissionRate}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : parseFloat(e.target.value)
                    if (editingAffiliate) setEditingAffiliate({ ...editingAffiliate, commissionRate: val })
                  }}
                />
                <p className="text-xs text-muted-foreground">Kosongkan untuk menggunakan rate global standard.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Affiliate Status</label>
                <Select
                  value={editingAffiliate?.status}
                  onValueChange={(val) => {
                    if (editingAffiliate) setEditingAffiliate({ ...editingAffiliate, status: val })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditAffiliateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAffiliate} disabled={updateLoading}>
                {updateLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
