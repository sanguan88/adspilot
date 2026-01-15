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
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Ticket,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Calendar,
  DollarSign,
  Percent,
  Users,
  CheckCircle2,
  XCircle
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { useConfirm } from "@/components/providers/confirmation-provider"
import { TableSkeleton } from "@/components/ui/loading-skeleton"

interface Voucher {
  id: number
  code: string
  name: string
  description?: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  startDate?: string | null
  expiryDate: string
  isActive: boolean
  maxUsagePerUser?: number | null
  maxTotalUsage?: number | null
  applicablePlans: string[]
  minimumPurchase?: number | null
  maximumDiscount?: number | null
  usageCount: number
  uniqueUsersCount: number
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  updatedBy?: string | null

  notes?: string | null
  applicableType: 'all' | 'subscription' | 'addon'
}

export function VouchersManagementPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<string>("") // 'true', 'false', or '' (all)

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null)
  const confirm = useConfirm()

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: "",
    startDate: "",
    expiryDate: "",
    isActive: true,
    maxUsagePerUser: "",
    maxTotalUsage: "",
    applicablePlans: [] as string[],
    minimumPurchase: "",
    maximumDiscount: "",

    notes: "",
    applicableType: 'all' as 'all' | 'subscription' | 'addon',
  })

  useEffect(() => {
    fetchVouchers()
  }, [isActiveFilter])

  const fetchVouchers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (isActiveFilter) {
        params.append('isActive', isActiveFilter)
      }
      if (search) {
        params.append('search', search)
      }

      const response = await authenticatedFetch(`/api/vouchers?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setVouchers(result.data)
      } else {
        toast.error(result.error || 'Gagal memuat data voucher')
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error)
      toast.error('Gagal memuat data voucher')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchVouchers()
  }

  const handleCreate = async () => {
    try {
      // Validate
      if (!formData.code || !formData.name || !formData.expiryDate) {
        toast.error('Code, name, dan expiry date harus diisi')
        return
      }

      if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
        toast.error('Discount value harus lebih dari 0')
        return
      }

      if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
        toast.error('Percentage discount tidak boleh lebih dari 100%')
        return
      }

      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        startDate: formData.startDate || null,
        expiryDate: formData.expiryDate,
        isActive: formData.isActive,
        maxUsagePerUser: formData.maxUsagePerUser ? parseInt(formData.maxUsagePerUser) : null,
        maxTotalUsage: formData.maxTotalUsage ? parseInt(formData.maxTotalUsage) : null,
        applicablePlans: formData.applicablePlans.length > 0 ? formData.applicablePlans : null,
        minimumPurchase: formData.minimumPurchase ? parseFloat(formData.minimumPurchase) : null,
        maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,

        notes: formData.notes || null,
        applicableType: formData.applicableType,
      }

      const response = await authenticatedFetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Voucher berhasil dibuat')
        setIsCreateDialogOpen(false)
        resetForm()
        fetchVouchers()
      } else {
        toast.error(result.error || 'Gagal membuat voucher')
      }
    } catch (error) {
      console.error('Error creating voucher:', error)
      toast.error('Gagal membuat voucher')
    }
  }

  const handleEdit = async () => {
    if (!editingVoucher) return

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        startDate: formData.startDate || null,
        expiryDate: formData.expiryDate,
        isActive: formData.isActive,
        maxUsagePerUser: formData.maxUsagePerUser ? parseInt(formData.maxUsagePerUser) : null,
        maxTotalUsage: formData.maxTotalUsage ? parseInt(formData.maxTotalUsage) : null,
        applicablePlans: formData.applicablePlans.length > 0 ? formData.applicablePlans : null,
        minimumPurchase: formData.minimumPurchase ? parseFloat(formData.minimumPurchase) : null,
        maximumDiscount: formData.maximumDiscount ? parseFloat(formData.maximumDiscount) : null,
        notes: formData.notes || null,
        applicableType: formData.applicableType,
      }

      // Only update code if changed
      if (formData.code !== editingVoucher.code) {
        (payload as any).code = formData.code
      }

      const response = await authenticatedFetch(`/api/vouchers/${editingVoucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Voucher berhasil diupdate')
        setIsEditDialogOpen(false)
        setEditingVoucher(null)
        resetForm()
        fetchVouchers()
      } else {
        toast.error(result.error || 'Gagal mengupdate voucher')
      }
    } catch (error) {
      console.error('Error updating voucher:', error)
      toast.error('Gagal mengupdate voucher')
    }
  }

  const handleDelete = async (voucher: Voucher) => {
    const confirmed = await confirm({
      title: "Hapus Voucher?",
      description: `Yakin ingin menghapus voucher "${voucher.code}"?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/vouchers/${voucher.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Voucher berhasil dihapus')
        fetchVouchers()
      } else {
        toast.error(result.error || 'Gagal menghapus voucher')
      }
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error('Gagal menghapus voucher')
    }
  }

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const response = await authenticatedFetch(`/api/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !voucher.isActive }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`Voucher berhasil ${!voucher.isActive ? 'diaktifkan' : 'dinonaktifkan'}`)
        fetchVouchers()
      } else {
        toast.error(result.error || 'Gagal mengupdate status voucher')
      }
    } catch (error) {
      console.error('Error toggling voucher status:', error)
      toast.error('Gagal mengupdate status voucher')
    }
  }

  const openEditDialog = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || "",
      discountType: voucher.discountType,
      discountValue: voucher.discountValue.toString(),
      startDate: voucher.startDate ? format(new Date(voucher.startDate), 'yyyy-MM-dd\'T\'HH:mm') : "",
      expiryDate: format(new Date(voucher.expiryDate), 'yyyy-MM-dd\'T\'HH:mm'),
      isActive: voucher.isActive,
      maxUsagePerUser: voucher.maxUsagePerUser?.toString() || "",
      maxTotalUsage: voucher.maxTotalUsage?.toString() || "",
      applicablePlans: voucher.applicablePlans || [],
      minimumPurchase: voucher.minimumPurchase?.toString() || "",
      maximumDiscount: voucher.maximumDiscount?.toString() || "",

      notes: voucher.notes || "",
      applicableType: voucher.applicableType || 'all',
    })
    setIsEditDialogOpen(true)
  }

  const openUsageDialog = (voucherId: number) => {
    setSelectedVoucherId(voucherId)
    setIsUsageDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      discountType: 'percentage',
      discountValue: "",
      startDate: "",
      expiryDate: "",
      isActive: true,
      maxUsagePerUser: "",
      maxTotalUsage: "",
      applicablePlans: [],
      minimumPurchase: "",
      maximumDiscount: "",

      notes: "",
      applicableType: 'all',
    })
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discountType === 'percentage') {
      return `${voucher.discountValue}%`
    } else {
      return formatPrice(voucher.discountValue)
    }
  }

  const filteredVouchers = vouchers.filter((voucher) => {
    const searchLower = search.toLowerCase()
    return (
      voucher.code.toLowerCase().includes(searchLower) ||
      voucher.name.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voucher Management</h1>
          <p className="text-muted-foreground mt-1">
            Kelola voucher dan promo code untuk subscription
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Voucher
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by code or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Select value={isActiveFilter || "all"} onValueChange={(value) => setIsActiveFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : filteredVouchers.length === 0 ? (
            <EmptyState
              icon={<Ticket className="w-12 h-12" />}
              title="No vouchers found"
              description={
                search || isActiveFilter
                  ? "Try adjusting your filters or search terms"
                  : "No vouchers have been created yet"
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="font-mono font-semibold">
                      {voucher.code}
                    </TableCell>
                    <TableCell>{voucher.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {voucher.discountType === 'percentage' ? (
                          <Percent className="w-4 h-4" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                        <span>{formatDiscount(voucher)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(voucher.expiryDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={voucher.isActive ? "default" : "secondary"}>
                        {voucher.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{voucher.usageCount} uses</span>
                        <span className="text-muted-foreground">({voucher.uniqueUsersCount} users)</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(voucher.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUsageDialog(voucher.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(voucher)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(voucher)}
                        >
                          {voucher.isActive ? (
                            <XCircle className="w-4 h-4 text-orange-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(voucher)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Voucher</DialogTitle>
            <DialogDescription>
              Create a new voucher/promo code for subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Voucher Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DISCOUNT10"
                />
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="10% Discount Voucher"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Voucher description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountType">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'percentage' | 'fixed') =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="discountValue">
                  Discount Value *
                  {formData.discountType === 'percentage' ? ' (%)' : ' (Rp)'}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === 'percentage' ? "10" : "50000"}
                />
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div>
                <Label htmlFor="maximumDiscount">Maximum Discount (Rp) - Optional</Label>
                <Input
                  id="maximumDiscount"
                  type="number"
                  value={formData.maximumDiscount}
                  onChange={(e) => setFormData({ ...formData, maximumDiscount: e.target.value })}
                  placeholder="200000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum discount amount untuk percentage type
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date - Optional</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="datetime-local"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="applicableType">Applicable Context</Label>
                <Select
                  value={formData.applicableType}
                  onValueChange={(value: 'all' | 'subscription' | 'addon') =>
                    setFormData({ ...formData, applicableType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="subscription">Subscription Only</SelectItem>
                    <SelectItem value="addon">Addon Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimumPurchase">Minimum Purchase (Rp) - Optional</Label>
                <Input
                  id="minimumPurchase"
                  type="number"
                  value={formData.minimumPurchase}
                  onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                  placeholder="500000"
                />
              </div>
              {formData.applicableType !== 'addon' && (
                <div>
                  <Label htmlFor="applicablePlans">Applicable Plans</Label>
                  <Select
                    value={formData.applicablePlans.length > 0 ? formData.applicablePlans.join(',') : 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFormData({ ...formData, applicablePlans: [] })
                      } else {
                        setFormData({ ...formData, applicablePlans: value.split(',') })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plans..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="1-month">1-month only</SelectItem>
                      <SelectItem value="3-month">3-month only</SelectItem>
                      <SelectItem value="6-month">6-month only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUsagePerUser">Max Usage Per User - Optional</Label>
                <Input
                  id="maxUsagePerUser"
                  type="number"
                  value={formData.maxUsagePerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsagePerUser: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <Label htmlFor="maxTotalUsage">Max Total Usage - Optional</Label>
                <Input
                  id="maxTotalUsage"
                  type="number"
                  value={formData.maxTotalUsage}
                  onChange={(e) => setFormData({ ...formData, maxTotalUsage: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes - Optional</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Voucher</DialogTitle>
            <DialogDescription>
              Update voucher details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-code">Voucher Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="DISCOUNT10"
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="10% Discount Voucher"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Voucher description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-discountType">Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(value: 'percentage' | 'fixed') =>
                    setFormData({ ...formData, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-discountValue">
                  Discount Value *
                  {formData.discountType === 'percentage' ? ' (%)' : ' (Rp)'}
                </Label>
                <Input
                  id="edit-discountValue"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === 'percentage' ? "10" : "50000"}
                />
              </div>
            </div>

            {formData.discountType === 'percentage' && (
              <div>
                <Label htmlFor="edit-maximumDiscount">Maximum Discount (Rp) - Optional</Label>
                <Input
                  id="edit-maximumDiscount"
                  type="number"
                  value={formData.maximumDiscount}
                  onChange={(e) => setFormData({ ...formData, maximumDiscount: e.target.value })}
                  placeholder="200000"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date - Optional</Label>
                <Input
                  id="edit-startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-expiryDate">Expiry Date *</Label>
                <Input
                  id="edit-expiryDate"
                  type="datetime-local"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-applicableType">Applicable Context</Label>
                <Select
                  value={formData.applicableType}
                  onValueChange={(value: 'all' | 'subscription' | 'addon') =>
                    setFormData({ ...formData, applicableType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="subscription">Subscription Only</SelectItem>
                    <SelectItem value="addon">Addon Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-minimumPurchase">Minimum Purchase (Rp) - Optional</Label>
                <Input
                  id="edit-minimumPurchase"
                  type="number"
                  value={formData.minimumPurchase}
                  onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                  placeholder="500000"
                />
              </div>
              {formData.applicableType !== 'addon' && (
                <div>
                  <Label htmlFor="edit-applicablePlans">Applicable Plans</Label>
                  <Select
                    value={formData.applicablePlans.length > 0 ? formData.applicablePlans.join(',') : 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFormData({ ...formData, applicablePlans: [] })
                      } else {
                        setFormData({ ...formData, applicablePlans: value.split(',') })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plans..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="1-month">1-month only</SelectItem>
                      <SelectItem value="3-month">3-month only</SelectItem>
                      <SelectItem value="6-month">6-month only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-maxUsagePerUser">Max Usage Per User - Optional</Label>
                <Input
                  id="edit-maxUsagePerUser"
                  type="number"
                  value={formData.maxUsagePerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsagePerUser: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
              <div>
                <Label htmlFor="edit-maxTotalUsage">Max Total Usage - Optional</Label>
                <Input
                  id="edit-maxTotalUsage"
                  type="number"
                  value={formData.maxTotalUsage}
                  onChange={(e) => setFormData({ ...formData, maxTotalUsage: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes - Optional</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update Voucher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      <VoucherUsageDialog
        isOpen={isUsageDialogOpen}
        onClose={() => setIsUsageDialogOpen(false)}
        voucherId={selectedVoucherId}
      />
    </div>
  )
}

// Voucher Usage Dialog Component
function VoucherUsageDialog({
  isOpen,
  onClose,
  voucherId
}: {
  isOpen: boolean
  onClose: () => void
  voucherId: number | null
}) {
  const [usage, setUsage] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [voucherInfo, setVoucherInfo] = useState<any>(null)

  useEffect(() => {
    if (isOpen && voucherId) {
      fetchUsage()
    }
  }, [isOpen, voucherId])

  const fetchUsage = async () => {
    if (!voucherId) return

    try {
      setLoading(true)
      const response = await authenticatedFetch(`/api/vouchers/${voucherId}/usage`)
      const result = await response.json()

      if (result.success) {
        setVoucherInfo(result.data.voucher)
        setUsage(result.data.usage)
      } else {
        toast.error(result.error || 'Gagal memuat usage history')
      }
    } catch (error) {
      console.error('Error fetching usage:', error)
      toast.error('Gagal memuat usage history')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Voucher Usage History
            {voucherInfo && (
              <span className="text-lg font-mono ml-2 text-muted-foreground">
                ({voucherInfo.code})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            View all transactions that used this voucher
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : usage.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No usage history found
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Amount Before</TableHead>
                  <TableHead>Amount After</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Used At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">
                      {item.transactionId}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.user.username || item.userId}</div>
                        <div className="text-xs text-muted-foreground">{item.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{item.planId}</TableCell>
                    <TableCell>
                      {formatPrice(item.discountAmount)}
                    </TableCell>
                    <TableCell>{formatPrice(item.totalAmountBeforeDiscount)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPrice(item.totalAmountAfterDiscount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.transactionStatus === 'paid' ? 'default' : 'secondary'}>
                        {item.transactionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(item.usedAt), 'dd MMM yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

