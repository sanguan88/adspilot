"use client"

import type React from "react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Activity, Zap, AlertTriangle, CheckCircle } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  trend?: "up" | "down" | "neutral"
  icon: React.ReactNode
  color?: string
}

function MetricCard({ title, value, change, trend, icon, color = "blue" }: MetricCardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-600"
    if (trend === "down") return "text-red-600"
    return "text-gray-600"
  }

  const getTrendIcon = () => {
    if (trend === "up") return <TrendingUp className="w-3 h-3" />
    if (trend === "down") return <TrendingDown className="w-3 h-3" />
    return null
  }

  return (
    <Card className="p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 bg-${color}-100 rounded-lg flex items-center justify-center`}>{icon}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-primary font-medium">{title}</p>
      </div>
    </Card>
  )
}

export function RuleMetricsDashboard() {
  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Rules"
          value={24}
          change={12}
          trend="up"
          icon={<Zap className="w-4 h-4 text-blue-600" />}
          color="blue"
        />
        <MetricCard
          title="Rules Triggered Today"
          value={156}
          change={8}
          trend="up"
          icon={<Activity className="w-4 h-4 text-green-600" />}
          color="green"
        />
        <MetricCard
          title="Successful Actions"
          value="98.2%"
          change={2.1}
          trend="up"
          icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
          color="emerald"
        />
        <MetricCard
          title="Failed Actions"
          value={3}
          change={-15}
          trend="down"
          icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
          color="red"
        />
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Rule Activity</h3>
        <div className="space-y-4">
          {[
            {
              rule: "High Spend Pause Rule",
              action: "Paused campaign 'Summer Sale 2024'",
              time: "2 minutes ago",
              status: "success",
              impact: "Saved Rp45 in potential overspend",
            },
            {
              rule: "Low CTR Optimization",
              action: "Increased bid for ad set 'Tech Accessories'",
              time: "15 minutes ago",
              status: "success",
              impact: "CTR improved from 2.1% to 2.8%",
            },
            {
              rule: "Budget Scale Up",
              action: "Failed to increase budget - daily limit reached",
              time: "1 hour ago",
              status: "failed",
              impact: "Manual review required",
            },
            {
              rule: "Conversion Optimizer",
              action: "Duplicated high-performing ad",
              time: "2 hours ago",
              status: "success",
              impact: "New ad set created with 150% budget",
            },
          ].map((activity, index) => (
            <div key={index} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div
                className={`w-2 h-2 rounded-full mt-2 ${activity.status === "success" ? "bg-success" : "bg-destructive"}`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{activity.rule}</span>
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-1">{activity.action}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{activity.time}</span>
                  <span className="font-medium">{activity.impact}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Performing Rules</h3>
          <div className="space-y-3">
            {[
              { name: "High Spend Pause Rule", triggers: 45, success: "98%", savings: "Rp1,250" },
              { name: "Low CTR Optimization", triggers: 32, success: "94%", savings: "Rp890" },
              { name: "Conversion Optimizer", triggers: 28, success: "100%", savings: "Rp2,100" },
            ].map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{rule.name}</p>
                  <p className="text-sm text-gray-500">{rule.triggers} triggers this week</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{rule.success} success</p>
                  <p className="text-sm text-gray-500">{rule.savings} saved</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Rule Categories</h3>
          <div className="space-y-3">
            {[
              { category: "Account Management", rules: 12, active: 10, color: "bg-primary" },
              { category: "Bottom Of Funnel", rules: 8, active: 7, color: "bg-success" },
              { category: "Top Of Funnel", rules: 3, active: 2, color: "bg-secondary" },
              { category: "Middle Of Funnel", rules: 5, active: 5, color: "bg-warning" },
            ].map((category, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{category.category}</span>
                    <span className="text-sm text-gray-500">
                      {category.active}/{category.rules} active
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${category.color}`}
                      style={{ width: `${(category.active / category.rules) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
