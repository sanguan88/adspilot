'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Ticket, Copy, Trash2, Plus, CheckCircle2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface Voucher {
    id: number
    voucher_code: string
    discount_type: string
    discount_value: number
    is_active: boolean
    usage_count: number
    created_at: string
}

interface AffiliateSettings {
    discountRate: number
    commissionRate: number
}

function VouchersContent() {
    const { token } = useAuth()
    const [vouchers, setVouchers] = useState<Voucher[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newCode, setNewCode] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [showBanner, setShowBanner] = useState(true)
    const [showDismissDialog, setShowDismissDialog] = useState(false)
    const [settings, setSettings] = useState<AffiliateSettings>({
        discountRate: 50,
        commissionRate: 30
    })

    // Check if banner was dismissed
    useEffect(() => {
        const dismissed = localStorage.getItem('voucher_banner_dismissed')
        if (dismissed === 'true') {
            setShowBanner(false)
        }
    }, [])

    // Fetch affiliate settings from admin config
    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings/affiliate')
            const result = await response.json()
            if (result.success && result.data) {
                setSettings({
                    discountRate: result.data.voucherDiscountRate || 50,
                    commissionRate: result.data.defaultCommissionRate || 30
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
            // Use default values
        }
    }

    const fetchVouchers = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/vouchers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const result = await response.json()
            if (result.success) {
                setVouchers(result.data)
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error)
            toast.error('Gagal memuat voucher')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
        if (token) {
            fetchVouchers()
        }
    }, [token])

    const handleCloseBanner = () => {
        setShowDismissDialog(true)
    }

    const handleDismissBanner = (dontRemind: boolean) => {
        setShowBanner(false)
        setShowDismissDialog(false)
        if (dontRemind) {
            localStorage.setItem('voucher_banner_dismissed', 'true')
        }
    }

    const handleCreateVoucher = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCode.trim()) {
            toast.error('Masukkan kode voucher')
            return
        }

        try {
            setCreating(true)
            const response = await fetch('/api/vouchers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ voucherCode: newCode })
            })
            const result = await response.json()

            if (result.success) {
                toast.success('Voucher berhasil dibuat!')
                setNewCode('')
                setShowForm(false)
                fetchVouchers()
            } else {
                toast.error(result.error || 'Gagal membuat voucher')
            }
        } catch (error) {
            console.error('Error creating voucher:', error)
            toast.error('Terjadi kesalahan')
        } finally {
            setCreating(false)
        }
    }

    const handleDeleteVoucher = async (id: number) => {
        if (!confirm('Yakin ingin menghapus voucher ini?')) return

        try {
            const response = await fetch(`/api/vouchers?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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
            toast.error('Terjadi kesalahan')
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Kode voucher disalin!')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Voucher Saya</h1>
                    <p className="text-muted-foreground">
                        Buat kode voucher unik untuk dibagikan kepada calon pelanggan
                    </p>
                </div>
                {vouchers.length === 0 && !showForm && (
                    <Button onClick={() => setShowForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Buat Voucher
                    </Button>
                )}
            </div>

            {/* Info Banner - Dismissible */}
            {showBanner && (
                <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-200 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200/50"
                        onClick={handleCloseBanner}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <CardContent className="py-4 pr-10">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-emerald-500/20">
                                <Ticket className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-800">Cara Kerja Voucher Affiliate</h3>
                                <ul className="text-sm text-emerald-700 mt-2 space-y-1">
                                    <li>✓ Voucher Anda memberikan diskon <strong>{settings.discountRate}%</strong> kepada pelanggan</li>
                                    <li>✓ Setiap pembelian dengan voucher Anda = Anda dapat <strong>komisi {settings.commissionRate}%</strong></li>
                                    <li>✓ Voucher otomatis diterapkan saat pelanggan klik link referral Anda</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dismiss Dialog */}
            <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tutup Info Banner?</DialogTitle>
                        <DialogDescription>
                            Anda bisa menyembunyikan info ini untuk sementara atau permanen.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
                            Batal
                        </Button>
                        <Button variant="secondary" onClick={() => handleDismissBanner(false)}>
                            Tutup Sementara
                        </Button>
                        <Button onClick={() => handleDismissBanner(true)}>
                            Jangan Ingatkan Lagi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Form */}
            {showForm && (
                <Card>
                    <CardHeader>
                        <CardTitle>Buat Voucher Baru</CardTitle>
                        <CardDescription>
                            Pilih kode voucher yang mudah diingat (contoh: NAMAANDA50)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateVoucher} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="voucherCode">Kode Voucher</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="voucherCode"
                                        placeholder="Contoh: RIZKI50"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        className="uppercase"
                                        maxLength={20}
                                    />
                                    <Badge variant="secondary" className="whitespace-nowrap">
                                        Diskon {settings.discountRate}%
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Hanya huruf dan angka, maksimal 20 karakter
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={creating}>
                                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Buat Voucher
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                                    Batal
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Voucher List */}
            {vouchers.length > 0 ? (
                <div className="grid gap-4">
                    {vouchers.map((voucher) => (
                        <Card key={voucher.id} className="overflow-hidden">
                            <div className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-lg bg-primary/10">
                                        <Ticket className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-bold font-mono">{voucher.voucher_code}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => copyToClipboard(voucher.voucher_code)}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                Diskon {Math.round(voucher.discount_value)}%
                                            </span>
                                            <span>•</span>
                                            <span>{voucher.usage_count} penggunaan</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={voucher.is_active ? 'default' : 'secondary'}>
                                        {voucher.is_active ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteVoucher(voucher.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : !showForm ? (
                <Card className="py-12">
                    <CardContent className="text-center">
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Ticket className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Belum Ada Voucher</h3>
                        <p className="text-muted-foreground mb-4">
                            Buat voucher pertama Anda untuk mulai mendapatkan komisi
                        </p>
                        <Button onClick={() => setShowForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Buat Voucher Sekarang
                        </Button>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    )
}

export default function VouchersPage() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <VouchersContent />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
