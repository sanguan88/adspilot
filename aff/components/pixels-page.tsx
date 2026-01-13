"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash, ExternalLink, Loader2, Save, Calendar } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format, subDays } from "date-fns"
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Platform icon helper
const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
        facebook: '/icons8-facebook.svg',
        tiktok: '/icons8-tiktok.svg',
        google: '/icons8-google.svg'
    }
    return icons[platform] || '/icons8-facebook.svg'
}

interface Pixel {
    id: number
    platform: 'facebook' | 'tiktok' | 'google'
    pixelId: string
    name: string
    isActive: boolean
    createdAt: string
}

export function PixelsPage() {
    const [pixels, setPixels] = useState<Pixel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)

    // Health Check State
    const [healthData, setHealthData] = useState<{
        isActive: boolean
        todayCount: number
        platformStats: Array<{
            platform: string
            total: number
            success: number
            failed: number
        }>
        trendData: Array<{
            date: string
            facebook: number
            tiktok: number
            google: number
        }>
        recentLogs: Array<{
            platform: string
            pixelId: string | null
            eventName: string
            status: string
            errorMessage: string | null
            timestamp: string
        }>
        successRate: number
        dateRange: {
            startDate: string
            endDate: string
        }
    } | null>(null)
    const [isLoadingHealth, setIsLoadingHealth] = useState(true)

    // Date Range Filter
    const [dateRange, setDateRange] = useState<'today' | '7days' | '30days'>('7days')
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')

    // Create Pixel Form
    const [newPixelOpen, setNewPixelOpen] = useState(false)
    const [activePlatform, setActivePlatform] = useState<'facebook' | 'tiktok' | 'google'>('facebook')
    const [newPixelData, setNewPixelData] = useState({
        pixelId: '',
        name: ''
    })

    useEffect(() => {
        fetchPixels()
        fetchHealthData()
        // Refresh health data every 30 seconds
        const interval = setInterval(fetchHealthData, 30000)
        return () => clearInterval(interval)
    }, [dateRange, customStartDate, customEndDate])

    const getDateRangeParams = () => {
        const today = new Date()
        let startDate, endDate

        switch (dateRange) {
            case 'today':
                startDate = endDate = format(today, 'yyyy-MM-dd')
                break
            case '7days':
                startDate = format(subDays(today, 6), 'yyyy-MM-dd')
                endDate = format(today, 'yyyy-MM-dd')
                break
            case '30days':
                startDate = format(subDays(today, 29), 'yyyy-MM-dd')
                endDate = format(today, 'yyyy-MM-dd')
                break
            default:
                startDate = format(subDays(today, 6), 'yyyy-MM-dd')
                endDate = format(today, 'yyyy-MM-dd')
        }

        return { startDate, endDate }
    }

    const fetchHealthData = async () => {
        try {
            const { startDate, endDate } = getDateRangeParams()
            const response = await authenticatedFetch(`/api/pixels/health?startDate=${startDate}&endDate=${endDate}`)
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setHealthData(data.data)
                }
            }
        } catch (error) {
            console.error('Error fetching health data:', error)
        } finally {
            setIsLoadingHealth(false)
        }
    }

    const fetchPixels = async () => {
        try {
            setIsLoading(true)
            const response = await authenticatedFetch('/api/pixels')
            if (response.ok) {
                const data = await response.json()
                if (data.success) {
                    setPixels(data.data)
                }
            }
        } catch (error) {
            console.error('Error fetching pixels:', error)
            toast.error('Gagal mengambil data pixel')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreatePixel = async () => {
        if (!newPixelData.pixelId) {
            toast.error('Pixel ID wajib diisi')
            return
        }

        try {
            setIsAdding(true)
            const response = await authenticatedFetch('/api/pixels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: activePlatform,
                    pixelId: newPixelData.pixelId,
                    name: newPixelData.name || `${activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)} Pixel`
                })
            })

            const data = await response.json()
            if (data.success) {
                toast.success('Pixel berhasil ditambahkan')
                setPixels(prev => [data.data, ...prev])
                setNewPixelOpen(false)
                setNewPixelData({ pixelId: '', name: '' })
            } else {
                toast.error(data.error || 'Gagal menambahkan pixel')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan')
        } finally {
            setIsAdding(false)
        }
    }

    const handleToggleActive = async (id: number, currentStatus: boolean) => {
        // Optimistic update
        setPixels(prev => prev.map(p => p.id === id ? { ...p, isActive: !currentStatus } : p))

        try {
            const response = await authenticatedFetch(`/api/pixels/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            })

            const data = await response.json()
            if (!data.success) {
                // Revert on failure
                setPixels(prev => prev.map(p => p.id === id ? { ...p, isActive: currentStatus } : p))
                toast.error(data.error || 'Gagal mengupdate status')
            }
        } catch (error) {
            // Revert on error
            setPixels(prev => prev.map(p => p.id === id ? { ...p, isActive: currentStatus } : p))
            toast.error('Terjadi kesalahan')
        }
    }

    const handleDeletePixel = async (id: number) => {
        if (!confirm('Apakah anda yakin ingin menghapus pixel ini?')) return

        try {
            const response = await authenticatedFetch(`/api/pixels/${id}`, {
                method: 'DELETE'
            })

            const data = await response.json()
            if (data.success) {
                toast.success('Pixel berhasil dihapus')
                setPixels(prev => prev.filter(p => p.id !== id))
            } else {
                toast.error(data.error || 'Gagal menghapus pixel')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan')
        }
    }

    const renderPixelList = (platform: 'facebook' | 'tiktok' | 'google') => {
        const platformPixels = pixels.filter(p => p.platform === platform)

        if (isLoading) {
            return (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )
        }

        if (platformPixels.length === 0) {
            return (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">Belum ada Pixel {platform} yang ditambahkan.</p>
                    <Button onClick={() => { setActivePlatform(platform); setNewPixelOpen(true) }}>
                        <Plus className="h-4 w-4 mr-2" /> Tambah {platform} Pixel
                    </Button>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <Button size="sm" onClick={() => { setActivePlatform(platform); setNewPixelOpen(true) }}>
                        <Plus className="h-4 w-4 mr-2" /> Tambah Pixel Baru
                    </Button>
                </div>
                <div className="grid gap-4">
                    {platformPixels.map(pixel => (
                        <Card key={pixel.id} className="flex flex-row items-center justify-between p-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{pixel.name}</h4>
                                    <Badge variant={pixel.isActive ? "tertiary" : "secondary"}>
                                        {pixel.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded inline-block">
                                    ID: {pixel.pixelId}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Added on {new Date(pixel.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor={`active-${pixel.id}`} className="text-xs text-muted-foreground">Status</Label>
                                    <Switch
                                        id={`active-${pixel.id}`}
                                        checked={pixel.isActive}
                                        onCheckedChange={() => handleToggleActive(pixel.id, pixel.isActive)}
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePixel(pixel.id)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Pixel Tracking</h2>
                    <p className="text-muted-foreground">
                        Kelola tracking pixel Anda untuk memantau performa referral di berbagai platform.
                    </p>
                </div>
            </div>

            {/* Health Check Section */}
            <Card className="border-2">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                🩺 System Health Check
                                {!isLoadingHealth && healthData && (
                                    <>
                                        <Badge variant={healthData.isActive ? "tertiary" : "secondary"}>
                                            {healthData.isActive ? '🟢 Active' : '⚪ Inactive'}
                                        </Badge>
                                        <Badge variant="outline" className="text-emerald-600">
                                            {healthData.successRate}% Success Rate
                                        </Badge>
                                    </>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Monitor pixel firing events in real-time
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Date Range Filter */}
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Today</SelectItem>
                                        <SelectItem value="7days">Last 7 Days</SelectItem>
                                        <SelectItem value="30days">Last 30 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {!isLoadingHealth && healthData && (
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-emerald-600">
                                        {healthData.todayCount}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Events Today</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingHealth ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : healthData ? (
                        <>
                            {/* Platform Stats */}
                            {healthData.platformStats.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {healthData.platformStats.map(stat => (
                                        <Card key={stat.platform} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <Image
                                                        src={getPlatformIcon(stat.platform)}
                                                        alt={stat.platform}
                                                        width={32}
                                                        height={32}
                                                        className="rounded"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium capitalize">{stat.platform}</p>
                                                        <p className="text-2xl font-bold">{stat.total}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div className="text-green-600">✓ {stat.success}</div>
                                                    {stat.failed > 0 && <div className="text-red-600">✗ {stat.failed}</div>}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Event Trend Chart */}
                            {healthData.trendData && healthData.trendData.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">Event Trend</h4>
                                    <div className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={healthData.trendData.map(d => ({
                                                ...d,
                                                date: format(new Date(d.date), 'MMM dd')
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#9ca3af"
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 12 }}
                                                    stroke="#9ca3af"
                                                />
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #e5e7eb',
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                <Legend />
                                                <Area
                                                    type="monotone"
                                                    dataKey="facebook"
                                                    stackId="1"
                                                    stroke="#1877f2"
                                                    fill="#1877f2"
                                                    fillOpacity={0.6}
                                                    name="Facebook"
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="tiktok"
                                                    stackId="1"
                                                    stroke="#000000"
                                                    fill="#000000"
                                                    fillOpacity={0.6}
                                                    name="TikTok"
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="google"
                                                    stackId="1"
                                                    stroke="#4285f4"
                                                    fill="#4285f4"
                                                    fillOpacity={0.6}
                                                    name="Google"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {/* Recent Logs */}
                            {healthData.recentLogs.length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Recent Events</h4>
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="text-left p-2">Time</th>
                                                    <th className="text-left p-2">Platform</th>
                                                    <th className="text-left p-2">Event</th>
                                                    <th className="text-left p-2">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {healthData.recentLogs.slice(0, 10).map((log, idx) => (
                                                    <tr key={idx} className="border-t hover:bg-muted/50">
                                                        <td className="p-2 text-xs text-muted-foreground">
                                                            {new Date(log.timestamp).toLocaleString('id-ID', {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                day: '2-digit',
                                                                month: 'short'
                                                            })}
                                                        </td>
                                                        <td className="p-2 capitalize">{log.platform}</td>
                                                        <td className="p-2 font-mono text-xs">{log.eventName}</td>
                                                        <td className="p-2">
                                                            <Badge variant={log.status === 'success' ? 'tertiary' : 'destructive'} className="text-xs">
                                                                {log.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No pixel events recorded yet.</p>
                                    <p className="text-xs mt-2">Events will appear here when pixels are fired.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            Failed to load health data
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={newPixelOpen} onOpenChange={setNewPixelOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah {activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)} Pixel Baru</DialogTitle>
                        <DialogDescription>
                            Masukkan ID Pixel Anda. Pastikan ID valid agar tracking berjalan lancar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nama Pixel (Opsional)</Label>
                            <Input
                                placeholder="Contoh: Akun Iklan Utama"
                                value={newPixelData.name}
                                onChange={(e) => setNewPixelData({ ...newPixelData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Pixel ID / Tag ID <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder={activePlatform === 'google' ? 'G-XXXXXXXXXX' : '1234567890...'}
                                value={newPixelData.pixelId}
                                onChange={(e) => setNewPixelData({ ...newPixelData, pixelId: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                {activePlatform === 'facebook' && 'Dapat ditemukan di Events Manager > Data Sources.'}
                                {activePlatform === 'tiktok' && 'Dapat ditemukan di Assets > Events > Web Events.'}
                                {activePlatform === 'google' && 'Masukkan ID "G-..." atau "AW-..." Anda.'}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewPixelOpen(false)}>Batal</Button>
                        <Button onClick={handleCreatePixel} disabled={isAdding}>
                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Simpan Pixel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="facebook" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="facebook" className="gap-2">
                        <Image src="/icons8-facebook.svg" alt="Facebook" width={16} height={16} />
                        Facebook Pixel
                    </TabsTrigger>
                    <TabsTrigger value="tiktok" className="gap-2">
                        <Image src="/icons8-tiktok.svg" alt="TikTok" width={16} height={16} />
                        TikTok Pixel
                    </TabsTrigger>
                    <TabsTrigger value="google" className="gap-2">
                        <Image src="/icons8-google.svg" alt="Google" width={16} height={16} />
                        Google G-Tag
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="facebook" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Facebook Meta Pixel</CardTitle>
                                    <CardDescription>
                                        Lacak konversi dari iklan Facebook & Instagram Ads.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Events Manager
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderPixelList('facebook')}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tiktok" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>TikTok Pixel</CardTitle>
                                    <CardDescription>
                                        Optimalkan kampanye TikTok Ads Anda dengan tracking data real-time.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://ads.tiktok.com/i18n/events_manager/" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Ads Manager
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderPixelList('tiktok')}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="google" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>Google Analytics & Ads</CardTitle>
                                    <CardDescription>
                                        Gunakan Global Site Tag (gtag.js) untuk Google Analytics 4 atau Google Ads.
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <a href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4 mr-2" /> Google Analytics
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {renderPixelList('google')}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
