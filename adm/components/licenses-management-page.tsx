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
import { Key, Plus, Search, Edit, Trash2, Copy, CheckCircle, XCircle, Clock } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"
import { useConfirm } from "@/components/providers/confirmation-provider"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard, filterPanel } from "@/lib/design-tokens"

interface License {
  id: string
  userId: string
  username: string
  email: string
  licenseKey: string
  licenseType: string
  status: string
  duration?: number
  maxUsers: number
  maxAccounts: number
  activatedAt: string
  expiresAt?: string
  createdAt: string
}

interface LicenseFormData {
  userId: string
  licenseType: string
  duration: number
  maxUsers: number
  maxAccounts: number
}

export function LicensesManagementPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)
  const [formData, setFormData] = useState<LicenseFormData>({
    userId: "",
    licenseType: "trial",
    duration: 30,
    maxUsers: 1,
    maxAccounts: 1,
  })
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const confirm = useConfirm()

  useEffect(() => {
    fetchLicenses()
  }, [page, statusFilter, typeFilter])

  const fetchLicenses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "20")
      if (statusFilter) params.append("status", statusFilter)
      if (typeFilter) params.append("type", typeFilter)

      const response = await authenticatedFetch(`/api/licenses?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setLicenses(data.data.licenses || [])
        setTotal(data.data.total || 0)
        setTotalPages(data.data.totalPages || 1)
      } else {
        toast.error(data.error || "Gagal memuat data licenses")
      }
    } catch (error) {
      console.error("Error fetching licenses:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingLicense(null)
    setFormData({
      userId: "",
      licenseType: "trial",
      duration: 30,
      maxUsers: 1,
      maxAccounts: 1,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (license: License) => {
    setEditingLicense(license)
    setFormData({
      userId: license.userId,
      licenseType: license.licenseType,
      duration: license.duration || 30,
      maxUsers: license.maxUsers,
      maxAccounts: license.maxAccounts,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingLicense
        ? `/api/licenses/${editingLicense.id}`
        : "/api/licenses"

      const method = editingLicense ? "PUT" : "POST"

      const response = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingLicense ? "License berhasil diupdate" : "License berhasil dibuat")
        setIsDialogOpen(false)
        fetchLicenses()
      } else {
        toast.error(data.error || "Gagal menyimpan license")
      }
    } catch (error) {
      console.error("Error saving license:", error)
      toast.error("Terjadi kesalahan saat menyimpan license")
    }
  }

  const handleDelete = async (license: License) => {
    const confirmed = await confirm({
      title: "Cabut License?",
      description: `Apakah Anda yakin ingin mencabut license ${license.licenseKey}?`,
      confirmText: "Ya, Cabut",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/licenses/${license.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("License berhasil dicabut")
        fetchLicenses()
      } else {
        toast.error(data.error || "Gagal mencabut license")
      }
    } catch (error) {
      console.error("Error deleting license:", error)
      toast.error("Terjadi kesalahan saat mencabut license")
    }
  }

  const copyLicenseKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(key)
    toast.success("License key copied!")
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    return getStatusBadgeVariant(status)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4 text-success" />
      case "expired":
        return <XCircle className="w-4 h-4 text-destructive" />
      case "suspended":
        return <Clock className="w-4 h-4 text-warning" />
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const filteredLicenses = licenses.filter((license) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        license.licenseKey.toLowerCase().includes(searchLower) ||
        license.username.toLowerCase().includes(searchLower) ||
        license.email.toLowerCase().includes(searchLower)
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
            <h1 className={pageLayout.headerTitle}>License Management</h1>
            <p className={pageLayout.headerDescription}>
              Kelola license keys dan aktivasi
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Buat License
          </Button>
        </div>

        {/* Stats Cards */}
        <div className={gridLayouts.stats}>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Key className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Licenses</p>
                <p className={summaryCard.value}>{total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <CheckCircle className={`${componentSizes.cardIcon} text-success mb-2`} />
                <p className={summaryCard.label}>Active Licenses</p>
                <p className={summaryCard.value}>
                  {licenses.filter((l) => l.status === "active").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <XCircle className={`${componentSizes.cardIcon} text-destructive mb-2`} />
                <p className={summaryCard.label}>Expired Licenses</p>
                <p className={summaryCard.value}>
                  {licenses.filter((l) => l.status === "expired").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Clock className={`${componentSizes.cardIcon} text-warning mb-2`} />
                <p className={summaryCard.label}>Suspended Licenses</p>
                <p className={summaryCard.value}>
                  {licenses.filter((l) => l.status === "suspended").length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className={filterPanel.container}>
          <CardContent className={filterPanel.content}>
            <div className={filterPanel.grid4}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari license key, user..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter || "all"} onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter || "all"} onValueChange={(value) => {
                setTypeFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Type</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="perpetual">Perpetual</SelectItem>
                </SelectContent>
              </Select>
              <div className={typography.muted}>
                Total: <span className="font-semibold text-foreground ml-1">{total}</span> licenses
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Licenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Licenses</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : filteredLicenses.length === 0 ? (
              <EmptyState
                icon={<Key className="w-12 h-12" />}
                title="Tidak ada license ditemukan"
                description={
                  search || statusFilter || typeFilter
                    ? "Coba ubah filter atau kata kunci pencarian"
                    : "Mulai dengan membuat license baru"
                }
                action={
                  !search && !statusFilter && !typeFilter
                    ? {
                      label: "Buat License",
                      onClick: handleCreate,
                    }
                    : undefined
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Key</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLicenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {license.licenseKey}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLicenseKey(license.licenseKey)}
                              className="h-6 w-6 p-0"
                            >
                              {copiedKey === license.licenseKey ? (
                                <CheckCircle className="w-3 h-3 text-success" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{license.username}</div>
                            <div className={typography.muted}>{license.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{license.licenseType}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(license.status)}
                            <Badge className={getStatusBadge(license.status)}>
                              {license.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Users: {license.maxUsers === -1 ? "∞" : license.maxUsers}</div>
                            <div>Accounts: {license.maxAccounts === -1 ? "∞" : license.maxAccounts}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {license.expiresAt
                            ? format(new Date(license.expiresAt), "dd MMM yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(license)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(license)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLicense ? "Edit License" : "Buat License Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingLicense
                  ? "Update informasi license"
                  : "Buat license key baru untuk user"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">User ID *</label>
                <Input
                  value={formData.userId}
                  onChange={(e) =>
                    setFormData({ ...formData, userId: e.target.value })
                  }
                  required
                  placeholder="Masukkan User ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">License Type *</label>
                <Select
                  value={formData.licenseType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, licenseType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="perpetual">Perpetual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (days)</label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                    }
                    min="1"
                  />
                  <p className={`${typography.mutedSmall} mt-1`}>0 = unlimited (perpetual)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Users</label>
                  <Input
                    type="number"
                    value={formData.maxUsers === -1 ? "" : formData.maxUsers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUsers: e.target.value === "" ? -1 : parseInt(e.target.value) || 1,
                      })
                    }
                    placeholder="Unlimited"
                    min="-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Accounts</label>
                <Input
                  type="number"
                  value={formData.maxAccounts === -1 ? "" : formData.maxAccounts}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxAccounts: e.target.value === "" ? -1 : parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="Unlimited"
                  min="-1"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingLicense ? "Update" : "Buat License"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

