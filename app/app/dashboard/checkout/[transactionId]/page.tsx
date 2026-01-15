'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, CheckCircle2, ArrowLeft, Receipt, Send, Clock } from 'lucide-react'
import { authenticatedFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Transaction {
    id: number
    transactionId: string
    planId: string
    totalAmount: number
    uniqueCode: number
    paymentMethod: string
    paymentStatus: string
    createdAt: string
    expiresAt: string
}

interface BankAccount {
    id: number
    bank_name: string
    account_number: string
    account_name: string
}

export default function AddonCheckoutPage() {
    const params = useParams()
    const router = useRouter()
    const transactionId = params.transactionId as string

    const [loading, setLoading] = useState(true)
    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
    const [copied, setCopied] = useState<string | null>(null)
    const [isConfirming, setIsConfirming] = useState(false)

    useEffect(() => {
        if (transactionId) {
            fetchData()
        }
    }, [transactionId])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [trxRes, bankRes] = await Promise.all([
                authenticatedFetch(`/api/transactions/${transactionId}`),
                fetch('/api/payment-settings/public') // Public endpoint
            ])

            const trxData = await trxRes.json()
            const bankData = await bankRes.json()

            if (trxData.success) {
                setTransaction(trxData.data)
            } else {
                toast.error(trxData.error || 'Gagal memuat data transaksi')
            }

            if (bankData.success && bankData.data.activeMethod === 'manual') {
                setBankAccounts(bankData.data.bankAccounts)
            }

        } catch (error) {
            console.error('Fetch data error:', error)
            toast.error('Terjadi kesalahan saat memuat data')
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopied(id)
        toast.success('Disalin ke clipboard')
        setTimeout(() => setCopied(null), 2000)
    }

    const handleConfirmPayment = async () => {
        if (!transaction) return

        try {
            setIsConfirming(true)
            const res = await authenticatedFetch(`/api/transactions/${transaction.transactionId}/confirm`, {
                method: 'POST'
            })
            const data = await res.json()

            if (data.success) {
                toast.success('Konfirmasi berhasil dikirim. Mohon tunggu verifikasi admin.')
                // Update transaction state locally
                setTransaction({ ...transaction, paymentStatus: 'waiting_confirmation' })
            } else {
                toast.error(data.error || 'Gagal mengonfirmasi pembayaran')
            }
        } catch (error) {
            console.error('Confirmation error', error)
            toast.error('Terjadi kesalahan')
        } finally {
            setIsConfirming(false)
        }
    }

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    if (!transaction) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Alert variant="destructive">
                    <AlertTitle>Transaksi Tidak Ditemukan</AlertTitle>
                    <AlertDescription>
                        Data transaksi tidak ditemukan atau Anda tidak memiliki akses.
                        <Button
                            variant="link"
                            className="p-0 h-auto font-semibold ml-1 text-white underline"
                            onClick={() => router.push('/accounts')}
                        >
                            Kembali ke Manajemen Toko
                        </Button>
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    // Parse items from planId (e.g., addon-extra_accounts-5-fixed)
    const parsePlan = (planId: string) => {
        const parts = planId.split('-')
        if (parts[0] === 'addon') {
            const qty = parts[2]
            const mode = parts[3]
            return {
                name: `${qty} Toko Tambahan`,
                duration: mode === 'fixed' ? '1 Bulan (30 Hari)' : 'Mengikuti Sisa Subscription (Pro-rata)'
            }
        }
        return { name: planId, duration: '-' }
    }

    const { name, duration } = parsePlan(transaction.planId)

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/accounts')}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Kembali
                </Button>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                    Checkout Pembayaran
                </h1>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Col: Instructions */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-emerald-100 shadow-md">
                        <CardHeader className="bg-emerald-50/50 pb-4">
                            <CardTitle className="flex items-center gap-2 text-emerald-800">
                                <Receipt className="h-5 w-5" />
                                Instruksi Transfer
                            </CardTitle>
                            <CardDescription>
                                Silakan transfer ke rekening berikut untuk menyelesaikan pembayaran.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">

                            {bankAccounts.length > 0 ? (
                                bankAccounts.map((bank) => (
                                    <div key={bank.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-slate-100 px-2 py-1 rounded-bl text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            Transfer Bank
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-500 font-medium">Bank Tujuan</span>
                                            <span className="font-bold text-lg">{bank.bank_name}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-dashed pt-3">
                                            <span className="text-sm text-slate-500 font-medium">No. Rekening</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-lg select-all">{bank.account_number}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => copyToClipboard(bank.account_number, `bank-${bank.id}`)}
                                                >
                                                    {copied === `bank-${bank.id}` ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-dashed pt-3">
                                            <span className="text-sm text-slate-500 font-medium">Atas Nama</span>
                                            <span className="font-medium">{bank.account_name}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <Alert>
                                    <AlertDescription>Tidak ada metode pembayaran manual yang tersedis. Silakan bubungi Admin.</AlertDescription>
                                </Alert>
                            )}

                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mt-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm text-emerald-800 font-semibold">Total Transfer</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-2xl text-emerald-700">
                                            {formatRupiah(transaction.totalAmount)}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100"
                                            onClick={() => copyToClipboard(transaction.totalAmount.toString(), 'amount')}
                                        >
                                            {copied === 'amount' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                                <p className="text-xs text-emerald-600 italic border-t border-emerald-200/50 pt-2 mt-2">
                                    *Mohon transfer sesuai nominal persis (termasuk kode unik {transaction.uniqueCode}) agar verifikasi otomatis/manual lebih cepat.
                                </p>
                            </div>

                            <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                                <AlertTitle className="flex items-center gap-2 font-semibold">
                                    <span className="bg-blue-200 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">!</span>
                                    Penting: Berita Transfer
                                </AlertTitle>
                                <AlertDescription className="text-sm mt-2">
                                    Mohon cantumkan ID Transaksi ini pada berita transfer:
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="bg-white px-2 py-1 rounded border border-blue-200 font-mono font-bold select-all">
                                            {transaction.transactionId}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => copyToClipboard(transaction.transactionId, 'trxId')}
                                        >
                                            {copied === 'trxId' ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                        </Button>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {transaction.paymentStatus === 'waiting_confirmation' ? (
                        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-6 text-center space-y-3">
                            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                            <h3 className="text-lg font-semibold text-blue-900">Pembayaran Sedang Diverifikasi</h3>
                            <p className="text-sm text-blue-700 max-w-md mx-auto">
                                Kami telah menerima konfirmasi pembayaran Anda. Admin akan segera melakukan pengecekan.
                                Status akan otomatis aktif setelah diverifikasi.
                            </p>
                            <Button variant="outline" onClick={() => window.location.reload()} className="mt-2 text-blue-700 border-blue-200 hover:bg-blue-100">
                                Refresh Status
                            </Button>
                        </div>
                    ) : transaction.paymentStatus === 'paid' ? (
                        <div className="w-full bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h3 className="text-lg font-semibold text-green-900">Pembayaran Berhasil!</h3>
                            <p className="text-sm text-green-700 mb-4">Transaksi Anda telah lunas.</p>
                            <Button onClick={() => router.push('/accounts')} className="bg-green-600 hover:bg-green-700 text-white">
                                Kembali ke Dashboard
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 h-14 text-lg font-semibold shadow-emerald-200 shadow-lg transition-all"
                                onClick={handleConfirmPayment}
                                disabled={isConfirming}
                            >
                                {isConfirming ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5 mr-2" />
                                        Konfirmasi Pembayaran
                                    </>
                                )}
                            </Button>
                            <p className="text-center text-xs text-slate-400">
                                Klik tombol di atas jika Anda sudah melakukan transfer
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Col: Summary */}
                <div className="md:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Ringkasan Order</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="pb-4 border-b space-y-2">
                                <div>
                                    <p className="text-slate-500">Item</p>
                                    <p className="font-medium">{name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Durasi</p>
                                    <p className="font-medium truncate" title={duration}>{duration}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Subtotal</span>
                                    <span>{formatRupiah(transaction.totalAmount - (transaction.uniqueCode || 0))}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Kode Unik</span>
                                    <span>{transaction.uniqueCode}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                                    <span>Total</span>
                                    <span className="text-emerald-600">{formatRupiah(transaction.totalAmount)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
