"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Copy, Trash2, Settings } from "lucide-react"
import { MultiStepRuleModal } from "./multi-step-rule-modal"

interface Rule {
  id: string
  name: string
  description: string
  category: string
  priority: string
  status: "active" | "inactive" | "paused"
  conditions: number
  actions: string[]
  timeSchedule: string
  lastCheck: string
  nextCheck: string
  errorCount: number
  assignment: {
    accounts: number
    ads: number
  }
  createdAt: string
  updatedAt: string
}

interface RulesTableProps {
  rules: Rule[]
  onEditRule: (rule: Rule) => void
  onDeleteRule: (ruleId: string) => void
  onDuplicateRule: (rule: Rule) => void
  onToggleStatus: (ruleId: string) => void
}

export function RulesTable({ rules, onEditRule, onDeleteRule, onDuplicateRule, onToggleStatus }: RulesTableProps) {
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setShowEditModal(true)
  }

  const handleSaveRule = (ruleData: any) => {
    // Handle save rule logic here
    console.log("Saving rule:", ruleData)
    setShowEditModal(false)
    setEditingRule(null)
  }

  const handleDuplicateRule = (rule: Rule) => {
    const duplicatedRule = {
      ...rule,
      id: Date.now().toString(),
      name: `${rule.name} (Copy)`,
      status: "inactive" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    onDuplicateRule(duplicatedRule)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20"
      case "inactive":
        return "bg-gray-100 text-gray-800 border-gray-200"
      case "paused":
        return "bg-warning/10 text-warning border-warning/20"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "medium":
        return "bg-warning/10 text-warning border-warning/20"
      case "low":
        return "bg-success/10 text-success border-success/20"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <Checkbox disabled />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NAMA RULE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RULE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KATEGORI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TIME SCHEDULE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  LAST CHECK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NEXT CHECK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ERROR COUNT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ASSIGNMENT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Checkbox />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      checked={rule.status === "active"}
                      onCheckedChange={() => onToggleStatus(rule.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                      <div className="text-sm text-gray-500">{rule.conditions} kondisi</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div>Kondisi: {rule.conditions} kondisi</div>
                      <div>Aksi: {rule.actions.join(", ")}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-900">{rule.category}</span>
                      <Badge className={`w-fit ${getPriorityColor(rule.priority)}`}>
                        {rule.priority}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{rule.timeSchedule}</div>
                      <div className="text-gray-500">Real-time monitoring</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.lastCheck}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.nextCheck}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{Number(rule.errorCount || 0).toLocaleString()}</span>
                      {rule.errorCount > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {rule.assignment.accounts} Akun
                      </Badge>
                      <Badge className="bg-secondary/10 text-secondary border-secondary/20">
                        {rule.assignment.ads} Iklan
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRule(rule)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Assignment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplikat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditRule(rule)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Rule
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDeleteRule(rule.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Rule
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Rule Modal */}
      {showEditModal && editingRule && (
        <MultiStepRuleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRule(null)
          }}
          onSave={handleSaveRule}
          initialData={editingRule}
        />
      )}
    </>
  )
}
