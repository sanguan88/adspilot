'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, CalendarClock, CalendarDays } from 'lucide-react'
import { authenticatedFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AddonPurchaseModalProps {
    open: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function AddonPurchaseModal({ open, onClose, onSuccess }: AddonPurchaseModalProps) {
    const router = useRouter()
    const [quantity, setQuantity] = useState(1)
    const [durationMode, setDurationMode] = useState<'following_subscription' | 'fixed_30_days'>('following_subscription')
    const [pricing, setPricing] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Voucher State
    const [voucherInput, setVoucherInput] = useState('')
    const [appliedVoucher, setAppliedVoucher] = useState('')

    useEffect(() => {
        if (open) {
            fetchPricing(quantity, durationMode, appliedVoucher)
        }
    }, [open, quantity, durationMode, appliedVoucher])

    const fetchPricing = async (qty: number, mode: string, code: string) => {
        try {
            let url = `/api/addons/calculate-price?quantity=${qty}&duration_mode=${mode}`
            if (code) url += `&voucher_code=${code}`

            const res = await authenticatedFetch(url)
            const data = await res.json()
            if (data.success) {
                setPricing(data.data)
                // If error in voucher, toast it once? Or just show inline? Inline is better.
            }
        } catch (error) {
            console.error('Error fetching pricing:', error)
        }
    }

    const handleApplyVoucher = () => {
        if (!voucherInput.trim()) return
        setAppliedVoucher(voucherInput.trim())
    }

    const handleRemoveVoucher = () => {
        setAppliedVoucher('')
        setVoucherInput('')
    }

    const handlePurchase = async () => {
        setLoading(true)
        try {
            const res = await authenticatedFetch('/api/addons/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity,
                    addonType: 'extra_accounts',
                    durationMode,
                    voucherCode: pricing?.voucherCode // Send validated code if exists
                })
            })
            const data = await res.json()

            if (data.success) {
                toast.success('Transaksi berhasil dibuat! Mengalihkan ke halaman pembayaran...')
                if (onSuccess) onSuccess()
                onClose()
                // Redirect to checkout page
                router.push(`/dashboard/checkout/${data.data.transactionId}`)
            } else {
                toast.error(data.error || 'Gagal membuat transaksi')
            }
        } catch (error: any) {
            toast.error(error.message || 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const handleClose = () => {
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl">Beli Addon Toko Tambahan</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-1">
                    {/* Duration Selection (Compact Segmented Control) */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">Pilih Durasi</Label>
                        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                            <button
                                onClick={() => setDurationMode('following_subscription')}
                                className={cn(
                                    "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                    durationMode === 'following_subscription'
                                        ? "bg-white shadow-sm text-emerald-700 ring-1 ring-black/5"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                <CalendarClock className="w-4 h-4" />
                                Ikuti Sisa Subscription
                            </button>
                            <button
                                onClick={() => setDurationMode('fixed_30_days')}
                                className={cn(
                                    "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2",
                                    durationMode === 'fixed_30_days'
                                        ? "bg-white shadow-sm text-emerald-700 ring-1 ring-black/5"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                <CalendarDays className="w-4 h-4" />
                                1 Bulan (30 Hari)
                            </button>
                        </div>

                        {/* Compact Duration Note */}
                        <div className="text-xs text-slate-500 px-1">
                            {durationMode === 'following_subscription' ? (
                                <span>Pro-rata sesuai sisa hari aktif ({pricing?.remainingDays || 0} hari). Expired bersamaan dengan paket utama.</span>
                            ) : (
                                <span>Aktif selama 30 hari penuh. Flat rate Rp 99.000.</span>
                            )}
                        </div>
                    </div>

                    {/* Quantity Input (Compact) */}
                    <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between gap-4">
                        <div className="text-left">
                            <Label className="text-sm font-medium text-gray-700 block">Jumlah Toko</Label>
                            <span className="text-xs text-slate-400">Rp 99rb / toko / bulan</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full shrink-0"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1}
                            >
                                <span className="font-bold">-</span>
                            </Button>

                            <div className="w-12 text-center">
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0
                                        if (val > 20) return
                                        setQuantity(val)
                                    }}
                                    className="w-full text-center text-xl font-bold text-slate-800 border-none focus:outline-none p-0"
                                    min="1"
                                    max="20"
                                />
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full shrink-0"
                                onClick={() => setQuantity(quantity + 1)}
                                disabled={quantity >= 20}
                            >
                                <span className="font-bold">+</span>
                            </Button>
                        </div>
                    </div>

                    {/* Pricing Summary & Voucher */}
                    {pricing && (
                        <div className="space-y-3">
                            {/* Voucher Input */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Punya Kode Voucher?"
                                        value={voucherInput}
                                        onChange={(e) => setVoucherInput(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-emerald-500 uppercase h-9"
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                                    />
                                    <div className="absolute left-3 top-2.5 text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                                    </div>
                                </div>
                                {appliedVoucher && appliedVoucher === pricing.voucherCode && !pricing.voucherError ? (
                                    <Button onClick={handleRemoveVoucher} variant="outline" className="shrink-0 text-red-600 border-red-200 hover:bg-red-50 h-9 px-3">
                                        Hapus
                                    </Button>
                                ) : (
                                    <Button onClick={handleApplyVoucher} variant="secondary" className="shrink-0 h-9 px-3">
                                        Pakai
                                    </Button>
                                )}
                            </div>

                            {/* Voucher Feedback */}
                            {pricing.voucherError && appliedVoucher && (
                                <p className="text-xs text-red-500 font-medium ml-1 -mt-1">
                                    ❌ {pricing.voucherError}
                                </p>
                            )}
                            {pricing.voucherCode && !pricing.voucherError && (
                                <p className="text-xs text-emerald-600 font-medium ml-1 -mt-1">
                                    ✅ Voucher <b>{pricing.voucherCode}</b> applied!
                                </p>
                            )}

                            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm border border-gray-100">
                                {/* Compact Rows */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <div className="text-slate-500">Durasi:</div>
                                    <div className="text-right font-medium">{pricing.remainingDays} Hari ({durationMode === 'fixed_30_days' ? pricing.addonEndDate : pricing.subscriptionEndDate})</div>

                                    <div className="text-slate-500">Subtotal:</div>
                                    <div className="text-right font-medium">{formatRupiah(pricing.subtotal)}</div>

                                    {pricing.discountAmount > 0 && (
                                        <>
                                            <div className="text-emerald-600">Diskon:</div>
                                            <div className="text-right font-medium text-emerald-600">- {formatRupiah(pricing.discountAmount)}</div>
                                        </>
                                    )}
                                </div>

                                <div className="border-t pt-2 mt-1 flex justify-between items-center">
                                    <span className="font-semibold text-slate-800">Total Biaya:</span>
                                    <div className="text-right">
                                        <div className="font-bold text-xl text-emerald-600 leading-none">
                                            {formatRupiah(pricing.total)}
                                        </div>
                                        <div className="text-[10px] text-gray-400 mt-1">
                                            Inc. PPN 11% & Kode Unik
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button variant="ghost" onClick={handleClose} className="flex-1 text-gray-500">
                            Batal
                        </Button>
                        <Button
                            onClick={handlePurchase}
                            disabled={loading}
                            className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transform transition-all active:scale-95 shadow-md shadow-emerald-200"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Lanjut Checkout'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
