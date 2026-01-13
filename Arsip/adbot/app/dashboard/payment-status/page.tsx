"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  Mail,
  Loader2,
  Copy,
  Building2,
  Upload,
  X,
  Image as ImageIcon
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Transaction {
  transactionId: string
  planId: string
  baseAmount: number
  ppnAmount: number
  uniqueCode: number
  totalAmount: number
  paymentStatus: string
  paymentProofUrl: string | null
  createdAt: string
  expiresAt: string | null
  voucherCode?: string | null
  discountAmount?: number | null
  baseAmountAfterDiscount?: number | null
}

interface PaymentSettings {
  activeMethod: 'manual' | 'gateway' | null
  confirmationEmail: string | null
  bankAccounts: Array<{
    id: number
    bank_name: string
    account_number: string
    account_name: string
  }>
}

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

export default function PaymentStatusPage() {
  const { user } = useAuth()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        toast.error('File harus berupa gambar (JPG, PNG, atau WEBP)')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB')
        return
      }
      setUploadFile(file)
    }
  }

  const handleUploadProof = async () => {
    if (!uploadFile || !transaction) {
      toast.error('Pilih file bukti pembayaran terlebih dahulu')
      return
    }

    if (!user) {
      toast.error('Anda harus login terlebih dahulu')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', uploadFile)

      // Get token from localStorage (AuthContext uses 'auth_token')
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') 
        : null
      
      if (!token) {
        toast.error('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const response = await fetch(`/api/transactions/${transaction.transactionId}/proof`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for FormData
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal upload bukti pembayaran')
      }

      toast.success('Bukti pembayaran berhasil diupload!')
      setUploadFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('proof-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Refresh transaction data
      if (user?.userId) {
        const transactionResponse = await fetch(`/api/transactions/undefined?userId=${user.userId}`)
        const transactionData = await transactionResponse.json()
        if (transactionData.success) {
          setTransaction(transactionData.data)
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Gagal upload bukti pembayaran')
    } finally {
      setUploading(false)
    }
  }

  // Fetch plans
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

  // Fetch transaction and payment settings
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.userId) return

      try {
        setLoading(true)

        // Fetch transaction
        const transactionResponse = await fetch(`/api/transactions/undefined?userId=${user.userId}`)
        const transactionData = await transactionResponse.json()

        if (transactionData.success && transactionData.data) {
          setTransaction(transactionData.data)
        }

        // Fetch payment settings
        const settingsResponse = await fetch('/api/payment-settings/public')
        const settingsData = await settingsResponse.json()

        if (settingsData.success) {
          setPaymentSettings(settingsData.data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Auto-refresh every 30 seconds if payment is pending or waiting verification
  useEffect(() => {
    if (transaction?.paymentStatus === 'pending' || transaction?.paymentStatus === 'waiting_verification') {
      const interval = setInterval(async () => {
        if (!user?.userId) return

        try {
          const response = await fetch(`/api/transactions/undefined?userId=${user.userId}`)
          const data = await response.json()

          if (data.success && data.data) {
            setTransaction(data.data)

            // If payment is confirmed, refresh user data
            if (data.data.paymentStatus === 'paid') {
              window.location.reload() // Reload to update user status
            }
          }
        } catch (error) {
          console.error('Error refreshing transaction:', error)
        }
      }, 30000) // 30 seconds

      return () => clearInterval(interval)
    }
  }, [transaction?.paymentStatus, user?.userId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const selectedPlan = transaction ? plans.find(p => p.planId === transaction.planId) : null
  const isPending = transaction?.paymentStatus === 'pending'
  const isWaitingVerification = transaction?.paymentStatus === 'waiting_verification'
  const isPaid = transaction?.paymentStatus === 'paid'

  return (
    <ProtectedRoute allowPendingPayment={true}>
      <div className="container mx-auto max-w-6xl py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Status Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          {isPending && "Menunggu upload bukti pembayaran"}
          {isWaitingVerification && "Menunggu verifikasi pembayaran dari admin"}
          {isPaid && "Pembayaran sudah dikonfirmasi"}
          {!transaction && "Tidak ada transaksi ditemukan"}
        </p>
      </div>

      {transaction && selectedPlan ? (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left Column - Payment Details */}
          <div className="lg:col-span-2 space-y-3">
            {/* Status & Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Detail Pembayaran</CardTitle>
                  <Badge 
                    variant={isPending || isWaitingVerification ? "secondary" : "default"}
                    className={isPaid ? "bg-green-500" : isWaitingVerification ? "bg-blue-500" : ""}
                  >
                    {isPending ? (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Menunggu
                      </>
                    ) : isWaitingVerification ? (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Verifikasi
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Dikonfirmasi
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Plan Info */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Paket</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Durasi</span>
                  <span className="font-medium">
                    {selectedPlan.durationMonths === 1 ? '1 bulan' : 
                     selectedPlan.durationMonths === 3 ? '3 bulan' : 
                     selectedPlan.durationMonths === 6 ? '6 bulan' : 
                     `${selectedPlan.durationMonths} bulan`}
                  </span>
                </div>
                <Separator className="my-3" />
                {/* Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Paket</span>
                    <span>{formatPrice(transaction.baseAmount)}</span>
                  </div>
                  {transaction.voucherCode && transaction.discountAmount && transaction.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diskon ({transaction.voucherCode})</span>
                        <span className="text-green-600">-{formatPrice(transaction.discountAmount)}</span>
                      </div>
                      {transaction.baseAmountAfterDiscount !== undefined && transaction.baseAmountAfterDiscount !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Setelah Diskon</span>
                          <span>{formatPrice(transaction.baseAmountAfterDiscount)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PPN (11%)</span>
                    <span>{formatPrice(transaction.ppnAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kode Unik</span>
                    <span className="font-mono">{transaction.uniqueCode}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-base">
                    <span>Total Pembayaran</span>
                    <span className="text-primary">{formatPrice(transaction.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Accounts & Upload (if pending or waiting verification) */}
            {(isPending || isWaitingVerification) && paymentSettings?.activeMethod === 'manual' && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Rekening Bank</CardTitle>
                    <CardDescription className="text-xs">
                      Pilih salah satu rekening untuk transfer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paymentSettings.bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-sm">{account.bank_name}</h4>
                            <p className="text-xs text-muted-foreground">{account.account_name}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{getBankLogo(account.bank_name)}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-md p-2 font-mono text-sm">
                            {account.account_number}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(account.account_number, account.account_number)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {copiedAccount === account.account_number && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Disalin!
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Upload Payment Proof */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Upload Bukti Pembayaran</CardTitle>
                    <CardDescription className="text-xs">
                      Upload bukti transfer untuk mempercepat verifikasi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {transaction.paymentProofUrl ? (
                      <div className="space-y-3">
                        <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 py-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                            Bukti pembayaran sudah diupload. Admin akan memverifikasi.
                          </AlertDescription>
                        </Alert>
                        <div className="border rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">Bukti Pembayaran</p>
                              <p className="text-xs text-muted-foreground">Klik untuk melihat</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8"
                              asChild
                            >
                              <a href={transaction.paymentProofUrl} target="_blank" rel="noopener noreferrer">
                                Lihat
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            id="proof-file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          <label
                            htmlFor="proof-file"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {uploadFile ? uploadFile.name : 'Klik untuk memilih file'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              JPG, PNG, WEBP (Maks. 5MB)
                            </span>
                          </label>
                        </div>
                        {uploadFile && (
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 text-xs truncate">{uploadFile.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setUploadFile(null)
                                const fileInput = document.getElementById('proof-file') as HTMLInputElement
                                if (fileInput) fileInput.value = ''
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <Button
                          onClick={handleUploadProof}
                          disabled={!uploadFile || uploading}
                          className="w-full"
                          size="sm"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Mengupload...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-3 w-3" />
                              Upload Bukti
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 py-2 flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-blue-900 dark:text-blue-200">
                    Transfer tepat sebesar <strong>{formatPrice(transaction.totalAmount)}</strong> (termasuk kode unik <strong>{transaction.uniqueCode}</strong>).
                  </span>
                </Alert>
              </>
            )}

            {/* Success Message (if paid) */}
            {isPaid && (
              <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 py-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <AlertDescription className="text-xs text-green-900 dark:text-green-200">
                  <strong>Pembayaran dikonfirmasi!</strong> Akun Anda sudah aktif.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Right Column - Quick Actions & Info */}
          <div className="space-y-3">
            <Card className="sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Info & Tindakan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Quick Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge 
                      variant={isPending || isWaitingVerification ? "secondary" : "default"}
                      className={isPaid ? "bg-green-500 text-xs" : isWaitingVerification ? "bg-blue-500 text-xs" : "text-xs"}
                    >
                      {isPending ? "Menunggu" : isWaitingVerification ? "Verifikasi" : "Dikonfirmasi"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold text-primary">{formatPrice(transaction.totalAmount)}</span>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="space-y-2">
                  <Button asChild className="w-full" size="sm">
                    <a href={`mailto:${paymentSettings?.confirmationEmail || 'support@shopadexpert.com'}`}>
                      <Mail className="mr-2 h-3 w-3" />
                      Hubungi Admin
                    </a>
                  </Button>
                  {isPaid && (
                    <Button asChild className="w-full" variant="default" size="sm">
                      <Link href="/general">
                        Masuk Dashboard
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Notes */}
                <Alert className="py-2">
                  <Clock className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Akun akan aktif maksimal <strong>1x24 jam</strong> setelah pembayaran dikonfirmasi.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Tidak ada transaksi ditemukan.</p>
          </CardContent>
        </Card>
      )}
      </div>
    </ProtectedRoute>
  )
}

