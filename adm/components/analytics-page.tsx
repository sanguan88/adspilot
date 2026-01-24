"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, Legend
} from "recharts"
import {
    TrendingUp, Users, CreditCard, DollarSign, Calendar, Download, RefreshCw,
    ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react"
import { format, subDays } from "date-fns"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import {
    pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard
} from "@/lib/design-tokens"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444']

export function AnalyticsPage() {
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState("30")
    const [revenueData, setRevenueData] = useState<any>(null)
    const [userData, setUserData] = useState<any>(null)
    const [subData, setSubData] = useState<any>(null)
    const [affiliateData, setAffiliateData] = useState<any>(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [revRes, userRes, subRes, affRes] = await Promise.all([
                authenticatedFetch(`/api/analytics/revenue?period=${period}`),
                authenticatedFetch(`/api/analytics/users?period=${period}`),
                authenticatedFetch(`/api/analytics/subscriptions`),
                authenticatedFetch(`/api/analytics/affiliates`)
            ])

            const [revJson, userJson, subJson, affJson] = await Promise.all([
                revRes.json(),
                userRes.json(),
                subRes.json(),
                affRes.json()
            ])

            if (revJson.success) setRevenueData(revJson.data)
            if (userJson.success) setUserData(userJson.data)
            if (subJson.success) setSubData(subJson.data)
            if (affJson.success) setAffiliateData(affJson.data)

        } catch (error) {
            console.error("Error fetching analytics:", error)
            toast.error("Failed to load analytics data")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [period])

    const formatIDR = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumSignificantDigits: 3
        }).format(val)
    }

    if (loading && !revenueData) {
        return (
            <div className="p-8 flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className={typography.muted}>Loading real-time analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={pageLayout.container}>
            <div className={pageLayout.content}>
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className={pageLayout.headerTitle}>Advanced Analytics</h1>
                        <p className={pageLayout.headerDescription}>Historical trends & performance insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[160px] h-9">
                                <Calendar className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 Days</SelectItem>
                                <SelectItem value="30">Last 30 Days</SelectItem>
                                <SelectItem value="90">Last 90 Days</SelectItem>
                                <SelectItem value="365">Last 1 Year</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={fetchData} size="icon" className="h-9 w-9">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="default" size="sm" className="h-9">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Top Growth Cards */}
                <div className={gridLayouts.stats}>
                    <MetricCard
                        title="Total Revenue"
                        value={formatIDR(revenueData?.totalRevenue || 0)}
                        growth={revenueData?.growthRate || 0}
                        icon={DollarSign}
                    />
                    <MetricCard
                        title="Monthly Revenue"
                        value={formatIDR(revenueData?.mrr || 0)}
                        growth={12.5}
                        icon={TrendingUp}
                    />
                    <MetricCard
                        title="New Users"
                        value={userData?.newUsers || 0}
                        growth={userData?.growthRate || 0}
                        icon={Users}
                    />
                    <MetricCard
                        title="Churn Rate"
                        value={`${userData?.churnRate || 0}%`}
                        growth={-2.1}
                        icon={ArrowDownRight}
                        inverseTrend
                    />
                </div>

                {/* Charts Section 1: Revenue & Growth */}
                <div className={gridLayouts.twoColumn}>
                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className={typography.label}>Revenue Trend</CardTitle>
                            <CardDescription className={typography.mutedSmall}>Daily successful transactions</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-4">
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData?.dailyTrend || []}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `Rp${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                            labelFormatter={(label) => format(new Date(label), 'd MMM yyyy')}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/50">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className={typography.label}>User Acquisition</CardTitle>
                            <CardDescription className={typography.mutedSmall}>New signups per day</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-4">
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={userData?.dailyGrowth || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        />
                                        <Bar
                                            dataKey="newUsers"
                                            fill="#3b82f6"
                                            radius={[4, 4, 0, 0]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section 2: Distribution & Affiliates */}
                <div className={gridLayouts.threeColumn}>
                    <Card className="lg:col-span-1 shadow-sm border-border/50">
                        <CardHeader className="p-4">
                            <CardTitle className={typography.label}>Subscription Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={subData?.distribution || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {subData?.distribution?.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 shadow-sm border-border/50">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className={typography.label}>Affiliate Performance Trend</CardTitle>
                            <CardDescription className={typography.mutedSmall}>Payouts over the last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 pt-4">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={affiliateData?.trend || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(str) => format(new Date(str), 'd MMM')}
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#888' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="amount"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: '#8b5cf6' }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Section 3: Revenue by Plan */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="p-4">
                        <CardTitle className={typography.label}>Revenue Breakdown & Top Affiliates</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <p className={typography.mutedSmall + " mb-2"}>Revenue contribution per plan</p>
                                {revenueData?.revenueByPlan?.map((plan: any, index: number) => (
                                    <div key={plan.planName} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-medium">{plan.planName}</span>
                                            <span className={typography.mutedSmall}>{formatIDR(plan.revenue)}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{
                                                    width: `${(plan.revenue / (revenueData.totalRevenue || 1)) * 100}%`,
                                                    backgroundColor: COLORS[index % COLORS.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {(!revenueData?.revenueByPlan || revenueData.revenueByPlan.length === 0) && (
                                    <div className="text-center py-4 text-muted-foreground text-xs">
                                        No data available
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50/50 rounded-lg p-4">
                                <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3 text-primary" />
                                    Top Affiliates
                                </h4>
                                <div className="space-y-3">
                                    {affiliateData?.topPerformers?.slice(0, 3).map((aff: any, idx: number) => (
                                        <div key={aff.code} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium">{aff.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{aff.code}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold">{formatIDR(aff.earned)}</p>
                                                <p className="text-[10px] text-emerald-600">{aff.conversions} conv.</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!affiliateData?.topPerformers || affiliateData.topPerformers.length === 0) && (
                                        <p className="text-center text-muted-foreground text-[10px] py-2">No top performers yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function MetricCard({ title, value, growth, icon: Icon, inverseTrend = false }: any) {
    const isPositive = growth > 0
    const trendColor = inverseTrend
        ? (isPositive ? 'text-rose-600' : 'text-emerald-600')
        : (isPositive ? 'text-emerald-600' : 'text-rose-600')

    return (
        <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
                <div className={summaryCard.layoutVertical}>
                    <div className="flex items-center justify-between">
                        <Icon className={summaryCard.iconTop} />
                        <div className={`flex items-center text-[10px] font-bold ${trendColor}`}>
                            {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> : <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />}
                            {Math.abs(growth)}%
                        </div>
                    </div>
                    <p className={summaryCard.label}>{title}</p>
                    <h3 className={summaryCard.value + " text-xl"}>{value}</h3>
                </div>
            </CardContent>
        </Card>
    )
}
