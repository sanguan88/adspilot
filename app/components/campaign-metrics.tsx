"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Target, Loader2, AlertCircle, BarChart3, Percent, Wallet, FolderOpen, ShoppingCart, Monitor } from "lucide-react"

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
  view: number
  orders: number
  conversions: number
  ctr?: number
  cpc: number
  startDate: string
  endDate?: string
  adSets: any[]
}

interface CampaignMetricsProps {
  campaigns: Campaign[]
  loading?: boolean
  error?: string | null
  totalCampaigns?: number
  summaryData?: {
    adBalance: number
    totalSpend: number
    totalSales: number
    totalImpressions: number
    totalClicks: number
    totalViews?: number
    totalOrders?: number
    totalConversions: number
    averageCTR: number
    averageConversionRate?: number
    averageROAS: number
    estCommission: number
    yesterday?: {
      adBalance?: number
      totalSpend?: number
      totalSales?: number
      totalImpressions?: number
      totalClicks?: number
      totalViews?: number
      totalOrders?: number
      totalConversions?: number
      averageCTR?: number
      averageConversionRate?: number
      averageROAS?: number
      estCommission?: number
    } | null
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
    if (trend === "up") return "text-success"
    if (trend === "down") return "text-destructive"
    if (trend === "neutral") return "text-gray-700"
    return "text-gray-700"
  }

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-2 h-2" />
    if (trend === "down") return <TrendingDown className="w-2 h-2" />
    return null
  }

  // Default value color is gray-900 (black), but can be overridden
  const valueColorClass = valueColor || "text-gray-900"

  // Only show trend if both change and trend are defined
  const showTrend = change !== undefined && trend !== undefined

  // Determine if this is a primary card (larger) or secondary card (smaller)
  // Check icon size to determine card type
  const iconSize = (icon as any)?.props?.className?.match(/w-(\d+)/)?.[1]
  const isPrimary = iconSize === '5'

  return (
    <Card className={`transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${isPrimary ? 'p-6' : 'p-3'}`}>
      <div className={`flex items-center justify-between ${isPrimary ? 'mb-2' : 'mb-1'}`}>
        <div className={`${isPrimary ? 'w-8 h-8' : 'w-6 h-6'} bg-primary/10 rounded-lg flex items-center justify-center`}>{icon}</div>
        {showTrend && (
          <div className={`flex items-center gap-0.5 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{change !== undefined ? `${change >= 0 ? '+' : ''}${change}%` : ''}</span>
          </div>
        )}
      </div>
      <div className={isPrimary ? 'space-y-1' : 'space-y-0.5'}>
        <p className={`${isPrimary ? 'text-3xl font-bold' : 'text-lg font-bold'} ${valueColorClass}`}>{value}</p>
        <p className={`${isPrimary ? 'text-sm' : 'text-xs'} text-primary font-medium`}>{title}</p>
      </div>
    </Card>
  )
}

export function CampaignMetrics({ campaigns, loading = false, error = null, totalCampaigns, summaryData }: CampaignMetricsProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
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

  // Empty state - removed to always show cards with 0 values

  // Always calculate from campaigns array to ensure consistency with filters
  // This ensures summary cards reflect the same filtered data as the table
  // Note: summaryData from API may not include search/status filters, so we use campaigns array
  // BUT for adBalance, we should use summaryData from API Shopee (real-time balance), not from campaigns
  const totalAdBalance = summaryData?.adBalance || 0
  // Calculate totalSpend from campaigns and add PPN 11%
  const totalSpend = Math.round((campaigns.reduce((acc, campaign) => acc + campaign.spend, 0) / 100000) * 1.11 * 100) / 100
  const totalSales = campaigns.reduce((acc, campaign) => acc + campaign.sales, 0) / 100000
  const totalImpressions = campaigns.reduce((acc, campaign) => acc + campaign.impressions, 0)
  const totalClicks = campaigns.reduce((acc, campaign) => acc + campaign.clicks, 0)
  // Calculate totals from campaigns array (always use campaigns data for view and orders, as API summary doesn't include them)
  const totalViews = campaigns.reduce((acc, campaign) => acc + (campaign.view || 0), 0)
  const totalOrders = campaigns.reduce((acc, campaign) => acc + (campaign.orders || 0), 0)

  // Average Conversion Rate = average of all campaign conversion rates
  const averageConversionRate = campaigns.length > 0
    ? campaigns.reduce((acc, campaign) => {
      // Calculate conversion rate per campaign: (orders / clicks) * 100
      // If clicks is 0, conversion rate is 0
      const campaignConversionRate = campaign.clicks > 0
        ? ((campaign.orders || 0) / campaign.clicks) * 100
        : 0
      return acc + campaignConversionRate
    }, 0) / campaigns.length
    : 0

  // Always calculate averages from campaigns array for consistency with filters
  const averageCTR = campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + (campaign.ctr || 0), 0) / campaigns.length : 0
  const averageCPC = campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + campaign.cpc, 0) / campaigns.length : 0
  const averageROAS = campaigns.length > 0 ? campaigns.reduce((acc, campaign) => acc + campaign.roas, 0) / campaigns.length : 0
  // Calculate ACOS: (Total Spend / Total Sales) × 100%
  const acos = totalSales > 0 ? (totalSpend / totalSales) * 100 : 0
  const baseEstCommission = totalSales * 0.1 // Assuming 10% commission rate
  const estCommission = baseEstCommission - totalSpend // Est. Commission dikurangi Total Spend

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length

  // Helper function to calculate trend
  const calculateTrend = (current: number, previous?: number | null): { change?: number; trend?: "up" | "down" | "neutral" } => {
    if (previous === undefined || previous === null || previous === 0) {
      return {}
    }

    const change = ((current - previous) / previous) * 100
    const absChange = Math.abs(change)

    if (absChange < 0.01) {
      return { change: 0, trend: "neutral" }
    }

    return {
      change: Math.round(absChange * 10) / 10, // Round to 1 decimal place
      trend: change >= 0 ? "up" : "down"
    }
  }

  // Calculate trends from yesterday data if available
  const yesterday = summaryData?.yesterday
  const adBalanceTrend = calculateTrend(totalAdBalance, yesterday?.adBalance)
  const totalSpendTrend = calculateTrend(totalSpend, yesterday?.totalSpend)
  const totalSalesTrend = calculateTrend(totalSales, yesterday?.totalSales)
  const impressionsTrend = calculateTrend(totalImpressions, yesterday?.totalImpressions)
  const clicksTrend = calculateTrend(totalClicks, yesterday?.totalClicks)
  const viewsTrend = calculateTrend(totalViews, yesterday?.totalViews)
  const ordersTrend = calculateTrend(totalOrders, yesterday?.totalOrders)
  const ctrTrend = calculateTrend(averageCTR, yesterday?.averageCTR)
  const conversionRateTrend = calculateTrend(averageConversionRate, yesterday?.averageConversionRate)
  const roasTrend = calculateTrend(averageROAS, yesterday?.averageROAS)
  // Calculate yesterday ACOS for trend
  const yesterdayACOS = yesterday?.totalSales && yesterday.totalSales > 0
    ? ((yesterday.totalSpend || 0) / yesterday.totalSales) * 100
    : undefined
  const acosTrend = calculateTrend(acos, yesterdayACOS)
  const commissionTrend = calculateTrend(estCommission, yesterday?.estCommission)

  // Use totalCampaigns prop if provided, otherwise fallback to campaigns.length
  // This ensures we always show the total count of all filtered campaigns, not just current page
  const displayTotalCampaigns = totalCampaigns !== undefined ? totalCampaigns : campaigns.length

  return (
    <div className="space-y-6">
      {/* Primary Summary Cards - 4 Large Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Iklan"
          value={displayTotalCampaigns.toLocaleString()}
          icon={<FolderOpen className="w-5 h-5 text-primary" />}
          color="blue"
          valueColor="text-gray-900"
        />
        <MetricCard
          title="Total Spend"
          value={`Rp${Math.round(totalSpend || 0).toLocaleString('id-ID')}`}
          change={totalSpendTrend.change}
          trend={totalSpendTrend.trend}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          color="blue"
          valueColor="text-gray-900"
        />
        <MetricCard
          title="Total Sales"
          value={`Rp${Math.round(totalSales || 0).toLocaleString('id-ID')}`}
          change={totalSalesTrend.change}
          trend={totalSalesTrend.trend}
          icon={<ShoppingCart className="w-5 h-5 text-primary" />}
          color="blue"
          valueColor="text-gray-900"
        />
        <MetricCard
          title="ROAS"
          value={`${(averageROAS || 0).toFixed(2)}x`}
          change={roasTrend.change}
          trend={roasTrend.trend}
          icon={<Percent className="w-5 h-5 text-primary" />}
          color="blue"
          valueColor="text-gray-900"
        />
      </div>

      {/* Secondary Summary Cards - 8 Smaller Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <MetricCard
          title="Saldo Iklan Saat ini"
          value={`Rp${Math.round(totalAdBalance || 0).toLocaleString('id-ID')}`}
          change={adBalanceTrend.change}
          trend={adBalanceTrend.trend}
          icon={<Wallet className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="Impressions"
          value={(totalImpressions || 0).toLocaleString()}
          change={impressionsTrend.change}
          trend={impressionsTrend.trend}
          icon={<Eye className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="Clicks"
          value={(totalClicks || 0).toLocaleString()}
          change={clicksTrend.change}
          trend={clicksTrend.trend}
          icon={<MousePointer className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="View"
          value={(totalViews || 0).toLocaleString()}
          change={viewsTrend.change}
          trend={viewsTrend.trend}
          icon={<Monitor className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="Average CTR"
          value={`${(averageCTR || 0).toFixed(2)}%`}
          change={ctrTrend.change}
          trend={ctrTrend.trend}
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="Pesanan"
          value={(totalOrders || 0).toLocaleString()}
          change={ordersTrend.change}
          trend={ordersTrend.trend}
          icon={<ShoppingCart className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="Avg Conversion Rate"
          value={`${(averageConversionRate || 0).toFixed(2)}%`}
          change={conversionRateTrend.change}
          trend={conversionRateTrend.trend}
          icon={<Target className="w-4 h-4 text-primary" />}
          color="blue"
        />
        <MetricCard
          title="ACOS"
          value={`${(acos || 0).toFixed(2)}%`}
          change={acosTrend.change}
          trend={acosTrend.trend}
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          color="blue"
        />
      </div>
    </div>
  )
}
