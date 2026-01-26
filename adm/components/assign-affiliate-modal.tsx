"use client"

import { useState, useEffect } from "react"
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
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Assign Affiliate Manual</DialogTitle>
                    <DialogDescription>
                        Tautkan user <span className="font-semibold text-foreground">{user?.email}</span> ke affiliate tertentu.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Affiliate Selection */}
                    <div className="space-y-2">
                        <label className={typography.label}>Pilih Affiliate</label>
                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={isPopoverOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedAffiliate
                                        ? `${selectedAffiliate.username} (${selectedAffiliate.referralCode})`
                                        : "Cari affiliate..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Ketik nama atau kode affiliate..."
                                        onValueChange={setAffiliateSearch}
                                    />
                                    <CommandList>
                                        {loadingAffiliates ? (
                                            <div className="flex items-center justify-center py-6">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            </div>
                                        ) : affiliates.length === 0 ? (
                                            <CommandEmpty>Affiliate tidak ditemukan.</CommandEmpty>
                                        ) : (
                                            <CommandGroup>
                                                {affiliates.map((aff) => (
                                                    <CommandItem
                                                        key={aff.id}
                                                        onSelect={() => {
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
                                                            <span>{aff.username}</span>
                                                            <span className="text-xs text-muted-foreground">{aff.email} | {aff.referralCode}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Transactions Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className={typography.label}>Transaksi Manual (Retroaktif)</label>
                            <Badge variant="outline" className="text-xs">
                                {transactions.length} Transaksi Ditemukan
                            </Badge>
                        </div>

                        {loadingTransactions ? (
                            <div className="flex items-center justify-center py-12 border rounded-md bg-muted/20">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border rounded-md bg-yellow-50/30 border-yellow-100 text-center">
                                <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
                                <p className="text-sm font-medium text-yellow-800">Tidak ada transaksi yang bisa ditautkan</p>
                                <p className="text-xs text-yellow-600">User belum memiliki transaksi atau semua transaksi sudah tertaut.</p>
                            </div>
                        ) : (
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[180px]">Paket & Tanggal</TableHead>
                                            <TableHead>Total Bayar</TableHead>
                                            <TableHead className="w-[150px]">Komisi (IDR)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((t) => (
                                            <TableRow key={t.transactionId}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-xs">{t.planName}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {format(new Date(t.createdAt), "dd MMM yyyy")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    Rp {t.totalAmount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            className="h-8 text-xs pr-4"
                                                            value={commissionOverrides[t.transactionId] || "0"}
                                                            onChange={(e) => setCommissionOverrides({
                                                                ...commissionOverrides,
                                                                [t.transactionId]: e.target.value
                                                            })}
                                                            disabled={!selectedAffiliate}
                                                        />
                                                        {selectedAffiliate && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground opacity-50">
                                                                {selectedAffiliate.commissionRate}%
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {selectedAffiliate && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Komisi di atas dihitung otomatis ({selectedAffiliate.commissionRate}%), silakan edit manual jika perlu.
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
