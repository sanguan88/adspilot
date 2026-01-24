"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2, Rocket, DollarSign, Clock, ArrowRight, Loader2, Share2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface AffiliateClientProps {
    defaultCommissionRate: string
}

export default function AffiliateClient({ defaultCommissionRate }: AffiliateClientProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingStatus, setIsCheckingStatus] = useState(true)
    const [successData, setSuccessData] = useState<any | null>(null)

    // URL Affiliate Portal (bisa disesuaikan environment)
    // Di production: https://aff.adspilot.id
    // Di local: http://localhost:3003
    const AFFILIATE_URL = process.env.NEXT_PUBLIC_AFFILIATE_URL || "http://localhost:3003"

    // Check if user is already an affiliate on mount
    useEffect(() => {
        const checkAffiliateStatus = async () => {
            try {
                const response = await fetch("/api/user/affiliate-status")
                const result = await response.json()

                if (result.success && result.isAffiliate) {
                    setSuccessData({
                        affiliateCode: result.data.affiliateCode,
                        commissionRate: result.data.commissionRate || defaultCommissionRate
                    })
                }
            } catch (error) {
                console.error("Error checking affiliate status:", error)
            } finally {
                setIsCheckingStatus(false)
            }
        }

        checkAffiliateStatus()
    }, [defaultCommissionRate])

    const handleActivate = async () => {
        setIsLoading(true)
        try {
            // Auth relies on httpOnly cookies automatically sent by browser
            const response = await fetch("/api/user/activate-affiliate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            })

            const result = await response.json()

            if (response.ok && result.success) {
                // Merge defaultCommissionRate if API doesn't return it
                const dataWithCommission = {
                    ...result.data,
                    commissionRate: result.data?.commissionRate || defaultCommissionRate
                }
                setSuccessData(dataWithCommission)
                toast.success(result.isNew ? "Akun affiliate berhasil dibuat!" : "Akun affiliate Anda sudah aktif")
            } else {
                toast.error(result.error || "Gagal mengaktifkan akun affiliate")
            }
        } catch (error) {
            console.error("Activation error:", error)
            toast.error("Terjadi kesalahan sistem")
        } finally {
            setIsLoading(false)
        }
    }

    // Show loading while checking status
    if (isCheckingStatus) {
        return (
            <div className="container mx-auto py-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        )
    }

    if (successData) {
        return (
            <div className="container mx-auto py-10 max-w-4xl animate-in fade-in zoom-in duration-500">
                <Card className="border-teal-500 border-2 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white text-center">
                        <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                            <Rocket className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Selamat! Akun Affiliate Aktif 🚀</h1>
                        <p className="text-teal-50 opacity-90">Anda sekarang resmi menjadi partner AdsPilot</p>
                    </div>

                    <CardContent className="p-8 space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Kode Referral Anda</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl font-black text-slate-800 tracking-tight">{successData.affiliateCode}</span>
                                    <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-200">Aktif</Badge>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Bagikan kode ini atau link referral Anda</p>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Komisi Anda</h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-3xl font-black text-emerald-600">{successData.commissionRate}%</span>
                                    <span className="text-sm font-medium text-slate-400 bg-white px-2 py-1 rounded shadow-sm border">Lifetime</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Dari setiap pembayaran user yang Anda referensikan</p>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-full mt-0.5">
                                <Share2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-blue-900">Login ke Dashboard Affiliate</h4>
                                <p className="text-sm text-blue-700/80 mt-1 mb-3">
                                    Gunakan <strong>Email</strong> dan <strong>Password</strong> akun AdsPilot Anda saat ini untuk login ke portal affiliate.
                                </p>
                                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                                    <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer">
                                        Buka Portal Affiliate
                                        <ExternalLink className="ml-2 w-4 h-4" />
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Partner Affiliate</h1>
                    <p className="text-slate-500 mt-1">Dapatkan penghasilan tambahan dengan merekomendasikan AdsPilot</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="overflow-hidden border-teal-100 shadow-lg">
                        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                                <DollarSign className="w-64 h-64" />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-bold mb-4">Cuan Bareng AdsPilot 💸</h2>
                                <p className="text-teal-50 leading-relaxed max-w-xl">
                                    Aktifkan akun affiliate Anda sekarang dan mulai hasilkan passive income.
                                    Setiap teman yang Anda ajak berlangganan akan memberikan komisi untuk Anda, selamanya!
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-8">
                            <h3 className="text-lg font-semibold mb-6">Keuntungan Partner:</h3>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <BenefitItem
                                    icon={DollarSign}
                                    title={`Komisi ${defaultCommissionRate}% Lifetime`}
                                    desc="Dapatkan komisi dari setiap pembayaran user referral Anda, selama mereka berlangganan."
                                />
                                <BenefitItem
                                    icon={Clock}
                                    title="Cookie 90 Hari"
                                    desc="Tracking referral bertahan selama 3 bulan sejak klik pertama."
                                />
                                <BenefitItem
                                    icon={Share2}
                                    title="Mudah Dibagikan"
                                    desc="Cukup share link atau kode unik Anda ke sosial media atau komunitas seller."
                                />
                                <BenefitItem
                                    icon={CheckCircle2}
                                    title="Pembayaran Cepat"
                                    desc="Withdraw komisi Anda Setiap 2 Minggu dengan proses yang transparan."
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="bg-slate-50 p-6 border-t border-slate-100 flex justify-between items-center">
                            <div className="text-sm text-slate-500">
                                Sudah siap bergabung?
                            </div>
                            <Button
                                size="lg"
                                onClick={handleActivate}
                                disabled={isLoading}
                                className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-600/20"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        Aktifkan Akun Sekarang
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Sidebar Info (Right) */}
                <div className="space-y-6">
                    <Card className="bg-slate-50 border-dashed border-2 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-base text-slate-700">Cara Kerja</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Step number="1" text="Klik tombol 'Aktifkan Akun Sekarang'" />
                            <Step number="2" text="Dapatkan Kode Referral unik Anda" />
                            <Step number="3" text="Share link ke teman sesama seller" />
                            <Step number="4" text="Terima komisi saat mereka berlangganan" />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base text-slate-700">FAQ Singkat</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-slate-600">
                            <div>
                                <strong className="block text-slate-800 mb-1">Apakah gratis?</strong>
                                Ya, pendaftaran partner 100% gratis.
                            </div>
                            <div>
                                <strong className="block text-slate-800 mb-1">Kapan cair?</strong>
                                Komisi dicairkan Setiap 2 Minggu setelah mencapai batas minimum.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function BenefitItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="bg-teal-50 p-2 rounded-lg mt-1">
                <Icon className="w-5 h-5 text-teal-600" />
            </div>
            <div>
                <h4 className="font-bold text-slate-800 mb-1">{title}</h4>
                <p className="text-sm text-slate-500 leading-snug">{desc}</p>
            </div>
        </div>
    )
}

function Step({ number, text }: { number: string, text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {number}
            </div>
            <p className="text-sm text-slate-600">{text}</p>
        </div>
    )
}
