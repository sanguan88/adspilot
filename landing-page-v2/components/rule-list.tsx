"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Play, Pause, MoreHorizontal, Edit, Copy, Trash2, BarChart3, Clock, Target } from "lucide-react"

interface Rule {
  id: string
  name: string
  status: "active" | "paused" | "draft"
  category: string
  conditions: number
  actions: number
  lastTriggered: string | null
  performance: {
    triggered: number
    successful: number
    failed: number
  }
  metrics: {
    spend: number
    ctr: number
    conversions: number
  }
}

const sampleRules: Rule[] = [
  {
    id: "1",
    name: "High Spend Pause Rule",
    status: "active",
    category: "Account Management",
    conditions: 2,
    actions: 1,
    lastTriggered: "2 hours ago",
    performance: { triggered: 15, successful: 14, failed: 1 },
    metrics: { spend: 1250, ctr: 3.2, conversions: 45 },
  },
  {
    id: "2",
    name: "Low CTR Optimization",
    status: "active",
    category: "Bottom Of Funnel",
    conditions: 3,
    actions: 2,
    lastTriggered: "1 day ago",
    performance: { triggered: 8, successful: 8, failed: 0 },
    metrics: { spend: 890, ctr: 2.1, conversions: 23 },
  },
  {
    id: "3",
    name: "Budget Scale Up",
    status: "paused",
    category: "Top Of Funnel",
    conditions: 4,
    actions: 1,
    lastTriggered: null,
    performance: { triggered: 0, successful: 0, failed: 0 },
    metrics: { spend: 0, ctr: 0, conversions: 0 },
  },
]

interface RuleListProps {
  categoryId?: string
  categoryName?: string
}

export function RuleList({ categoryId, categoryName }: RuleListProps) {
  const [rules, setRules] = useState<Rule[]>(sampleRules)

  const toggleRuleStatus = (ruleId: string) => {
    setRules(
      rules.map((rule) =>
        rule.id === ruleId ? { ...rule, status: rule.status === "active" ? "paused" : "active" } : rule,
      ),
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success"
      case "paused":
        return "bg-warning/10 text-warning"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {categoryName ? `${categoryName} Rules` : "All Rules"}
          </h2>
          <p className="text-sm text-gray-500">{rules.length} automation rules configured</p>
        </div>
        <Button>Create New Rule</Button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* Rule Status Toggle */}
                <div className="flex items-center gap-2">
                  <Switch checked={rule.status === "active"} onCheckedChange={() => toggleRuleStatus(rule.id)} />
                  {rule.status === "active" ? (
                    <Play className="w-4 h-4 text-success" />
                  ) : (
                    <Pause className="w-4 h-4 text-warning" />
                  )}
                </div>

                {/* Rule Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{rule.name}</h3>
                    <Badge variant="secondary" className={getStatusColor(rule.status)}>
                      {rule.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {rule.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {rule.conditions} conditions
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      {rule.actions} actions
                    </span>
                    {rule.lastTriggered && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last triggered {rule.lastTriggered}
                      </span>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">Rp{rule.metrics.spend}</div>
                    <div className="text-gray-500">Spend</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{rule.metrics.ctr}%</div>
                    <div className="text-gray-500">CTR</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{rule.metrics.conversions}</div>
                    <div className="text-gray-500">Conv.</div>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="hidden lg:flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-success/10 text-success rounded">
                    {rule.performance.successful} success
                  </span>
                  {rule.performance.failed > 0 && (
                    <span className="px-2 py-1 bg-destructive/10 text-destructive rounded">{rule.performance.failed} failed</span>
                  )}
                </div>
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Rule
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Rule
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Rule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {rules.length === 0 && (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Target className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="font-medium text-gray-900 mb-2">No rules configured</h3>
          <p className="text-gray-500 mb-4">Create your first automation rule to start optimizing your Shopee ads.</p>
          <Button>Create Your First Rule</Button>
        </Card>
      )}
    </div>
  )
}
