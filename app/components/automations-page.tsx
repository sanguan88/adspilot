"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Search,
  Plus,
  Copy,
  Zap,
  Edit,
  Trash2,
  Activity,
  Settings,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { MultiStepRuleModal } from "./multi-step-rule-modal"
import { useCookiesHealth } from "@/contexts/CookiesHealthContext"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Play, Pause } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { hasPermission, UserRole } from "@/lib/role-permissions"

interface AutomationRule {
  id: string
  name: string
  status: "active" | "paused" | "error" | "draft"
  category: string
  priority: "high" | "medium" | "low"
  triggers: number
  successRate: number
  lastRun: string
  lastCheck?: string
  lastCheckDate?: string
  lastCheckTime?: string
  nextCheck?: string
  errorCount: number
  successCount?: number
  conditions: number
  actions: string[]
  accounts: string[]
  ruleGroups?: any[]
  actionsDetail?: any[]
  assignments?: {
    accountIds: string[]
    campaignIds: string[]
    totalAccounts: number
    totalCampaigns: number
  }
}

// Data akan di-load dari API (sesuai komitmen fallback)

export function AutomationsPage() {
  const { tokos } = useCookiesHealth()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showMultiStepModal, setShowMultiStepModal] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const { toast } = useToast()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    totalTriggers: 0,
    totalErrorCount: 0,
    avgSuccessRate: 0
  })

  // Get user from auth context
  const { user } = useAuth()
  const userRole = (user?.role || 'user') as UserRole

  // Helper to check permissions
  const canCreate = hasPermission(userRole, 'rules.create')
  const canEdit = hasPermission(userRole, 'rules.edit.own') // Minimal permission to edit own rules
  const canDelete = hasPermission(userRole, 'rules.delete.own') // Minimal permission to delete own rules

  // Load data dari API
  const fetchRules = async () => {
    try {
      setLoading(true)
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
        // Calculate stats from real data
        const total = result.data.length
        const active = result.data.filter((r: AutomationRule) => r.status === "active").length
        const paused = result.data.filter((r: AutomationRule) => r.status === "paused").length
        // Total Pemicu: sum dari kolom triggers (pastikan Number, bukan string concatenation)
        const totalTriggers = result.data.reduce((sum: number, rule: AutomationRule) => {
          const triggers = typeof rule.triggers === 'number' ? rule.triggers : Number(rule.triggers) || 0
          if (isNaN(triggers)) return sum
          return Number(sum) + Number(triggers)
        }, 0)
        // Rule Gagal: sum dari kolom error_count (pastikan Number, bukan string concatenation)
        const totalErrorCount = result.data.reduce((sum: number, rule: AutomationRule) => {
          const errorCount = typeof rule.errorCount === 'number' ? rule.errorCount : Number(rule.errorCount) || 0
          if (isNaN(errorCount)) return sum
          return Number(sum) + Number(errorCount)
        }, 0)
        // Tingkat Keberhasilan Rata-rata: rata-rata dari kolom success_rate (pastikan Number)
        const avgSuccessRate = total > 0 ? (() => {
          const validRules = result.data.filter((rule: AutomationRule) => {
            const successRate = typeof rule.successRate === 'number' ? rule.successRate : Number(rule.successRate)
            return !isNaN(successRate) && successRate >= 0 && successRate <= 100
          })

          if (validRules.length === 0) return 0

          const sum = validRules.reduce((sum: number, rule: AutomationRule) => {
            const successRate = typeof rule.successRate === 'number' ? rule.successRate : Number(rule.successRate) || 0
            return Number(sum) + Number(successRate)
          }, 0)

          return Math.round(sum / validRules.length)
        })() : 0

        setStats({
          total,
          active,
          paused,
          totalTriggers,
          totalErrorCount,
          avgSuccessRate
        })
      } else {
        console.error('Error fetching rules:', result.error)
        toast({
          title: "Error",
          description: result.error || "Gagal memuat data rules",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data rules",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load data saat component mount
  useEffect(() => {
    fetchRules()
  }, [])

  // Function to generate rule summary - just show condition count
  const generateRuleSummary = (rule: AutomationRule) => {
    return `${rule.conditions} kondisi`
  }

  // Function to generate logic tooltip as JSX components
  const generateLogicTooltip = (rule: AutomationRule) => {
    if (!rule.ruleGroups || rule.ruleGroups.length === 0) {
      return <div>Tidak ada kondisi yang ditetapkan</div>
    }

    const metrics = [
      { value: "broad_gmv", label: "GMV" },
      { value: "broad_order", label: "Pesanan" },
      { value: "broad_roi", label: "ROAS" },
      { value: "click", label: "Klik" },
      { value: "cost", label: "Spend" },
      { value: "cpc", label: "CPS" },
      { value: "ctr", label: "CTR" },
      { value: "impression", label: "Impresi" },
      { value: "view", label: "View" },
      { value: "cpm", label: "CPM" },
    ]

    const actionTypes = [
      { value: "add_budget", label: "Tambah Budget" },
      { value: "set_budget", label: "Set Budget" },
      { value: "subtract_budget", label: "Kurangi Budget" },
      { value: "pause_campaign", label: "Pause Iklan" },
      { value: "start_campaign", label: "Start Iklan" },
      { value: "duplicate_campaign", label: "Duplikat Iklan" },
    ]

    const components: JSX.Element[] = []

    // JIKA section
    components.push(<div key="if-title" className="font-bold mb-2 text-gray-900">JIKA</div>)

    rule.ruleGroups.forEach((group: any, groupIndex: number) => {
      if (group.conditions.length === 0) return

      const conditions = group.conditions.map((condition: any) => {
        const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
        let operator = ""

        switch (condition.operator) {
          case "greater_than": operator = "lebih dari"; break
          case "less_than": operator = "kurang dari"; break
          case "greater_equal": operator = "lebih dari atau sama dengan"; break
          case "less_equal": operator = "kurang dari atau sama dengan"; break
          case "equal": operator = "sama dengan"; break
          case "not_equal": operator = "tidak sama dengan"; break
          default: operator = condition.operator
        }

        let value = condition.value
        if (!isNaN(Number(value)) && Number(value) >= 1000) {
          value = `Rp ${Number(value).toLocaleString('id-ID').replace(/,/g, '.')}`
        }

        return { metric, operator, value }
      })

      // Build condition line with colored operators
      const conditionParts: JSX.Element[] = []
      conditions.forEach((condition: any, idx: number) => {
        if (idx > 0) {
          const connector = group.logicalOperator === "AND" ? " DAN " : " ATAU "
          conditionParts.push(
            <Badge key={`conn-${groupIndex}-${idx}`} className={`mx-1 font-bold ${group.logicalOperator === "AND" ? "!bg-success/20 !text-success border-0 rounded-none" : "!bg-warning/20 !text-warning border-0 rounded-none"}`}>
              {connector.trim()}
            </Badge>
          )
        }
        conditionParts.push(<span key={`metric-${groupIndex}-${idx}`} className="text-gray-900">{condition.metric}</span>)
        conditionParts.push(<span key={`op-${groupIndex}-${idx}`} className="text-primary font-bold"> {condition.operator} </span>)
        conditionParts.push(<span key={`val-${groupIndex}-${idx}`} className="text-gray-900 font-bold">{condition.value}</span>)
      })

      // Wrap conditions in parentheses if more than one
      if (conditions.length > 1) {
        components.push(
          <div key={`condition-${groupIndex}`} className="ml-2">
            (<span>{conditionParts}</span>)
          </div>
        )
      } else {
        components.push(
          <div key={`condition-${groupIndex}`} className="ml-2">
            {conditionParts}
          </div>
        )
      }

      // Add connector between groups
      if (rule.ruleGroups && groupIndex < rule.ruleGroups.length - 1) {
        const nextGroup = rule.ruleGroups[groupIndex + 1]
        const groupConnector = nextGroup.type === "AND" ? " DAN " : " ATAU "
        components.push(
          <div key={`group-conn-${groupIndex}`} className="flex items-center my-2 ml-2">
            <Badge className={`px-2 py-0.5 font-bold ${nextGroup.type === "AND" ? "!bg-success/20 !text-success border-0 rounded-none" : "!bg-warning/20 !text-warning border-0 rounded-none"}`}>
              {groupConnector.trim()}
            </Badge>
          </div>
        )
      }
    })

    // Add MAKA section
    components.push(<div key="maka-title" className="font-bold my-4 text-gray-900">MAKA</div>)

    const actionsToDisplay = rule.actionsDetail || rule.actions || []
    if (actionsToDisplay.length === 0) {
      components.push(<div key="no-actions" className="ml-2 text-gray-900">tidak ada aksi yang dikonfigurasi</div>)
    } else {
      actionsToDisplay.forEach((action: any, actionIndex: number) => {
        const actionType = actionTypes.find(at => at.value === action.type)?.label || action.label || action.type || "Aksi Tidak Dikenal"

        switch (action.type) {
          case "add_budget":
          case "reduce_budget":
            // Check if it's percentage or amount
            if (action.adjustmentType === 'percentage' && action.percentage) {
              components.push(
                <div key={`action-${actionIndex}`} className="ml-2 text-gray-900">
                  {actionType} <span className="font-bold">{action.percentage}%</span>
                </div>
              )
            } else if (action.amount) {
              components.push(
                <div key={`action-${actionIndex}`} className="ml-2 text-gray-900">
                  {actionType} <span className="font-bold">Rp {Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}</span>
                </div>
              )
            } else {
              components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            }
            break
          case "set_budget":
            if (action.amount) {
              components.push(
                <div key={`action-${actionIndex}`} className="ml-2 text-gray-900">
                  {actionType} <span className="font-bold">Rp {Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}</span>
                </div>
              )
            } else {
              components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            }
            break
          case "subtract_budget":
            // Check if it's percentage or amount
            if (action.adjustmentType === 'percentage' && action.percentage) {
              components.push(
                <div key={`action-${actionIndex}`} className="ml-2 text-gray-900">
                  {actionType} <span className="font-bold">{action.percentage}%</span>
                </div>
              )
            } else if (action.amount) {
              components.push(
                <div key={`action-${actionIndex}`} className="ml-2 text-gray-900">
                  {actionType} <span className="font-bold">Rp {Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}</span>
                </div>
              )
            } else {
              components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            }
            break
          case "pause_campaign":
            components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            break
          case "start_campaign":
            components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            break
          case "duplicate_campaign":
            components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
            break
          default:
            components.push(<div key={`action-${actionIndex}`} className="ml-2 text-gray-900">{actionType}</div>)
        }
      })
    }

    return <div className="text-sm">{components}</div>
  }

  // Filter rules based on search and category
  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || rule.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Pagination
  const totalPages = Math.ceil(filteredRules.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRules = filteredRules.slice(startIndex, endIndex)

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRules(paginatedRules.map(rule => rule.id))
    } else {
      setSelectedRules([])
    }
  }

  // Handle toggle status
  const handleToggleStatus = async (ruleId: string) => {
    if (togglingStatus === ruleId) return

    try {
      setTogglingStatus(ruleId)
      const rule = rules.find(r => r.id === ruleId)
      if (!rule) return

      const newStatus = rule.status === "active" ? "paused" : "active"

      const response = await authenticatedFetch(`/api/automation-rules/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: 'Failed to parse error response' }))

        // Handle limitasi error (403) dengan informasi detail
        if (response.status === 403 && (errorResult.usage !== undefined || errorResult.limit !== undefined)) {
          const usage = errorResult.usage ?? 0
          const limit = errorResult.limit ?? 0
          const limitText = limit === -1 ? 'Unlimited' : limit.toString()

          const errorDescription = errorResult.error || errorResult.details ||
            `Anda telah mencapai batas maksimal automation rules aktif. Usage: ${usage}/${limitText}. Nonaktifkan rule lain atau upgrade plan.`

          toast({
            title: "Limitasi Automation Rules",
            description: errorDescription,
            className: "!bg-pink-50 !border-red-300 !border-2", // Pink pastel background, red border
            variant: "destructive",
            duration: 8000,
          })
          return
        }

        throw new Error(errorResult.details || errorResult.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Status rule berhasil diubah menjadi ${newStatus === "active" ? "aktif" : "pause"}`,
        })
        await fetchRules()
      } else {
        console.error('Error updating rule status:', result.error)
        console.error('Error details:', result.details)
        toast({
          title: "Error",
          description: result.details || result.error || "Gagal mengubah status rule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating rule status:', error)
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah status rule"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setTogglingStatus(null)
    }
  }

  // Handle duplicate rule
  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      // Create a duplicate with "- Copy" suffix
      const { id, ...duplicatedData } = rule
      const newDuplicatedData = {
        ...duplicatedData,
        name: `${rule.name} - Copy`,
        status: "paused" as const,
      }

      const response = await fetch('/api/automation-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDuplicatedData),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Rule "${duplicatedData.name}" berhasil diduplikasi`,
        })
        await fetchRules()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menduplikasi rule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error duplicating rule:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menduplikasi rule",
        variant: "destructive",
      })
    }
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)


  // Handle delete rule
  const handleDeleteRule = (ruleId: string) => {
    setRuleToDelete(ruleId)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return

    try {
      const response = await authenticatedFetch(`/api/automation-rules/${ruleToDelete}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Rule berhasil dihapus",
        })
        fetchRules() // Refresh list
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal menghapus rule",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus rule",
        variant: "destructive",
      })
    } finally {
      setDeleteConfirmOpen(false)
      setRuleToDelete(null)
    }
  }

  // Handle bulk status change
  const handleBulkStatusChange = async (status: "active" | "paused") => {
    try {
      setLoading(true)
      const promises = selectedRules.map(ruleId =>
        authenticatedFetch(`/api/automation-rules/${ruleId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      )

      await Promise.all(promises)

      toast({
        title: "Berhasil",
        description: `${selectedRules.length} rule berhasil di${status === "active" ? "aktifkan" : "nonaktifkan"}`,
      })

      setSelectedRules([])
      fetchRules()
    } catch (error) {
      console.error('Error in bulk status change:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengubah status rule secara massal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    try {
      setLoading(true)
      const promises = selectedRules.map(ruleId =>
        authenticatedFetch(`/api/automation-rules/${ruleId}`, {
          method: 'DELETE',
        })
      )

      await Promise.all(promises)

      toast({
        title: "Berhasil",
        description: `${selectedRules.length} rule berhasil dihapus`,
      })

      setSelectedRules([])
      fetchRules()
    } catch (error) {
      console.error('Error in bulk delete:', error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus rule secara massal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setBulkDeleteConfirmOpen(false)
    }
  }

  // Handle edit rule
  const handleEditRule = async (rule: AutomationRule) => {
    try {
      setLoading(true)

      // Fetch full rule data from API
      const response = await authenticatedFetch(`/api/automation-rules/${rule.id}`)

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()

      if (result.success) {
        setEditingRule(result.data)
        setShowMultiStepModal(true)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal memuat data rule",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat data rule",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle update rule
  const handleUpdateRule = async (ruleData: any) => {
    if (!editingRule) {
      toast({
        title: "Error",
        description: "Data rule tidak ditemukan untuk diupdate",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)

      // Ensure we have the rule ID
      const ruleId = editingRule.id || editingRule.rule_id
      if (!ruleId) {
        throw new Error("Rule ID tidak ditemukan")
      }

      // Use authenticatedFetch for consistency
      const response = await authenticatedFetch(`/api/automation-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ruleData,
          // Ensure all required fields are included
          name: ruleData.name || editingRule.name,
          category: ruleData.category || editingRule.category,
          priority: ruleData.priority || editingRule.priority || 'medium',
          status: ruleData.status || editingRule.status || 'draft',
        }),
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Rule "${ruleData.name || editingRule.name}" berhasil diperbarui`,
        })

        // Refresh rules list
        await fetchRules()

        // Close modal and reset editing state
        setShowMultiStepModal(false)
        setEditingRule(null)
      } else {
        console.error('Error updating rule:', result.error, result.details)
        toast({
          title: "Error",
          description: result.details || result.error || "Gagal memperbarui rule. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating rule:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui rule",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Handle create rule
  const handleCreateRule = async (ruleData: any) => {
    try {
      setSaving(true)

      // Use authenticatedFetch for consistency
      const response = await authenticatedFetch('/api/automation-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      })

      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: `Rule "${ruleData.name}" berhasil dibuat dan disimpan ke database`,
        })

        // Refresh rules list immediately
        await fetchRules()

        // Close modal and reset editing state
        setShowMultiStepModal(false)
        setEditingRule(null)
      } else {
        console.error('Error creating rule:', result.error, result.details)
        toast({
          title: "Error",
          description: result.details || result.error || "Gagal membuat rule. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating rule:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat membuat rule",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-primary">Automations</h1>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-success">Engine Running</span>
              </div>
            </div>
            <p className="text-gray-700 text-sm lg:text-base">
              Manage automation rules for your Shopee ads
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && selectedRules.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="tertiary"
                    size="default"
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Bulk Actions ({selectedRules.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white shadow-xl border border-gray-100 p-1">
                  <DropdownMenuLabel className="text-xs font-bold text-gray-400 px-2 py-1.5 uppercase tracking-wider">Pilih Aksi</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  <DropdownMenuItem
                    onClick={() => handleBulkStatusChange("active")}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-success hover:bg-success/10 cursor-pointer rounded-md transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Aktifkan Terpilih
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkStatusChange("paused")}
                    className="flex items-center gap-2 px-2 py-2 text-sm text-warning hover:bg-warning/10 cursor-pointer rounded-md transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Terpilih
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => setBulkDeleteConfirmOpen(true)}
                      className="flex items-center gap-2 px-2 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer rounded-md transition-colors font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Terpilih
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="tertiary"
              size="default"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            {canCreate && (
              <Button
                onClick={() => {
                  setEditingRule(null) // Ensure editingRule is null for create mode
                  setShowMultiStepModal(true)
                }}
                className="bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Rule
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6 max-w-full">
          {/* Quick Stats */}
          <div className="flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6">
              {[
                { label: 'Rule Aktif', value: stats.active, icon: Zap },
                { label: 'Total Pemicu', value: Number(stats.totalTriggers || 0).toLocaleString(), icon: Activity },
                { label: 'Tingkat Keberhasilan Rata-rata', value: `${Math.round(Number(stats.avgSuccessRate || 0))}%`, icon: Settings, hasBadge: true },
                { label: 'Rule Gagal', value: Number(stats.totalErrorCount || 0).toLocaleString(), icon: AlertTriangle }
              ].map((stat, i) => (
                <div key={i} className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer overflow-hidden">
                  {loading ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                      {stat.hasBadge && <Skeleton className="h-5 w-20" />}
                    </div>
                  ) : (
                    <>
                      <stat.icon className="w-5 h-5 text-primary absolute top-4 right-4" />
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-primary text-xs font-medium uppercase tracking-wider">{stat.label}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                          {stat.hasBadge && (
                            <Badge className={`text-xs px-2 py-1 ${Math.round(Number(stats.avgSuccessRate || 0)) >= 90 ? 'bg-success/10 text-success border-success/20' :
                              Math.round(Number(stats.avgSuccessRate || 0)) >= 80 ? 'bg-warning/10 text-warning border-warning/20' :
                                'bg-destructive/10 text-destructive border-destructive/20'
                              }`}>
                              {Math.round(Number(stats.avgSuccessRate || 0)) >= 90 ? 'Excellent' :
                                Math.round(Number(stats.avgSuccessRate || 0)) >= 80 ? 'Good' : 'Poor'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Filter and Table Container */}
          <Card className="!p-0">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 p-6 pb-0">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari rule otomasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Budget Management">Budget Management</SelectItem>
                    <SelectItem value="Performance">Performance</SelectItem>
                    <SelectItem value="Scaling">Scaling</SelectItem>
                    <SelectItem value="Scheduling">Scheduling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rules List Table */}
            {loading ? (
              <div className="px-6 py-4 space-y-4">
                {/* Header Skeleton */}
                <div className="flex items-center gap-4 border-b pb-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                {/* Row Skeletons */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 py-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-8 w-12 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <div className="ml-auto flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center justify-center">
                  <Zap className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Found</h3>
                  <p className="text-gray-600 mb-4">Start by creating your first automation rule</p>
                  {canCreate && (
                    <Button
                      onClick={() => {
                        setEditingRule(null) // Ensure editingRule is null for create mode
                        setShowMultiStepModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Rule
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative px-6">
                <div className="overflow-x-auto overflow-y-auto max-h-96 lg:max-h-[500px] xl:max-h-[600px]">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <Checkbox
                            checked={selectedRules.length === paginatedRules.length && paginatedRules.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Nama Rule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Rule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Aksi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Kategori
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Time Schedule
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Triggers
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Success Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Error Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Assignment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Checkbox
                              checked={selectedRules.includes(rule.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRules([...selectedRules, rule.id])
                                } else {
                                  setSelectedRules(selectedRules.filter(id => id !== rule.id))
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-block">
                              <Switch
                                checked={rule.status === "active"}
                                disabled={!canEdit || togglingStatus === rule.id}
                                onCheckedChange={(checked) => {
                                  if (canEdit) handleToggleStatus(rule.id)
                                }}
                                className={`cursor-pointer pointer-events-auto ${(!canEdit || togglingStatus === rule.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-sm text-gray-900 cursor-pointer">
                                    {generateRuleSummary(rule)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-md bg-gray-50 shadow-lg border border-gray-200 p-4">
                                  {generateLogicTooltip(rule)}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {rule.actions.length > 0 ? rule.actions.join(', ') : 'Tidak ada aksi'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm text-gray-900">{rule.category}</span>
                              <Badge className={`w-fit ${rule.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                rule.priority === 'medium' ? 'bg-warning/10 text-warning border-warning/20' :
                                  'bg-success/10 text-success border-success/20'
                                }`}>
                                {rule.priority}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>Continuous</div>
                              <div className="text-gray-500">Real-time monitoring</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {Number(rule.triggers || 0).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-success">
                              {(() => {
                                const triggers = typeof rule.triggers === 'number' ? rule.triggers : Number(rule.triggers) || 0
                                const errorCount = typeof rule.errorCount === 'number' ? rule.errorCount : Number(rule.errorCount) || 0
                                const successCount = rule.successCount !== undefined
                                  ? (typeof rule.successCount === 'number' ? rule.successCount : Number(rule.successCount) || 0)
                                  : Math.max(0, triggers - errorCount)
                                return successCount.toLocaleString()
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${(() => {
                                const errorCount = typeof rule.errorCount === 'number'
                                  ? rule.errorCount
                                  : Number(rule.errorCount) || 0
                                return errorCount > 0 ? 'text-destructive' : 'text-gray-900'
                              })()}`}>
                                {(() => {
                                  const errorCount = typeof rule.errorCount === 'number'
                                    ? rule.errorCount
                                    : Number(rule.errorCount) || 0
                                  return errorCount.toLocaleString()
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-primary/10 text-primary border-primary/20 w-fit">
                                  {rule.assignments?.totalAccounts || 0} Akun
                                </Badge>
                                {(() => {
                                  const accountIds = rule.assignments?.accountIds || rule.accounts || []
                                  const hasExpired = accountIds.some((id: string) => tokos[id] === 'expired' || tokos[id] === 'no_cookies')
                                  return hasExpired && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center text-destructive animate-pulse">
                                            <AlertTriangle className="w-4 h-4" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Beberapa akun dalam rule ini memiliki sesi yang berakhir (expired)</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )
                                })()}
                              </div>
                              <Badge className="bg-secondary/10 text-secondary border-secondary/20 w-fit">
                                {rule.assignments?.totalCampaigns || 0} Iklan
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-1">
                              {canCreate && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 border border-transparent hover:border-gray-200"
                                  onClick={() => handleDuplicateRule(rule)}
                                  title="Duplikat Rule"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 border border-transparent hover:border-gray-200"
                                  onClick={() => handleEditRule(rule)}
                                  title="Edit Rule"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 border border-transparent hover:border-gray-200 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  title="Hapus Rule"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
            }

            {/* Pagination */}
            {
              filteredRules.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Rows per page:</span>
                      <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                        setItemsPerPage(parseInt(value))
                        setCurrentPage(1)
                      }}>
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, filteredRules.length)} of {filteredRules.length} results
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )
            }
          </Card >
        </div >

        {/* Create/Edit Rule Modal */}
        < MultiStepRuleModal
          isOpen={showMultiStepModal}
          onClose={() => {
            setShowMultiStepModal(false)
            setEditingRule(null)
          }}
          onSave={editingRule ? handleUpdateRule : handleCreateRule}
          initialData={editingRule}
          isEditMode={!!editingRule}
        />

        {/* Bulk Delete Confirm Alert */}
        <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
          <AlertDialogContent className="bg-white border-none shadow-2xl p-6 max-w-md">
            <AlertDialogHeader className="pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 transition-transform hover:scale-105">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">
                Hapus {selectedRules.length} Rule Terpilih?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500 text-sm mt-2">
                Tindakan ini tidak dapat dibatalkan. Semua data statistik dan konfigurasi untuk rule yang dipilih akan dihapus secara permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4 gap-2">
              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 border-none text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Ya, Hapus Masal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Single Delete Confirm Alert */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-white border-none shadow-2xl p-6 max-w-md">
            <AlertDialogHeader className="pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 transition-transform hover:scale-105">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl font-bold text-gray-900">Apakah Anda Yakin?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-500 text-sm mt-2">
                Tindakan ini tidak dapat dibatalkan. Rule akan dihapus secara permanen dari server.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4 gap-2">
              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 border-none text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteRule}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg shadow-lg shadow-red-600/20 transition-all active:scale-95"
              >
                Ya, Hapus Rule
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div >
    </div >
  )
}