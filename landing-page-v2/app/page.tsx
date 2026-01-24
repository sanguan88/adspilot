"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { HighlightText } from "@/components/ui/highlight-text"
import { VideoPlaceholder } from "@/components/ui/video-placeholder"
import {
  CheckCircle2,
  TrendingUp,
  Zap,
  Shield,
  BarChart3,
  Users,
  Star,
  ArrowRight,
  Play,
  Award,
  Clock,
  DollarSign,
  ShoppingBag,
  Target,
  Rocket,
  Sparkles,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { PixelTracker } from "@/components/PixelTracker"

interface Plan {
  planId: string
  name: string
  description: string
  price: number
  originalPrice: number | null
  discountPercentage: number | null
  billingCycle: string
  durationMonths: number
  durationDays?: number
  features: {
    maxAccounts: number
    maxAutomationRules: number
    maxCampaigns: number
    support: string
  }
  featuresList: string[]
  isActive: boolean
  displayOrder: number
  isPopular?: boolean
  isPremium?: boolean
}

interface VoucherInfo {
  voucher: {
    id: number
    code: string
    name: string
    description: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    maximumDiscount: number | null
  }
  discountAmount: number
  baseAmount: number
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [defaultVoucherCode, setDefaultVoucherCode] = useState<string | null>(null)
  const [defaultVoucherDiscount, setDefaultVoucherDiscount] = useState<number>(0)
  const [planVouchers, setPlanVouchers] = useState<Record<string, VoucherInfo | null>>({})
  const [loadingVouchers, setLoadingVouchers] = useState(false)

  // Promo Banner State
  const [promoBanner, setPromoBanner] = useState<{
    isEnabled: boolean
    badgeText: string
    title: string
    description: string
    ctaText: string
  } | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true)
        const response = await fetch(`${API_URL}/api/plans`)
        const result = await response.json()
        if (result.success) {
          setPlans(result.data)
        } else {
          console.error('Error fetching plans:', result.error)
        }
      } catch (error) {
        console.error('Error fetching plans:', error)
      } finally {
        setLoadingPlans(false)
      }
    }
    fetchPlans()

    // Fetch promo banner
    const fetchPromoBanner = async () => {
      try {
        const response = await fetch('/api/promo-banner')
        const result = await response.json()
        if (result.success) {
          setPromoBanner(result.data)
        }
      } catch (error) {
        console.error('Error fetching promo banner:', error)
      }
    }
    fetchPromoBanner()
  }, [])

  // Handle Referral Tracking (First-Click Attribution) + Auto-inject Affiliate Voucher
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search)
    const refCode = params.get('ref')

    if (refCode) {
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      }

      // ALWAYS track click for statistics (even if cookie exists)
      fetch(`${API_URL}/api/tracking/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralCode: refCode }),
      }).catch(err => console.error('Tracking error:', err))

      // But ONLY set cookie on first visit (First-Click Wins for commission)
      const existingRef = getCookie('referral_code')
      if (!existingRef) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 90) // 3 months
        document.cookie = `referral_code=${refCode}; expires=${expiryDate.toUTCString()}; path=/; samesite=strict`

        // Track first click date
        if (!localStorage.getItem('referral_first_click')) {
          localStorage.setItem('referral_first_click', new Date().toISOString())
        }
      }

      // Auto-inject affiliate voucher (always set/update based on current ref)
      // This ensures the affiliate voucher is prioritized over default voucher
      const existingAffVoucher = getCookie('affiliate_voucher')
      if (!existingAffVoucher) {
        fetch(`${API_URL}/api/tracking/voucher?ref=${refCode}`)
          .then(res => res.json())
          .then(result => {
            if (result.success && result.data?.voucherCode) {
              const expiryDate = new Date()
              expiryDate.setDate(expiryDate.getDate() + 90) // 3 months
              document.cookie = `affiliate_voucher=${result.data.voucherCode}; expires=${expiryDate.toUTCString()}; path=/; samesite=strict`
              console.log('[Affiliate] Voucher auto-injected:', result.data.voucherCode)
            }
          })
          .catch(err => console.error('Voucher lookup error:', err))
      }
    }
  }, [])

  // Fetch default voucher
  useEffect(() => {
    const fetchDefaultVoucher = async () => {
      try {
        const response = await fetch(`${API_URL}/api/payment-settings/public`)
        const result = await response.json()
        if (result.success && result.data.defaultVoucherCode) {
          setDefaultVoucherCode(result.data.defaultVoucherCode)
          // Fetch voucher details to get discount percentage
          try {
            const voucherResponse = await fetch(`${API_URL}/api/vouchers/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                voucherCode: result.data.defaultVoucherCode,
                planId: 'any',
                baseAmount: 100000,
              }),
            })
            const voucherResult = await voucherResponse.json()
            if (voucherResult.success && voucherResult.data?.voucher?.discountType === 'percentage') {
              setDefaultVoucherDiscount(voucherResult.data.voucher.discountValue)
            }
          } catch (err) {
            console.error('Error fetching voucher details:', err)
          }
        }
      } catch (error) {
        console.error('Error fetching default voucher:', error)
      }
    }
    fetchDefaultVoucher()
  }, [])

  // Validate default voucher for each plan
  useEffect(() => {
    const validateVouchers = async () => {
      if (!defaultVoucherCode || plans.length === 0) return

      try {
        setLoadingVouchers(true)
        const voucherMap: Record<string, VoucherInfo | null> = {}

        for (const plan of plans) {
          try {
            // Use originalPrice for voucher calculation if available, otherwise use price
            const baseAmountForVoucher = plan.originalPrice && plan.originalPrice > plan.price
              ? plan.originalPrice
              : plan.price

            const response = await fetch(`${API_URL}/api/vouchers/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                voucherCode: defaultVoucherCode,
                planId: plan.planId,
                baseAmount: baseAmountForVoucher,
              }),
            })

            const result = await response.json()
            if (result.success) {
              voucherMap[plan.planId] = result.data
            } else {
              voucherMap[plan.planId] = null
            }
          } catch (error) {
            console.error(`Error validating voucher for plan ${plan.planId}:`, error)
            voucherMap[plan.planId] = null
          }
        }

        setPlanVouchers(voucherMap)
      } catch (error) {
        console.error('Error validating vouchers:', error)
      } finally {
        setLoadingVouchers(false)
      }
    }

    validateVouchers()
  }, [defaultVoucherCode, plans])

  const handleCTAClick = () => {
    // Track CTA click if needed
  }

  // Helper function to generate checkout URL with plan parameter
  const getCheckoutUrl = (planId: string) => {
    return `${APP_URL}/auth/checkout?plan=${planId}`
  }

  return (
    <div className="min-h-screen bg-white">
      <PixelTracker />
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="/adspilot.png"
                alt="ADSPILOT Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#fitur" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Fitur
              </Link>
              <Link href="#harga" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Harga
              </Link>
              <Link href="#testimoni" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Testimoni
              </Link>
              <Link href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`${APP_URL}/auth/login`}>Masuk</Link>
              </Button>
              <Button size="sm" asChild onClick={handleCTAClick}>
                <Link href="#harga">Daftar Sekarang</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-white py-12 sm:py-20 lg:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Headline - Benefit Headline dengan Highlight */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
              Tingkatkan Margin Profit Shopee Anda{" "}
              <HighlightText>Hingga 300%</HighlightText>{" "}
              dengan <HighlightText>Otomasi Cerdas 24/7</HighlightText>!
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Hentikan ketakutan budget iklan habis sia-sia. ADSPILOT mengelola iklan Shopee Anda
              secara otomatis 24/7, <strong>tanpa perlu bangun tengah malam</strong> untuk setting iklan.
            </p>

            {/* Video Placeholder */}
            <div className="relative w-full mb-6 sm:mb-8">
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 max-w-4xl mx-auto">
                <iframe
                  src="https://www.youtube.com/embed/FwiUXkDFGK0"
                  className="w-full h-full"
                  title="AdsPilot Intro Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            </div>


            {/* Social Proof - Benefit Focused */}
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                <strong>Solusi untuk seller yang lelah mengelola iklan manual</strong>
              </p>
              <div className="flex items-center gap-6 flex-wrap justify-center text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Otomasi 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Aman & Terpercaya</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Setup 5 Menit</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hook Section - After Video */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-red-50 via-orange-50 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-xl border-2 border-red-200 p-8 sm:p-10">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                  PERHATIAN!
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 leading-tight">
                  Seller Shopee Gak Ngiklan?{" "}
                  <HighlightText>OMSET Auto Drop Drastis!</HighlightText>
                </h2>
              </div>

              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p className="text-center text-xl font-semibold text-foreground">
                  Oleh karena itu, salah satu cara boost OMSET adalah dengan ngiklan.
                </p>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg my-6">
                  <p className="text-xl font-bold text-foreground mb-2">
                    Namun!!! Ngiklan bukan hanya sekedar ngiklan biasa,
                  </p>
                  <p className="text-xl font-bold text-primary">
                    tapi iklan yang benar-benar terkontrol dan teroptimasi.
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                  <p className="text-lg font-bold text-foreground mb-4">
                    Masalahnya adalah...
                  </p>
                  <ul className="space-y-3 text-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold text-xl"></span>
                      <span><strong>Sebagian besar budget iklan bisa terbuang sia-sia</strong> karena iklan tidak terkontrol dengan baik. Budget habis di produk yang tidak menghasilkan penjualan, tapi Anda tidak tahu mana yang rugi.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold text-xl"></span>
                      <span><strong>Harus bangun tengah malam</strong> untuk setting iklan di jam 00:00 karena promo dimulai tengah malam. Kalau lupa, kehilangan momentum penjualan.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold text-xl"></span>
                      <span><strong>Pusing cek puluhan hingga ratusan iklan</strong> setiap hari. Harus buka satu per satu, cek performa, adjust bid, dan monitor budget. Capek mental!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold text-xl"></span>
                      <span><strong>Bayar advertiser mahal</strong> untuk mengelola banyak toko Shopee. Biaya bulanan bisa puluhan juta, padahal hasilnya belum tentu maksimal.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1 font-bold text-xl"></span>
                      <span><strong>Rasio iklan tidak terkontrol</strong> dan ternyata boncos. Baru sadar setelah budget habis, ternyata ROI negatif. Terlambat!</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-lg mt-6">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    Solusinya?
                  </p>
                  <p className="text-lg text-foreground">
                    <strong>ADSPILOT</strong> mengelola iklan Anda secara otomatis 24/7 dengan kontrol penuh.
                    Tidak perlu bangun tengah malam lagi. Tidak perlu panik saat budget habis.
                    <HighlightText>ADSPILOT yang mengatur semuanya, iklan Anda benar-benar terkontrol dan teroptimasi.</HighlightText>
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <Button size="lg" className="text-base px-8 py-6 h-auto" asChild onClick={handleCTAClick}>
                  <Link href="#harga">
                    Kontrol Iklan Anda Sekarang
                    <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section id="fitur" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Semua yang Anda Butuhkan untuk{" "}
              <HighlightText>Sukses di Shopee</HighlightText>
            </h2>
            <p className="text-lg text-muted-foreground">
              Fitur lengkap yang dirancang khusus untuk membantu seller Shopee meningkatkan penjualan
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Feature 1 */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Otomasi Iklan Cerdas</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Atur iklan Anda sekali, biarkan AdsPilot yang mengelola. Sistem otomasi kami akan
                mengoptimalkan budget dan bid secara otomatis untuk hasil maksimal.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Auto-bid berdasarkan performa</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Jadwal iklan otomatis</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Pause iklan yang tidak efektif</span>
                </li>
              </ul>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Analitik Real-Time</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Pantau performa iklan Anda secara real-time. Lihat ROI, conversion rate,
                dan metrik penting lainnya dalam satu dashboard yang mudah dipahami.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Dashboard interaktif</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Menganalisa data harian otomatis</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Memprediksi performa untuk masa depan</span>
                </li>
              </ul>
            </Card>

            {/* Feature 3 - Rekam Medic */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Rekam Medic - BCG Matrix</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Diagnosis kesehatan iklan dengan teknologi BCG Matrix dari Fortune 500. Ketahui iklan mana yang produktif dan mana yang buang-buang budget.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Kategorisasi iklan otomatis</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Analisis Star, Cash Cow, Dog</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Rekomendasi aksi cerdas</span>
                </li>
              </ul>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Hemat Budget Hingga 40%</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Optimalkan pengeluaran iklan Anda tanpa mengurangi performa. Sistem kami
                memastikan setiap rupiah yang Anda keluarkan memberikan hasil maksimal.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Smart budget allocation</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Deteksi iklan tidak efektif</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Recomendasi optimasi budget</span>
                </li>
              </ul>
            </Card>

            {/* Feature 5 */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">100% Aman & Terpercaya</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Data dan akun Shopee Anda aman bersama kami. Kami menggunakan enkripsi
                tingkat enterprise dan tidak pernah menyimpan password Anda.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Enkripsi SSL 256-bit</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Session cookies terenkripsi</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Disconnect kapan saja</span>
                </li>
              </ul>
            </Card>

            {/* Feature 6 */}
            <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Setup dalam 5 Menit</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                Tidak perlu ribet! Setup AdsPilot hanya butuh 5 menit. Koneksikan akun Shopee
                Anda, pilih produk yang ingin diiklankan, dan biarkan AdsPilot bekerja.
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Koneksi akun Shopee mudah</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Buat automation rules cepat</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>Support via Telegram member group</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Rekam Medic Feature Section - Super Feature */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/10 via-primary/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <Sparkles className="h-4 w-4" />
                FITUR REVOLUSIONER
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Akhirnya Terungkap! <HighlightText>Rekam Medic</HighlightText> untuk Iklan Shopee
              </h2>
              <p className="text-lg text-muted-foreground">
                Teknologi yang digunakan perusahaan Fortune 500, sekarang tersedia untuk seller Shopee
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-12">
              {/* Explanation Section */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Apa Itu Rekam Medic?
                </h3>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                  <strong className="text-foreground">Rekam Medic</strong> adalah fitur diagnosis kesehatan iklan yang menggunakan teknologi <strong className="text-foreground">BCG Matrix (Boston Consulting Group)</strong> - framework analisis bisnis legendaris yang digunakan perusahaan Fortune 500 untuk mengkategorikan produk berdasarkan Market Share dan Growth Rate. Sekarang, AdsPilot membawa teknologi ini ke dunia iklan Shopee.
                </p>
              </div>

              {/* Mega Image Dashboard Section */}
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                  <img
                    src="/rekam-medic.jpg"
                    alt="Rekam Medic - BCG Matrix Analysis Dashboard"
                    className="w-full h-auto object-contain"
                  />
                  {/* Floating badge over image */}
                  <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-medium border border-white/20">
                    Live Dashboard Visualization
                  </div>
                </div>
              </div>

              {/* BCG Categories Grid */}
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-primary font-bold tracking-wider uppercase text-sm mb-2">Diagnosis Hasil</p>
                  <h4 className="text-xl font-bold">Dengan Rekam Medic, Anda akan tahu:</h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      <h5 className="font-bold text-foreground">Star Products (Top Perform)</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">Iklan yang menghasilkan tinggi dan tumbuh cepat. Fokus investasi maksimal di sini!</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <h5 className="font-bold text-foreground">Cash Cows (Revenue Stabil)</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">Iklan stabil yang menghasilkan uang konsisten. Pertahankan performanya!</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                      <h5 className="font-bold text-foreground">Question Marks (Fase Testing)</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">Iklan potensial tapi performa belum jelas. Perlu optimasi atau ganti strategi.</p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-primary/10 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      <h5 className="font-bold text-foreground">Dogs Products (Under Perform)</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">Iklan yang buang-buang budget (boncos). Segera hentikan dan hemat biaya Anda!</p>
                  </div>
                </div>
              </div>

              {/* Benefits Section */}
              <div className="grid sm:grid-cols-3 gap-6 pt-8">
                <div className="text-center group">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <TrendingUp className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">Hentikan Pemborosan</h4>
                  <p className="text-sm text-muted-foreground">Langsung identifikasi iklan "Dogs" yang menghabiskan budget tanpa hasil.</p>
                </div>

                <div className="text-center group">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Target className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">Alokasi Budget Cerdas</h4>
                  <p className="text-sm text-muted-foreground">Investasikan budget Anda pada iklan "Stars" yang terbukti menghasilkan penjualan.</p>
                </div>

                <div className="text-center group">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Award className="h-7 w-7" />
                  </div>
                  <h4 className="font-bold text-foreground mb-2">Teknologi Terbukti</h4>
                  <p className="text-sm text-muted-foreground">Gunakan framework analisis bisnis kelas atas untuk iklan Shopee Anda.</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center bg-white rounded-lg p-8 border-2 border-primary/20 shadow-lg mt-16 sm:mt-24">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                Jangan Biarkan Budget Iklan Terbuang Sia-Sia
              </h3>
              <p className="text-muted-foreground mb-6">
                Dengan Rekam Medic, Anda akan langsung tahu iklan mana yang produktif dan mana yang buang-buang duit.
                <strong className="text-foreground"> Hemat budget hingga 40% dengan alokasi yang tepat.</strong>
              </p>
              <Button size="lg" className="text-base px-4 py-4 sm:px-8 sm:py-6 h-auto w-full sm:w-auto whitespace-normal text-center" asChild onClick={handleCTAClick}>
                <Link href="#harga">
                  Coba Rekam Medic Sekarang
                  <ArrowRight className="ml-2 inline-block shrink-0" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimoni" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Apa Kata Mereka yang Sudah{" "}
              <HighlightText>Menggunakan ADSPILOT</HighlightText>
            </h2>
            <p className="text-lg text-muted-foreground">
              Seller yang sudah merasakan manfaat otomasi iklan dengan ADSPILOT
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {[
              {
                name: "Rizky Maulana",
                role: "Seller Herbal",
                image: "/rizky.jpg",
                initials: "RM",
                rating: 5,
                text: "Sejak pakai AdsPilot, penjualan saya meningkat signifikan! Budget iklan lebih efisien dan ROI meningkat. Sekarang saya bisa tidur nyenyak tanpa khawatir iklan boncos. Recommended!",
              },
              {
                name: "Nurul Fauziyah",
                role: "Seller Kecantikan",
                image: "/nurul.jpg",
                initials: "NF",
                rating: 5,
                text: "Dulu hidup saya nggak tenang, tiap jam 12 malam harus bangun cuma buat reset default iklan manual supaya nggak boncos. Sejak ada AdsPilot, semua serba otomatis. Saya bisa tidur nyenyak dan pas bangun, performa iklan sudah optimal. Bener-bener penyelamat!",
              },
              {
                name: "Cepi Kurniawan",
                role: "Agensi Iklan",
                image: "/cepi.jpg",
                initials: "CK",
                rating: 5,
                text: "Sebagai agensi, mengelola puluhan klien sekaligus sangat menantang. Dengan AdsPilot, tim kami hemat waktu 80% untuk optimasi. ROAS klien terjaga stabil dan kami bisa fokus ke strategi kreatif. Game changer buat skala bisnis agensi!",
              },
            ].map((testimonial, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center text-primary font-bold">
                    {testimonial.image ? (
                      <img
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      testimonial.initials
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" asChild>
              <Link href="#testimoni">
                Baca Lebih Banyak Testimoni
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Mulai dalam{" "}
              <HighlightText>3 Langkah Sederhana</HighlightText>
            </h2>
            <p className="text-lg text-muted-foreground">
              Setup ADSPILOT hanya butuh 5 menit, hasilnya bisa dirasakan langsung!
            </p>
          </div>

          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "1",
                title: "Daftar & Koneksikan Akun",
                description: "Daftar gratis, lalu koneksikan akun Shopee Anda dengan aman. Proses ini hanya butuh 2 menit.",
                icon: ShoppingBag,
              },
              {
                step: "2",
                title: "Pilih Produk & Atur Budget",
                description: "Pilih produk yang ingin diiklankan dan tentukan budget harian. AdsPilot akan memberikan rekomendasi optimal.",
                icon: Target,
              },
              {
                step: "3",
                title: "Biarkan AdsPilot Bekerja",
                description: "Sit back and relax! ADSPILOT akan mengelola iklan Anda 24/7, mengoptimalkan performa secara otomatis.",
                icon: Sparkles,
              },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="relative inline-flex items-center justify-center mb-6">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-10 w-10 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="text-base px-8 py-6 h-auto" asChild onClick={handleCTAClick}>
              <Link href="#harga">
                Mulai Sekarang - Gratis!
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Promo Banner - Dynamic from API */}
          {promoBanner?.isEnabled && (
            <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
              {promoBanner.badgeText && (
                <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                  <Clock className="h-4 w-4" />
                  {promoBanner.badgeText}
                </div>
              )}
              {promoBanner.title && (
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  {promoBanner.title}
                </h2>
              )}
              {promoBanner.description && (
                <p className="text-lg text-muted-foreground">
                  {promoBanner.description}
                </p>
              )}
              {promoBanner.ctaText && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">
                    {promoBanner.ctaText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Dynamic grid based on number of active plans */}
          <div className={`grid gap-4 sm:gap-6 lg:gap-8 mx-auto ${plans.length === 0 ? 'grid-cols-1' :
            plans.length === 1 ? 'grid-cols-1 max-w-md' :
              plans.length === 2 ? 'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 max-w-3xl' :
                'grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl'
            }`}>
            {loadingPlans ? (
              <div className="col-span-full text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Memuat data plan...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Tidak ada plan tersedia</p>
              </div>
            ) : (
              plans.map((plan) => {
                const formatPrice = (price: number) => {
                  return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(price)
                }

                const isPopular = plan.isPopular || false
                const isPremium = plan.isPremium || false

                // Determine duration text based on days or months
                const durationText = plan.durationDays && plan.durationDays > 0
                  ? `${plan.durationDays} hari`
                  : plan.durationMonths === 1
                    ? '1 bulan'
                    : plan.durationMonths === 3
                      ? '3 bulan'
                      : plan.durationMonths === 6
                        ? '6 bulan'
                        : `${plan.durationMonths} bulan`

                // Get voucher info for this plan
                const voucherInfo = planVouchers[plan.planId]

                // Calculate price with default voucher discount (NO PPN on landing page)
                // Use originalPrice if available (for voucher calculation), otherwise use price
                const basePriceForVoucher = plan.originalPrice && plan.originalPrice > plan.price
                  ? plan.originalPrice
                  : plan.price
                const basePrice = plan.price
                const discountAmount = voucherInfo?.discountAmount || 0
                // If voucher is applied, calculate from basePriceForVoucher, otherwise use basePrice
                // PPN will be calculated only in checkout page, not here
                const priceAfterDiscount = voucherInfo
                  ? (basePriceForVoucher - discountAmount)
                  : basePrice

                // Calculate price per month (use price after discount if voucher applied)
                const displayPrice = priceAfterDiscount

                // For daily plans, free plans, or 1-month plans, don't show per-month calculation
                // Only show per-month for plans with more than 1 month duration
                const shouldShowPerMonth = displayPrice > 0 && (!plan.durationDays || plan.durationDays === 0) && plan.durationMonths > 1
                const pricePerMonth = shouldShowPerMonth
                  ? (displayPrice / plan.durationMonths)
                  : 0

                // Calculate savings text
                let savingsText = null
                if (voucherInfo && discountAmount > 0) {
                  savingsText = `Hemat ${formatPrice(discountAmount)}`
                } else if (plan.originalPrice && plan.originalPrice > plan.price) {
                  const savings = plan.originalPrice - plan.price
                  savingsText = `Hemat ${formatPrice(savings)}`
                }

                return (
                  <Card
                    key={plan.planId}
                    className={`p-6 sm:p-8 relative h-full flex flex-col ${isPopular
                      ? "border-2 border-primary shadow-xl md:scale-105 bg-gradient-to-br from-primary/5 to-white"
                      : isPremium
                        ? "border-2 border-primary/30 shadow-lg"
                        : "border shadow-sm hover:shadow-md transition-shadow"
                      }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                          PALING POPULER
                        </span>
                      </div>
                    )}
                    {isPremium && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                          PALING HEMAT
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6 flex-shrink-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4">{plan.description}</p>

                      {/* Price Display */}
                      <div className="mb-4">
                        {/* Show original price if exists (including free plans with 100% discount) */}
                        {plan.originalPrice && plan.originalPrice > plan.price && (
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-base sm:text-lg text-muted-foreground line-through">
                              {formatPrice(plan.originalPrice)}
                            </span>
                            {plan.discountPercentage && (
                              <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                                -{plan.discountPercentage}%
                              </span>
                            )}
                          </div>
                        )}
                        {/* Show base price with line-through if voucher applied */}
                        {voucherInfo && discountAmount > 0 && (
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-base sm:text-lg text-muted-foreground line-through">
                              {formatPrice(basePrice)}
                            </span>
                            {voucherInfo.voucher.discountType === 'percentage' && (
                              <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">
                                -{voucherInfo.voucher.discountValue}%
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl sm:text-4xl font-bold text-foreground">
                            {displayPrice === 0 ? "GRATIS" : formatPrice(displayPrice)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {durationText}{shouldShowPerMonth ? `  ${formatPrice(pricePerMonth)}/bulan` : ''}
                        </p>
                        {savingsText && (
                          <p className="text-xs sm:text-sm font-semibold text-green-600 mt-2">
                            {savingsText}
                          </p>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-grow">
                      {plan.featuresList && plan.featuresList.length > 0 ? (
                        plan.featuresList.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
                            <span className="text-xs sm:text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs sm:text-sm text-muted-foreground">Tidak ada fitur tersedia</li>
                      )}
                    </ul>

                    <Button
                      className="w-full mt-auto flex-shrink-0"
                      variant="default"
                      size="lg"
                      asChild
                      onClick={handleCTAClick}
                    >
                      <Link href={`${APP_URL}/auth/checkout?plan=${plan.planId}`}>
                        Langganan Sekarang
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </Card>
                )
              })
            )}
          </div>

          <div className="text-center mt-12">
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Transaksi Aman & Terpercaya</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Data Terenkripsi SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Pembayaran Terverifikasi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center mb-8 sm:mb-12 lg:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Pertanyaan yang{" "}
              <HighlightText>Sering Diajukan</HighlightText>
            </h2>
            <p className="text-lg text-muted-foreground">
              Temukan jawaban untuk pertanyaan Anda di sini
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                question: "Apa itu ADSPILOT?",
                answer:
                  "ADSPILOT adalah platform otomasi iklan untuk Shopee yang membantu seller mengelola, mengoptimalkan, dan meningkatkan performa iklan secara otomatis. Dengan algoritma cerdas, ADSPILOT memastikan setiap rupiah budget iklan Anda memberikan hasil maksimal.",
              },
              {
                question: "Bagaimana cara AdsPilot bekerja?",
                answer:
                  "AdsPilot terhubung dengan akun Shopee Anda menggunakan session cookies (sama seperti saat Anda login di browser). Setelah setup, sistem otomasi kami akan menganalisis performa iklan, mengoptimalkan bid, mengatur budget, dan memberikan rekomendasi strategi secara real-time. Semua berjalan otomatis 24/7.",
              },
              {
                question: "Apakah AdsPilot aman untuk akun Shopee saya?",
                answer:
                  "Ya, sangat aman! AdsPilot menggunakan session cookies yang terenkripsi (sama seperti saat Anda login di browser Shopee). Kami menggunakan enkripsi SSL 256-bit untuk melindungi data Anda. Kami TIDAK pernah menyimpan password Anda, dan Anda bisa disconnect kapan saja. Seller Shopee sudah mempercayai AdsPilot untuk mengelola iklan mereka dengan aman.",
              },
              {
                question: "Berapa lama waktu setup?",
                answer:
                  "Setup AdsPilot sangat cepat! Hanya butuh 5 menit. Anda cukup daftar, koneksikan akun Shopee, pilih produk yang ingin diiklankan, dan tentukan budget. Setelah itu, AdsPilot langsung mulai bekerja.",
              },
              {
                question: "Apakah ADSPILOT bisa digunakan untuk semua kategori produk?",
                answer:
                  "Ya! ADSPILOT bekerja untuk semua kategori produk di Shopee, mulai dari fashion, kecantikan, elektronik, makanan, hingga produk digital. Sistem otomasi kami akan menyesuaikan strategi iklan sesuai dengan karakteristik produk Anda.",
              },
              {
                question: "Bagaimana cara menghubungi support?",
                answer:
                  "Kami menyediakan support via Telegram member group untuk semua paket. Anda akan bergabung dengan komunitas seller Shopee yang aktif, bisa bertanya kapan saja, dan mendapatkan bantuan dari tim support serta member lainnya. Tim support kami siap membantu Anda kapan saja!",
              },
            ].map((faq, idx) => (
              <Card key={idx} className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {faq.question}
                </h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Hentikan Ketakutan, <HighlightText>Tidur Tenang Mulai Malam Ini</HighlightText>
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Jangan biarkan ketakutan budget iklan habis sia-sia atau harus bangun tengah malam
              menghambat bisnis Anda. <strong>Slot terbatas untuk bulan ini!</strong>
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="text-base px-8 py-6 h-auto bg-white text-primary hover:bg-white/90"
              asChild
              onClick={handleCTAClick}
            >
              <Link href="#harga">
                {defaultVoucherDiscount > 0
                  ? `Daftar Sekarang - Voucher ${defaultVoucherDiscount}%`
                  : 'Daftar Sekarang'}
                <ArrowRight className="ml-2" />
              </Link>
            </Button>
            <p className="text-sm mt-6 opacity-75">
              Promo terbatas! Buruan daftar sebelum kehabisan slot
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-primary-foreground py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/adspilot.png"
                  alt="ADSPILOT Logo"
                  className="h-8 w-auto object-contain brightness-0 invert"
                />
              </div>
              <p className="text-sm opacity-75">
                Platform otomasi iklan terbaik untuk seller Shopee di Indonesia.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produk</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <Link href="#fitur" className="hover:opacity-100 transition-opacity">
                    Fitur
                  </Link>
                </li>
                <li>
                  <Link href="#harga" className="hover:opacity-100 transition-opacity">
                    Harga
                  </Link>
                </li>
                <li>
                  <Link href="#testimoni" className="hover:opacity-100 transition-opacity">
                    Testimoni
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <Link href="#faq" className="hover:opacity-100 transition-opacity">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100 transition-opacity">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100 transition-opacity">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm opacity-75">
                <li>
                  <Link href="#" className="hover:opacity-100 transition-opacity">
                    Hubungi Kami
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100 transition-opacity">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:opacity-100 transition-opacity">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="https://aff.adspilot.id/auth/login" className="hover:opacity-100 transition-opacity">
                    Affiliate
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 pt-8 text-center text-sm opacity-75">
            <p>© {new Date().getFullYear()} AdsPilot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

