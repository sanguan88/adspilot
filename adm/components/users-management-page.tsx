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
import { Users, UserPlus, Search, Edit, Trash2, X, Settings, Store, Loader2, Link2 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { FormError } from "@/components/ui/form-error"
import { getRoleBadgeVariant, getStatusBadgeVariant } from "@/components/ui/badge-variants"
import { pageLayout, typography, filterPanel } from "@/lib/design-tokens"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StoresTab } from "./stores-tab"
import { AssignAffiliateModal } from "./assign-affiliate-modal"
import { useConfirm } from "@/components/providers/confirmation-provider"

interface User {
  no: number
  userId: string
  username: string
  email: string
  namaLengkap: string
  role: string
  status: string
  photoProfile?: string | null
  createdAt: string
  updatedAt?: string
  lastLogin?: string
}

interface UserFormData {
  username: string
  email: string
  password: string
  namaLengkap: string
  role: string
  status: string
}

export function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isLimitsDialogOpen, setIsLimitsDialogOpen] = useState(false)
  const [selectedUserForLimits, setSelectedUserForLimits] = useState<User | null>(null)
  const [limitsData, setLimitsData] = useState<{
    planName: string
    limits: { maxAccounts: number; maxAutomationRules: number; maxCampaigns: number }
    usage: { accounts: number; automationRules: number; campaigns: number }
  } | null>(null)
  const [limitsFormData, setLimitsFormData] = useState({
    maxAccounts: "",
    maxAutomationRules: "",
    maxCampaigns: "",
  })
  const [limitsLoading, setLimitsLoading] = useState(false)
  const [isAssignAffiliateDialogOpen, setIsAssignAffiliateDialogOpen] = useState(false)
  const [selectedUserForAffiliate, setSelectedUserForAffiliate] = useState<User | null>(null)

  // Stores management state
  const [activeTab, setActiveTab] = useState("limits")
  const [storesData, setStoresData] = useState<{
    stores: Array<{
      idToko: string
      namaToko: string
      status: string
      createdAt: string
    }>
    total: number
  } | null>(null)
  const [storesLoading, setStoresLoading] = useState(false)
  const [assignStoreId, setAssignStoreId] = useState("")
  const confirm = useConfirm()
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    email: "",
    password: "",
    namaLengkap: "",
    role: "user",
    status: "aktif",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("page", page.toString())
      params.append("limit", "20")
      if (search) params.append("search", search)
      if (roleFilter) params.append("role", roleFilter)
      if (statusFilter) params.append("status", statusFilter)

      const response = await authenticatedFetch(`/api/users?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users)
        setTotal(data.data.total)
        setTotalPages(data.data.totalPages)
      } else {
        toast.error(data.error || "Gagal memuat data users")
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, search, roleFilter, statusFilter])

  const handleCreate = () => {
    setEditingUser(null)
    setFormData({
      username: "",
      email: "",
      password: "",
      namaLengkap: "",
      role: "user",
      status: "aktif",
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      namaLengkap: user.namaLengkap,
      role: user.role,
      status: user.status,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof UserFormData, string>> = {}

    if (!formData.username.trim()) {
      errors.username = "Username harus diisi"
    } else if (formData.username.length < 3) {
      errors.username = "Username minimal 3 karakter"
    }

    if (!formData.email.trim()) {
      errors.email = "Email harus diisi"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format email tidak valid"
    }

    if (!editingUser && !formData.password) {
      errors.password = "Password harus diisi"
    } else if (formData.password && formData.password.length < 6) {
      errors.password = "Password minimal 6 karakter"
    }

    if (!formData.namaLengkap.trim()) {
      errors.namaLengkap = "Nama lengkap harus diisi"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const url = editingUser
        ? `/api/users/${editingUser.userId}`
        : "/api/users"

      const method = editingUser ? "PUT" : "POST"
      const body = editingUser
        ? { ...formData, password: formData.password || undefined }
        : formData

      const response = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingUser ? "User berhasil diupdate" : "User berhasil dibuat")
        setIsDialogOpen(false)
        setFormErrors({})
        fetchUsers()
      } else {
        toast.error(data.error || "Gagal menyimpan user")
      }
    } catch (error) {
      console.error("Error saving user:", error)
      toast.error("Terjadi kesalahan saat menyimpan user")
    }
  }

  const handleDelete = async (user: User) => {
    const confirmed = await confirm({
      title: "Nonaktifkan User?",
      description: `Apakah Anda yakin ingin menonaktifkan user ${user.username}?`,
      confirmText: "Ya, Nonaktifkan",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      const response = await authenticatedFetch(`/api/users/${user.userId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("User berhasil dinonaktifkan")
        fetchUsers()
      } else {
        toast.error(data.error || "Gagal menghapus user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Terjadi kesalahan saat menghapus user")
    }
  }

  const getRoleBadgeColor = (role: string) => {
    return getRoleBadgeVariant(role)
  }

  const getStatusBadgeColor = (status: string) => {
    return getStatusBadgeVariant(status)
  }

  const handleEditLimits = async (user: User) => {
    try {
      setSelectedUserForLimits(user)
      setLimitsLoading(true)
      setIsLimitsDialogOpen(true)
      setActiveTab("limits") // Reset to limits tab

      const response = await authenticatedFetch(`/api/users/${user.userId}/limits`)
      const data = await response.json()

      if (data.success) {
        setLimitsData(data.data)
        setLimitsFormData({
          maxAccounts: data.data.limits.maxAccounts === -1 ? "unlimited" : data.data.limits.maxAccounts.toString(),
          maxAutomationRules: data.data.limits.maxAutomationRules === -1 ? "unlimited" : data.data.limits.maxAutomationRules.toString(),
          maxCampaigns: data.data.limits.maxCampaigns === -1 ? "unlimited" : data.data.limits.maxCampaigns.toString(),
        })

        // Also fetch stores data
        fetchUserStores(user.userId)
      } else {
        toast.error(data.error || "Gagal memuat data limits")
        setIsLimitsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error fetching user limits:", error)
      toast.error("Terjadi kesalahan saat memuat data limits")
      setIsLimitsDialogOpen(false)
    } finally {
      setLimitsLoading(false)
    }
  }

  const handleSaveLimits = async () => {
    if (!selectedUserForLimits) return

    try {
      setLimitsLoading(true)

      const payload: any = {}
      if (limitsFormData.maxAccounts === "unlimited") {
        payload.maxAccounts = -1
      } else if (limitsFormData.maxAccounts !== "") {
        payload.maxAccounts = parseInt(limitsFormData.maxAccounts)
      }

      if (limitsFormData.maxAutomationRules === "unlimited") {
        payload.maxAutomationRules = -1
      } else if (limitsFormData.maxAutomationRules !== "") {
        payload.maxAutomationRules = parseInt(limitsFormData.maxAutomationRules)
      }

      if (limitsFormData.maxCampaigns === "unlimited") {
        payload.maxCampaigns = -1
      } else if (limitsFormData.maxCampaigns !== "") {
        payload.maxCampaigns = parseInt(limitsFormData.maxCampaigns)
      }

      const response = await authenticatedFetch(`/api/users/${selectedUserForLimits.userId}/limits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Limits berhasil diupdate")
        setIsLimitsDialogOpen(false)
        setSelectedUserForLimits(null)
        setLimitsData(null)
        setLimitsFormData({
          maxAccounts: "",
          maxAutomationRules: "",
          maxCampaigns: "",
        })
      } else {
        toast.error(data.error || "Gagal mengupdate limits")
      }
    } catch (error) {
      console.error("Error saving limits:", error)
      toast.error("Terjadi kesalahan saat menyimpan limits")
    } finally {
      setLimitsLoading(false)
    }
  }

  const fetchUserStores = async (userId: string) => {
    try {
      setStoresLoading(true)
      const response = await authenticatedFetch(`/api/users/${userId}/stores`)
      const data = await response.json()

      if (data.success) {
        setStoresData(data.data)
      } else {
        toast.error(data.error || "Gagal memuat data stores")
      }
    } catch (error) {
      console.error("Error fetching user stores:", error)
      toast.error("Terjadi kesalahan saat memuat data stores")
    } finally {
      setStoresLoading(false)
    }
  }

  const handleAssignStore = async (idToko: string) => {
    if (!selectedUserForLimits || !idToko.trim()) {
      toast.error("Toko harus dipilih")
      return
    }

    try {
      setStoresLoading(true)
      const response = await authenticatedFetch(`/api/users/${selectedUserForLimits.userId}/stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToko: idToko.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || "Store berhasil di-assign")
        fetchUserStores(selectedUserForLimits.userId)
      } else {
        toast.error(data.error || "Gagal assign store")
      }
    } catch (error) {
      console.error("Error assigning store:", error)
      toast.error("Terjadi kesalahan saat assign store")
    } finally {
      setStoresLoading(false)
    }
  }

  const handleUnassignStore = async (idToko: string, namaToko: string) => {
    if (!selectedUserForLimits) return

    const confirmed = await confirm({
      title: "Unassign Toko?",
      description: `Apakah Anda yakin ingin unassign toko "${namaToko}"?`,
      confirmText: "Ya, Unassign",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      setStoresLoading(true)
      const response = await authenticatedFetch(
        `/api/users/${selectedUserForLimits.userId}/stores?idToko=${idToko}`,
        { method: "DELETE" }
      )

      const data = await response.json()

      if (data.success) {
        toast.success(data.message || "Store berhasil di-unassign")
        fetchUserStores(selectedUserForLimits.userId)
      } else {
        toast.error(data.error || "Gagal unassign store")
      }
    } catch (error) {
      console.error("Error unassigning store:", error)
      toast.error("Terjadi kesalahan saat unassign store")
    } finally {
      setStoresLoading(false)
    }
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        {/* Header */}
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>User Management</h1>
            <p className={pageLayout.headerDescription}>
              Kelola user dan roles
            </p>
          </div>
          <Button onClick={handleCreate}>
            <UserPlus className="w-4 h-4" />
            Tambah User
          </Button>
        </div>

        {/* Filters */}
        <Card className={filterPanel.container}>
          <CardContent className={filterPanel.content}>
            <div className={filterPanel.grid4}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari username, email, atau nama..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter || "all"} onValueChange={(value) => {
                setRoleFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter || "all"} onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value)
                setPage(1)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
              <div className={typography.muted}>
                Total: <span className="font-semibold text-foreground ml-1">{total}</span> users
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} columns={7} />
            ) : users.length === 0 ? (
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="Tidak ada user ditemukan"
                description={
                  search || roleFilter || statusFilter
                    ? "Coba ubah filter atau kata kunci pencarian"
                    : "Mulai dengan membuat user baru"
                }
                action={
                  !search && !roleFilter && !statusFilter
                    ? {
                      label: "Tambah User",
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
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nama Lengkap</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.namaLengkap}</TableCell>
                        <TableCell>
                          <Badge className={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeVariant(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className={typography.bodySmall}>
                          {user.lastLogin
                            ? format(new Date(user.lastLogin), "dd MMM yyyy HH:mm")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUserForAffiliate(user)
                                setIsAssignAffiliateDialogOpen(true)
                              }}
                              title="Assign Affiliate"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLimits(user)}
                              title="Edit Limits"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user)}
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
                {editingUser ? "Edit User" : "Tambah User Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Update informasi user"
                  : "Buat user baru untuk aplikasi"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block ${typography.label} mb-1`}>Username *</label>
                  <Input
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value })
                      if (formErrors.username) {
                        setFormErrors({ ...formErrors, username: undefined })
                      }
                    }}
                    required
                    disabled={!!editingUser}
                    className={formErrors.username ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!formErrors.username}
                  />
                  <FormError message={formErrors.username} />
                </div>
                <div>
                  <label className={`block ${typography.label} mb-1`}>Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      if (formErrors.email) {
                        setFormErrors({ ...formErrors, email: undefined })
                      }
                    }}
                    required
                    className={formErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
                    aria-invalid={!!formErrors.email}
                  />
                  <FormError message={formErrors.email} />
                </div>
              </div>
              <div>
                <label className={`block ${typography.label} mb-1`}>
                  Password {editingUser ? "(kosongkan jika tidak diubah)" : "*"}
                </label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (formErrors.password) {
                      setFormErrors({ ...formErrors, password: undefined })
                    }
                  }}
                  required={!editingUser}
                  className={formErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!formErrors.password}
                />
                <FormError message={formErrors.password} />
              </div>
              <div>
                <label className={`block ${typography.label} mb-1`}>Nama Lengkap *</label>
                <Input
                  value={formData.namaLengkap}
                  onChange={(e) => {
                    setFormData({ ...formData, namaLengkap: e.target.value })
                    if (formErrors.namaLengkap) {
                      setFormErrors({ ...formErrors, namaLengkap: undefined })
                    }
                  }}
                  required
                  className={formErrors.namaLengkap ? "border-destructive focus-visible:ring-destructive" : ""}
                  aria-invalid={!!formErrors.namaLengkap}
                />
                <FormError message={formErrors.namaLengkap} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block ${typography.label} mb-1`}>Role *</label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block ${typography.label} mb-1`}>Status *</label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  {editingUser ? "Update" : "Buat User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Limits Dialog */}
        {isLimitsDialogOpen && (
          <Dialog open={isLimitsDialogOpen} onOpenChange={setIsLimitsDialogOpen}>
            <DialogContent className="max-w-3xl w-full h-[85vh] flex flex-col overflow-hidden p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Edit Subscription Limits</DialogTitle>
                <DialogDescription>
                  {selectedUserForLimits && `Atur custom limits untuk ${selectedUserForLimits.username}`}
                </DialogDescription>
              </DialogHeader>

              {limitsLoading && !limitsData ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="text-sm font-medium">Loading limits data...</p>
                </div>
              ) : limitsData ? (
                <div className="flex-1 overflow-y-auto px-6 custom-scrollbar">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="limits">Limits</TabsTrigger>
                      <TabsTrigger value="stores">Assigned Stores</TabsTrigger>
                    </TabsList>

                    {/* Limits Tab */}
                    <TabsContent value="limits" className="space-y-6 mt-6">
                      {/* Current Plan Info */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 mb-2">Plan Saat Ini</div>
                        <div className="text-lg font-semibold">{limitsData.planName}</div>
                      </div>

                      {/* Current Usage */}
                      <div>
                        <div className="text-base font-semibold mb-3">Current Usage</div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold">{limitsData.usage.accounts}</div>
                            <div className="text-sm text-gray-600">Toko/Store</div>
                          </div>
                          <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold">{limitsData.usage.automationRules}</div>
                            <div className="text-sm text-gray-600">Active Rules</div>
                          </div>
                          <div className="border rounded-lg p-3">
                            <div className="text-2xl font-bold">{limitsData.usage.campaigns}</div>
                            <div className="text-sm text-gray-600">Campaigns</div>
                          </div>
                        </div>
                      </div>

                      {/* Limits Form */}
                      <div className="border-t pt-4">
                        <div className="text-base font-semibold mb-3">Custom Limits Override</div>
                        <div className="space-y-4">
                          {/* Max Accounts */}
                          <div>
                            <Label>Maximum Toko/Store *</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <Input
                                type="number"
                                value={limitsFormData.maxAccounts === "unlimited" ? "" : limitsFormData.maxAccounts}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setLimitsFormData({
                                    ...limitsFormData,
                                    maxAccounts: value === "" ? "" : value,
                                  })
                                }}
                                placeholder="10"
                                disabled={limitsFormData.maxAccounts === "unlimited"}
                                className="flex-1"
                                min="1"
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="unlimited-accounts-limits"
                                  checked={limitsFormData.maxAccounts === "unlimited"}
                                  onCheckedChange={(checked) => {
                                    setLimitsFormData({
                                      ...limitsFormData,
                                      maxAccounts: checked ? "unlimited" : limitsData.limits.maxAccounts === -1 ? "" : limitsData.limits.maxAccounts.toString(),
                                    })
                                  }}
                                />
                                <Label htmlFor="unlimited-accounts-limits" className="cursor-pointer">
                                  Unlimited
                                </Label>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Current: {limitsData.limits.maxAccounts === -1 ? "Unlimited" : limitsData.limits.maxAccounts}
                            </p>
                          </div>

                          {/* Max Automation Rules */}
                          <div>
                            <Label>Maximum Automation Rules (Active) *</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <Input
                                type="number"
                                value={limitsFormData.maxAutomationRules === "unlimited" ? "" : limitsFormData.maxAutomationRules}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setLimitsFormData({
                                    ...limitsFormData,
                                    maxAutomationRules: value === "" ? "" : value,
                                  })
                                }}
                                placeholder="20"
                                disabled={limitsFormData.maxAutomationRules === "unlimited"}
                                className="flex-1"
                                min="1"
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="unlimited-rules-limits"
                                  checked={limitsFormData.maxAutomationRules === "unlimited"}
                                  onCheckedChange={(checked) => {
                                    setLimitsFormData({
                                      ...limitsFormData,
                                      maxAutomationRules: checked ? "unlimited" : limitsData.limits.maxAutomationRules === -1 ? "" : limitsData.limits.maxAutomationRules.toString(),
                                    })
                                  }}
                                />
                                <Label htmlFor="unlimited-rules-limits" className="cursor-pointer">
                                  Unlimited
                                </Label>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Current: {limitsData.limits.maxAutomationRules === -1 ? "Unlimited" : limitsData.limits.maxAutomationRules}
                            </p>
                          </div>

                          {/* Max Campaigns */}
                          <div>
                            <Label>Maximum Campaigns *</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <Input
                                type="number"
                                value={limitsFormData.maxCampaigns === "unlimited" ? "" : limitsFormData.maxCampaigns}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setLimitsFormData({
                                    ...limitsFormData,
                                    maxCampaigns: value === "" ? "" : value,
                                  })
                                }}
                                placeholder="100"
                                disabled={limitsFormData.maxCampaigns === "unlimited"}
                                className="flex-1"
                                min="1"
                              />
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="unlimited-campaigns-limits"
                                  checked={limitsFormData.maxCampaigns === "unlimited"}
                                  onCheckedChange={(checked) => {
                                    setLimitsFormData({
                                      ...limitsFormData,
                                      maxCampaigns: checked ? "unlimited" : limitsData.limits.maxCampaigns === -1 ? "" : limitsData.limits.maxCampaigns.toString(),
                                    })
                                  }}
                                />
                                <Label htmlFor="unlimited-campaigns-limits" className="cursor-pointer">
                                  Unlimited
                                </Label>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Current: {limitsData.limits.maxCampaigns === -1 ? "Unlimited" : limitsData.limits.maxCampaigns}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Stores Tab */}
                    <TabsContent value="stores" className="mt-6">
                      <StoresTab
                        stores={storesData?.stores || []}
                        total={storesData?.total || 0}
                        loading={storesLoading}
                        userId={selectedUserForLimits?.userId || ""}
                        onAssignStore={handleAssignStore}
                        onUnassignStore={handleUnassignStore}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              ) : null}


              <DialogFooter className="px-6 py-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsLimitsDialogOpen(false)}
                  disabled={limitsLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLimits}
                  disabled={limitsLoading}
                >
                  {limitsLoading ? "Saving..." : "Save Limits"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <AssignAffiliateModal
          isOpen={isAssignAffiliateDialogOpen}
          onClose={() => {
            setIsAssignAffiliateDialogOpen(false)
            setSelectedUserForAffiliate(null)
          }}
          onSuccess={() => {
            fetchUsers()
          }}
          user={selectedUserForAffiliate}
        />
      </div>
    </div >
  )
}
