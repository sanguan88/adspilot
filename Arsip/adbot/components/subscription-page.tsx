"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreditCard,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  RefreshCw,
  Crown,
  TrendingUp,
  Info,
  Copy,
  ExternalLink,
  Download,
  Store,
  Zap,
  FolderKanban
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface Subscription {
  id: number
  planId: string
  planName: string
  transactionId: string
  status: string
  startDate: string
  endDate: string
  billingCycle: string
  baseAmount: number
  ppnAmount: number
  totalAmount: number
  autoRenew: boolean
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancellationReason?: string | null
  paymentConfirmedAt?: string | null
  paymentProofUrl?: string | null
  createdAt: string
  updatedAt?: string
}

interface Invoice {
  transactionId: string
  planId: string
  planName: string
  paymentStatus: string
  baseAmount: number
  ppnAmount: number
  totalAmount: number
  uniqueCode?: number | null
  paymentConfirmedAt?: string | null
  paymentProofUrl?: string | null
  createdAt: string
}

export function SubscriptionPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [subscriptionHistory, setSubscriptionHistory] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [limitsData, setLimitsData] = useState<{
    planName: string
    limits: { maxAccounts: number; maxAutomationRules: number; maxCampaigns: number }
    usage: { accounts: number; automationRules: number; campaigns: number }
  } | null>(null)
  const [limitsLoading, setLimitsLoading] = useState(false)

  useEffect(() => {
    fetchSubscriptionData()
    fetchLimitsData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/user/subscription")
      const data = await response.json()
      
      if (data.success && data.data) {
        setCurrentSubscription(data.data.current)
        setSubscriptionHistory(data.data.history || [])
        setInvoices(data.data.invoices || [])
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error)
      toast.error("Gagal memuat data subscription")
    } finally {
      setLoading(false)
    }
  }

  const fetchLimitsData = async () => {
    try {
      setLimitsLoading(true)
      const response = await authenticatedFetch("/api/user/subscription/limits")
      const data = await response.json()
      
      if (data.success && data.data) {
        setLimitsData(data.data)
      }
    } catch (error) {
      console.error("Error fetching limits data:", error)
      // Don't show error toast, just log it (limits are optional)
    } finally {
      setLimitsLoading(false)
    }
  }

  const getProgressPercentage = (usage: number, limit: number): number => {
    if (limit === -1) return 0 // Unlimited, no progress
    if (limit === 0 || limit === null || limit === undefined) return 0 // Invalid limit, show 0%
    if (usage === 0) return 0 // No usage, show 0%
    return Math.min((usage / limit) * 100, 100)
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const shouldShowWarning = (usage: number, limit: number): boolean => {
    if (limit === -1 || limit === 0 || limit === null || limit === undefined) return false
    return usage >= limit * 0.9
  }

  const getUsagePercentage = (usage: number, limit: number): string => {
    if (limit === -1) return "Unlimited"
    if (limit === 0 || limit === null || limit === undefined) return "N/A"
    const percentage = (usage / limit) * 100
    if (isNaN(percentage) || !isFinite(percentage)) return "N/A"
    return `${percentage.toFixed(0)}%`
  }

  const handleToggleAutoRenew = async (enabled: boolean) => {
    if (!currentSubscription) return

    try {
      setSaving(true)

      const response = await authenticatedFetch("/api/user/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: enabled }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Gagal mengupdate auto-renewal")
      }

      // Update state lokal agar UI langsung sinkron
      setCurrentSubscription((prev) =>
        prev ? { ...prev, autoRenew: enabled } : prev
      )

      toast.success(
        enabled
          ? "Auto-renewal diaktifkan. Subscription akan diperpanjang otomatis saat berakhir."
          : "Auto-renewal dimatikan. Subscription tidak akan diperpanjang otomatis."
      )
    } catch (error: any) {
      console.error("Error updating auto-renew:", error)
      toast.error(error?.message || "Gagal mengupdate auto-renewal")
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktif</Badge>
      case 'expired':
        return <Badge variant="secondary">Kadaluarsa</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>
      case 'suspended':
        return <Badge variant="outline">Ditangguhkan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDaysUntilExpiry = (endDate: string): number | null => {
    const end = new Date(endDate)
    const now = new Date()
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Lunas</Badge>
      case 'pending':
        return <Badge variant="secondary">Menunggu</Badge>
      case 'waiting_verification':
        return <Badge className="bg-yellow-500">Menunggu Verifikasi</Badge>
      case 'rejected':
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCheckoutUrl = (planId: string) => {
    return `/auth/checkout?plan=${planId}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Berhasil disalin ke clipboard")
  }

  const handleDownloadInvoice = async (transactionId: string) => {
    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('auth_token') 
        : null
      
      if (!token) {
        toast.error('Token tidak ditemukan. Silakan login ulang.')
        return
      }

      const response = await fetch(`/api/invoices/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        // Try to get error message if response is JSON
        let errorMessage = 'Gagal mengunduh invoice'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // If response is not JSON, use default message
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Check if response is PDF
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/pdf')) {
        throw new Error('Response bukan PDF file')
      }

      // Get PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${transactionId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Invoice berhasil diunduh!')
    } catch (error: any) {
      console.error('Download invoice error:', error)
      toast.error(error.message || 'Gagal mengunduh invoice')
    }
  }

  const getSubscriptionProgress = (startDate: string, endDate: string): number => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = new Date().getTime()
    const total = end - start
    const elapsed = now - start
    return Math.min(Math.max((elapsed / total) * 100, 0), 100)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  const daysUntilExpiry = currentSubscription ? getDaysUntilExpiry(currentSubscription.endDate) : null
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0
  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0
  const subscriptionProgress = currentSubscription 
    ? getSubscriptionProgress(currentSubscription.startDate, currentSubscription.endDate)
    : 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-600 mt-1">Kelola langganan dan invoice Anda</p>
      </div>

      {/* Warning/Alert Banners */}
      {isExpired && currentSubscription && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Subscription Anda telah kadaluarsa</h3>
                <p className="text-sm text-red-700 mt-1">
                  Akses aplikasi Anda telah ditangguhkan. Perpanjang subscription untuk melanjutkan menggunakan layanan.
                </p>
                <Button 
                  className="mt-3"
                  onClick={() => window.location.href = getCheckoutUrl(currentSubscription.planId)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Perpanjang Sekarang
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isExpiringSoon && currentSubscription && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Subscription akan berakhir dalam {daysUntilExpiry} hari</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Perpanjang subscription Anda sekarang untuk menghindari gangguan layanan.
                </p>
                <Button 
                  variant="outline"
                  className="mt-3"
                  onClick={() => window.location.href = getCheckoutUrl(currentSubscription.planId)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Perpanjang Sekarang
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {currentSubscription && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">{getStatusBadge(currentSubscription.status)}</p>
              <p className="text-sm text-primary font-medium">Status</p>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                {daysUntilExpiry !== null 
                  ? daysUntilExpiry > 0 
                    ? `${daysUntilExpiry} hari` 
                    : 'Kadaluarsa'
                  : 'N/A'}
              </p>
              <p className="text-sm text-primary font-medium">Sisa Waktu</p>
            </div>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-gray-900">
                Rp {currentSubscription.totalAmount.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-primary font-medium">Total Pembayaran</p>
            </div>
          </Card>
        </div>
      )}

      {/* Current Subscription Card */}
      {currentSubscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  Langganan Aktif
                </CardTitle>
                <CardDescription>
                  Informasi lengkap subscription Anda saat ini
                </CardDescription>
              </div>
              {getStatusBadge(currentSubscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            {!isExpired && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress Subscription</span>
                  <span className="font-medium text-gray-900">
                    {subscriptionProgress.toFixed(1)}% digunakan
                  </span>
                </div>
                <Progress 
                  value={subscriptionProgress} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Mulai: {format(new Date(currentSubscription.startDate), 'dd MMM yyyy', { locale: id })}
                  </span>
                  <span>
                    Berakhir: {format(new Date(currentSubscription.endDate), 'dd MMM yyyy', { locale: id })}
                  </span>
                </div>
              </div>
            )}

            {/* Plan Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Paket
                </Label>
                <p className="text-base font-semibold text-gray-900">{currentSubscription.planName}</p>
                <p className="text-xs text-gray-500 capitalize">{currentSubscription.billingCycle}</p>
              </div>
              <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Tanggal Mulai
                </Label>
                <p className="text-base font-medium text-gray-900">
                  {format(new Date(currentSubscription.startDate), 'dd MMMM yyyy', { locale: id })}
                </p>
              </div>
              <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Tanggal Berakhir
                </Label>
                <p className="text-base font-medium text-gray-900">
                  {format(new Date(currentSubscription.endDate), 'dd MMMM yyyy', { locale: id })}
                </p>
                {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                  <p className="text-xs text-blue-600 font-medium">
                    {daysUntilExpiry} hari tersisa
                  </p>
                )}
              </div>
              <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Total Pembayaran
                </Label>
                <p className="text-base font-semibold text-gray-900">
                  Rp {currentSubscription.totalAmount.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-500">
                  Base: Rp {currentSubscription.baseAmount.toLocaleString('id-ID')} + PPN: Rp {currentSubscription.ppnAmount.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="space-y-1 p-3 bg-gray-50 rounded-lg md:col-span-2">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Transaction ID
                </Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-900">{currentSubscription.transactionId}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(currentSubscription.transactionId)}
                    title="Salin Transaction ID"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Auto-Renewal Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50/50">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="auto-renew" className="text-base font-medium">
                    Auto-Renewal
                  </Label>
                  <Info className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  Otomatis memperpanjang subscription saat berakhir. Anda akan dikenakan biaya sesuai paket yang dipilih.
                </p>
              </div>
              <Switch
                id="auto-renew"
                checked={currentSubscription.autoRenew}
                onCheckedChange={handleToggleAutoRenew}
                disabled={saving}
              />
            </div>

            {/* Usage & Limits Accordion */}
            {limitsData && (
              <div className="border rounded-lg">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="limits" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Penggunaan & Limitasi</span>
                        <Badge variant="outline" className="ml-2">
                          {limitsData.planName}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {/* Max Accounts */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Store className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium">Toko/Store</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {limitsData.usage.accounts} / {limitsData.limits.maxAccounts === -1 ? "∞" : limitsData.limits.maxAccounts}
                            </div>
                          </div>
                          {limitsData.limits.maxAccounts !== -1 ? (
                            <>
                              <Progress 
                                value={getProgressPercentage(limitsData.usage.accounts, limitsData.limits.maxAccounts)} 
                                className="h-2"
                              />
                              {limitsData.usage.accounts >= limitsData.limits.maxAccounts * 0.9 && (
                                <p className="text-xs text-red-600">
                                  Anda telah mencapai {((limitsData.usage.accounts / limitsData.limits.maxAccounts) * 100).toFixed(0)}% dari limit. Pertimbangkan untuk upgrade plan.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">Unlimited</div>
                          )}
                        </div>

                        {/* Max Automation Rules */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium">Automation Rules (Aktif)</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {limitsData.usage.automationRules} / {limitsData.limits.maxAutomationRules === -1 ? "∞" : limitsData.limits.maxAutomationRules}
                            </div>
                          </div>
                          {limitsData.limits.maxAutomationRules !== -1 && limitsData.limits.maxAutomationRules > 0 ? (
                            <>
                              <Progress 
                                value={getProgressPercentage(limitsData.usage.automationRules, limitsData.limits.maxAutomationRules)} 
                                className="h-2"
                              />
                              {shouldShowWarning(limitsData.usage.automationRules, limitsData.limits.maxAutomationRules) && (
                                <p className="text-xs text-red-600">
                                  Anda telah mencapai {getUsagePercentage(limitsData.usage.automationRules, limitsData.limits.maxAutomationRules)} dari limit. Nonaktifkan rule lain atau upgrade plan.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">Unlimited</div>
                          )}
                        </div>

                        {/* Max Campaigns */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-gray-600" />
                              <span className="text-sm font-medium">Campaigns</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {limitsData.usage.campaigns} / {limitsData.limits.maxCampaigns === -1 ? "∞" : limitsData.limits.maxCampaigns}
                            </div>
                          </div>
                          {limitsData.limits.maxCampaigns !== -1 && limitsData.limits.maxCampaigns > 0 ? (
                            <>
                              <Progress 
                                value={getProgressPercentage(limitsData.usage.campaigns, limitsData.limits.maxCampaigns)} 
                                className="h-2"
                              />
                              {shouldShowWarning(limitsData.usage.campaigns, limitsData.limits.maxCampaigns) && (
                                <p className="text-xs text-red-600">
                                  Anda telah mencapai {getUsagePercentage(limitsData.usage.campaigns, limitsData.limits.maxCampaigns)} dari limit. Pertimbangkan untuk upgrade plan.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="text-xs text-gray-500">Unlimited</div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => window.location.href = getCheckoutUrl(currentSubscription.planId)}
                className="flex-1"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Perpanjang Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada subscription aktif</h3>
              <p className="text-sm text-gray-500 mb-4">
                Berlangganan sekarang untuk mengakses semua fitur aplikasi
              </p>
              <Button onClick={() => window.location.href = '/auth/checkout'}>
                <Crown className="w-4 h-4 mr-2" />
                Berlangganan Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription History */}
      {subscriptionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Riwayat Subscription
            </CardTitle>
            <CardDescription>
              Daftar semua subscription yang pernah Anda miliki ({subscriptionHistory.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Paket</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal Mulai</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal Berakhir</TableHead>
                    <TableHead className="text-right min-w-[120px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionHistory.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.planName}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(sub.startDate), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(sub.endDate), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {sub.totalAmount.toLocaleString('id-ID')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices/Receipts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice & Receipt
          </CardTitle>
          <CardDescription>
            Daftar semua invoice dan bukti pembayaran ({invoices.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Transaction ID</TableHead>
                    <TableHead className="min-w-[120px]">Paket</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[120px]">Tanggal</TableHead>
                    <TableHead className="text-right min-w-[120px]">Total</TableHead>
                    <TableHead className="text-center min-w-[140px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.transactionId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-900">{invoice.transactionId}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(invoice.transactionId)}
                            title="Salin Transaction ID"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.planName}</TableCell>
                      <TableCell>{getPaymentStatusBadge(invoice.paymentStatus)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(invoice.createdAt), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        Rp {invoice.totalAmount.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice.transactionId)}
                            title="Download Invoice"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Invoice
                          </Button>
                          {invoice.paymentProofUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const proofUrl = invoice.paymentProofUrl!.startsWith('/') 
                                  ? invoice.paymentProofUrl! 
                                  : `/${invoice.paymentProofUrl!}`
                                window.open(proofUrl, '_blank')
                              }}
                              title="Lihat Bukti Pembayaran"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Bukti
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Belum ada invoice atau bukti pembayaran</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

