"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Plus, Search, Filter } from "lucide-react"
import { RulesTable } from "./rules-table"
import { MultiStepRuleModal } from "./multi-step-rule-modal"
import { toast } from "sonner"

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

export function RulesManagement() {
  const [rules, setRules] = useState<Rule[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Fetch rules from API
  const fetchRules = async () => {
    try {
      const response = await authenticatedFetch('/api/automation-rules')
      
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()
      
      if (result.success) {
        setRules(result.data)
      } else {
        console.error('Error fetching rules:', result.error)
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    }
  }

  // Load rules on component mount
  useEffect(() => {
    fetchRules()
  }, [])

  const handleCreateRule = async (ruleData: any) => {
    try {
      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      const result = await response.json()

      if (result.success) {
        // Refresh rules list
        await fetchRules()
        setShowCreateModal(false)
        toast.success("Rule created successfully!")
      } else {
        toast.error(result.error || "Failed to create rule")
      }
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error("Failed to create rule")
    }
  }

  const handleEditRule = (rule: Rule) => {
    setEditingRule(rule)
    setShowEditModal(true)
  }

  const handleUpdateRule = async (ruleData: any) => {
    try {
      const response = await authenticatedFetch(`/api/automation-rules/${ruleData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      const result = await response.json()

      if (result.success) {
        await fetchRules()
        setShowEditModal(false)
        setEditingRule(null)
        toast.success("Rule updated successfully!")
      } else {
        toast.error(result.error || "Failed to update rule")
      }
    } catch (error) {
      console.error('Error updating rule:', error)
      toast.error("Failed to update rule")
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      try {
        const response = await authenticatedFetch(`/api/automation-rules/${ruleId}`, {
          method: 'DELETE',
        })

        const result = await response.json()

        if (result.success) {
          await fetchRules()
          toast.success("Rule deleted successfully!")
        } else {
          toast.error(result.error || "Failed to delete rule")
        }
      } catch (error) {
        console.error('Error deleting rule:', error)
        toast.error("Failed to delete rule")
      }
    }
  }

  const handleDuplicateRule = async (rule: Rule) => {
    try {
      const duplicatedRuleData = {
        ...rule,
        name: `${rule.name} (Copy)`,
        status: "inactive"
      }

      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedRuleData),
      })

      const result = await response.json()

      if (result.success) {
        await fetchRules()
        toast.success("Rule duplicated successfully!")
      } else {
        toast.error(result.error || "Failed to duplicate rule")
      }
    } catch (error) {
      console.error('Error duplicating rule:', error)
      toast.error("Failed to duplicate rule")
    }
  }

  const handleToggleStatus = async (ruleId: string) => {
    try {
      const rule = rules.find(r => r.id === ruleId)
      if (!rule) return

      const newStatus = rule.status === "active" ? "inactive" : "active"

      const response = await fetch(`/api/automation-rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (result.success) {
        await fetchRules()
        toast.success("Rule status updated!")
      } else {
        toast.error(result.error || "Failed to update rule status")
      }
    } catch (error) {
      console.error('Error updating rule status:', error)
      toast.error("Failed to update rule status")
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || rule.status === statusFilter
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rules Management</h1>
          <p className="text-gray-600">Manage your automation rules</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Filter and Table Container */}
      <Card className="!p-0">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-6 pb-0">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Performance">Performance</SelectItem>
                <SelectItem value="Scaling">Scaling</SelectItem>
                <SelectItem value="Scheduling">Scheduling</SelectItem>
                <SelectItem value="Budget Management">Budget Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rules Table */}
        <div className="p-6 pt-0">
          <RulesTable
            rules={filteredRules}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onDuplicateRule={handleDuplicateRule}
            onToggleStatus={handleToggleStatus}
          />
        </div>
      </Card>

      {/* Create Rule Modal */}
      <MultiStepRuleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateRule}
        isEditMode={false}
      />

      {/* Edit Rule Modal */}
      {showEditModal && editingRule && (
        <MultiStepRuleModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingRule(null)
          }}
          onSave={handleUpdateRule}
          initialData={editingRule}
          isEditMode={true}
        />
      )}
    </div>
  )
}
