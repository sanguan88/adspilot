"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface Condition {
  id: string
  metric: string
  operator: string
  value: string
  timeframe: string
}

interface ConditionGroup {
  id: string
  operator: "AND" | "OR"
  conditions: Condition[]
}

interface ConditionBuilderProps {
  conditions: ConditionGroup[]
  onChange: (conditions: ConditionGroup[]) => void
}

const metrics = [
  { value: "spend", label: "Spend", unit: "$" },
  { value: "ctr", label: "CTR (Outbound clicks)", unit: "%" },
  { value: "hook_rate", label: "Hook rate", unit: "%" },
  { value: "hold_rate", label: "Hold rate", unit: "%" },
  { value: "conversion_rate", label: "Conversion rate", unit: "%" },
  { value: "cpc", label: "Cost per click", unit: "$" },
  { value: "cpm", label: "Cost per 1000 impressions", unit: "$" },
  { value: "impressions", label: "Impressions", unit: "" },
  { value: "clicks", label: "Clicks", unit: "" },
  { value: "conversions", label: "Conversions", unit: "" },
]

const operators = [
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: "=", label: "=" },
  { value: "!=", label: "!=" },
]

const timeframes = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 days (incl. today)" },
  { value: "last_14_days", label: "Last 14 days (incl. today)" },
  { value: "last_30_days", label: "Last 30 days (incl. today)" },
  { value: "lifetime", label: "Lifetime" },
]

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = (groupId: string) => {
    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      metric: "spend",
      operator: ">",
      value: "0",
      timeframe: "last_7_days",
    }

    const updatedConditions = conditions.map((group) =>
      group.id === groupId ? { ...group, conditions: [...group.conditions, newCondition] } : group,
    )

    onChange(updatedConditions)
  }

  const removeCondition = (groupId: string, conditionId: string) => {
    const updatedConditions = conditions.map((group) =>
      group.id === groupId ? { ...group, conditions: group.conditions.filter((c) => c.id !== conditionId) } : group,
    )

    onChange(updatedConditions)
  }

  const updateCondition = (groupId: string, conditionId: string, field: keyof Condition, value: string) => {
    const updatedConditions = conditions.map((group) =>
      group.id === groupId
        ? {
            ...group,
            conditions: group.conditions.map((c) => (c.id === conditionId ? { ...c, [field]: value } : c)),
          }
        : group,
    )

    onChange(updatedConditions)
  }

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group_${Date.now()}`,
      operator: "AND",
      conditions: [
        {
          id: `condition_${Date.now()}`,
          metric: "spend",
          operator: ">",
          value: "0",
          timeframe: "last_7_days",
        },
      ],
    }

    onChange([...conditions, newGroup])
  }

  const removeConditionGroup = (groupId: string) => {
    onChange(conditions.filter((group) => group.id !== groupId))
  }

  const updateGroupOperator = (groupId: string, operator: "AND" | "OR") => {
    const updatedConditions = conditions.map((group) => (group.id === groupId ? { ...group, operator } : group))

    onChange(updatedConditions)
  }

  const getMetricUnit = (metricValue: string) => {
    const metric = metrics.find((m) => m.value === metricValue)
    return metric?.unit || ""
  }

  return (
    <div className="space-y-4">
      {conditions.map((group, groupIndex) => (
        <Card key={group.id} className="p-4">
          <div className="space-y-4">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Condition Group {groupIndex + 1}</span>
                {conditions.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeConditionGroup(group.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {group.conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Operator:</span>
                  <Select
                    value={group.operator}
                    onValueChange={(value: "AND" | "OR") => updateGroupOperator(group.id, value)}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              {group.conditions.map((condition, conditionIndex) => (
                <div key={condition.id} className="flex items-center gap-3">
                  {/* Logic Operator Indicator */}
                  <div className="flex flex-col items-center">
                    {conditionIndex > 0 && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs px-2 py-1 mb-2",
                          group.operator === "AND" ? "bg-primary/10 text-primary" : "bg-success/10 text-success",
                        )}
                      >
                        {group.operator}
                      </Badge>
                    )}
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>

                  {/* Condition Configuration */}
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    {/* Metric */}
                    <Select
                      value={condition.metric}
                      onValueChange={(value) => updateCondition(group.id, condition.id, "metric", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {metrics.map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Timeframe */}
                    <Select
                      value={condition.timeframe}
                      onValueChange={(value) => updateCondition(group.id, condition.id, "timeframe", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframes.map((timeframe) => (
                          <SelectItem key={timeframe.value} value={timeframe.value}>
                            {timeframe.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator */}
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(group.id, condition.id, "operator", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((operator) => (
                          <SelectItem key={operator.value} value={operator.value}>
                            {operator.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value */}
                    <div className="relative">
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(group.id, condition.id, "value", e.target.value)}
                        placeholder="0"
                      />
                      {getMetricUnit(condition.metric) && (
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600">
                          {getMetricUnit(condition.metric)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove Condition */}
                  {group.conditions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(group.id, condition.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Condition Button */}
            <Button variant="ghost" size="sm" onClick={() => addCondition(group.id)} className="text-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Condition
            </Button>
          </div>
        </Card>
      ))}

      {/* Add Group Button */}
      <Button variant="ghost" size="sm" onClick={addConditionGroup} className="text-primary">
        <Plus className="w-4 h-4 mr-2" />
        Add Group
      </Button>

      {/* Condition Summary */}
      {conditions.length > 0 && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">Condition Summary</h4>
          <div className="text-sm text-gray-700 space-y-1">
            {conditions.map((group, groupIndex) => (
              <div key={group.id}>
                {groupIndex > 0 && <span className="font-medium text-primary">OR</span>}
                <div className="ml-4">
                  {group.conditions.map((condition, conditionIndex) => {
                    const metric = metrics.find((m) => m.value === condition.metric)
                    const timeframe = timeframes.find((t) => t.value === condition.timeframe)
                    return (
                      <div key={condition.id} className="flex items-center gap-2">
                        {conditionIndex > 0 && (
                          <span
                            className={cn("font-medium", group.operator === "AND" ? "text-primary" : "text-success")}
                          >
                            {group.operator}
                          </span>
                        )}
                        <span>
                          {metric?.label} ({timeframe?.label}) {condition.operator} {condition.value}
                          {getMetricUnit(condition.metric)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
