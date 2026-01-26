"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  Copy,
  Building2,
  CreditCard,
  Clock,
  AlertCircle,
  Package,
  ArrowRight,
  Mail,
  Loader2,
  Send
} from "lucide-react"
import { toast } from "sonner"

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

// Helper function to get bank logo
function getBankLogo(bankName: string): string {
  const name = bankName.toUpperCase()
  if (name.includes('BCA')) return 'BCA'
  if (name.includes('MANDIRI')) return 'MANDIRI'
  if (name.includes('BRI')) return 'BRI'
  if (name.includes('BNI')) return 'BNI'
  if (name.includes('CIMB')) return 'CIMB'
  return 'BANK'
}

interface BankAccount {
  id: number
  bank_name: string
  account_number: string
  account_name: string
}

interface PaymentSettings {
  activeMethod: 'manual' | 'gateway' | null
  confirmationEmail: string | null
  bankAccounts: BankAccount[]
}

interface Transaction {
  transactionId: string
  planId: string
  planName: string
  durationMonths: number
  baseAmount: number
  ppnAmount: number
  uniqueCode: number
  totalAmount: number
  paymentStatus: string
  voucherCode?: string | null
  discountAmount?: number | null
  baseAmountAfterDiscount?: number | null
}

function PaymentConfirmationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  const planId = searchParams.get('planId') || '3-month'
  const transactionId = searchParams.get('transactionId')

  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loadingTransaction, setLoadingTransaction] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [contactingAdmin, setContactingAdmin] = useState(false)
  const [contactCooldown, setContactCooldown] = useState(0) // seconds remaining

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true)
        const response = await fetch('/api/plans')
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

  // Get selected plan
  const selectedPlan = plans.find(p => p.planId === planId) || plans.find(p => p.planId === '3-month') || null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const copyToClipboard = (text: string, accountNumber: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAccount(accountNumber)
    toast.success('Nomor rekening berhasil disalin!')
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const handleContactAdmin = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Prevent default mailto behavior - we'll handle notification first
    e.preventDefault()

    // Check if already in cooldown
    if (contactCooldown > 0 || contactingAdmin) {
      toast.error(`Silakan tunggu ${Math.ceil(contactCooldown / 60)} menit lagi`)
      return
    }

    setContactingAdmin(true)

    try {
      const response = await fetch('/api/notifications/contact-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          transactionId: transactionId,
        }),
      });

      const data = await response.json()

      if (response.status === 429 && data.rateLimited) {
        // Rate limited - start cooldown timer
        setContactCooldown(data.remainingSeconds || 300)
        toast.error(data.error || 'Silakan tunggu beberapa menit lagi')
      } else if (data.success) {
        // Success - start 5 minute cooldown
        setContactCooldown(300)
        toast.success('Notifikasi terkirim! Membuka Telegram Support...')
        // Open Telegram link
        window.open('https://t.me/AdsPilotSupport', '_blank')
      } else {
        // Even if notification fails, let's allow opening Telegram
        window.open('https://t.me/AdsPilotSupport', '_blank')
      }
    } catch (error) {
      console.error('Failed to send notification to admin:', error);
      toast.error('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setContactingAdmin(false)
    }
  }

  // Cooldown timer effect
  useEffect(() => {
    if (contactCooldown > 0) {
      const timer = setInterval(() => {
        setContactCooldown(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [contactCooldown])

  // Fetch transaction data from PUBLIC endpoint (no auth required)
  useEffect(() => {
    const fetchTransaction = async () => {
      if (!transactionId) {
        setLoadingTransaction(false)
        return
      }

      try {
        setLoadingTransaction(true)
        // Use public endpoint - no auth required
        const response = await fetch(`/api/transactions/public/${transactionId}`)
        const data = await response.json()

        if (data.success && data.data) {
          setTransaction(data.data)
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      } finally {
        setLoadingTransaction(false)
      }
    }

    fetchTransaction()
  }, [transactionId])

  // Fetch payment settings
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await fetch('/api/payment-settings/public')
        const data = await response.json()

        if (data.success) {
          setPaymentSettings(data.data)
        }
      } catch (error) {
        console.error('Error fetching payment settings:', error)
      } finally {
        setLoadingSettings(false)
      }
    }

    fetchPaymentSettings()
  }, [])

  // Prevent back navigation and redirect if no userId
  useEffect(() => {
    if (!userId) {
      router.replace('/auth/checkout')
      return
    }

    // Prevent back navigation using history API
    const handlePopState = (e: PopStateEvent) => {
      // Prevent default back navigation
      e.preventDefault()
      // Replace current history entry to prevent back
      window.history.pushState(null, '', window.location.href)
      // Redirect to login page instead
      router.replace('/auth/login')
    }

    // Push state to prevent back navigation
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [userId, router])

  if (!userId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
            <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Registrasi Berhasil!</h1>
          <p className="text-muted-foreground">
            Silakan lakukan pembayaran untuk mengaktifkan akun Anda. Akun akan aktif setelah pembayaran dikonfirmasi oleh admin.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Left: Payment Instructions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>Paket yang Dipilih</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {transaction ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{transaction.planName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {transaction.durationMonths === 1 ? '1 bulan' :
                          transaction.durationMonths === 3 ? '3 bulan' :
                            transaction.durationMonths === 6 ? '6 bulan' :
                              `${transaction.durationMonths} bulan`}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {transaction.durationMonths === 1 ? '1 bulan' :
                        transaction.durationMonths === 3 ? '3 bulan' :
                          transaction.durationMonths === 6 ? '6 bulan' :
                            `${transaction.durationMonths} bulan`}
                    </Badge>
                  </div>
                ) : selectedPlan ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedPlan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedPlan.durationMonths === 1 ? '1 bulan' :
                          selectedPlan.durationMonths === 3 ? '3 bulan' :
                            selectedPlan.durationMonths === 6 ? '6 bulan' :
                              `${selectedPlan.durationMonths} bulan`}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {selectedPlan.durationMonths === 1 ? '1 bulan' :
                        selectedPlan.durationMonths === 3 ? '3 bulan' :
                          selectedPlan.durationMonths === 6 ? '6 bulan' :
                            `${selectedPlan.durationMonths} bulan`}
                    </Badge>
                  </div>
                ) : loadingPlans || loadingTransaction ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Memuat data plan...</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
                    <p className="text-sm text-muted-foreground">Plan tidak ditemukan</p>
                  </div>
                )}
                <Separator className="my-4" />

                {/* Price Breakdown */}
                {loadingTransaction ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Memuat detail pembayaran...</p>
                  </div>
                ) : transaction ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Harga Paket</span>
                      <span className="font-medium">{formatPrice(transaction.baseAmount)}</span>
                    </div>
                    {transaction.voucherCode && transaction.discountAmount && transaction.discountAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Diskon Voucher ({transaction.voucherCode})
                        </span>
                        <span className="font-medium text-green-600">
                          -{formatPrice(transaction.discountAmount)}
                        </span>
                      </div>
                    )}
                    {transaction.voucherCode && transaction.discountAmount && transaction.discountAmount > 0 && transaction.baseAmountAfterDiscount !== undefined && transaction.baseAmountAfterDiscount !== null && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Harga Setelah Diskon</span>
                        <span className="font-medium">{formatPrice(transaction.baseAmountAfterDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">PPN (11%)</span>
                      <span className="font-medium">{formatPrice(transaction.ppnAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Kode Unik</span>
                      <span className="font-medium font-mono">{transaction.uniqueCode}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Pembayaran</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(transaction.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                        <AlertCircle className="h-4 w-4 inline-block mr-1.5 align-middle shrink-0" />
                        <span className="inline">
                          <strong className="mr-1">Penting:</strong>
                          Transfer tepat sebesar <strong className="text-base">{formatPrice(transaction.totalAmount)}</strong> (termasuk kode unik <strong>{transaction.uniqueCode}</strong>) untuk memudahkan verifikasi pembayaran.
                        </span>
                      </p>
                    </div>
                  </div>
                ) : selectedPlan ? (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Pembayaran</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatPrice(selectedPlan.price)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Pembayaran</span>
                    <span className="text-2xl font-bold text-primary">-</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Accounts */}
            {paymentSettings?.activeMethod === 'manual' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle>Transfer ke Rekening Bank</CardTitle>
                  </div>
                  <CardDescription>
                    Pilih salah satu rekening di bawah untuk melakukan transfer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingSettings ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Memuat rekening bank...</p>
                    </div>
                  ) : paymentSettings.bankAccounts.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Tidak ada rekening bank yang tersedia. Silakan hubungi admin.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    paymentSettings.bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{account.bank_name}</h4>
                            <p className="text-sm text-muted-foreground">{account.account_name}</p>
                          </div>
                          <Badge variant="outline">{getBankLogo(account.bank_name)}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-md p-3 font-mono text-lg">
                            {account.account_number}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(account.account_number, account.account_number)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {copiedAccount === account.account_number && (
                          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Disalin!
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Gateway */}
            {paymentSettings?.activeMethod === 'gateway' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle>Payment Gateway</CardTitle>
                  </div>
                  <CardDescription>
                    Pembayaran melalui payment gateway
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment Gateway integration akan segera tersedia.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* No Payment Method Active */}
            {!loadingSettings && paymentSettings?.activeMethod === null && (
              <Card>
                <CardContent className="py-8">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Payment sedang dalam maintenance. Silakan hubungi admin untuk informasi lebih lanjut.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Payment Instructions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle>Instruksi Pembayaran</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm">
                    Transfer sesuai dengan <strong>Total Pembayaran</strong> yang tertera di atas
                  </li>
                  <li className="text-sm">
                    Transfer ke salah satu rekening bank yang tersedia
                  </li>
                  <li className="text-sm">
                    Setelah transfer, <strong>login terlebih dahulu</strong> untuk mengupload bukti pembayaran di halaman status pembayaran
                  </li>
                  <li className="text-sm">
                    Akun Anda akan diaktifkan dalam <strong>1x24 jam</strong> setelah pembayaran dikonfirmasi oleh admin
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Penting:</strong> Pastikan nominal transfer sesuai dengan total pembayaran.
                Jika ada perbedaan nominal, mohon hubungi admin sebelum melakukan transfer.
              </AlertDescription>
            </Alert>
          </div>

          {/* Right: Summary & Actions */}
          <div className="space-y-6">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {transaction ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paket</span>
                        <span className="font-medium">{transaction.planName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Durasi</span>
                        <span className="font-medium">
                          {transaction.durationMonths === 1 ? '1 bulan' :
                            transaction.durationMonths === 3 ? '3 bulan' :
                              transaction.durationMonths === 6 ? '6 bulan' :
                                `${transaction.durationMonths} bulan`}
                        </span>
                      </div>
                    </>
                  ) : selectedPlan ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paket</span>
                        <span className="font-medium">{selectedPlan.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Durasi</span>
                        <span className="font-medium">
                          {selectedPlan.durationMonths === 1 ? '1 bulan' :
                            selectedPlan.durationMonths === 3 ? '3 bulan' :
                              selectedPlan.durationMonths === 6 ? '6 bulan' :
                                `${selectedPlan.durationMonths} bulan`}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      {loadingPlans || loadingTransaction ? 'Memuat data plan...' : 'Plan tidak ditemukan'}
                    </div>
                  )}
                  <Separator />
                  {loadingTransaction ? (
                    <div className="text-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : transaction ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Harga Paket</span>
                        <span>{formatPrice(transaction.baseAmount)}</span>
                      </div>
                      {transaction.voucherCode && transaction.discountAmount && transaction.discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Diskon ({transaction.voucherCode})</span>
                          <span className="text-green-600">-{formatPrice(transaction.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>PPN (11%)</span>
                        <span>{formatPrice(transaction.ppnAmount)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Kode Unik</span>
                        <span className="font-mono">{transaction.uniqueCode}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span className="text-primary text-lg">
                          {formatPrice(transaction.totalAmount)}
                        </span>
                      </div>
                    </div>
                  ) : selectedPlan ? (
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatPrice(selectedPlan.price)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary">-</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <Button className="w-full" asChild variant="outline">
                    <Link href="/auth/login">
                      Login untuk Cek Status
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={contactingAdmin || contactCooldown > 0}
                    onClick={(e) => handleContactAdmin(e as unknown as React.MouseEvent<HTMLAnchorElement>)}
                  >
                    {contactingAdmin ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : contactCooldown > 0 ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Tunggu {Math.ceil(contactCooldown / 60)} menit
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Hubungi Admin (Telegram)
                      </>
                    )}
                  </Button>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Catatan:</strong> Setelah login, Anda akan diarahkan ke halaman status pembayaran.
                    Akun akan aktif setelah pembayaran dikonfirmasi oleh admin (maksimal 1x24 jam).
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Butuh bantuan? Hubungi kami di{" "}
            <a href="mailto:support@adspilot.id" className="text-primary hover:underline">
              support@adspilot.id
            </a>
            {" "}atau via Telegram
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Memuat halaman...</p>
        </div>
      </div>
    }>
      <PaymentConfirmationContent />
    </Suspense>
  )
}
