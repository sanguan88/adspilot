"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Package, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

// Plan interface
interface Plan {
  planId: string
  name: string
  description: string
  price: number
  originalPrice: number | null
  discountPercentage: number | null
  billingCycle: string
  durationMonths: number
  features: {
    maxAccounts: number
    maxAutomationRules: number
    maxCampaigns: number
    support: string
  }
  featuresList: string[]
  isActive: boolean
  displayOrder: number
}

// Validasi email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validasi password
function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password minimal 8 karakter' }
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung huruf kecil' }
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung huruf besar' }
  }
  if (!/(?=.*[0-9])/.test(password)) {
    return { isValid: false, error: 'Password harus mengandung angka' }
  }
  return { isValid: true }
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const planId = searchParams.get('plan') || '3-month'

  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Voucher states
  const [voucherCode, setVoucherCode] = useState("")
  const [voucherInfo, setVoucherInfo] = useState<any>(null)
  const [validatingVoucher, setValidatingVoucher] = useState(false)
  const [voucherError, setVoucherError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.status_user === 'pending_payment') {
        router.replace('/dashboard/payment-status')
      } else {
        router.replace('/general')
      }
    }
  }, [isAuthenticated, authLoading, user, router])

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/plans`)
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
  }, [])

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    nama_lengkap: "",
    no_whatsapp: "",
    password: "",
    confirmPassword: "",
  })

  // Get selected plan from fetched plans
  const selectedPlan = plans.find(p => p.planId === planId) || plans.find(p => p.planId === '3-month') || null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validasi
    if (!formData.username || formData.username.trim().length < 3) {
      setError('Username minimal 3 karakter')
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Format email tidak valid')
      return
    }

    if (!formData.nama_lengkap || formData.nama_lengkap.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter')
      return
    }

    if (!formData.no_whatsapp || formData.no_whatsapp.trim().length === 0) {
      setError('No WhatsApp harus diisi')
      return
    }

    // Validasi format WhatsApp (minimal 10 digit, bisa dengan atau tanpa +62)
    const whatsappRegex = /^(\+62|62|0)?[0-9]{9,12}$/
    const cleanWhatsapp = formData.no_whatsapp.trim().replace(/[\s-]/g, '')
    if (!whatsappRegex.test(cleanWhatsapp)) {
      setError('Format No WhatsApp tidak valid. Gunakan format: 081234567890 atau +6281234567890')
      return
    }

    const passwordValidation = validatePassword(formData.password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'Password tidak valid')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak sama')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          nama_lengkap: formData.nama_lengkap.trim(),
          no_whatsapp: formData.no_whatsapp.trim(),
          password: formData.password,
          planId: selectedPlan?.planId || planId,
          voucherCode: voucherCode.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Redirect ke halaman konfirmasi pembayaran dengan user_id, planId, dan transactionId
        // Gunakan replace() untuk menghindari back navigation
        const transactionId = data.data.transaction?.transactionId || '';
        router.replace(`/auth/payment-confirmation?userId=${data.data.userId}&planId=${selectedPlan?.planId || planId}${transactionId ? `&transactionId=${transactionId}` : ''}`)
      } else {
        setError(data.error || 'Registrasi gagal')
      }
    } catch (err) {
      setError('Terjadi kesalahan saat registrasi. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (error) {
      setError(null)
    }
  }

  // Validate voucher code
  const handleValidateVoucher = async (code: string) => {
    if (!code || code.trim().length === 0) {
      setVoucherInfo(null)
      setVoucherError(null)
      return
    }

    setValidatingVoucher(true)
    setVoucherError(null)

    try {
      // Use originalPrice for voucher calculation if available, otherwise use price
      const baseAmountForVoucher = selectedPlan?.originalPrice && selectedPlan.originalPrice > (selectedPlan?.price || 0)
        ? selectedPlan.originalPrice
        : selectedPlan?.price || 0

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/vouchers/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucherCode: code.trim(),
          planId: selectedPlan?.planId || planId,
          baseAmount: baseAmountForVoucher,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setVoucherInfo(result.data)
        setVoucherError(null)
      } else {
        setVoucherInfo(null)
        setVoucherError(result.error || 'Voucher tidak valid')
      }
    } catch (err) {
      setVoucherInfo(null)
      setVoucherError('Gagal memvalidasi voucher')
    } finally {
      setValidatingVoucher(false)
    }
  }

  // Fetch default voucher on mount
  useEffect(() => {
    const fetchDefaultVoucher = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payment-settings/public`)
        const result = await response.json()
        if (result.success && result.data.defaultVoucherCode) {
          // Auto-apply default voucher if user hasn't entered a code
          if (!voucherCode.trim()) {
            setVoucherCode(result.data.defaultVoucherCode)
            handleValidateVoucher(result.data.defaultVoucherCode)
          }
        }
      } catch (error) {
        console.error('Error fetching default voucher:', error)
      }
    }
    fetchDefaultVoucher()
  }, [])

  // Debounced voucher validation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (voucherCode.trim()) {
        handleValidateVoucher(voucherCode)
      } else {
        setVoucherInfo(null)
        setVoucherError(null)
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [voucherCode, selectedPlan?.planId, selectedPlan?.price])

  // Calculate total with voucher
  const calculateTotalWithVoucher = () => {
    if (!selectedPlan) return 0

    // Use originalPrice for voucher calculation if available, otherwise use price
    const basePriceForVoucher = selectedPlan.originalPrice && selectedPlan.originalPrice > selectedPlan.price
      ? selectedPlan.originalPrice
      : selectedPlan.price

    if (voucherInfo && voucherInfo.discountAmount > 0) {
      // Discount is already calculated from base amount (Indonesia standard)
      // Total = base - discount + PPN + unique_code
      // For display, we'll show approximate total (without unique_code since it's generated at registration)
      const discountAmount = voucherInfo.discountAmount
      // If voucher is applied, calculate from basePriceForVoucher, otherwise use basePrice
      const baseAfterDiscount = basePriceForVoucher - discountAmount
      const ppn = Math.round(baseAfterDiscount * 0.11) // 11% PPN
      return baseAfterDiscount + ppn
    }
    // Without voucher: base + PPN
    const baseAmount = selectedPlan.price
    const ppn = Math.round(baseAmount * 0.11)
    return baseAmount + ppn
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="container mx-auto max-w-6xl py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/#harga">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Halaman Utama
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Registration Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Daftar & Checkout</CardTitle>
                <CardDescription>
                  Lengkapi data Anda untuk melanjutkan pembayaran
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Masukkan username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="username"
                      minLength={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Masukkan email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                    <Input
                      id="nama_lengkap"
                      type="text"
                      placeholder="Masukkan nama lengkap"
                      value={formData.nama_lengkap}
                      onChange={(e) => handleInputChange('nama_lengkap', e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="name"
                      minLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="no_whatsapp">No WhatsApp</Label>
                    <Input
                      id="no_whatsapp"
                      type="tel"
                      placeholder="081234567890 atau +6281234567890"
                      value={formData.no_whatsapp}
                      onChange={(e) => handleInputChange('no_whatsapp', e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                    <p className="text-xs text-slate-500">
                      Format: 081234567890 atau +6281234567890
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password (min. 8 karakter)"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="pr-10"
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Password harus mengandung huruf besar, huruf kecil, dan angka
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Masukkan ulang password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Daftar & Lanjutkan Pembayaran
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                    Sudah punya akun?{' '}
                    <Link href="/auth/login" className="text-primary hover:underline font-medium">
                      Masuk di sini
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right: Plan Summary */}
          <div>
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>Ringkasan Paket</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Plan Info */}
                {selectedPlan ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold">{selectedPlan.name}</h3>
                        <Badge variant="secondary">
                          {selectedPlan.durationMonths === 1 ? '1 bulan' :
                            selectedPlan.durationMonths === 3 ? '3 bulan' :
                              selectedPlan.durationMonths === 6 ? '6 bulan' :
                                `${selectedPlan.durationMonths} bulan`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{selectedPlan.description}</p>

                      {/* Price - Only show base price, breakdown will be in Total section */}
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-primary">
                          {formatPrice(selectedPlan.price)}
                        </div>
                        {selectedPlan.originalPrice && selectedPlan.originalPrice > selectedPlan.price && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatPrice(selectedPlan.originalPrice)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h4 className="font-semibold mb-3">Fitur yang Didapat:</h4>
                      <ul className="space-y-2">
                        {selectedPlan.featuresList && selectedPlan.featuresList.length > 0 ? (
                          selectedPlan.featuresList.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-sm text-muted-foreground">Tidak ada fitur tersedia</li>
                        )}
                      </ul>
                    </div>
                  </>
                ) : loadingPlans ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Memuat data plan...</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
                    <p className="text-sm text-muted-foreground">Plan tidak ditemukan</p>
                  </div>
                )}

                {/* Voucher Code Input in Summary */}
                <div className="border-t pt-4">
                  <Label htmlFor="voucherCodeSummary" className="text-sm font-medium mb-2 block">
                    Punya Voucher?
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="voucherCodeSummary"
                      type="text"
                      placeholder="Masukkan kode voucher"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      className={voucherError ? 'border-destructive' : voucherInfo ? 'border-green-500' : ''}
                    />
                    {validatingVoucher && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground my-auto" />
                    )}
                    {voucherInfo && !validatingVoucher && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 my-auto" />
                    )}
                    {voucherError && !validatingVoucher && (
                      <X className="h-4 w-4 text-destructive my-auto" />
                    )}
                  </div>
                  {voucherError && (
                    <p className="text-xs text-destructive mt-1">{voucherError}</p>
                  )}
                  {voucherInfo && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded mt-2">
                      <p className="font-semibold">{voucherInfo.voucher.name}</p>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Harga Paket</span>
                    <span className="font-medium">
                      {selectedPlan ? formatPrice(selectedPlan.price) : '-'}
                    </span>
                  </div>
                  {voucherInfo && voucherInfo.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Diskon Voucher ({voucherInfo.voucher.code})</span>
                      <span className="text-green-600 font-semibold">
                        -{formatPrice(voucherInfo.discountAmount)}
                      </span>
                    </div>
                  )}
                  {(() => {
                    if (!selectedPlan) return null
                    const basePriceForVoucher = selectedPlan.originalPrice && selectedPlan.originalPrice > selectedPlan.price
                      ? selectedPlan.originalPrice
                      : selectedPlan.price
                    const baseAfterDiscount = voucherInfo && voucherInfo.discountAmount > 0
                      ? basePriceForVoucher - voucherInfo.discountAmount
                      : selectedPlan.price
                    const ppnAmount = Math.round(baseAfterDiscount * 0.11)
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">PPN 11%</span>
                        <span className="font-medium">
                          {formatPrice(ppnAmount)}
                        </span>
                      </div>
                    )
                  })()}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total Pembayaran</span>
                    <span className="text-primary">
                      {selectedPlan ? formatPrice(voucherInfo && voucherInfo.discountAmount > 0
                        ? calculateTotalWithVoucher()
                        : selectedPlan.price
                      ) : '-'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Setelah registrasi, Anda akan diarahkan ke halaman konfirmasi pembayaran
                    untuk melihat informasi rekening bank.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat halaman...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
