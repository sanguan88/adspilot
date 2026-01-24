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
    Building2,
    Search,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Clock,
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { pageLayout, typography, filterPanel, gridLayouts, summaryCard } from "@/lib/design-tokens"

interface BankMutation {
    id: number
    moota_mutation_id: string
    amount: string
    bank_type: string
    account_number: string
    description: string
    date: string
    type: string
    status: string
    transaction_id: string | null
    created_at: string
}

export function BankMutationsPage() {
    const [mutations, setMutations] = useState<BankMutation[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState("")
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)

    useEffect(() => {
        fetchMutations()
    }, [page, statusFilter])

    const fetchMutations = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append("page", page.toString())
            params.append("limit", "20")
            if (statusFilter) params.append("status", statusFilter)

            const response = await authenticatedFetch(`/api/bank-mutations?${params.toString()}`)
            const data = await response.json()

            if (data.success) {
                setMutations(data.data.mutations || [])
                setTotal(data.data.total || 0)
                setTotalPages(data.data.totalPages || 1)
            } else {
                toast.error(data.error || "Gagal memuat data mutasi")
            }
        } catch (error) {
            console.error("Error fetching mutations:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'processed':
                return "bg-green-100 text-green-700 border-green-200"
            case 'ignored':
                return "bg-slate-100 text-slate-600 border-slate-200"
            case 'failed':
                return "bg-red-100 text-red-700 border-red-200"
            default:
                return "bg-yellow-100 text-yellow-700 border-yellow-200"
        }
    }

    const formatPrice = (price: string | number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(Number(price))
    }

    return (
        <div className={pageLayout.container}>
            <div className={pageLayout.content}>
                <div className={pageLayout.header}>
                    <div>
                        <h1 className={pageLayout.headerTitle}>Bank Mutations (Moota)</h1>
                        <p className={pageLayout.headerDescription}>
                            Monitoring real-time uang masuk dari semua rekening bank yang terhubung ke Moota.co
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchMutations()} disabled={loading}>
                        <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Filters */}
                <Card className={filterPanel.container}>
                    <CardContent className={filterPanel.content}>
                        <div className={filterPanel.grid}>
                            <div className="flex items-center gap-4">
                                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Semua Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="processed">Processed (Matched)</SelectItem>
                                        <SelectItem value="ignored">Ignored (No Match)</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-right text-xs text-muted-foreground flex items-center justify-end">
                                Total: <span className="font-bold ml-1 text-foreground">{total}</span> mutasi tercatat
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="pt-6">
                        {loading ? (
                            <TableSkeleton rows={5} columns={6} />
                        ) : mutations.length === 0 ? (
                            <EmptyState
                                icon={<Building2 className="w-12 h-12" />}
                                title="Belum ada mutasi"
                                description="Mutasi bank akan muncul di sini secara otomatis setelah Moota mendeteksi transaksi."
                            />
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Waktu & Bank</TableHead>
                                            <TableHead>Nominal</TableHead>
                                            <TableHead>Deskripsi</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Matched Order</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mutations.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">
                                                            {format(new Date(m.date), "dd MMM yyyy HH:mm")}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                                                            <Building2 className="w-2 h-2" />
                                                            {m.bank_type} - {m.account_number}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {m.type === 'CR' ? (
                                                            <ArrowDownLeft className="w-3 h-3 text-green-500" />
                                                        ) : (
                                                            <ArrowUpRight className="w-3 h-3 text-red-500" />
                                                        )}
                                                        <span className={`font-bold ${m.type === 'CR' ? 'text-green-700' : 'text-slate-700'}`}>
                                                            {formatPrice(m.amount)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-xs max-w-[300px] truncate" title={m.description}>
                                                        {m.description}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getStatusBadge(m.status)}`}>
                                                        {m.status.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {m.transaction_id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-mono font-bold text-blue-600">
                                                                {m.transaction_id}
                                                            </span>
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-muted-foreground">Tidak Cocok</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination Placeholder */}
                        {totalPages > 1 && (
                            <div className="flex justify-between items-center mt-4">
                                <p className="text-xs text-muted-foreground">Halaman {page} dari {totalPages}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
