"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, TrendingUp, Link2, BarChart2, Filter } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { useAuth } from "@/contexts/AuthContext"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Funnel,
  FunnelChart,
  LabelList
} from "recharts"

export function DashboardOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
    totalReferrals: 0,
    convertedReferrals: 0,
    conversionRate: 0,
    totalClicks: 0,
    thisMonthCommission: 0,
    funnelData: [] as any[], // Visits -> Leads -> Conversions
    trendData: [] as any[], // Daily stats
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000) // Refresh every 60 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Process funnel data from stats
          const funnelData = [
            {
              id: "visits",
              value: Math.max(data.data.totalClicks || 0, data.data.totalReferrals || 0),
              name: "Visits",
              fill: "#3b82f6",
            },
            {
              id: "leads",
              value: data.data.totalReferrals || 0,
              name: "Leads",
              fill: "#8b5cf6",
            },
            {
              id: "sales",
              value: data.data.convertedReferrals || 0,
              name: "Sales",
              fill: "#10b981",
            },
          ]
          // Use real trend data from API
          const trendData = data.data.trendData || []

          setStats({ ...data.data, funnelData, trendData })
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Pantau performa kampanye affiliate Anda secara real-time.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {isLoading ? '...' : formatCurrency(stats.totalCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.thisMonthCommission)} bulan ini
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? '...' : formatCurrency(stats.pendingCommission)}
            </div>
            <p className="text-xs text-muted-foreground">
              Menunggu pencairan
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoading ? '...' : `${stats.conversionRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.convertedReferrals} sales dari {stats.totalReferrals} leads
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Traffic</CardTitle>
            <Link2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isLoading ? '...' : stats.totalClicks.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Total link clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel Chart */}
        <Card className="col-span-1 flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-indigo-500" />
              Sales Funnel
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Tooltip
                    formatter={(value: any, name: any) => [value, name]}
                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                  />
                  <Funnel
                    dataKey="value"
                    data={stats.funnelData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="#888" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
            {/* Custom Legend - Positioned explicitly at bottom */}
            <div className="flex justify-center gap-6 mt-4 pb-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                Visits
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                Leads
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                Sales
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card className="col-span-1 flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-rose-500" />
              Traffic vs Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            {stats.trendData.length > 0 && stats.trendData.some(d => d.clicks > 0 || d.conversions > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    name="Clicks"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    name="Sales"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <BarChart2 className="h-12 w-12 mb-2" />
                <p>Belum ada data trend untuk ditampilkan</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}