"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  Building2,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Ticket,
  CheckCircle2
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useConfirm } from "@/components/providers/confirmation-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface BankAccount {
  id: number
  bank_name: string
  account_number: string
  account_name: string
  is_active: boolean
  display_order: number
}

interface GatewayConfig {
  id?: number
  provider: string
  environment: string
  clientKey: string
  webhookUrl: string
  isActive: boolean
}

interface Voucher {
  id: number
  code: string
  name: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
}

interface PaymentSettings {
  activeMethod: 'manual' | 'gateway' | null
  bankAccounts: BankAccount[]
  gatewayConfig: GatewayConfig | null
  confirmationEmail: string
  defaultVoucherEnabled: boolean
  defaultVoucherId: number | null
  defaultVoucher: Voucher | null
  // Moota specific (optional, can be stored in gatewayConfig)
  mootaEnabled: boolean
  mootaApiToken: string
  mootaWebhookSecret: string
}

export function PaymentSettingsPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null)
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    isActive: true,
    displayOrder: 0,
  })
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loadingVouchers, setLoadingVouchers] = useState(false)
  const [testingMoota, setTestingMoota] = useState(false)
  const [mootaStatus, setMootaStatus] = useState<{
    connected: boolean;
    name?: string;
    points?: number;
    error?: string;
  } | null>(null)
  const confirm = useConfirm()

  useEffect(() => {
    fetchPaymentSettings()
    fetchVouchers()
  }, [])

  const fetchVouchers = async () => {
    try {
      setLoadingVouchers(true)
      const response = await authenticatedFetch("/api/vouchers")
      const data = await response.json()

      if (data.success) {
        // Filter only active vouchers that haven't expired
        const now = new Date()
        const activeVouchers = data.data.filter((v: any) => {
          if (!v.isActive) return false
          if (v.expiryDate && new Date(v.expiryDate) < now) return false
          return true
        })
        setVouchers(activeVouchers)
      }
    } catch (error) {
      console.error("Error fetching vouchers:", error)
    } finally {
      setLoadingVouchers(false)
    }
  }

  const fetchPaymentSettings = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/payment-settings")
      const data = await response.json()

      if (data.success) {
        setSettings({
          activeMethod: data.data.activeMethod,
          bankAccounts: data.data.bankAccounts || [],
          gatewayConfig: data.data.gatewayConfig,
          confirmationEmail: data.data.confirmationEmail || 'support@adspilot.id',
          defaultVoucherEnabled: data.data.defaultVoucherEnabled || false,
          defaultVoucherId: data.data.defaultVoucherId || null,
          defaultVoucher: data.data.defaultVoucher || null,
          mootaEnabled: data.data.gatewayConfig?.provider === 'moota' && data.data.gatewayConfig?.isActive,
          mootaApiToken: data.data.gatewayConfig?.hasServerKey ? '********' : '',
          mootaWebhookSecret: data.data.gatewayConfig?.provider === 'moota' ? data.data.gatewayConfig?.clientKey || '' : '',
        })
      } else {
        toast.error("Gagal memuat payment settings")
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error)
      toast.error("Terjadi kesalahan saat memuat payment settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      const response = await authenticatedFetch("/api/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeMethod: settings.activeMethod,
          confirmationEmail: settings.confirmationEmail,
          defaultVoucherEnabled: settings.defaultVoucherEnabled,
          defaultVoucherId: settings.defaultVoucherId,
          // Send moota config if changed
          mootaConfig: {
            enabled: settings.mootaEnabled,
            apiToken: settings.mootaApiToken === '********' ? undefined : settings.mootaApiToken,
            webhookSecret: settings.mootaWebhookSecret,
          }
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Payment settings berhasil disimpan")
        // Reset toggle ke OFF setelah save berhasil
        setSettings({
          ...settings,
          defaultVoucherEnabled: false,
          defaultVoucherId: null,
        })
        fetchPaymentSettings() // Refresh data after save
      } else {
        toast.error(data.error || "Gagal menyimpan payment settings")
      }
    } catch (error) {
      console.error("Error saving payment settings:", error)
      toast.error("Terjadi kesalahan saat menyimpan payment settings")
    } finally {
      setSaving(false)
    }
  }

  const handleAddBank = () => {
    setEditingBank(null)
    setBankForm({
      bankName: '',
      accountNumber: '',
      accountName: '',
      isActive: true,
      displayOrder: settings?.bankAccounts.length || 0,
    })
    setBankDialogOpen(true)
  }

  const handleEditBank = (bank: BankAccount) => {
    setEditingBank(bank)
    setBankForm({
      bankName: bank.bank_name,
      accountNumber: bank.account_number,
      accountName: bank.account_name,
      isActive: bank.is_active,
      displayOrder: bank.display_order,
    })
    setBankDialogOpen(true)
  }

  const handleSaveBank = async () => {
    try {
      const url = editingBank
        ? `/api/payment-settings/bank-accounts/${editingBank.id}`
        : '/api/payment-settings/bank-accounts'

      const method = editingBank ? 'PUT' : 'POST'

      const response = await authenticatedFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(editingBank ? "Bank account berhasil diupdate" : "Bank account berhasil ditambahkan")
        setBankDialogOpen(false)
        fetchPaymentSettings()
      } else {
        toast.error(data.error || "Gagal menyimpan bank account")
      }
    } catch (error) {
      console.error("Error saving bank account:", error)
      toast.error("Terjadi kesalahan saat menyimpan bank account")
    }
  }

  const handleDeleteBank = async (id: number) => {
    const confirmed = await confirm({
      title: "Hapus Bank?",
      description: 'Apakah Anda yakin ingin menghapus bank account ini?',
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/payment-settings/bank-accounts/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Bank account berhasil dihapus")
        fetchPaymentSettings()
      } else {
        toast.error(data.error || "Gagal menghapus bank account")
      }
    } catch (error) {
      console.error("Error deleting bank account:", error)
      toast.error("Terjadi kesalahan saat menghapus bank account")
    }
  }

  const handleTestMoota = async () => {
    try {
      setTestingMoota(true)
      setMootaStatus(null)
      const response = await authenticatedFetch("/api/payment-settings/moota/test", {
        method: "POST"
      })
      const data = await response.json()

      if (data.success) {
        setMootaStatus({
          connected: true,
          name: data.data.name,
          points: data.data.points
        })
        toast.success("Koneksi Moota berhasil!")
      } else {
        setMootaStatus({
          connected: false,
          error: data.error || "Gagal terhubung"
        })
        toast.error(data.error || "Koneksi Moota gagal")
      }
    } catch (error) {
      console.error("Error testing Moota:", error)
      setMootaStatus({
        connected: false,
        error: "Terjadi kesalahan sistem"
      })
      toast.error("Terjadi kesalahan saat mengetes koneksi")
    } finally {
      setTestingMoota(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Gagal memuat payment settings</AlertDescription>
        </Alert>
      </div>
    )
  }

  const activeBankAccounts = settings.bankAccounts.filter(b => b.is_active)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Payment Settings</h1>
            <p className="text-muted-foreground mt-1">
              Kelola metode pembayaran dan konfigurasi
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>

        {/* Active Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Active Payment Method
            </CardTitle>
            <CardDescription>
              Pilih metode pembayaran yang aktif. Hanya satu metode yang bisa aktif pada satu waktu.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.activeMethod || ''}
              onValueChange={(value) => {
                setSettings({
                  ...settings,
                  activeMethod: value as 'manual' | 'gateway' | null,
                })
              }}
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-semibold">Manual Transfer</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    User melakukan transfer manual ke rekening bank
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="gateway" id="gateway" />
                <Label htmlFor="gateway" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-semibold">Payment Gateway</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Integrasi dengan payment gateway (Midtrans, Xendit, dll)
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Manual Transfer Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Manual Transfer Settings
                </CardTitle>
                <CardDescription>
                  Kelola rekening bank untuk transfer manual
                </CardDescription>
              </div>
              <Button onClick={handleAddBank} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Bank Account
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.activeMethod === 'manual' && activeBankAccounts.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tidak ada bank account aktif. Tambahkan minimal 1 bank account untuk menggunakan manual transfer.
                </AlertDescription>
              </Alert>
            )}

            {settings.bankAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada bank account. Klik "Add Bank Account" untuk menambahkan.
              </p>
            ) : (
              <div className="space-y-2">
                {settings.bankAccounts.map((bank) => (
                  <div
                    key={bank.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${!bank.is_active ? 'opacity-60 bg-muted/30' : ''
                      }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{bank.bank_name}</span>
                        {bank.is_active ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-400">
                            Tidak Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bank.account_number} - {bank.account_name}
                      </p>
                      {!bank.is_active && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Bank account ini tidak akan muncul di halaman payment user
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`toggle-${bank.id}`} className="text-sm cursor-pointer">
                          {bank.is_active ? 'Aktif' : 'Nonaktif'}
                        </Label>
                        <Switch
                          id={`toggle-${bank.id}`}
                          checked={bank.is_active}
                          onCheckedChange={async (checked) => {
                            try {
                              const response = await authenticatedFetch(
                                `/api/payment-settings/bank-accounts/${bank.id}`,
                                {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    bankName: bank.bank_name,
                                    accountNumber: bank.account_number,
                                    accountName: bank.account_name,
                                    isActive: checked,
                                    displayOrder: bank.display_order,
                                  }),
                                }
                              )

                              const data = await response.json()

                              if (data.success) {
                                toast.success(
                                  checked
                                    ? 'Bank account diaktifkan'
                                    : 'Bank account dinonaktifkan'
                                )
                                fetchPaymentSettings()
                              } else {
                                toast.error(data.error || 'Gagal mengupdate status')
                              }
                            } catch (error) {
                              console.error('Error toggling bank account:', error)
                              toast.error('Terjadi kesalahan saat mengupdate status')
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBank(bank)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBank(bank.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t">
              <Label htmlFor="confirmationEmail">Confirmation Email</Label>
              <Input
                id="confirmationEmail"
                value={settings.confirmationEmail}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    confirmationEmail: e.target.value,
                  })
                }
                placeholder="support@adspilot.id"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email untuk menerima bukti transfer dari user
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Default Voucher Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Default Voucher
            </CardTitle>
            <CardDescription>
              Atur voucher default yang akan otomatis diterapkan jika user tidak input voucher code di checkout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="defaultVoucherEnabled">Enable Default Voucher</Label>
                <p className="text-sm text-muted-foreground">
                  Aktifkan untuk menerapkan voucher default secara otomatis
                </p>
              </div>
              <Switch
                id="defaultVoucherEnabled"
                checked={settings.defaultVoucherEnabled}
                onCheckedChange={(checked) => {
                  setSettings({
                    ...settings,
                    defaultVoucherEnabled: checked,
                    defaultVoucherId: checked ? settings.defaultVoucherId : null,
                  })
                }}
              />
            </div>

            {settings.defaultVoucherEnabled && (
              <div className="space-y-2">
                <Label htmlFor="defaultVoucherId">Default Voucher</Label>
                <Select
                  value={settings.defaultVoucherId?.toString() || ""}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      defaultVoucherId: value ? parseInt(value) : null,
                    })
                  }}
                  disabled={loadingVouchers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingVouchers ? "Loading vouchers..." : "Pilih voucher default"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vouchers.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Tidak ada voucher aktif
                      </SelectItem>
                    ) : (
                      vouchers.map((voucher) => (
                        <SelectItem key={voucher.id} value={voucher.id.toString()}>
                          {voucher.code} - {voucher.name}
                          ({voucher.discountType === 'percentage'
                            ? `${voucher.discountValue}%`
                            : `Rp ${voucher.discountValue.toLocaleString('id-ID')}`})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {settings.defaultVoucher && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Voucher yang dipilih:</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.defaultVoucher.code} - {settings.defaultVoucher.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Discount: {settings.defaultVoucher.discountType === 'percentage'
                        ? `${settings.defaultVoucher.discountValue}%`
                        : `Rp ${settings.defaultVoucher.discountValue.toLocaleString('id-ID')}`}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Voucher ini akan otomatis diterapkan jika user tidak memasukkan kode voucher di checkout.
                  User masih bisa override dengan memasukkan voucher code lain.
                </p>
              </div>
            )}

            {!settings.defaultVoucherEnabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Default voucher dinonaktifkan. User harus memasukkan voucher code manual di checkout untuk mendapat diskon.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Payment Gateway Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Gateway Settings
            </CardTitle>
            <CardDescription>
              Konfigurasi payment gateway (Midtrans, Xendit, dll)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Coming Soon</p>
                <p className="text-xs text-muted-foreground">Integrasi Midtrans dan Xendit sedang dalam tahap pengembangan.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Moota Automation Settings */}
        <Card className={settings.activeMethod === 'manual' ? "border-emerald-200 shadow-md" : "opacity-60"}>
          <CardHeader className="bg-emerald-50/50">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-emerald-800">
                  <Building2 className="h-5 w-5" />
                  Moota.co Automation
                </CardTitle>
                <CardDescription>
                  Otomatisasi verifikasi transfer bank manual menggunakan Moota.co
                </CardDescription>
              </div>
              <Switch
                checked={settings.mootaEnabled}
                onCheckedChange={(checked) => setSettings({ ...settings, mootaEnabled: checked })}
                disabled={settings.activeMethod !== 'manual'}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {!settings.mootaEnabled ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <p className="text-sm text-slate-600">
                  Aktifkan Moota untuk mengotomatisasi verifikasi transfer bank manual.
                  Sistem akan secara otomatis mengubah status transaksi menjadi <strong>Paid</strong> jika mutasi bank yang cocok ditemukan.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mootaApiToken">Moota API Token</Label>
                  <Input
                    id="mootaApiToken"
                    type="password"
                    value={settings.mootaApiToken}
                    onChange={(e) => setSettings({ ...settings, mootaApiToken: e.target.value })}
                    placeholder="Masukkan API Token dari dashboard Moota"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Token ini digunakan untuk autentikasi API ke Moota.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mootaWebhookSecret">Webhook Secret (Verification Key)</Label>
                  <Input
                    id="mootaWebhookSecret"
                    value={settings.mootaWebhookSecret}
                    onChange={(e) => setSettings({ ...settings, mootaWebhookSecret: e.target.value })}
                    placeholder="Masukkan Secret Key untuk verifikasi webhook"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Gunakan key ini untuk memverifikasi bahwa callback berasal dari Moota.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-emerald-800 mb-2">Webhook URL:</p>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-emerald-200">
                    <code className="text-[10px] font-mono break-all flex-1">
                      {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace('adm.', 'app.')}/api/webhooks/moota` : 'https://app.adspilot.id/api/webhooks/moota'}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace('adm.', 'app.')}/api/webhooks/moota` : 'https://app.adspilot.id/api/webhooks/moota';
                        navigator.clipboard.writeText(url);
                        toast.success("URL disalin");
                      }}
                    >
                      <Plus className="h-3 w-3 rotate-45" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-2">
                    Daftarkan URL ini di dashboard Moota pada bagian Settings {">"} Webhooks.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                    onClick={handleTestMoota}
                    disabled={testingMoota || !settings.mootaEnabled}
                  >
                    {testingMoota ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Check Moota Connection
                  </Button>

                  {mootaStatus && (
                    <div className={`mt-3 p-3 rounded-lg border flex items-center justify-between ${mootaStatus.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${mootaStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <div>
                          <p className={`text-xs font-bold ${mootaStatus.connected ? 'text-green-800' : 'text-red-800'}`}>
                            {mootaStatus.connected ? 'CONNECTION ACTIVE' : 'CONNECTION FAILED'}
                          </p>
                          {mootaStatus.connected && (
                            <p className="text-[10px] text-green-700">Account: {mootaStatus.name}</p>
                          )}
                          {mootaStatus.error && (
                            <p className="text-[10px] text-red-600">{mootaStatus.error}</p>
                          )}
                        </div>
                      </div>
                      {mootaStatus.connected && (
                        <div className="text-right">
                          <p className="text-[10px] text-green-600 font-medium">Moota Points</p>
                          <p className="text-sm font-bold text-green-800">{mootaStatus.points?.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Account Dialog */}
        <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
              </DialogTitle>
              <DialogDescription>
                {editingBank
                  ? 'Update informasi bank account'
                  : 'Tambahkan rekening bank baru untuk manual transfer'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankForm.bankName}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, bankName: e.target.value })
                  }
                  placeholder="Bank BCA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={bankForm.accountNumber}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, accountNumber: e.target.value })
                  }
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={bankForm.accountName}
                  onChange={(e) =>
                    setBankForm({ ...bankForm, accountName: e.target.value })
                  }
                  placeholder="PT Shopee Ads Expert"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={bankForm.displayOrder}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="isActive"
                    checked={bankForm.isActive}
                    onCheckedChange={(checked) =>
                      setBankForm({ ...bankForm, isActive: checked })
                    }
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBankDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBank}>
                {editingBank ? 'Update' : 'Add'} Bank Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

