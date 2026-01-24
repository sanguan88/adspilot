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
import { MultiStepRuleModal } from "./multi-step-rule-modal"

interface AutomationRule {
  id: string
  name: string
  status: "active" | "paused" | "error" | "draft"
  category: string
  priority: "high" | "medium" | "low"
  triggers: number
  successRate: number
  lastRun: string
  lastCheck: string
  lastCheckDate?: string
  lastCheckTime?: string
  nextCheck: string
  errorCount: number
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
  const { toast } = useToast()
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    totalTriggers: 0,
    totalErrorCount: 0,
    avgSuccessRate: 0
  })

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
        
        switch(condition.operator) {
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
    try {
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
            titleClassName: "!text-red-800", // Red text for title
            descriptionClassName: "!text-red-700", // Red text for description
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

  // Handle delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus rule ini?')) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/automation-rules/${ruleId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Rule berhasil dihapus",
        })
        await fetchRules()
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus rule",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus rule",
        variant: "destructive",
      })
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
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Automations</h1>
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
            {selectedRules.length > 0 && (
              <Button 
                variant="tertiary" 
                size="default"
              >
                <Settings className="w-4 h-4 mr-1" />
                Bulk Actions ({selectedRules.length})
              </Button>
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
        </div>
      </div>

        <div className="space-y-6 max-w-full">
          {/* Quick Stats */}
          <div className="flex flex-col gap-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-6">
              {/* 1. Active Rules */}
              <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                <Zap className="w-5 h-5 text-primary absolute top-4 right-4" />
                <div className="flex flex-col items-start gap-2">
                  <p className="text-primary text-xs font-medium">Rule Aktif</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.active}
                  </p>
                </div>
              </div>
              
              {/* 2. Total Triggers */}
              <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                <Activity className="w-5 h-5 text-primary absolute top-4 right-4" />
                <div className="flex flex-col items-start gap-2">
                  <p className="text-primary text-xs font-medium">Total Pemicu</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Number(stats.totalTriggers || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* 3. Avg Success Rate */}
              <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                <Settings className="w-5 h-5 text-primary absolute top-4 right-4" />
                <div className="flex flex-col items-start gap-2">
                  <p className="text-primary text-xs font-medium">Tingkat Keberhasilan Rata-rata</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-gray-900">
                      {Math.round(Number(stats.avgSuccessRate || 0))}%
                    </p>
                    <Badge className={`text-xs px-2 py-1 ${
                      Math.round(Number(stats.avgSuccessRate || 0)) >= 90 ? 'bg-success/10 text-success border-success/20' : 
                      Math.round(Number(stats.avgSuccessRate || 0)) >= 80 ? 'bg-warning/10 text-warning border-warning/20' : 
                      'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {Math.round(Number(stats.avgSuccessRate || 0)) >= 90 ? 'Excellent' : 
                       Math.round(Number(stats.avgSuccessRate || 0)) >= 80 ? 'Good' : 'Poor'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* 4. Failed Rules */}
              <div className="bg-white border rounded-sm p-6 w-full shadow-sm relative transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer">
                <AlertTriangle className="w-5 h-5 text-primary absolute top-4 right-4" />
                <div className="flex flex-col items-start gap-2">
                  <p className="text-primary text-xs font-medium">Rule Gagal</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {Number(stats.totalErrorCount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
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
                  <SelectItem value="Budget Management">Budget Management</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                  <SelectItem value="Scaling">Scaling</SelectItem>
                  <SelectItem value="Scheduling">Scheduling</SelectItem>
                  <SelectItem value="Conversion (Top Funnel)">Conversion (Top Funnel)</SelectItem>
                  <SelectItem value="Conversion (Bottom Funnel)">Conversion (Bottom Funnel)</SelectItem>
                  <SelectItem value="Template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rules List Table */}
          {loading ? (
              <div className="p-8 text-center">
              <div className="flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-600">Loading rules...</span>
              </div>
            </div>
          ) : rules.length === 0 ? (
              <div className="p-8 text-center">
              <div className="flex flex-col items-center justify-center">
                <Zap className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Found</h3>
                <p className="text-gray-600 mb-4">Start by creating your first automation rule</p>
                <Button 
                  onClick={() => {
                    setEditingRule(null) // Ensure editingRule is null for create mode
                    setShowMultiStepModal(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Rule
                </Button>
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
                      Last Check
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Next Check
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Triggers
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
                        <div 
                          className="inline-block cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(rule.id)
                          }}
                        >
                        <Switch
                          checked={rule.status === "active"}
                            onCheckedChange={(checked) => {
                              handleToggleStatus(rule.id)
                            }}
                            className="cursor-pointer pointer-events-auto"
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
                          <Badge className={`w-fit ${
                            rule.priority === 'high' ? 'bg-destructive/10 text-destructive border-destructive/20' :
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
                          <div>{rule.lastCheckDate || rule.lastCheck}</div>
                          {rule.lastCheckTime && rule.lastCheckTime !== 'Never' && (
                            <div className="text-gray-500">{rule.lastCheckTime}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {rule.nextCheck}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {Number(rule.triggers || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {(() => {
                              const errorCount = typeof rule.errorCount === 'number' 
                                ? rule.errorCount 
                                : Number(rule.errorCount) || 0
                              // Jika error count 0, tampilkan "0" saja, jika > 0 tampilkan dengan "/24h"
                              return errorCount === 0 
                                ? '0' 
                                : `${errorCount.toLocaleString()}/24h`
                            })()}
                          </span>
                          {(() => {
                            const errorCount = typeof rule.errorCount === 'number' 
                              ? rule.errorCount 
                              : Number(rule.errorCount) || 0
                            return errorCount > 0
                          })() && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">Error</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <Badge className="bg-primary/10 text-primary border-primary/20 w-fit">
                            {rule.assignments?.totalAccounts || 0} Akun
                          </Badge>
                          <Badge className="bg-secondary/10 text-secondary border-secondary/20 w-fit">
                            {rule.assignments?.totalCampaigns || 0} Iklan
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDuplicateRule(rule)}
                            title="Duplikat Rule"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditRule(rule)}
                            title="Edit Rule"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteRule(rule.id)}
                            title="Hapus Rule"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {filteredRules.length > 0 && (
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
          )}
          </Card>
      </div>

      {/* Create/Edit Rule Modal */}
      <MultiStepRuleModal 
        isOpen={showMultiStepModal} 
        onClose={() => {
          setShowMultiStepModal(false)
          // Reset editing rule after a short delay to allow modal to close first
          setTimeout(() => {
          setEditingRule(null)
          }, 100)
        }} 
        onSave={editingRule ? handleUpdateRule : handleCreateRule}
        initialData={editingRule}
        isEditMode={!!editingRule}
      />
      </div>
    </div>
  )
}