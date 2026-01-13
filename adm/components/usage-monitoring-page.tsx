"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Database, Cpu, HardDrive, Users, Target, Zap, BarChart3 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { StatsCardSkeleton } from "@/components/ui/loading-skeleton"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard } from "@/lib/design-tokens"

interface UsageStats {
  users: {
    total: number
    active: number
    active30d: number
  }
  accounts: {
    total: number
    usersWithAccounts: number
  }
  campaigns: {
    total: number
    accountsWithCampaigns: number
  }
  rules: {
    total: number
    active: number
  }
  apiCalls: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  database: {
    size: string
  }
}

export function UsageMonitoringPage() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageStats()
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchUsageStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchUsageStats = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/usage")
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      } else {
        toast.error(data.error || "Gagal memuat data usage")
      }
    } catch (error) {
      console.error("Error fetching usage stats:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <StatsCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="text-center py-20 text-gray-600">No data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Usage & Monitoring</h1>
            <p className={pageLayout.headerDescription}>
              Monitor usage analytics dan resource consumption
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className={gridLayouts.stats}>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Activity className={summaryCard.iconTop} />
                <p className={summaryCard.label}>API Calls (Today)</p>
                <p className={summaryCard.value}>{stats.apiCalls.today.toLocaleString()}</p>
                <p className={summaryCard.description}>
                  This month: {stats.apiCalls.thisMonth.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Database className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Database Usage</p>
                <p className={summaryCard.value}>{stats.database.size}</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Users className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Active Users (30d)</p>
                <p className={summaryCard.value}>{stats.users.active30d}</p>
                <p className={summaryCard.description}>
                  Total: {stats.users.total} | Active: {stats.users.active}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Target className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Accounts</p>
                <p className={summaryCard.value}>{stats.accounts.total}</p>
                <p className={summaryCard.description}>
                  Users with accounts: {stats.accounts.usersWithAccounts}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Usage */}
        <div className={gridLayouts.twoColumn}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Campaign Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={standardSpacing.card}>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Total Campaigns</span>
                  <span className="text-lg font-semibold text-foreground">{stats.campaigns.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Accounts with Campaigns</span>
                  <span className="text-lg font-semibold text-foreground">{stats.campaigns.accountsWithCampaigns}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className={componentSizes.cardIcon} />
                Automation Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={standardSpacing.card}>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Total Rules</span>
                  <span className="text-lg font-semibold text-foreground">{stats.rules.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Active Rules</span>
                  <span className="text-lg font-semibold text-foreground">{stats.rules.active}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className={componentSizes.cardIcon} />
              Resource Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>CPU Usage</span>
                  <span className={`${typography.label} text-foreground`}>0%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>Memory Usage</span>
                  <span className={`${typography.label} text-foreground`}>0%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={typography.muted}>Storage Usage</span>
                  <span className={`${typography.label} text-foreground`}>{stats.database.size}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
