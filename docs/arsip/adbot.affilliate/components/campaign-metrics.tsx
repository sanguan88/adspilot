"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Target, Loader2, AlertCircle, BarChart3, Percent, Wallet } from "lucide-react"

interface Campaign {
  id: string
  name: string
  status: "active" | "paused" | "ended"
  objective: string
  budget: number
  spend: number
  sales: number
  roas: number
  adBalance: number
  impressions: number
  clicks: number
  conversions: number
  cpc: number
  startDate: string
  endDate?: string
  adSets: any[]
}

interface CampaignMetricsProps {
  campaigns: Campaign[]
  loading?: boolean
  error?: string | null
  summaryData?: {
    adBalance: number
    totalSpend: number
    totalSales: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    averageCTR: number
    averageROAS: number
    estCommission: number
  }
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: "up" | "down" | "neutral"
  icon: React.ReactNode
  color?: string
  valueColor?: string
}

function MetricCard({ title, value, change, trend, icon, color = "blue", valueColor }: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600"
    if (trend === "down") return "text-red-600"
    return "text-gray-600"
  }

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-2 h-2" />
    if (trend === "down") return <TrendingDown className="w-2 h-2" />
    return null
  }

  // Default value color is gray-900 (black), but can be overridden
  const valueColorClass = valueColor || "text-gray-900"

  return (
    <Card className="p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
      <div className="flex items-center justify-between mb-1">
        <div className={`w-6 h-6 bg-${color}-100 rounded-lg flex items-center justify-center`}>{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <p className={`text-lg font-bold ${valueColorClass}`}>{value}</p>
        <p className="text-xs text-primary font-medium">{title}</p>
      </div>
    </Card>
  )
}

export function CampaignMetrics({ campaigns, loading = false, error = null, summaryData }: CampaignMetricsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="w-6 h-6 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-8 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="w-16 h-6 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4 border-red-200 bg-red-50">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading metrics:</span>
          <span>{error}</span>
        </div>
      </Card>
    )
  }

  // Empty state
  if (campaigns.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">No campaign data available</p>
          <p className="text-sm">Create campaigns to see metrics</p>
        </div>
      </Card>
    )
  }

  // Use summary data from API if available, otherwise calculate from campaigns
  // If summaryData exists, use it; otherwise fallback to campaign calculation
  const totalAdBalance = summaryData ? (summaryData.adBalance || 0) : campaigns.reduce((acc, campaign) => acc + campaign.adBalance, 0) / 100000
  // Jika summaryData ada, totalSpend sudah termasuk PPN 11% dari API
  // Jika tidak ada, hitung dari campaigns dan tambahkan PPN 11%
  const totalSpend = summaryData 
    ? (summaryData.totalSpend || 0) // Sudah termasuk PPN 11% dari API
    : Math.round((campaigns.reduce((acc, campaign) => acc + campaign.spend, 0) / 100000) * 1.11 * 100) / 100 // Tambah PPN 11% untuk fallback
  const totalSales = summaryData ? (summaryData.totalSales || 0) : campaigns.reduce((acc, campaign) => acc + campaign.sales, 0) / 100000
  const totalImpressions = summaryData ? (summaryData.totalImpressions || 0) : campaigns.reduce((acc, campaign) => acc + campaign.impressions, 0)
  const totalClicks = summaryData ? (summaryData.totalClicks || 0) : campaigns.reduce((acc, campaign) => acc + campaign.clicks, 0)
  const totalConversions = summaryData ? (summaryData.totalConversions || 0) : campaigns.reduce((acc, campaign) => acc + campaign.conversions, 0)
  const averageCTR = summaryData ? (summaryData.averageCTR || 0) : (campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + campaign.ctr, 0) / campaigns.length : 0)
  const averageCPC =
    campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + campaign.cpc, 0) / campaigns.length : 0
  const averageROAS = summaryData ? (summaryData.averageROAS || 0) : (campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + campaign.roas, 0) / campaigns.length : 0)
  const baseEstCommission = summaryData ? (summaryData.estCommission || 0) : totalSales * 0.1 // Assuming 10% commission rate
  const estCommission = baseEstCommission - totalSpend // Est. Commission dikurangi Total Spend

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-3">
      <MetricCard
        title="Saldo Iklan"
        value={`Rp${Math.round(totalAdBalance || 0).toLocaleString('id-ID')}`}
        change={-2.3}
        trend="down"
        icon={<Wallet className="w-3 h-3 text-amber-600" />}
        color="amber"
      />
      <MetricCard
        title="Total Spend (+PPN 11%)"
        value={`Rp${Math.round(totalSpend || 0).toLocaleString('id-ID')}`}
        change={12.5}
        trend="up"
        icon={<DollarSign className="w-3 h-3 text-blue-600" />}
        color="blue"
      />
      <MetricCard
        title="Total Sales Hari Ini"
        value={`Rp${Math.round(totalSales || 0).toLocaleString('id-ID')}`}
        icon={<BarChart3 className="w-3 h-3 text-green-600" />}
        color="green"
      />
      <MetricCard
        title="Impressions"
        value={(totalImpressions || 0).toLocaleString()}
        change={8.3}
        trend="up"
        icon={<Eye className="w-3 h-3 text-purple-600" />}
        color="purple"
      />
      <MetricCard
        title="Clicks"
        value={(totalClicks || 0).toLocaleString()}
        change={15.2}
        trend="up"
        icon={<MousePointer className="w-3 h-3 text-orange-600" />}
        color="orange"
      />
      <MetricCard
        title="Average CTR"
        value={`${(averageCTR || 0).toFixed(2)}%`}
        change={-2.1}
        trend="down"
        icon={<TrendingUp className="w-3 h-3 text-red-600" />}
        color="red"
      />
      <MetricCard
        title="Conversions"
        value={(totalConversions || 0).toLocaleString()}
        change={22.7}
        trend="up"
        icon={<Target className="w-3 h-3 text-emerald-600" />}
        color="emerald"
      />
      <MetricCard
        title="ROAS"
        value={`${(averageROAS || 0).toFixed(2)}x`}
        change={5.2}
        trend="up"
        icon={<Percent className="w-3 h-3 text-indigo-600" />}
        color="indigo"
      />
      <MetricCard
        title="Net Commission"
        value={`Rp${Math.round(estCommission || 0).toLocaleString('id-ID')}`}
        change={8.1}
        trend="up"
        icon={<DollarSign className="w-3 h-3 text-teal-600" />}
        color="teal"
        valueColor={estCommission < 0 ? "text-red-600" : "text-gray-900"}
      />
    </div>
  )
}
