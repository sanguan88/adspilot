"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  MousePointer,
  ShoppingCart,
  RefreshCw,
} from "lucide-react"

interface AccountMetrics {
  accountName: string
  status: "active" | "paused" | "error"
  spend: number
  budget: number
  impressions: number
  clicks: number
  pesanan: number
  conversions: number // Untuk kompatibilitas
  roas: number
  activeCampaigns: number
  activeRules: number
}

export function GeneralOverviewPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("1d")
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [accounts, setAccounts] = useState<AccountMetrics[]>([])
  const [usernames, setUsernames] = useState<string[]>([]) // Untuk dropdown
  const [loading, setLoading] = useState(true)
  const [totalMetrics, setTotalMetrics] = useState({
    spend: 0,
    budget: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    pesanan: 0,
    campaigns: 0,
    rules: 0,
  })
  const [avgPesanan, setAvgPesanan] = useState(0) // Menggantikan avgCTR
  const [avgROAS, setAvgROAS] = useState(0)
  const [avgActiveCampaigns, setAvgActiveCampaigns] = useState(0)
  const [totalSpendWithPPN, setTotalSpendWithPPN] = useState(0)
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  // Fetch overview data
  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        setLoading(true)
        // Kirim parameter account ke API untuk filtering di backend
        const accountParam = selectedAccount !== "all" ? `&account=${encodeURIComponent(selectedAccount)}` : ""
        const response = await authenticatedFetch(`/api/overview?period=${selectedPeriod}${accountParam}`)
        
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          throw new Error('Unauthorized')
        }
        
        const result = await response.json()
        
        if (result.success && result.data) {
          const { accounts: fetchedAccounts, usernames: fetchedUsernames, totals, averages, recentActivities: fetchedActivities } = result.data
          
          // Set usernames untuk dropdown
          setUsernames(fetchedUsernames || [])
          
          // Data sudah difilter di backend, langsung set
          // Jika akun dipilih, accounts berisi data campaign active
          // Jika "All Accounts", accounts berisi data per account
          setAccounts(fetchedAccounts || [])
          setTotalMetrics(totals)
          setAvgPesanan(averages.pesanan || 0) // Menggantikan avgCTR dengan avgPesanan
          setAvgROAS(averages.roas || 0)
          setAvgActiveCampaigns(averages.activeCampaigns || 0)
          setTotalSpendWithPPN(totals.spendWithPPN)
          
          // Set recent activities jika ada
          setRecentActivities(fetchedActivities || [])
        }
      } catch (error) {
        console.error('Error fetching overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOverviewData()
  }, [selectedPeriod, selectedAccount])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20"
      case "paused":
        return "bg-warning/10 text-warning border-warning/20"
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "paused":
        return <Clock className="h-4 w-4 text-warning" />
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 space-y-8 min-h-full">
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="text-gray-500">Loading overview data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Overview</h1>
            <p className="text-gray-600 text-sm lg:text-base">
              Monitor your Shopee advertising performance across all accounts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-full sm:w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Today</SelectItem>
                <SelectItem value="7d" disabled>Last 7 days</SelectItem>
                <SelectItem value="30d" disabled>Last 30 days</SelectItem>
                <SelectItem value="90d" disabled>Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {usernames.map((username) => (
                  <SelectItem key={username} value={username}>
                    {username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
            <DollarSign className="w-5 h-5 text-primary absolute top-4 right-4" />
            <div className="flex flex-col items-start gap-2">
              <p className="text-primary text-xs font-medium">Total Spend (+PPN 11%)</p>
              <p className="text-3xl font-bold text-gray-900">
                    Rp{Math.round(totalSpendWithPPN).toLocaleString()}
                  </p>
                  <div className="flex items-center">
                <TrendingUp className="h-2.5 w-2.5 text-green-600 mr-1" />
                <span className="text-xs text-green-700">+12.5%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
            <Eye className="w-5 h-5 text-primary absolute top-4 right-4" />
            <div className="flex flex-col items-start gap-2">
              <p className="text-primary text-xs font-medium">Impressions</p>
              <p className="text-3xl font-bold text-gray-900">
                    {(totalMetrics.impressions / 1000).toFixed(0)}K
                  </p>
                  <div className="flex items-center">
                <TrendingUp className="h-2.5 w-2.5 text-green-600 mr-1" />
                <span className="text-xs text-green-700">+8.2%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
            <MousePointer className="w-5 h-5 text-primary absolute top-4 right-4" />
            <div className="flex flex-col items-start gap-2">
              <p className="text-primary text-xs font-medium">Views</p>
              <p className="text-3xl font-bold text-gray-900">
                    {totalMetrics.clicks.toLocaleString()}
                  </p>
                  <div className="flex items-center">
                <TrendingDown className="h-2.5 w-2.5 text-red-600 mr-1" />
                <span className="text-xs text-red-700">-2.1%</span>
              </div>
                  </div>
                </div>

          <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
            <ShoppingCart className="w-5 h-5 text-primary absolute top-4 right-4" />
            <div className="flex flex-col items-start gap-2">
              <p className="text-primary text-xs font-medium">Conversions</p>
              <p className="text-3xl font-bold text-gray-900">{totalMetrics.conversions.toLocaleString()}</p>
              <div className="flex items-center">
                <TrendingUp className="h-2.5 w-2.5 text-green-600 mr-1" />
                <span className="text-xs text-green-700">+15.3%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-primary font-medium">PESANAN</p>
                    <p className="text-3xl font-bold text-gray-900">{Math.round(avgPesanan).toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-primary font-medium">Average ROAS</p>
                    <p className="text-3xl font-bold text-gray-900">{avgROAS.toFixed(1)}</p>
                  </div>
                </div>
                <div className="p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-primary font-medium">Active Campaigns</p>
                    <p className="text-3xl font-bold text-gray-900">{Math.round(avgActiveCampaigns)}</p>
                  </div>
                </div>
                <div className="p-6 bg-white border rounded-sm shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-xs text-primary font-medium">Active Rules</p>
                    <p className="text-3xl font-bold text-gray-900">{totalMetrics.rules}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Target className="h-4 w-4 lg:h-5 lg:w-5" />
                Budget Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Spend vs Budget</span>
                    <span>{((totalMetrics.spend / totalMetrics.budget) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full"
                      style={{ width: `${Math.min((totalMetrics.spend / totalMetrics.budget) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="text-center pt-2">
                  <p className="text-lg lg:text-xl font-semibold text-gray-900">
                    Rp{(totalMetrics.budget - totalMetrics.spend).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600">Remaining Budget</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Status / Active Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Users className="h-4 w-4 lg:h-5 lg:w-5" />
              {selectedAccount !== "all" ? "Active Campaigns" : "Account Status"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {accounts.length > 0 ? (
                accounts.map((account, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(account.status)}
                        <span className="font-medium text-gray-900 text-sm">{account.accountName}</span>
                        <Badge className={getStatusColor(account.status)}>{account.status}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:flex sm:items-center sm:space-x-4 gap-2 text-xs">
                      <div className="text-center sm:text-right">
                        <p className="font-medium text-gray-900">Rp{account.spend.toLocaleString()}</p>
                        <p className="text-gray-600">Spend</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="font-medium text-gray-900">{(account.pesanan || 0).toLocaleString()}</p>
                        <p className="text-gray-600">Pesanan</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="font-medium text-gray-900">{account.roas.toFixed(1)}x</p>
                        <p className="text-gray-600">ROAS</p>
                      </div>
                      {selectedAccount === "all" && (
                        <>
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">{account.activeCampaigns}</p>
                            <p className="text-gray-600">Campaigns</p>
                          </div>
                          <div className="text-center sm:text-right">
                            <p className="font-medium text-gray-900">{account.activeRules}</p>
                            <p className="text-gray-600">Rules</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedAccount !== "all" ? "No active campaigns found" : "No accounts found"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
              <Zap className="h-4 w-4 lg:h-5 lg:w-5" />
              Recent Automation Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === "success"
                          ? "bg-success"
                          : activity.status === "warning"
                            ? "bg-warning"
                            : activity.status === "info"
                              ? "bg-primary"
                              : "bg-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-600">{activity.campaign}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 sm:ml-auto">{activity.time}</span>
                </div>
              ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent automation activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
