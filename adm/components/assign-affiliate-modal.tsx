"use client"

import { useRef, useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Loader2, Search, Link2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { typography, table as tableTokens } from "@/lib/design-tokens"

interface Affiliate {
    id: string
    referralCode: string
    username: string
    email: string
    commissionRate: number
}

interface Transaction {
    id: string
    transactionId: string
    planName: string
    totalAmount: number
    createdAt: string
    affiliateId: string | null
}

interface AssignAffiliateModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    user: {
        userId: string
        username: string
        email: string
    } | null
}

const formatIDR = (val: string | number) => {
    if (val === undefined || val === null || val === "") return ""
    const numeric = typeof val === 'string' ? val.replace(/\D/g, '') : Math.floor(val).toString()
    if (!numeric) return ""
    return new Intl.NumberFormat('id-ID').format(parseInt(numeric))
}

const parseIDR = (val: string) => {
    return val.replace(/\D/g, '')
}

export function AssignAffiliateModal({
    isOpen,
    onClose,
    onSuccess,
    user,
}: AssignAffiliateModalProps) {
    const [affiliates, setAffiliates] = useState<Affiliate[]>([])
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loadingAffiliates, setLoadingAffiliates] = useState(false)
    const [loadingTransactions, setLoadingTransactions] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [affiliateSearch, setAffiliateSearch] = useState("")
    const [isPopoverOpen, setIsPopoverOpen] = useState(false)
    const [commissionOverrides, setCommissionOverrides] = useState<Record<string, string>>({})
    const inputRef = useRef<HTMLInputElement>(null)
    // Force focus when popover opens
    useEffect(() => {
        if (isPopoverOpen) {
            const timer = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                }
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [isPopoverOpen])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const container = document.getElementById('affiliate-selection-container')
            if (container && !container.contains(event.target as Node)) {
                setIsPopoverOpen(false)
            }
        }

        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        } else {
            document.removeEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isPopoverOpen])

    // Fetch user's paid transactions
    useEffect(() => {
        if (isOpen && user) {
            const fetchTransactions = async () => {
                try {
                    setLoadingTransactions(true)
                    const response = await authenticatedFetch(`/api/orders?userId=${user.userId}&status=paid`)
                    const data = await response.json()
                    if (data.success) {
                        // Only show transactions that ARE NOT already linked to an affiliate
                        const unlinkedTrx = data.data.orders.filter((t: Transaction) => !t.affiliateId)
                        setTransactions(unlinkedTrx)
                    }
                } catch (error) {
                    console.error("Error fetching transactions:", error)
                    toast.error("Gagal memuat data transaksi")
                } finally {
                    setLoadingTransactions(false)
                }
            }
            fetchTransactions()
        } else {
            setTransactions([])
            setSelectedAffiliate(null)
            setCommissionOverrides({})
        }
    }, [isOpen, user])

    // Fetch affiliates for search
    useEffect(() => {
        const fetchAffiliates = async () => {
            try {
                setLoadingAffiliates(true)
                const response = await authenticatedFetch(`/api/affiliates?search=${affiliateSearch}&limit=10`)
                const data = await response.json()
                if (data.success) {
                    setAffiliates(data.data.affiliates)
                }
            } catch (error) {
                console.error("Error fetching affiliates:", error)
            } finally {
                setLoadingAffiliates(false)
            }
        }

        if (isOpen) {
            const timer = setTimeout(() => {
                fetchAffiliates()
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [affiliateSearch, isOpen])

    // Update commission overrides when selected affiliate changes
    useEffect(() => {
        if (selectedAffiliate && transactions.length > 0) {
            const overrides: Record<string, string> = {}
            transactions.forEach((t) => {
                const suggested = (t.totalAmount * (selectedAffiliate.commissionRate / 100)).toFixed(0)
                overrides[t.transactionId] = suggested
            })
            setCommissionOverrides(overrides)
        }
    }, [selectedAffiliate, transactions])

    const handleSave = async () => {
        if (!user || !selectedAffiliate) return

        try {
            setSubmitting(true)

            const payload = {
                affiliateId: selectedAffiliate.id,
                commissions: transactions.map((t) => ({
                    transactionId: t.transactionId,
                    amount: parseFloat(commissionOverrides[t.transactionId] || "0"),
                    type: "first_payment", // Default to first_payment for manual retroactive assignments
                })),
            }

            const response = await authenticatedFetch(`/api/users/${user.userId}/assign-affiliate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (data.success) {
                toast.success("User berhasil dikaitkan ke affiliate")
                onSuccess()
                onClose()
            } else {
                toast.error(data.error || "Gagal mengaitkan affiliate")
            }
        } catch (error) {
            console.error("Error assigning affiliate:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !submitting && !open && onClose()}>
            <DialogContent className="max-w-3xl min-h-[600px] max-h-[90vh] flex flex-col p-0 overflow-visible">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Assign Affiliate Manual</DialogTitle>
                    <DialogDescription>
                        Tautkan user <span className="font-semibold text-foreground">{user?.email}</span> ke affiliate tertentu.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 px-6 py-4 flex flex-col space-y-6 overflow-visible">
                    {/* Affiliate Selection - ALWAYS VISIBLE OVERFLOW */}
                    <div className="space-y-2 relative z-[70]" id="affiliate-selection-container">
                        <label className={typography.label}>Pilih Affiliate</label>
                        <div className="relative">
                            <Button
                                variant="outline"
                                role="combobox"
                                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                                className="w-full justify-between"
                            >
                                {selectedAffiliate
                                    ? `${selectedAffiliate.username} (${selectedAffiliate.referralCode})`
                                    : "Cari affiliate..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>

                            {isPopoverOpen && (
                                <div
                                    className="absolute top-full left-0 mt-1 w-full z-[100] bg-popover border rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <div className="flex flex-col w-full">
                                        <div className="flex items-center border-b px-3 bg-muted/20">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <Input
                                                ref={inputRef}
                                                placeholder="Ketik nama atau kode affiliate..."
                                                className="flex h-11 w-full border-0 bg-transparent py-3 text-sm outline-none focus-visible:ring-0"
                                                value={affiliateSearch}
                                                onChange={(e) => setAffiliateSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-[250px] overflow-y-auto p-1 bg-background">
                                            {loadingAffiliates ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                </div>
                                            ) : affiliates.length === 0 ? (
                                                <div className="py-6 text-center text-sm text-muted-foreground italic">
                                                    Affiliate tidak ditemukan.
                                                </div>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    {affiliates.map((aff) => (
                                                        <div
                                                            key={aff.id}
                                                            className={cn(
                                                                "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
                                                                "hover:bg-primary/10 hover:text-primary",
                                                                selectedAffiliate?.id === aff.id && "bg-primary/20 text-primary font-medium"
                                                            )}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setSelectedAffiliate(aff)
                                                                setIsPopoverOpen(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedAffiliate?.id === aff.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="leading-none">{aff.username}</span>
                                                                <span className="text-[10px] text-muted-foreground mt-1">
                                                                    {aff.email} | {aff.referralCode}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transactions Selection - SCROLLABLE IF LONG */}
                    <div className="flex-1 flex flex-col min-h-0 space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className={typography.label}>Transaksi Manual (Retroaktif)</label>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {transactions.length} Transaksi Ditemukan
                            </Badge>
                        </div>

                        <div className="flex-1 overflow-y-auto border rounded-md">
                            {loadingTransactions ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <AlertCircle className="h-8 w-8 text-yellow-500 mb-2 opacity-50" />
                                    <p className="text-xs font-medium text-yellow-800/70">Tidak ada transaksi yang bisa ditautkan</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                                        <TableRow>
                                            <TableHead className="w-[180px] text-[11px] h-8">Paket & Tanggal</TableHead>
                                            <TableHead className="text-[11px] h-8">Total Bayar</TableHead>
                                            <TableHead className="w-[150px] text-[11px] h-8">Komisi (IDR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((t) => (
                                            <TableRow key={t.transactionId}>
                                                <TableCell className="py-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-[11px]">{t.planName}</span>
                                                        <span className="text-[9px] text-muted-foreground">
                                                            {format(new Date(t.createdAt), "dd MMM yyyy")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[11px] py-2">
                                                    Rp {t.totalAmount.toLocaleString('id-ID')}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                    <div className="relative">
                                                        <Input
                                                            type="text"
                                                            className="h-7 text-[11px] pr-4 px-2"
                                                            value={formatIDR(commissionOverrides[t.transactionId])}
                                                            onChange={(e) => {
                                                                const parsed = parseIDR(e.target.value)
                                                                setCommissionOverrides({
                                                                    ...commissionOverrides,
                                                                    [t.transactionId]: parsed
                                                                })
                                                            }}
                                                            disabled={!selectedAffiliate}
                                                        />
                                                        {selectedAffiliate && (
                                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground opacity-50">
                                                                {selectedAffiliate.commissionRate}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                        {selectedAffiliate && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-80">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Komisi dihitung otomatis ({selectedAffiliate.commissionRate}%), silakan edit manual jika perlu.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t">
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!selectedAffiliate || submitting || transactions.length === 0}
                        className="gap-2"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Link2 className="w-4 h-4" />
                        )}
                        Simpan Tautan Affiliate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
