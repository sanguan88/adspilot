"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link2, Copy, ExternalLink, Plus, Trash2 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { DualLayerInfoBanner } from "@/components/dual-layer-info-banner"

import { Area, AreaChart, ResponsiveContainer } from "recharts"

interface TrackingLink {
  id: string
  type: 'landing' | 'checkout'
  url: string
  clicks: number
  conversions: number
  createdAt: string
  trend: number[]
}

export function MyLinksPage() {
  const { user } = useAuth()
  const [links, setLinks] = useState<TrackingLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<'landing' | 'checkout' | ''>('')
  const [customRef, setCustomRef] = useState('')

  useEffect(() => {
    fetchLinks()
  }, [])

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
        setLinks([]) // Set empty array on error
      }
    } catch (error) {
      console.error('Error fetching links:', error)
      toast.error('Gagal memuat tracking links')
      setLinks([]) // Set empty array on error
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
    if (!confirm('Apakah Anda yakin ingin menghapus link ini?')) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/links/${linkId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Link berhasil dihapus')
        fetchLinks()
      }
    } catch (error) {
      toast.error('Gagal menghapus link')
    }
  }

  // Point to Main Landing Page (Port 3000) for generated links
  const baseUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL || 'http://localhost:3000'
  const affiliateCode = user?.affiliateCode || 'BYPASS'

  const landingPageLink = `${baseUrl}/?ref=${affiliateCode}`
  const checkoutLink = `${baseUrl}/auth/checkout?ref=${affiliateCode}`

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Links</h1>
          <p className="text-sm text-muted-foreground">
            Generate dan kelola tracking links untuk promosi
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Generate Link
        </Button>
      </div>

      {/* Info Banner */}
      <DualLayerInfoBanner />

      {/* Quick Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Generate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Landing Page Link */}
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Landing Page Link</p>
                <p className="text-xs text-muted-foreground truncate">{landingPageLink}</p>
                <p className="text-xs text-muted-foreground mt-1">Untuk affiliate yang menggunakan landing page default</p>
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
                <p className="text-sm font-medium">Checkout Link</p>
                <p className="text-xs text-muted-foreground truncate">{checkoutLink}</p>
                <p className="text-xs text-muted-foreground mt-1">Untuk affiliate yang punya landing page sendiri</p>
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
        </CardContent>
      </Card>

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
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-xs truncate">
                          {link.url}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 w-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={link.trend.map((val, i) => ({ value: val }))}>
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
                          onClick={() => deleteLink(link.id)}
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
    </div>
  )
}

