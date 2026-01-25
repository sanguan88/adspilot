"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link2, Copy, ExternalLink, Plus, Trash2, Ticket, CheckCircle2, CheckCircle, Loader2 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { DualLayerInfoBanner } from "@/components/dual-layer-info-banner"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

interface TrackingLink {
  id: string
  type: 'landing' | 'checkout'
  url: string
  clicks: number
  conversions: number
  createdAt: string
  trend: number[]
}

interface Voucher {
  id: number
  voucher_code: string
  discount_type: string
  discount_value: number
  is_active: boolean
  usage_count: number
}

interface AffiliateSettings {
  discountRate: number
  commissionRate: number
}

export function MyLinksPage() {
  const { user, token } = useAuth()
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<'landing' | 'checkout' | ''>('')
  const [customRef, setCustomRef] = useState('')

  // Voucher state
  const [voucher, setVoucher] = useState<Voucher | null>(null)
  const [voucherLoading, setVoucherLoading] = useState(true)
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [newVoucherCode, setNewVoucherCode] = useState('')
  const [creatingVoucher, setCreatingVoucher] = useState(false)
  // Delete confirmation states
  const [voucherToDelete, setVoucherToDelete] = useState(false)
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null)

  const [settings, setSettings] = useState<AffiliateSettings>({
    discountRate: 0,
    commissionRate: 0
  })

  useEffect(() => {
    fetchLinks()
    fetchVoucher()
    fetchSettings()
  }, [])

  // Fetch affiliate settings
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
    }
  }

  // Fetch voucher
  const fetchVoucher = async () => {
    try {
      setVoucherLoading(true)
      const response = await authenticatedFetch('/api/vouchers')
      const result = await response.json()
      if (result.success && result.data?.length > 0) {
        setVoucher(result.data[0])
      } else {
        setVoucher(null)
      }
    } catch (error) {
      console.error('Error fetching voucher:', error)
    } finally {
      setVoucherLoading(false)
    }
  }

  // Create voucher
  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newVoucherCode.trim()) {
      toast.error('Masukkan kode voucher')
      return
    }

    try {
      setCreatingVoucher(true)
      const response = await authenticatedFetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode: newVoucherCode })
      })
      const result = await response.json()

      if (result.success) {
        toast.success('Voucher berhasil dibuat!')
        setNewVoucherCode('')
        setShowVoucherForm(false)
        fetchVoucher()
      } else {
        toast.error(result.error || 'Gagal membuat voucher')
      }
    } catch (error) {
      console.error('Error creating voucher:', error)
      toast.error('Terjadi kesalahan')
    } finally {
      setCreatingVoucher(false)
    }
  }

  // Delete voucher
  const handleDeleteVoucher = async () => {
    if (!voucher) return

    try {
      const response = await authenticatedFetch(`/api/vouchers?id=${voucher.id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        toast.success('Voucher berhasil dihapus')
        setVoucher(null)
        setVoucherToDelete(false)
      } else {
        toast.error(result.error || 'Gagal menghapus voucher')
      }
    } catch (error) {
      console.error('Error deleting voucher:', error)
      toast.error('Terjadi kesalahan')
    }
  }

  const fetchLinks = async () => {
    try {
      setIsLoading(true)
      const response = await authenticatedFetch('/api/links')

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setLinks(data.data || [])
      } else {
        console.error('API returned error:', data.error)
        toast.error(data.error || 'Gagal memuat tracking links')
        setLinks([])
      }
    } catch (error) {
      console.error('Error fetching links:', error)
      toast.error('Gagal memuat tracking links')
      setLinks([])
    } finally {
      setIsLoading(false)
    }
  }

  const generateLink = async () => {
    if (!selectedType) {
      toast.error('Pilih jenis link terlebih dahulu')
      return
    }

    try {
      const response = await authenticatedFetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, customRef }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast.success('Link berhasil dibuat!')
          setIsDialogOpen(false)
          setSelectedType('')
          setCustomRef('')
          fetchLinks()
        } else {
          toast.error(data.error || 'Gagal membuat link')
        }
      }
    } catch (error) {
      toast.error('Gagal membuat link')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Link disalin ke clipboard!')
  }

  const deleteLink = async (linkId: string) => {
    try {
      const response = await authenticatedFetch(`/api/links?id=${linkId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Link berhasil dihapus')
        fetchLinks()
        setLinkToDelete(null)
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Gagal menghapus link')
      }
    } catch (error) {
      toast.error('Gagal menghapus link')
    }
  }

  // Use correct domain for production
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://adspilot.id'
  const affiliateCode = user?.affiliateCode || 'BYPASS'

  const landingPageLink = `${baseUrl}/?ref=${affiliateCode}`
  const checkoutLink = `${baseUrl}/auth/checkout?ref=${affiliateCode}`

  // Helper to clean up old URLs for display
  const formatUrl = (url: string) => {
    return url
      .replace('https://aff.shopadexpert.com/landing', 'https://adspilot.id')
      .replace('https://aff.shopadexpert.com', 'https://adspilot.id') // Fallback generic
      .replace('https://aff.adspilot.id/landing', 'https://adspilot.id')
      .replace('/landing?ref=', '/?ref=') // Fix path to root
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Link & Voucher</h1>
          <p className="text-sm text-muted-foreground">
            Kelola link referral dan voucher untuk promosi
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Generate Link
        </Button>
      </div>

      {/* Info Banner */}
      <DualLayerInfoBanner />

      {/* Voucher & Quick Links Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Voucher Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" />
              Voucher Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {voucherLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : voucher ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div>
                    <span className="text-lg font-bold font-mono">{voucher.voucher_code}</span>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Diskon {Math.round(voucher.discount_value)}%
                      <span>•</span>
                      <span>{voucher.usage_count} penggunaan</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(voucher.voucher_code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setVoucherToDelete(true)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Voucher otomatis diterapkan saat visitor klik link Anda
                </p>
              </div>
            ) : showVoucherForm ? (
              <form onSubmit={handleCreateVoucher} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Contoh: RIZKI50"
                    value={newVoucherCode}
                    onChange={(e) => setNewVoucherCode(e.target.value.toUpperCase())}
                    className="uppercase text-sm"
                    maxLength={20}
                  />
                  <Badge variant="secondary" className="whitespace-nowrap text-xs">
                    {settings.discountRate}%
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={creatingVoucher} className="flex-1">
                    {creatingVoucher && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Buat
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowVoucherForm(false)}>
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Buat voucher untuk komisi {settings.commissionRate}%
                </p>
                <Button size="sm" variant="outline" onClick={() => setShowVoucherForm(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Buat Voucher
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Generate Links */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Landing Page Link */}
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Landing Page</p>
                  <p className="text-xs text-muted-foreground truncate">{landingPageLink}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(landingPageLink)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Checkout Link */}
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Checkout Page</p>
                  <p className="text-xs text-muted-foreground truncate">{checkoutLink}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(checkoutLink)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {voucher && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>Voucher <strong>{voucher.voucher_code}</strong> akan otomatis diterapkan</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tracking Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking Links</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : links.length === 0 ? (
            <EmptyState
              icon={<Link2 className="w-12 h-12" />}
              title="Belum ada tracking links"
              description="Generate link pertama Anda untuk mulai tracking referrals"
              action={{
                label: "Generate Link",
                onClick: () => setIsDialogOpen(true)
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Trend (7 Hari)</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${link.type === 'landing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {link.type === 'landing' ? 'Landing Page' : 'Checkout'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 py-1">
                        {/* Landing Link */}
                        <div className="flex items-center gap-2 group">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none mb-1">Landing Page</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[280px] truncate">
                              {(() => {
                                const formatted = formatUrl(link.url)
                                return formatted.includes('checkout')
                                  ? formatted.replace('/auth/checkout', '/')
                                  : formatted
                              })()}
                            </code>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity self-end"
                            onClick={() => {
                              const formatted = formatUrl(link.url)
                              const final = formatted.includes('checkout')
                                ? formatted.replace('/auth/checkout', '/')
                                : formatted
                              copyToClipboard(final)
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Checkout Link */}
                        <div className="flex items-center gap-2 group border-t pt-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 leading-none mb-1">Checkout Page</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[280px] truncate">
                              {(() => {
                                const formatted = formatUrl(link.url)
                                return formatted.includes('checkout')
                                  ? formatted
                                  : formatted.replace('https://adspilot.id/', 'https://adspilot.id/auth/checkout/')
                                    .replace('//auth', '/auth') // Fix double slash if any
                                    .replace('.id/auth', '.id/auth') // Ensure domain-relative
                              })()}
                            </code>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 opacity-50 group-hover:opacity-100 transition-opacity self-end"
                            onClick={() => {
                              const formatted = formatUrl(link.url)
                              const final = formatted.includes('checkout')
                                ? formatted
                                : formatted.replace('https://adspilot.id/', 'https://adspilot.id/auth/checkout/')
                                  .replace('//auth', '/auth')
                              copyToClipboard(final)
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={link.trend.map((val, i) => {
                            const date = new Date();
                            date.setDate(date.getDate() - (6 - i));
                            return {
                              value: val,
                              date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                            };
                          })}>
                            <Tooltip
                              content={({ payload }) => {
                                if (!payload || !payload[0]) return null;
                                return (
                                  <div className="bg-popover text-popover-foreground p-2 rounded-md border shadow-md text-xs">
                                    <p className="font-semibold">{payload[0].payload.date}</p>
                                    <p className="text-muted-foreground">{payload[0].value} clicks</p>
                                  </div>
                                );
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={link.clicks > 0 ? "#10b981" : "#94a3b8"}
                              fill={link.clicks > 0 ? "#d1fae5" : "#f1f5f9"}
                              strokeWidth={1}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </TableCell>
                    <TableCell>{link.clicks}</TableCell>
                    <TableCell>{link.conversions}</TableCell>
                    <TableCell>
                      {link.clicks > 0
                        ? `${Math.round((link.conversions / link.clicks) * 100)}%`
                        : '0%'}
                    </TableCell>
                    <TableCell>
                      {new Date(link.createdAt).toLocaleDateString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setLinkToDelete(link.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Link Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Generate Tracking Link</DialogTitle>
            <DialogDescription>
              Pilih jenis link yang ingin dibuat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Jenis Link</Label>
              <Select value={selectedType} onValueChange={(value) => setSelectedType(value as 'landing' | 'checkout')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landing">Landing Page - Untuk affiliate yang menggunakan landing page default</SelectItem>
                  <SelectItem value="checkout">Checkout - Untuk affiliate yang punya landing page sendiri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Custom Ref (Optional)</Label>
              <Input
                value={customRef}
                onChange={(e) => setCustomRef(e.target.value)}
                placeholder="Ex: IG_ADS, TIKTOK_CAMPAIGN"
              />
              <p className="text-xs text-muted-foreground">
                Tambahkan variasi pada link untuk tracking campaign spesifik (e.g. ?ref=CODE_VARIASI)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDialogOpen(false)
              setSelectedType('')
              setCustomRef('')
            }}>
              Cancel
            </Button>
            <Button onClick={generateLink} disabled={!selectedType}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <AlertDialog open={!!voucherToDelete} onOpenChange={(open) => !open && setVoucherToDelete(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVoucher} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!linkToDelete} onOpenChange={(open) => !open && setLinkToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tracking Link</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus link ini? Traffic dari link ini tidak akan ditrack lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => linkToDelete && deleteLink(linkToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
