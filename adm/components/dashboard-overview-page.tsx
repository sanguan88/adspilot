"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Users,
  CreditCard,
  Handshake,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  Target,
  ShoppingCart,
  Key,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import Link from "next/link"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard } from "@/lib/design-tokens"

interface DashboardStats {
  todayRevenue: number
  totalRevenue: number
  totalUsers: number
  activeUsers: number
  activeUsers30d: number
  newUsers30d: number
  activeSubscriptions: number
  monthlyRevenue: number
  totalAffiliates: number
  conversionRate: number
  totalAccounts: number
  usersWithAccounts: number
  totalCampaigns: number
  accountsWithCampaigns: number
  totalOrders: number
  pendingOrders: number
  paidOrders: number
  totalLicenses: number
  activeLicenses: number
  expiredLicenses: number
  totalPlans: number
  activePlans: number
}

export function DashboardOverviewPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    totalRevenue: 0,
    totalUsers: 0,
    activeUsers: 0,
    activeUsers30d: 0,
    newUsers30d: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalAffiliates: 0,
    conversionRate: 0,
    totalAccounts: 0,
    usersWithAccounts: 0,
    totalCampaigns: 0,
    accountsWithCampaigns: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    totalLicenses: 0,
    activeLicenses: 0,
    expiredLicenses: 0,
    totalPlans: 0,
    activePlans: 0,
  })

  useEffect(() => {
    fetchDashboardStats()
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchDashboardStats, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch("/api/dashboard/stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      } else {
        toast.error("Gagal memuat dashboard stats")
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-4">
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border rounded-sm p-3 shadow-sm min-h-[100px]">
                <Skeleton className="h-3 w-3 mb-2" />
                <Skeleton className="h-3 w-16 mb-1" />
                <Skeleton className="h-5 w-12 mb-1" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={pageLayout.container}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={pageLayout.headerTitle}>Dashboard</h1>
            <p className={pageLayout.headerDescription}>
              Overview aplikasi SaaS AdsBot
            </p>
          </div>
        </div>

        {/* Key Metrics Cards - 2 rows × 4 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Users className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Users</p>
                <p className={summaryCard.value}>
                  {stats.totalUsers.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  Active: {stats.activeUsers}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <CreditCard className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Subscriptions</p>
                <p className={summaryCard.value}>
                  {stats.activeSubscriptions.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  MRR: Rp{(stats.monthlyRevenue / 1000000).toFixed(1)}M
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <ShoppingCart className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Orders</p>
                <p className={summaryCard.value}>
                  {stats.totalOrders.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  Paid: {stats.paidOrders}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <DollarSign className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Today's Revenue</p>
                <p className={summaryCard.value}>
                  Rp{stats.todayRevenue.toLocaleString('id-ID')}
                </p>
                <p className={summaryCard.description}>All time: Rp{(stats.totalRevenue / 1000000).toFixed(1)}M</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Key className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Licenses</p>
                <p className={summaryCard.value}>
                  {stats.totalLicenses.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  Active: {stats.activeLicenses}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <FileText className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Plans</p>
                <p className={summaryCard.value}>
                  {stats.totalPlans.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  Active: {stats.activePlans}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Handshake className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Affiliates</p>
                <p className={summaryCard.value}>
                  {stats.totalAffiliates.toLocaleString()}
                </p>
                <p className={summaryCard.description}>Active</p>
              </div>
            </CardContent>
          </Card>

          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <Target className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Campaigns</p>
                <p className={summaryCard.value}>
                  {stats.totalCampaigns.toLocaleString()}
                </p>
                <p className={summaryCard.description}>
                  Accounts: {stats.accountsWithCampaigns}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats - Compact Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="!py-0">
            <CardHeader className="!pb-2 !px-4 !pt-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className={componentSizes.cardIcon} />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="!px-4 !pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Conversion</span>
                  <span className={`${typography.label} text-foreground`}>{stats.conversionRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Active (30d)</span>
                  <span className={`${typography.label} text-foreground`}>{stats.activeUsers30d}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>New (30d)</span>
                  <span className={`${typography.label} text-foreground`}>{stats.newUsers30d}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Accounts</span>
                  <span className={`${typography.label} text-foreground`}>{stats.totalAccounts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="!py-0">
            <CardHeader className="!pb-2 !px-4 !pt-3">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className={componentSizes.cardIcon} />
                Orders Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="!px-4 !pb-3">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Total</span>
                  <span className={`${typography.label} text-foreground`}>{stats.totalOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Pending</span>
                  <span className={`${typography.label} text-foreground flex items-center gap-1`}>
                    <Clock className="w-4 h-4 text-warning" />
                    {stats.pendingOrders}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={typography.muted}>Paid</span>
                  <span className={`${typography.label} text-foreground flex items-center gap-1`}>
                    <CheckCircle className="w-4 h-4 text-success" />
                    {stats.paidOrders}
                  </span>
                </div>
                <Link href="/orders">
                  <Button variant="ghost" size="sm" className="w-full mt-1.5 text-xs h-7">
                    View All →
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="!py-0">
            <CardHeader className="!pb-2 !px-4 !pt-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className={componentSizes.cardIcon} />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="!px-4 !pb-3">
              <RecentActivity />
            </CardContent>
          </Card>
        </div>

        {/* Quick Links - Compact */}
        <Card className="!py-0">
          <CardHeader className="!pb-2 !px-4 !pt-3">
            <CardTitle className="flex items-center gap-2">
              <Target className={componentSizes.cardIcon} />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="!px-4 !pb-3">
            <div className="grid grid-cols-5 gap-2">
              <Link href="/users">
                <Button variant="outline" size="sm" className="w-full h-8">
                  <Users className="w-4 h-4" />
                  Users
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="outline" size="sm" className="w-full h-8">
                  <ShoppingCart className="w-4 h-4" />
                  Orders
                </Button>
              </Link>
              <Link href="/subscriptions">
                <Button variant="outline" size="sm" className="w-full h-8">
                  <CreditCard className="w-4 h-4" />
                  Subscriptions
                </Button>
              </Link>
              <Link href="/licenses">
                <Button variant="outline" size="sm" className="w-full h-8">
                  <Key className="w-4 h-4" />
                  Licenses
                </Button>
              </Link>
              <Link href="/affiliates">
                <Button variant="outline" size="sm" className="w-full h-8">
                  <Handshake className="w-4 h-4" />
                  Affiliates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RecentActivity() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivity()
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchActivity, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivity = async () => {
    try {
      const response = await authenticatedFetch("/api/dashboard/activity?limit=5")
      const data = await response.json()

      if (data.success) {
        setActivities(data.data)
      }
    } catch (error) {
      console.error("Error fetching activity:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`${typography.muted} text-center py-4`}>
        No recent activity
      </div>
    )
  }

  return (
    <div className={standardSpacing.compact}>
      {activities.map((activity, index) => (
        <div key={index} className={`flex items-start ${standardSpacing.gap.sm} ${typography.body}`}>
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${typography.body} truncate`}>{activity.title}</p>
            <p className={`${typography.mutedSmall} truncate`}>{activity.description}</p>
            <p className={`${typography.mutedSmall} mt-0.5`}>
              {new Date(activity.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
      {activities.length === 0 && (
        <p className={`${typography.muted} text-center py-2`}>No recent activity</p>
      )}
      <Link href="/users">
        <Button variant="ghost" size="sm" className="w-full mt-1.5 text-xs h-7">
          View All →
        </Button>
      </Link>
    </div>
  )
}

