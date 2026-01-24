'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Filter, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { authenticatedFetch } from '@/lib/api-client'
import { toast } from 'sonner'

interface AuditLog {
    id: number
    userId: string
    userEmail: string
    userRole: string
    action: string
    resourceType: string
    resourceId: string
    resourceName: string
    description: string
    oldValues: any
    newValues: any
    ipAddress: string
    userAgent: string
    status: string
    errorMessage: string
    createdAt: string
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [filters, setFilters] = useState({
        action: '',
        resourceType: '',
        userId: '',
        search: '',
        dateFrom: '',
        dateTo: '',
    })
    const [usersList, setUsersList] = useState<any[]>([])
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

    useEffect(() => {
        fetchLogs()
    }, [page, filters])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                ...filters,
            })

            const response = await authenticatedFetch(`/api/audit-logs?${params}`)
            const data = await response.json()

            if (data.success) {
                setLogs(data.data.logs)
                setTotal(data.data.pagination.total)
                setTotalPages(data.data.pagination.totalPages)
            } else if (data.error === 'Unauthorized') {
                window.location.href = '/login'
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchUsers = async () => {
        try {
            const response = await authenticatedFetch('/api/users?limit=100')
            const data = await response.json()
            if (data.success) {
                setUsersList(data.data.users)
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleFilterChange = (key: string, value: string) => {
        // Convert 'all' to empty string for API
        const apiValue = value === 'all' ? '' : value
        setFilters(prev => ({ ...prev, [key]: apiValue }))
        setPage(1) // Reset to first page
    }

    const getActionBadge = (action: string) => {
        const colors: Record<string, string> = {
            'user.create': 'bg-green-500',
            'user.update': 'bg-blue-500',
            'user.delete': 'bg-red-500',
            'subscription.create': 'bg-green-500',
            'subscription.update': 'bg-blue-500',
            'subscription.cancel': 'bg-red-500',
            'store.assign': 'bg-green-500',
            'store.unassign': 'bg-red-500',
        }

        return (
            <Badge className={colors[action] || 'bg-gray-500'}>
                {action}
            </Badge>
        )
    }

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            success: 'bg-emerald-500',
            failed: 'bg-rose-500',
            pending: 'bg-amber-500',
        }

        return (
            <Badge className={colors[status] || 'bg-slate-500'}>
                {status}
            </Badge>
        )
    }

    const exportToCSV = async () => {
        try {
            toast.loading("Mempersiapkan data untuk export...", { id: "export-csv" })

            const params = new URLSearchParams({
                format: 'csv',
                ...filters,
            })

            const response = await authenticatedFetch(`/api/audit-logs/export?${params}`)

            if (!response.ok) {
                const data = await response.json()
                toast.error(data.error || "Gagal export data", { id: "export-csv" })
                return
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`)
            document.body.appendChild(link)
            link.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(link)

            toast.success("Berhasil export data ke CSV", { id: "export-csv" })
        } catch (error) {
            console.error("Export error:", error)
            toast.error("Terjadi kesalahan saat export", { id: "export-csv" })
        }
    }

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">
                        Track all admin actions and system changes
                    </p>
                </div>

                {/* Filters */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Search */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search logs..."
                                        value={filters.search}
                                        onChange={(e) => handleFilterChange('search', e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            {/* Action Filter */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Action</label>
                                <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All actions</SelectItem>
                                        <SelectItem value="user.create">User Create</SelectItem>
                                        <SelectItem value="user.update">User Update</SelectItem>
                                        <SelectItem value="user.delete">User Delete</SelectItem>
                                        <SelectItem value="user.login">User Login</SelectItem>
                                        <SelectItem value="subscription.create">Subscription Create</SelectItem>
                                        <SelectItem value="subscription.update">Subscription Update</SelectItem>
                                        <SelectItem value="subscription.cancel">Subscription Cancel</SelectItem>
                                        <SelectItem value="store.assign">Store Assign</SelectItem>
                                        <SelectItem value="store.unassign">Store Unassign</SelectItem>
                                        <SelectItem value="voucher.create">Voucher Create</SelectItem>
                                        <SelectItem value="voucher.update">Voucher Update</SelectItem>
                                        <SelectItem value="voucher.delete">Voucher Delete</SelectItem>
                                        <SelectItem value="affiliate.create">Affiliate Create</SelectItem>
                                        <SelectItem value="affiliate.update">Affiliate Update</SelectItem>
                                        <SelectItem value="settings.update">Settings Update</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Resource Type Filter */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Resource Type</label>
                                <Select value={filters.resourceType} onValueChange={(value) => handleFilterChange('resourceType', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All types</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="subscription">Subscription</SelectItem>
                                        <SelectItem value="store">Store</SelectItem>
                                        <SelectItem value="voucher">Voucher</SelectItem>
                                        <SelectItem value="affiliate">Affiliate</SelectItem>
                                        <SelectItem value="settings">Settings</SelectItem>
                                        <SelectItem value="system">System</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* User Filter */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">User</label>
                                <Select value={filters.userId} onValueChange={(value) => handleFilterChange('userId', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All users" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All users</SelectItem>
                                        {usersList.map((user) => (
                                            <SelectItem key={user.userId} value={user.userId}>
                                                {user.username}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Date From</label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setFilters({
                                        action: '',
                                        resourceType: '',
                                        userId: '',
                                        search: '',
                                        dateFrom: '',
                                        dateTo: '',
                                    })
                                    setPage(1)
                                }}
                            >
                                Clear Filters
                            </Button>
                            <Button variant="outline" className="ml-auto" onClick={exportToCSV} disabled={logs.length === 0}>
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Audit Logs ({total} total)</CardTitle>
                        <CardDescription>
                            Showing {logs.length} logs on page {page} of {totalPages}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Loading...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No audit logs found
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Time</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Resource</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>IP</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="whitespace-nowrap">
                                                    {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{log.userEmail}</div>
                                                        <div className="text-sm text-muted-foreground">{log.userRole}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getActionBadge(log.action)}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{log.resourceType}</div>
                                                        <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                            {log.resourceName || log.resourceId}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="max-w-[300px] truncate">
                                                    {log.description}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(log.status)}</TableCell>
                                                <TableCell className="text-sm">{log.ipAddress}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedLog(log)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Detail Modal */}
                {selectedLog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedLog(null)}>
                        <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <CardHeader>
                                <CardTitle>Audit Log Details</CardTitle>
                                <CardDescription>ID: {selectedLog.id}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">User</label>
                                        <p>{selectedLog.userEmail}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Role</label>
                                        <p>{selectedLog.userRole}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Action</label>
                                        <p>{getActionBadge(selectedLog.action)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Status</label>
                                        <p>{getStatusBadge(selectedLog.status)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Resource Type</label>
                                        <p>{selectedLog.resourceType}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Resource ID</label>
                                        <p>{selectedLog.resourceId}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <p>{selectedLog.description}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">IP Address</label>
                                        <p>{selectedLog.ipAddress}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Time</label>
                                        <p>{format(new Date(selectedLog.createdAt), 'dd MMM yyyy HH:mm:ss')}</p>
                                    </div>
                                </div>

                                {selectedLog.oldValues && (
                                    <div>
                                        <label className="text-sm font-medium">Old Values</label>
                                        <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto">
                                            {JSON.stringify(selectedLog.oldValues, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {selectedLog.newValues && (
                                    <div>
                                        <label className="text-sm font-medium">New Values</label>
                                        <pre className="mt-2 p-3 bg-muted rounded text-sm overflow-x-auto">
                                            {JSON.stringify(selectedLog.newValues, null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {selectedLog.userAgent && (
                                    <div>
                                        <label className="text-sm font-medium">User Agent</label>
                                        <p className="text-sm text-muted-foreground">{selectedLog.userAgent}</p>
                                    </div>
                                )}

                                <Button onClick={() => setSelectedLog(null)} className="w-full">
                                    Close
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
