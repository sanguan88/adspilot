"use client"

import React, { useState, Fragment, useMemo } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Plus, X, ChevronRight, Clock, AlertTriangle, Calendar, ChevronDown, ChevronRight as ChevronRightIcon, HelpCircle, GripVertical, Trash2, Search, Check, Zap, DollarSign, Play, Pause as PauseIcon, Copy, TrendingDown, FileSearch, Target, Eye, Edit2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RuleTemplateModal } from "./rule-template-modal"
import { Badge } from "@/components/ui/badge"

interface MultiStepRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rule: any) => void
  initialData?: any
  isEditMode?: boolean
}

export function MultiStepRuleModal({ isOpen, onClose, onSave, initialData, isEditMode = false }: MultiStepRuleModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [ruleName, setRuleName] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("medium")
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [precisionMode, setPrecisionMode] = useState("standard")
  const [executionMode, setExecutionMode] = useState("continuous")
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [timeInput, setTimeInput] = useState("")
  const [showTimeConditions, setShowTimeConditions] = useState(false)
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(false)
  const [selectedInterval, setSelectedInterval] = useState("5 menit")
  const [customInterval, setCustomInterval] = useState("")
  const [showIntervalSelection, setShowIntervalSelection] = useState(false)
  const [logicalOperator, setLogicalOperator] = useState("AND")
  const [conditionGroups, setConditionGroups] = useState<any[]>([])
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [editingConditionId, setEditingConditionId] = useState<string | null>(null)
  const [newCondition, setNewCondition] = useState({
    metric: "",
    operator: "",
    value: "",
    timePeriod: "real_time"
  })
  const [ruleGroups, setRuleGroups] = useState<any[]>([
    {
      id: "group-1",
      type: "IF",
      logicalOperator: "AND",
      conditions: []
    }
  ])
  const [activeGroupId, setActiveGroupId] = useState("group-1")
  
  // Action step states
  const [actionType, setActionType] = useState("")
  const [actionAmount, setActionAmount] = useState("")
  const [telegramNotification, setTelegramNotification] = useState(true)
  const [actions, setActions] = useState<any[]>([])
  
  // Action configuration states
  const [budgetAmount, setBudgetAmount] = useState("100.000")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [duplicateSuffix, setDuplicateSuffix] = useState("- Salinan")
  const [addNumberToDuplicate, setAddNumberToDuplicate] = useState(false)
  const [keepOriginalActive, setKeepOriginalActive] = useState(true)
  const [messageTemplate, setMessageTemplate] = useState("Rule '{ruleName}' triggered at {time}. Action: {action}")
  
  // Campaign and Username states
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])
  
  // Data from API states
  const [usernamesList, setUsernamesList] = useState<Array<{value: string, label: string}>>([])
  const [campaignsList, setCampaignsList] = useState<Array<{value: string, label: string, username?: string, state: string}>>([])
  const [loadingUsernames, setLoadingUsernames] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [searchUsername, setSearchUsername] = useState("")
  const [searchCampaign, setSearchCampaign] = useState("")
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string[]>(['ongoing', 'paused'])
  
  // Create Campaign states
  const [createCampaignData, setCreateCampaignData] = useState({
    title: '',
    objective: 'max_gmv_roi_two',
    daily_budget: '',
    scheduleType: '', // 'waktu' or 'durasi'
    scheduleValue: '', // datetime string or duration text
    roas: ''
  })

  // Initialize form with initial data when in edit mode
  React.useEffect(() => {
    if (isEditMode && initialData) {
      setRuleName(initialData.name || "")
      setRuleDescription(initialData.description || "")
      setSelectedCategory(initialData.category || "")
      setSelectedPriority(initialData.priority || "medium")
      setPrecisionMode(initialData.precisionMode || "standard")
      setExecutionMode(initialData.executionMode || "continuous")
      setSelectedTimes(initialData.selectedTimes || [])
      setSelectedDays(initialData.selectedDays || [])
      setSelectedInterval(initialData.selectedInterval || "5 menit")
      setCustomInterval(initialData.customInterval || "")
      setRuleGroups(initialData.ruleGroups || [
        {
          id: "group-1",
          type: "IF",
          logicalOperator: "AND",
          conditions: []
        }
      ])
      // Ensure actions have labels and ids - create a simple mapping for labels
      const actionLabelMap: { [key: string]: string } = {
        "add_budget": "Tambah Budget",
        "reduce_budget": "Kurangi Budget",
        "set_budget": "Set Budget",
        "start_campaign": "Mulai Iklan",
        "pause_campaign": "Pause Iklan",
        "duplicate_campaign": "Duplikat Iklan",
        "create_campaign": "Buat Campaign"
      }
      const normalizedActions = (initialData.actions || []).map((action: any, index: number) => {
        return {
          ...action,
          id: action.id || `action-${index}-${Date.now()}`,
          label: action.label || actionLabelMap[action.type] || action.type
        }
      })
      setActions(normalizedActions)
      setTelegramNotification(initialData.telegramNotification ?? true)
      setSelectedCampaigns(initialData.campaignIds || [])
      setSelectedUsernames(initialData.usernames || [])
    }
  }, [isEditMode, initialData])

  // Fetch usernames from API when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchUsernames()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch campaigns when usernames are selected
  React.useEffect(() => {
    if (selectedUsernames.length > 0 && isOpen) {
      fetchCampaigns(selectedUsernames)
    } else if (selectedUsernames.length === 0 && isOpen && !isEditMode) {
      setCampaignsList([])
      setSelectedCampaigns([])
    }
  }, [selectedUsernames, isOpen, isEditMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selected campaigns when usernames change
  React.useEffect(() => {
    // Already handled in fetchCampaigns effect
  }, [selectedUsernames])

  // Reset create campaign form when action type changes
  React.useEffect(() => {
    if (actionType !== "create_campaign") {
      setCreateCampaignData({
        title: '',
        objective: 'max_gmv_roi_two',
        daily_budget: '',
        scheduleType: '',
        scheduleValue: '',
        roas: ''
      })
    }
  }, [actionType])

  // Fetch usernames from /api/accounts - fetch ALL accounts with cookies AND status_cookies aktif
  const fetchUsernames = async () => {
    try {
      setLoadingUsernames(true)
      // Fetch all accounts with cookies and status_cookies = aktif
      let allAccounts: Array<{username: string, email: string}> = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        // filter_cookies=connected already filters by status_cookies='aktif' in API
        const response = await authenticatedFetch(`/api/accounts?filter_cookies=connected&limit=1000&page=${page}`)
        
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          throw new Error('Unauthorized')
        }
        const result = await response.json()
        
        if (result.success && result.data?.accounts) {
          const accounts = result.data.accounts as Array<{username: string, email: string}>
          allAccounts = [...allAccounts, ...accounts]
          
          // Check if there are more pages
          const pagination = result.data?.pagination
          if (pagination && pagination.total_pages && page < pagination.total_pages) {
            page++
          } else {
            hasMore = false
          }
        } else {
          hasMore = false
        }
      }
      
      // Map to username options
      const usernameOptions = allAccounts.map(acc => ({
        value: acc.username,
        label: acc.username
      }))
      
      setUsernamesList(usernameOptions)
    } catch (error) {
      console.error('Error fetching usernames:', error)
      setUsernamesList([])
    } finally {
      setLoadingUsernames(false)
    }
  }
  
  
  // Filter usernames based on search term
  const filteredUsernames = React.useMemo(() => {
    if (!searchUsername.trim()) {
      return usernamesList
    }
    
    const searchLower = searchUsername.toLowerCase().trim()
    return usernamesList.filter(username => 
      username.label.toLowerCase().includes(searchLower) ||
      username.value.toLowerCase().includes(searchLower)
    )
  }, [usernamesList, searchUsername])

  // Handle select all usernames
  const handleSelectAllUsernames = (checked: boolean) => {
    if (checked) {
      // Select all filtered usernames
      const allFilteredValues = filteredUsernames.map(u => u.value)
      // Merge dengan yang sudah dipilih sebelumnya (yang tidak ada di filtered list)
      const existingSelected = selectedUsernames.filter(
        username => !filteredUsernames.find(f => f.value === username)
      )
      setSelectedUsernames([...existingSelected, ...allFilteredValues])
    } else {
      // Deselect all filtered usernames
      const filteredValues = filteredUsernames.map(u => u.value)
      setSelectedUsernames(selectedUsernames.filter(username => !filteredValues.includes(username)))
    }
  }

  // Check if all filtered usernames are selected
  const isAllFilteredSelected = React.useMemo(() => {
    if (filteredUsernames.length === 0) return false
    return filteredUsernames.every(username => selectedUsernames.includes(username.value))
  }, [filteredUsernames, selectedUsernames])

  // Check if some (but not all) filtered usernames are selected
  const isSomeFilteredSelected = React.useMemo(() => {
    if (filteredUsernames.length === 0) return false
    const selectedCount = filteredUsernames.filter(username => 
      selectedUsernames.includes(username.value)
    ).length
    return selectedCount > 0 && selectedCount < filteredUsernames.length
  }, [filteredUsernames, selectedUsernames])

  // Fetch campaigns from /api/campaigns/shopee based on selected usernames
  const fetchCampaigns = async (usernames: string[]) => {
    try {
      setLoadingCampaigns(true)
      
      // Get today's date range
      const today = new Date()
      const todayStr = today.toLocaleDateString('en-CA') // YYYY-MM-DD format
      
      // Convert usernames to account_ids (assuming username can be used as account_id)
      // Based on campaign management page, they use account_username, so we'll use username directly
      const accountIds = usernames
      
      const url = `/api/campaigns/shopee?start_time=${todayStr}&end_time=${todayStr}&account_ids=${accountIds.join(',')}`
      const response = await fetch(url)
      const result = await response.json()
      
      if (result.success && result.data) {
        const campaigns = result.data as Array<{id: string, title: string, account_username: string, state: string}>
        
        // Filter only ongoing and paused campaigns, group by account
        const campaignOptions = campaigns
          .filter(c => c.state === 'ongoing' || c.state === 'paused')
          .map(c => ({
            value: c.id.toString(),
            label: c.title,
            username: c.account_username,
            state: c.state
          }))
        
        // Remove duplicates
        const uniqueCampaigns = campaignOptions.filter((campaign, index, self) =>
          index === self.findIndex(c => c.value === campaign.value)
        )
        
        setCampaignsList(uniqueCampaigns)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
      setCampaignsList([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const categories = [
    "General",
    "Budget Management", 
    "Performance",
    "Scaling",
    "Scheduling",
    "Awareness (Top Funnel)",
    "Consideration (Middle Funnel)",
    "Conversion (Bottom Funnel)",
    "Template"
  ]

  const priorities = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" }
  ]

  const steps = [
    { id: 1, title: "Basic Information", icon: FileSearch },
    { id: 2, title: "Time Conditions", icon: Clock },
    { id: 3, title: "Metric Conditions", icon: TrendingDown },
    { id: 4, title: "Action", icon: Zap },
    { id: 5, title: "Target Selection", icon: Target },
    { id: 6, title: "Preview", icon: Eye }
  ]

  const getCampaignStatusColor = (state: string) => {
    switch (state) {
      case "ongoing":
        return "bg-success"
      case "paused":
        return "bg-warning"
      case "ended":
        return "bg-gray-500"
      default:
        return "bg-gray-400"
    }
  }

  const validateStep = (step: number) => {
    const newErrors: {[key: string]: string} = {}
    
    if (step === 1) {
      if (!ruleName.trim()) {
        newErrors.ruleName = "Rule name is required"
      }
      if (!selectedCategory) {
        newErrors.category = "Category is required"
      }
    } else if (step === 2) {
      // Step 2: Time Conditions - no required fields, can skip
    } else if (step === 3) {
      // Step 3: Metric Conditions
      const hasConditions = ruleGroups.some(group => group.conditions.length > 0)
      if (!hasConditions) {
        newErrors.conditions = "At least one condition is required"
      }
    } else if (step === 4) {
      // Step 4: Action
      if (actions.length === 0) {
        newErrors.actions = "At least one action is required"
      }
    } else if (step === 5) {
      // Step 5: Target Selection
      if (selectedUsernames.length === 0) {
        newErrors.targets = "At least one account must be selected"
      }
    } else if (step === 6) {
      // Step 6: Preview - always valid
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  // Check if current step is valid (for button disabling)
  const isStepValid = useMemo(() => {
    if (currentStep === 1) {
      return ruleName.trim() && selectedCategory
    } else if (currentStep === 2) {
      return true // Step 2: Time Conditions - no required fields
    } else if (currentStep === 3) {
      return ruleGroups.some(group => group.conditions.length > 0)
    } else if (currentStep === 4) {
      return actions.length > 0
    } else if (currentStep === 5) {
      return selectedUsernames.length > 0
    } else if (currentStep === 6) {
      return true // Step 6: Preview - always valid
    }
    return false
  }, [currentStep, ruleName, selectedCategory, ruleGroups, actions, selectedUsernames])

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSave = () => {
    if (validateStep(currentStep)) {
      const ruleData = {
        id: isEditMode && initialData ? initialData.id : Date.now().toString(),
        name: ruleName,
        description: ruleDescription,
        category: selectedCategory,
        priority: selectedPriority,
        precisionMode,
        executionMode,
        selectedTimes,
        selectedDays,
        selectedInterval,
        customInterval,
        ruleGroups,
        conditionGroups,
        actions,
        telegramNotification,
        campaignIds: selectedCampaigns,
        usernames: selectedUsernames,
        status: isEditMode ? (initialData?.status || "draft") : "draft",
        createdAt: isEditMode && initialData ? initialData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      onSave(ruleData)
      onClose()
    }
  }

  const handleSelectTemplate = (template: any) => {
    setRuleName(template.title)
    setRuleDescription(template.description)
    setSelectedCategory(template.category)
    setShowTemplateModal(false)
  }

  const handleAddTime = () => {
    if (timeInput && !selectedTimes.includes(timeInput)) {
      setSelectedTimes([...selectedTimes, timeInput])
      setTimeInput("")
    }
  }

  const handleQuickAddTime = (time: string) => {
    if (!selectedTimes.includes(time)) {
      setSelectedTimes([...selectedTimes, time])
    }
  }

  const handleRemoveTime = (time: string) => {
    setSelectedTimes(selectedTimes.filter(t => t !== time))
  }

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day))
    } else {
      setSelectedDays([...selectedDays, day])
    }
  }

  const daysOfWeek = [
    { id: "monday", label: "Senin" },
    { id: "tuesday", label: "Selasa" },
    { id: "wednesday", label: "Rabu" },
    { id: "thursday", label: "Kamis" },
    { id: "friday", label: "Jumat" },
    { id: "saturday", label: "Sabtu" },
    { id: "sunday", label: "Minggu" }
  ]

  const quickTimes = ["08:00", "12:00", "18:00", "23:59"]

  const intervalOptions = [
    "5 menit", "10 menit", "15 menit", "30 menit",
    "1 jam", "2 jam", "6 jam", "12 jam"
  ]

  const handleSetCustomInterval = () => {
    if (customInterval && !isNaN(Number(customInterval))) {
      const seconds = parseInt(customInterval)
      if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        if (remainingSeconds === 0) {
          setSelectedInterval(`${minutes} menit`)
        } else {
          setSelectedInterval(`${minutes} menit ${remainingSeconds} detik`)
        }
      } else {
        setSelectedInterval(`${seconds} detik`)
      }
      setCustomInterval("")
    }
  }

  const handleAddCondition = () => {
    if (newCondition.metric && newCondition.operator && newCondition.value) {
      if (editingConditionId) {
        // Update existing condition
        setRuleGroups(ruleGroups.map(group => 
          group.id === activeGroupId 
            ? { ...group, conditions: group.conditions.map(c => 
                c.id === editingConditionId 
                  ? { ...c, ...newCondition }
                  : c
              )}
            : group
        ))
        setEditingConditionId(null)
      } else {
        // Add new condition
      const condition = {
        id: Date.now().toString(),
        ...newCondition,
        groupType: logicalOperator
      }
      
      setRuleGroups(ruleGroups.map(group => 
        group.id === activeGroupId 
          ? { ...group, conditions: [...group.conditions, condition] }
          : group
      ))
      }
      
      setNewCondition({
        metric: "",
        operator: "",
        value: "",
        timePeriod: "real_time"
      })
      setShowConditionForm(false)
    }
  }
  
  const handleEditCondition = (conditionId: string, groupId: string) => {
    // Find the condition
    const group = ruleGroups.find(g => g.id === groupId)
    const condition = group?.conditions.find(c => c.id === conditionId)
    
    if (condition) {
      // Set form values
      setNewCondition({
        metric: condition.metric,
        operator: condition.operator,
        value: condition.value,
        timePeriod: condition.timePeriod
      })
      setEditingConditionId(conditionId)
      setActiveGroupId(groupId)
      setShowConditionForm(true)
    }
  }
  
  const handleCancelCondition = () => {
    setNewCondition({
      metric: "",
      operator: "",
      value: "",
      timePeriod: "real_time"
    })
    setEditingConditionId(null)
    setShowConditionForm(false)
  }

  const handleAddGroup = () => {
    const newGroup = {
      id: `group-${Date.now()}`,
      type: "AND",
      logicalOperator: "AND",
      conditions: []
    }
    setRuleGroups([...ruleGroups, newGroup])
  }

  const handleRemoveGroup = (groupId: string) => {
    if (ruleGroups.length > 1) {
      setRuleGroups(ruleGroups.filter(group => group.id !== groupId))
      if (activeGroupId === groupId) {
        setActiveGroupId(ruleGroups[0].id)
      }
    }
  }

  const handleSetGroupLogicalOperator = (groupId: string, operator: string) => {
    setRuleGroups(ruleGroups.map(group => 
      group.id === groupId 
        ? { ...group, logicalOperator: operator }
        : group
    ))
  }

  const handleSetGroupType = (groupId: string, type: string) => {
    setRuleGroups(ruleGroups.map(group => 
      group.id === groupId 
        ? { ...group, type: type }
        : group
    ))
  }

  // Generate rule summary in programmatic format
  const generateRuleSummary = () => {
    if (ruleGroups.length === 0) return "Tidak ada kondisi yang ditetapkan"
    
    const groupSummaries = ruleGroups.map(group => {
      if (group.conditions.length === 0) return ""
      
      const conditionStrings = group.conditions.map(condition => {
        const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
        const operator = operators.find(op => op.value === condition.operator)?.label || condition.operator
        const timePeriod = timePeriods.find(tp => tp.value === condition.timePeriod)?.label || condition.timePeriod
        
        return `${metric} ${operator} ${condition.value}`
      })
      
      if (conditionStrings.length === 1) {
        return conditionStrings[0]
      } else {
        return `(${conditionStrings.join(` ${group.logicalOperator} `)})`
      }
    }).filter(summary => summary !== "")
    
    if (groupSummaries.length === 1) {
      return groupSummaries[0]
    } else {
      return groupSummaries.join(" THEN ")
    }
  }

  // Generate Indonesian explanation
  const generateIndonesianExplanation = () => {
    if (ruleGroups.length === 0) return ["Tidak ada kondisi yang ditetapkan"]
    
    const explanations = []
    
    ruleGroups.forEach((group, groupIndex) => {
      if (group.conditions.length === 0) return
      
      const conditionExplanations = group.conditions.map(condition => {
        const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
        const operator = operators.find(op => op.value === condition.operator)?.label || condition.operator
        const timePeriod = timePeriods.find(tp => tp.value === condition.timePeriod)?.label || condition.timePeriod
        
        // Convert operator to Indonesian
        const operatorMap: { [key: string]: string } = {
          ">": "lebih besar dari",
          ">=": "lebih besar dari atau sama dengan",
          "<": "kurang dari",
          "<=": "kurang dari atau sama dengan",
          "=": "sama dengan",
          "!=": "tidak sama dengan"
        }
        
        const indonesianOperator = operatorMap[operator] || operator
        
        return `Jika ${metric} ${indonesianOperator} ${condition.value} ${timePeriod.toLowerCase()}`
      })
      
      if (conditionExplanations.length === 1) {
        explanations.push(conditionExplanations[0])
      } else {
        const connector = group.logicalOperator === "AND" ? "dan" : "atau"
        explanations.push(conditionExplanations.join(` ${connector} `))
      }
    })
    
    // Add "Kemudian" for subsequent groups
    const result = []
    explanations.forEach((explanation, index) => {
      if (index === 0) {
        result.push(explanation)
      } else {
        result.push(`Kemudian, ${explanation}`)
      }
    })
    
    return result
  }

  // Generate logic string for Step 6 Preview
  const generateLogicString = () => {
    let logic = ""
    
    // JIKA section
    if (ruleGroups.length === 0 || ruleGroups.every(g => g.conditions.length === 0)) {
      logic = "JIKA tidak ada kondisi yang ditetapkan"
    } else {
      logic += "JIKA\n"
      
      ruleGroups.forEach((group, groupIndex) => {
        if (group.conditions.length === 0) return
        
        // Convert conditions to Indonesian with formatted currency
        const conditions = group.conditions.map((condition: any) => {
          const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
          let operator = ""
          
          // Map operator value to Indonesian text
          switch(condition.operator) {
            case "greater_than": operator = "lebih dari"; break
            case "less_than": operator = "kurang dari"; break
            case "greater_equal": operator = "lebih dari atau sama dengan"; break
            case "less_equal": operator = "kurang dari atau sama dengan"; break
            case "equal": operator = "sama dengan"; break
            case "not_equal": operator = "tidak sama dengan"; break
            default: operator = condition.operator
          }
          
          // Format currency values
          let value = condition.value
          // Check if value is a number (currency)
          if (!isNaN(Number(value)) && Number(value) >= 1000) {
            value = `Rp ${Number(value).toLocaleString('id-ID').replace(/,/g, '.')}`
          }
          
          return {
            metric,
            operator,
            value,
            rawValue: condition.value
          }
        })
        
        // Build condition string with colored operators
        const connector = group.logicalOperator === "AND" ? " DAN" : " ATAU"
        const conditionParts = []
        
        conditions.forEach((condition: any, idx: number) => {
          if (idx > 0) {
            conditionParts.push(<span key={`conn-${idx}`} className="text-gray-900 font-bold">{connector}</span>)
          }
          conditionParts.push(<span key={`metric-${idx}`}>{condition.metric}</span>)
          conditionParts.push(<span key={`op-${idx}`} className="text-primary font-bold"> {condition.operator} </span>)
          conditionParts.push(<span key={`val-${idx}`}>{condition.value}</span>)
        })
        
        logic += "  " // indent for continuation
        // For now, return the plain string, we'll handle the colored rendering separately
        
        // Build string for now
        const conditionStr = conditions.map((c: any) => `${c.metric} ${c.operator} ${c.value}`).join(connector)
        logic += conditionStr
        
        // Add separator between groups if not the last
        if (groupIndex < ruleGroups.length - 1) {
          logic += "\nATAU\n"
        }
      })
    }
    
    // MAKA section
    logic += "\n\nMAKA\n"
    
    if (actions.length === 0) {
      logic += "  tidak ada aksi yang dikonfigurasi"
    } else {
      actions.forEach((action, actionIndex) => {
        let actionText = ""
        
        switch (action.type) {
          case "add_budget":
            actionText = `  Tambah Budget Rp ${Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}`
            break
          case "reduce_budget":
            actionText = `  Kurangi Budget Rp ${Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}`
            break
          case "set_budget":
            actionText = `  Set Budget Rp ${Number(action.amount.replace(/\./g, '')).toLocaleString('id-ID').replace(/,/g, '.')}`
            break
          case "start_campaign":
            actionText = `  Mulai Iklan (${selectedCampaigns.length} iklan)`
            break
          case "pause_campaign":
            actionText = `  Pause Iklan (${selectedCampaigns.length} iklan)`
            break
          case "duplicate_campaign":
            const suffix = action.suffix || '- Salinan'
            actionText = `  Duplikasi Iklan "${suffix}" (${selectedCampaigns.length} iklan)`
            break
          case "create_campaign":
            const campaignData = action.campaignData || {}
            const objectiveLabel = campaignData.objective === 'max_gmv_roi_two' ? 'GMV MAX' : 
                                  campaignData.objective === 'max_gmv' ? 'AUTO' : 
                                  campaignData.objective === 'max_view' ? 'VIEW' : campaignData.objective
            const scheduleLabel = campaignData.scheduleType === 'waktu' ? `Waktu: ${campaignData.scheduleValue || ''}` : 
                                 campaignData.scheduleType === 'durasi' ? `Durasi: ${campaignData.scheduleValue || ''}` : ''
            actionText = `  Buat Campaign: "${campaignData.title || ''}" (${objectiveLabel}, Budget: Rp ${Number(campaignData.daily_budget || 0).toLocaleString('id-ID').replace(/,/g, '.')}, ${scheduleLabel})`
            break
          default:
            actionText = `  ${action.label || action.type}`
        }
        
        logic += actionText
        
        if (actionIndex < actions.length - 1) {
          logic += ";\n"
        }
      })
    }
    
    return logic
  }

  // Generate logic with React components for colored rendering
  const generateLogicComponents = () => {
    const components: JSX.Element[] = []
    
    // JIKA section
    if (ruleGroups.length === 0 || ruleGroups.every(g => g.conditions.length === 0)) {
      components.push(<span key="no-conditions">JIKA tidak ada kondisi yang ditetapkan</span>)
    } else {
      // Show JIKA only once at the top
      components.push(<div key="if-title" className="font-bold mb-2">JIKA</div>)
      
      ruleGroups.forEach((group, groupIndex) => {
        if (group.conditions.length === 0) return
        
        // Convert conditions to Indonesian with formatted currency
        const conditions = group.conditions.map((condition: any) => {
          const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
          let operator = ""
          
          // Map operator value to Indonesian text
          switch(condition.operator) {
            case "greater_than": operator = "lebih dari"; break
            case "less_than": operator = "kurang dari"; break
            case "greater_equal": operator = "lebih dari atau sama dengan"; break
            case "less_equal": operator = "kurang dari atau sama dengan"; break
            case "equal": operator = "sama dengan"; break
            case "not_equal": operator = "tidak sama dengan"; break
            default: operator = condition.operator
          }
          
          // Format currency values
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
              <Badge key={`conn-${groupIndex}-${idx}`} variant={group.logicalOperator === "AND" ? "default" : "secondary"} className={`mx-1 font-bold ${group.logicalOperator === "AND" ? "!bg-green-100 !text-black border-0 rounded-none" : "!bg-orange-100 !text-black border-0 rounded-none"}`}>
                {connector.trim()}
              </Badge>
            )
          }
          conditionParts.push(<span key={`metric-${groupIndex}-${idx}`}>{condition.metric}</span>)
          conditionParts.push(<span key={`op-${groupIndex}-${idx}`} className="text-blue-600 font-bold"> {condition.operator} </span>)
          conditionParts.push(<span key={`val-${groupIndex}-${idx}`}>{condition.value}</span>)
        })
        
        // Wrap conditions in parentheses for grouping
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
        
        // Add connector between groups if not the last
        if (groupIndex < ruleGroups.length - 1) {
          const nextGroup = ruleGroups[groupIndex + 1]
          const groupConnector = nextGroup.type === "AND" ? " DAN " : " ATAU "
          components.push(
            <div key={`group-conn-${groupIndex}`} className="flex items-center my-2 ml-2">
              <Badge variant={nextGroup.type === "AND" ? "default" : "secondary"} className={`px-3 py-1 font-bold ${nextGroup.type === "AND" ? "!bg-green-100 !text-black border-0 rounded-none" : "!bg-orange-100 !text-black border-0 rounded-none"}`}>
                {groupConnector.trim()}
              </Badge>
            </div>
          )
        }
      })
    }
    
    // MAKA section
    components.push(<div key="maka-title" className="font-bold my-4">MAKA</div>)
    
    if (actions.length === 0) {
      components.push(<div key="no-actions" className="ml-2">tidak ada aksi yang dikonfigurasi</div>)
    } else {
      actions.forEach((action, actionIndex) => {
        let actionElement: JSX.Element
        
        switch (action.type) {
          case "add_budget":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Tambah Budget <span className="font-bold">Rp {Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}</span>
              </div>
            )
            break
          case "reduce_budget":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Kurangi Budget <span className="font-bold">Rp {Number(action.amount).toLocaleString('id-ID').replace(/,/g, '.')}</span>
              </div>
            )
            break
          case "set_budget":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Set Budget <span className="font-bold">Rp {Number(action.amount.replace(/\./g, '')).toLocaleString('id-ID').replace(/,/g, '.')}</span>
              </div>
            )
            break
          case "start_campaign":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Mulai Iklan <span className="font-bold">({selectedCampaigns.length} iklan)</span>
              </div>
            )
            break
          case "pause_campaign":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Pause Iklan <span className="font-bold">({selectedCampaigns.length} iklan)</span>
              </div>
            )
            break
          case "duplicate_campaign":
            const suffix = action.suffix || '- Salinan'
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Duplikasi Iklan <span className="font-bold">"{suffix}" ({selectedCampaigns.length} iklan)</span>
              </div>
            )
            break
          case "create_campaign":
            const campaignData = action.campaignData || {}
            const objectiveLabel = campaignData.objective === 'max_gmv_roi_two' ? 'GMV MAX' : 
                                  campaignData.objective === 'max_gmv' ? 'AUTO' : 
                                  campaignData.objective === 'max_view' ? 'VIEW' : campaignData.objective
            const scheduleLabel = campaignData.scheduleType === 'waktu' ? `Waktu: ${campaignData.scheduleValue || ''}` : 
                                 campaignData.scheduleType === 'durasi' ? `Durasi: ${campaignData.scheduleValue || ''}` : ''
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Buat Campaign: <span className="font-bold">"{campaignData.title || ''}"</span> 
                <span className="text-gray-600"> ({objectiveLabel}, Budget: Rp {Number(campaignData.daily_budget || 0).toLocaleString('id-ID').replace(/,/g, '.')}, {scheduleLabel})</span>
              </div>
            )
            break
          default:
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">{action.label || action.type}</div>
            )
        }
        
        components.push(actionElement)
      })
    }
    
    return components
  }

  // Action handlers
  const handleAddAction = () => {
    let isValid = false
    let actionData: any = {
      id: Date.now().toString(),
      type: actionType,
      label: actionTypes.find(a => a.value === actionType)?.label || actionType
    }

    switch (actionType) {
      case "add_budget":
      case "reduce_budget":
        if (actionAmount && !isNaN(Number(actionAmount)) && Number(actionAmount) % 5000 === 0) {
          actionData.amount = actionAmount
          isValid = true
        }
        break
      
      case "set_budget":
        if (budgetAmount && !isNaN(Number(budgetAmount.replace(/\./g, '')))) {
          actionData.amount = budgetAmount
          isValid = true
        }
        break
      
      case "start_campaign":
      case "pause_campaign":
        // Valid without additional config - campaigns selected in Step 5
          isValid = true
        break
      
      case "duplicate_campaign":
        // Valid without additional config - campaigns selected in Step 5
          actionData.suffix = duplicateSuffix
          actionData.addNumber = addNumberToDuplicate
          actionData.keepOriginal = keepOriginalActive
          isValid = true
        break
      
      case "create_campaign":
        if (isActionValid()) {
          actionData.campaignData = {
            title: createCampaignData.title,
            objective: createCampaignData.objective,
            daily_budget: createCampaignData.daily_budget,
            scheduleType: createCampaignData.scheduleType,
            scheduleValue: createCampaignData.scheduleValue,
            roas: createCampaignData.roas || undefined
          }
          isValid = true
        }
        break
    }

    if (isValid) {
      setActions([...actions, actionData])
      // Reset form based on action type
      if (actionType === "add_budget" || actionType === "reduce_budget") {
        setActionAmount("")
      } else if (actionType === "set_budget") {
        setBudgetAmount("100.000")
      } else if (actionType === "start_campaign" || actionType === "pause_campaign") {
        // No need to reset - campaigns are selected in Step 1
      } else if (actionType === "duplicate_campaign") {
        setDuplicateSuffix("- Salinan")
        setAddNumberToDuplicate(false)
        setKeepOriginalActive(true)
      } else if (actionType === "create_campaign") {
        setCreateCampaignData({
          title: '',
          objective: 'max_gmv_roi_two',
          daily_budget: '',
          scheduleType: '',
          scheduleValue: '',
          roas: ''
        })
      }
    }
  }

  const handleRemoveAction = (actionId: string) => {
    setActions(actions.filter(action => action.id !== actionId))
  }

  const validateAmount = (amount: string) => {
    const numAmount = Number(amount)
    return !isNaN(numAmount) && numAmount > 0 && numAmount % 5000 === 0
  }

  const renderActionConfiguration = () => {
    switch (actionType) {
      case "add_budget":
      case "reduce_budget":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Amount (Rp)</Label>
              <Input
                value={actionAmount}
                onChange={(e) => setActionAmount(e.target.value)}
                placeholder="Masukkan jumlah (contoh: 50000)"
                className="h-10 bg-white"
              />
              {actionAmount && !validateAmount(actionAmount) && (
                <div className="flex items-center gap-2 mt-2 text-warning text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Harus kelipatan 5.000</span>
                </div>
              )}
              <div className="mt-2 text-xs text-gray-500">
                Contoh: 5.000, 10.000, 15.000, 50.000, 100.000
              </div>
            </div>
          </div>
        )

      case "set_budget":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Budget Amount (Rp)</Label>
              <Input
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Masukkan jumlah budget"
                className="h-10 bg-white"
              />
              <div className="mt-2 text-xs text-gray-500">
                Contoh: 100.000 (seratus ribu), 250.000 (dua ratus lima puluh ribu)
              </div>
            </div>
          </div>
        )

      case "start_campaign":
      case "pause_campaign":
        return null

      case "duplicate_campaign":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Suffix Nama Duplikasi</Label>
              <Input
                value={duplicateSuffix}
                onChange={(e) => setDuplicateSuffix(e.target.value)}
                placeholder="Masukkan suffix"
                className="h-10 bg-white"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addNumber"
                  checked={addNumberToDuplicate}
                  onCheckedChange={(checked) => setAddNumberToDuplicate(checked as boolean)}
                />
                <Label htmlFor="addNumber" className="text-xs text-gray-600">
                  Tambahkan nomor ke nama duplikasi
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="keepOriginal"
                  checked={keepOriginalActive}
                  onCheckedChange={(checked) => setKeepOriginalActive(checked as boolean)}
                />
                <Label htmlFor="keepOriginal" className="text-xs text-gray-600">
                  Biarkan iklan asli tetap aktif
                </Label>
              </div>
            </div>
          </div>
        )

      case "create_campaign":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Campaign Title</Label>
              <Input
                value={createCampaignData.title}
                onChange={(e) => setCreateCampaignData({...createCampaignData, title: e.target.value})}
                placeholder="Enter campaign title"
                className="h-10 bg-white"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Objective</Label>
              <Select 
                value={createCampaignData.objective} 
                onValueChange={(value) => setCreateCampaignData({...createCampaignData, objective: value})}
              >
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max_gmv_roi_two">GMV MAX</SelectItem>
                  <SelectItem value="max_gmv">AUTO</SelectItem>
                  <SelectItem value="max_view">VIEW</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Daily Budget (Rp)</Label>
              <Input
                type="number"
                value={createCampaignData.daily_budget}
                onChange={(e) => setCreateCampaignData({...createCampaignData, daily_budget: e.target.value})}
                placeholder="Enter daily budget (in thousands)"
                className="h-10 bg-white"
                min="5"
                step="5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Budget harus kelipatan Rp5.000
              </p>
            </div>

            {createCampaignData.objective === 'max_gmv_roi_two' && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">
                  Target ROAS <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  value={createCampaignData.roas}
                  onChange={(e) => setCreateCampaignData({...createCampaignData, roas: e.target.value})}
                  placeholder="Enter target ROAS (e.g., 2.5)"
                  className="h-10 bg-white"
                  min="0.1"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ROAS diperlukan untuk objective GMV MAX
                </p>
              </div>
            )}

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Jadwal</Label>
              <Select 
                value={createCampaignData.scheduleType} 
                onValueChange={(value) => setCreateCampaignData({...createCampaignData, scheduleType: value, scheduleValue: ''})}
              >
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Pilih jenis jadwal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waktu">Waktu</SelectItem>
                  <SelectItem value="durasi">Durasi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createCampaignData.scheduleType === 'waktu' && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Waktu</Label>
                <div className="flex gap-2">
                  <Select
                    value={createCampaignData.scheduleValue ? createCampaignData.scheduleValue.split(':')[0] : '00'}
                    onValueChange={(hour) => {
                      const currentMinute = createCampaignData.scheduleValue ? createCampaignData.scheduleValue.split(':')[1] || '00' : '00'
                      setCreateCampaignData({...createCampaignData, scheduleValue: `${hour}:${currentMinute}`})
                    }}
                  >
                    <SelectTrigger className="h-10 bg-white w-[100px]">
                      <SelectValue placeholder="Jam" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = String(i).padStart(2, '0')
                        return (
                          <SelectItem key={hour} value={hour}>
                            {hour}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <span className="flex items-center text-gray-500 font-medium">:</span>
                  <Select
                    value={createCampaignData.scheduleValue ? createCampaignData.scheduleValue.split(':')[1] : '00'}
                    onValueChange={(minute) => {
                      const currentHour = createCampaignData.scheduleValue ? createCampaignData.scheduleValue.split(':')[0] || '00' : '00'
                      setCreateCampaignData({...createCampaignData, scheduleValue: `${currentHour}:${minute}`})
                    }}
                  >
                    <SelectTrigger className="h-10 bg-white w-[100px]">
                      <SelectValue placeholder="Menit" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 60 }, (_, i) => {
                        const minute = String(i).padStart(2, '0')
                        return (
                          <SelectItem key={minute} value={minute}>
                            {minute}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Format 24 jam (00:00 - 23:59)
                </p>
              </div>
            )}

            {createCampaignData.scheduleType === 'durasi' && (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Masukkan durasi (menit)</Label>
                <Input
                  type="number"
                  value={createCampaignData.scheduleValue}
                  onChange={(e) => setCreateCampaignData({...createCampaignData, scheduleValue: e.target.value})}
                  placeholder="Masukkan durasi dalam menit (contoh: 20)"
                  className="h-10 bg-white"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Durasi dalam menit (angka)
                </p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center text-gray-500 text-sm py-4">
            Pilih tipe aksi untuk melihat konfigurasi
          </div>
        )
    }
  }

  const isActionValid = () => {
    if (!actionType) return false
    
    switch (actionType) {
      case "add_budget":
      case "reduce_budget":
        return actionAmount && validateAmount(actionAmount)
      case "set_budget":
        return budgetAmount && !isNaN(Number(budgetAmount.replace(/\./g, '')))
      case "start_campaign":
      case "pause_campaign":
      case "duplicate_campaign":
        // Valid without additional config - campaigns selected in Step 5
        return true
      case "create_campaign":
        // Validate create campaign form
        if (!createCampaignData.title || !createCampaignData.daily_budget || !createCampaignData.scheduleType || !createCampaignData.scheduleValue) {
          return false
        }
        // Validate daily budget is multiple of 5000
        const budget = Number(createCampaignData.daily_budget)
        if (isNaN(budget) || budget <= 0 || budget % 5000 !== 0) {
          return false
        }
        // Validate scheduleValue based on scheduleType
        if (createCampaignData.scheduleType === 'durasi') {
          // For durasi, validate it's a positive number (minutes)
          const durationMinutes = parseInt(createCampaignData.scheduleValue, 10)
          if (isNaN(durationMinutes) || durationMinutes <= 0) {
            return false
          }
        } else if (createCampaignData.scheduleType === 'waktu') {
          // For waktu, validate it's a valid time format (HH:MM)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
          if (!timeRegex.test(createCampaignData.scheduleValue)) {
            return false
          }
        }
        // If objective is GMV MAX, ROAS is required
        if (createCampaignData.objective === 'max_gmv_roi_two') {
          if (!createCampaignData.roas || isNaN(Number(createCampaignData.roas)) || Number(createCampaignData.roas) <= 0) {
            return false
          }
        }
        return true
      default:
        return false
    }
  }

  const metrics = [
    { value: "roas", label: "ROAS", unit: "(tanpa unit)", description: "Return on Ad Spend" },
    { value: "spend", label: "Spend", unit: "Rp (Rupiah)", description: "Total ad spend" },
    { value: "spend_percent", label: "Spend_%", unit: "% (Persen)", description: "Persentase spend dari budget" },
    { value: "impressions", label: "Impresi", unit: "(tanpa unit)", description: "Jumlah impresi iklan" },
    { value: "views", label: "View", unit: "(tanpa unit)", description: "Jumlah view" },
    { value: "sales", label: "Sales", unit: "Rp (Rupiah)", description: "Total penjualan (GMV)" },
    { value: "cps", label: "CPS", unit: "Rp (Rupiah)", description: "Biaya per sales" },
    { value: "cpm", label: "CPM", unit: "Rp (Rupiah)", description: "Biaya per 1000 impresi" },
    { value: "orders", label: "Pesanan", unit: "(tanpa unit)", description: "Jumlah pesanan" },
    { value: "conversion_rate", label: "Tingkat Konversi", unit: "% (Persen)", description: "Persentase konversi" },
    { value: "avg_spend", label: "Total Spend", unit: "Rp (Rupiah)", description: "Total spend" },
    { value: "avg_roas", label: "Avg ROAS", unit: "(tanpa unit)", description: "Rata-rata ROAS" },
    { value: "avg_saldo", label: "Saldo", unit: "Rp (Rupiah)", description: "Nilai saldo" }
  ]

  const operators = [
    { value: "greater_than", label: "Lebih dari (>)", description: "Nilai lebih dari" },
    { value: "less_than", label: "Kurang dari (<)", description: "Nilai kurang dari" },
    { value: "greater_equal", label: "Lebih dari atau sama dengan (>=)", description: "Nilai lebih dari atau sama dengan" },
    { value: "less_equal", label: "Kurang dari atau sama dengan (<=)", description: "Nilai kurang dari atau sama dengan" },
    { value: "equal", label: "Sama dengan (=)", description: "Nilai sama dengan" },
    { value: "not_equal", label: "Tidak sama dengan (!=)", description: "Nilai tidak sama dengan" }
  ]

  const timePeriods = [
    { value: "real_time", label: "Real-time (Menit/Jam)", description: "Pemantauan real-time" },
    { value: "daily", label: "Harian", description: "Data harian" },
    { value: "weekly_monthly", label: "Mingguan/Bulanan", description: "Data mingguan atau bulanan" }
  ]

  const actionTypes = [
    {
      value: "add_budget",
      label: "Tambah Budget",
      icon: DollarSign,
      description: "Tambah budget iklan berdasarkan persentase atau jumlah tetap"
    },
    {
      value: "reduce_budget", 
      label: "Kurangi Budget",
      icon: TrendingDown,
      description: "Kurangi budget iklan berdasarkan persentase atau jumlah tetap"
    },
    {
      value: "set_budget",
      label: "Set Budget",
      icon: DollarSign,
      description: "Set budget iklan ke jumlah tertentu"
    },
    {
      value: "start_campaign",
      label: "Mulai Iklan",
      icon: Play,
      description: "Mulai/aktifkan iklan"
    },
    {
      value: "pause_campaign",
      label: "Pause Iklan",
      icon: PauseIcon,
      description: "Pause/nonaktifkan iklan"
    },
    {
      value: "duplicate_campaign",
      label: "Duplikasi Iklan",
      icon: Copy,
      description: "Buat salinan iklan"
    },
    {
      value: "create_campaign",
      label: "Buat Campaign",
      icon: Plus,
      description: "Buat campaign baru dengan konfigurasi lengkap"
    }
  ]

  const accounts = [
    { value: "account1", label: "Akun Utama" },
    { value: "account2", label: "Akun Secondary" },
    { value: "account3", label: "Akun Testing" }
  ]

  // Use real data from API - usernames are loaded from /api/accounts
  // Use real data from API - campaigns are already filtered by selectedUsernames
  const campaigns = React.useMemo(() => {
    if (campaignStatusFilter.length === 0) return []
    let filtered = campaignsList.filter(c => campaignStatusFilter.includes(c.state))
    
    // Filter by search term
    if (searchCampaign.trim()) {
      const searchLower = searchCampaign.toLowerCase().trim()
      filtered = filtered.filter(c => 
        c.label.toLowerCase().includes(searchLower) ||
        (c.username && c.username.toLowerCase().includes(searchLower))
      )
    }
    
    return filtered
  }, [campaignsList, campaignStatusFilter, searchCampaign])

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-end">
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="rule-name" className="text-sm font-semibold text-gray-700">
                    Rule Name *
                  </Label>
                  <Input
                    id="rule-name"
                    placeholder="Enter rule name"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className={`h-9 bg-white ${errors.ruleName ? "border-red-500" : ""}`}
                  />
                  {errors.ruleName && (
                    <p className="text-sm text-red-500 mt-1">{errors.ruleName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                    Category *
                  </Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className={`h-9 bg-white ${errors.category ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 mt-1">{errors.category}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rule-description" className="text-sm font-semibold text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="rule-description"
                  placeholder="Describe what this rule does"
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-semibold text-gray-700">
                  Priority
                </Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {/* Mode Presisi */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Mode Presisi</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`p-3 border-2 rounded-sm cursor-pointer transition-all ${
                      precisionMode === "standard" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setPrecisionMode("standard")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        precisionMode === "standard" ? "bg-primary" : "bg-gray-200"
                      }`}>
                        <Clock className={`w-4 h-4 ${precisionMode === "standard" ? "text-white" : "text-gray-600"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Standard</div>
                        <div className="text-sm text-gray-600">Window 5 menit</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-3 border-2 rounded-sm cursor-pointer transition-all ${
                      precisionMode === "critical" 
                        ? "border-orange-500 bg-orange-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setPrecisionMode("critical")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        precisionMode === "critical" ? "bg-orange-500" : "bg-gray-200"
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${precisionMode === "critical" ? "text-white" : "text-gray-600"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Critical</div>
                        <div className="text-sm text-gray-600">Window 59 detik</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Mode Warning */}
              {precisionMode === "critical" && (
                <div className="bg-destructive/10 border-2 border-destructive/20 rounded-sm p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <span className="font-bold text-destructive">MODE CRITICAL AKTIF</span>
                  </div>
                  <div className="space-y-1 text-sm text-destructive">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                      <span>Hanya untuk operasi finansial/budget</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                      <span>Window eksekusi 59 detik</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                      <span>Sistem keamanan berlapis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-destructive rounded-full"></span>
                      <span>Mencegah kerugian finansial</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Eksekusi */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Mode Eksekusi</h4>
                <div className="space-y-2">
                  <div 
                    className={`p-3 border-2 rounded-sm cursor-pointer transition-all ${
                      executionMode === "continuous" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setExecutionMode("continuous")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        executionMode === "continuous" 
                          ? "border-primary bg-primary" 
                          : "border-gray-300"
                      }`}>
                        {executionMode === "continuous" && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Terus Menerus (24/7)</div>
                        <div className="text-sm text-gray-600">Jalankan tanpa batasan waktu</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-3 border-2 rounded-sm cursor-pointer transition-all ${
                      executionMode === "specific" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setExecutionMode("specific")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        executionMode === "specific" 
                          ? "border-primary bg-primary" 
                          : "border-gray-300"
                      }`}>
                        {executionMode === "specific" && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Waktu Tertentu</div>
                        <div className="text-sm text-gray-600">Jalankan pada waktu dan hari yang ditentukan</div>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className={`p-3 border-2 rounded-sm cursor-pointer transition-all ${
                      executionMode === "interval" 
                        ? "border-primary bg-primary/10" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setExecutionMode("interval")}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        executionMode === "interval" 
                          ? "border-primary bg-primary" 
                          : "border-gray-300"
                      }`}>
                        {executionMode === "interval" && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Berdasarkan Interval</div>
                        <div className="text-sm text-gray-600">Jalankan setiap interval waktu tertentu</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kondisi Waktu - Muncul ketika Waktu Tertentu dipilih */}
              {executionMode === "specific" && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-sm cursor-pointer"
                    onClick={() => setShowTimeConditions(!showTimeConditions)}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Kondisi Waktu</span>
                    </div>
                    {showTimeConditions ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  </div>

                  {showTimeConditions && (
                    <div className="p-3 border border-gray-200 rounded-sm space-y-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Tambah Waktu Spesifik</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={timeInput}
                            onChange={(e) => setTimeInput(e.target.value)}
                            className="w-32 bg-white"
                            placeholder="--:--"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddTime}
                            disabled={!timeInput}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Tambah Cepat:</Label>
                        <div className="flex gap-2">
                          {quickTimes.map((time) => (
                            <Button
                              key={time}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickAddTime(time)}
                              disabled={selectedTimes.includes(time)}
                              className="text-xs"
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {selectedTimes.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Waktu Terpilih:</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedTimes.map((time) => (
                              <div key={time} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                                <span>{time}</span>
                                <button
                                  onClick={() => handleRemoveTime(time)}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-sm cursor-pointer"
                    onClick={() => setShowDaysOfWeek(!showDaysOfWeek)}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Hari dalam Seminggu (Opsional)</span>
                    </div>
                    {showDaysOfWeek ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  </div>

                  {showDaysOfWeek && (
                    <div className="p-3 border border-gray-200 rounded-sm">
                      <div className="grid grid-cols-2 gap-3">
                        {daysOfWeek.map((day) => (
                          <label key={day.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedDays.includes(day.id)}
                              onCheckedChange={() => handleToggleDay(day.id)}
                            />
                            <span className="text-sm text-gray-700">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Interval Selection - Muncul ketika Berdasarkan Interval dipilih */}
              {executionMode === "interval" && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-sm cursor-pointer"
                    onClick={() => setShowIntervalSelection(!showIntervalSelection)}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Pilih Interval</span>
                    </div>
                    {showIntervalSelection ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  </div>

                  {showIntervalSelection && (
                    <div className="p-3 border border-gray-200 rounded-sm space-y-3">
                      {/* Predefined Interval Buttons */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-3 block">Pilih Interval:</Label>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          {intervalOptions.map((interval) => (
                            <Button
                              key={interval}
                              variant={selectedInterval === interval ? "default" : "outline"}
                              size="sm"
                              onClick={() => setSelectedInterval(interval)}
                              className={
                                selectedInterval === interval
                                  ? ""
                                  : "border-gray-300 hover:border-gray-400"
                              }
                            >
                              {interval}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Interval Input */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Custom (detik):</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={customInterval}
                            onChange={(e) => setCustomInterval(e.target.value)}
                            placeholder="Masukkan detik"
                            className="w-32 bg-white"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSetCustomInterval}
                            disabled={!customInterval || isNaN(Number(customInterval))}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                          >
                            Set
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Saat ini: {selectedInterval}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ringkasan Jadwal Aturan */}
              <div className="bg-gray-50 p-3 rounded-sm">
                <h4 className="text-md font-medium text-gray-900 mb-3">Ringkasan Jadwal Aturan</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Mode:</span> {executionMode === "continuous" ? "Terus Menerus (24/7)" : executionMode === "specific" ? "Waktu Tertentu" : "Berdasarkan Interval"}</div>
                  <div><span className="font-medium">Interval:</span> {executionMode === "interval" ? selectedInterval : "5 menit"}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Presisi:</span> 
                    <span className={precisionMode === "critical" ? "text-warning font-medium" : ""}>
                      {precisionMode === "standard" ? "Standard (5 menit)" : "Critical (59 detik)"}
                    </span>
                    {precisionMode === "critical" && (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  {executionMode === "specific" && selectedTimes.length > 0 && (
                    <div><span className="font-medium">Waktu:</span> {selectedTimes.join(", ")}</div>
                  )}
                  {executionMode === "specific" && selectedDays.length > 0 && (
                    <div><span className="font-medium">Hari:</span> {selectedDays.map(day => daysOfWeek.find(d => d.id === day)?.label).join(", ")}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-4 h-full overflow-y-auto">
            <div className="space-y-4">
              {/* Rule Groups */}
              {ruleGroups.map((group, groupIndex) => (
                <Fragment key={group.id}>
                  {/* Connector between groups */}
                    {groupIndex > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <Select value={group.type} onValueChange={(value) => handleSetGroupType(group.id, value)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex-1 h-px bg-gray-300"></div>
                  </div>
                  )}

                  {/* Condition Group Box */}
                  <div className="border border-gray-200 rounded-sm bg-white">
                    <div className="p-3 border-l-4 border-primary">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Select value={group.logicalOperator} onValueChange={(value) => handleSetGroupLogicalOperator(group.id, value)}>
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AND">AND</SelectItem>
                              <SelectItem value="OR">OR</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-600">{group.conditions.length} kondisi</span>
                        </div>
                        {ruleGroups.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveGroup(group.id)}
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-6 w-6 p-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      {group.conditions.length === 0 && !showConditionForm ? (
                        <div className="text-center py-6">
                          <p className="text-gray-500 mb-3">Belum ada kondisi dalam grup ini</p>
                          <Button 
                            variant="tertiary" 
                            size="sm"
                            onClick={() => {
                              setActiveGroupId(group.id)
                              setShowConditionForm(true)
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Kondisi
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Existing Conditions */}
                          {group.conditions.map((condition, index) => {
                            // Hide condition if it's being edited
                            if (condition.id === editingConditionId) return null
                            
                            return (
                            <div key={condition.id} className="p-3 bg-white rounded-sm border border-gray-200">
                              <div className="flex items-center gap-2">
                                {/* Drag Handle */}
                                <div className="cursor-move">
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                                
                                {/* Metric Pill */}
                                <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                  {metrics.find(m => m.value === condition.metric)?.label || condition.metric}
                                </div>
                                
                                {/* Operator Pill */}
                                <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                                  {operators.find(op => op.value === condition.operator)?.label || condition.operator}
                                </div>
                                
                                {/* Value Pill */}
                                <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                                  {condition.value}
                                </div>
                                
                                {/* Time Period Pill */}
                                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                  {timePeriods.find(tp => tp.value === condition.timePeriod)?.label || condition.timePeriod}
                                </div>
                                
                                <div className="flex items-center gap-1 ml-auto">
                                  {/* Edit Button */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCondition(condition.id, group.id)}
                                    disabled={showConditionForm}
                                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 h-6 w-6 p-0"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                
                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setRuleGroups(ruleGroups.map(g => 
                                      g.id === group.id 
                                        ? { ...g, conditions: g.conditions.filter((_, i) => i !== index) }
                                        : g
                                    ))
                                  }}
                                    disabled={showConditionForm}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            </div>
                          )
                          })}

                          {/* Add Condition Form */}
                          {showConditionForm && activeGroupId === group.id && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
                              <div className="grid grid-cols-4 gap-3 mb-3">
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Metrik</Label>
                                  <Select value={newCondition.metric} onValueChange={(value) => setNewCondition({...newCondition, metric: value})}>
                                    <SelectTrigger className="h-10 bg-white">
                                      {newCondition.metric ? (
                                        <span className="font-medium">{metrics.find(m => m.value === newCondition.metric)?.label}</span>
                                      ) : (
                                      <SelectValue placeholder="Pilih metrik" />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      {metrics.map((metric) => (
                                        <SelectItem key={metric.value} value={metric.value}>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium">{metric.label}</span>
                                              <span className="text-xs text-gray-500">({metric.unit})</span>
                                            </div>
                                            <span className="text-xs text-gray-500">{metric.description}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Operator</Label>
                                  <Select value={newCondition.operator} onValueChange={(value) => setNewCondition({...newCondition, operator: value})}>
                                    <SelectTrigger className="h-10 bg-white">
                                      {newCondition.operator ? (
                                        <span className="font-medium">{operators.find(op => op.value === newCondition.operator)?.label}</span>
                                      ) : (
                                      <SelectValue placeholder="Pilih operator" />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      {operators.map((operator) => (
                                        <SelectItem key={operator.value} value={operator.value}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{operator.label}</span>
                                            <span className="text-xs text-gray-500">{operator.description}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Nilai</Label>
                                  <Input
                                    value={newCondition.value}
                                    onChange={(e) => setNewCondition({...newCondition, value: e.target.value})}
                                    placeholder="Masukkan nilai"
                                    className="h-10 bg-white"
                                  />
                                </div>
                                
                                <div>
                                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Periode Waktu</Label>
                                  <Select value={newCondition.timePeriod} onValueChange={(value) => setNewCondition({...newCondition, timePeriod: value})}>
                                    <SelectTrigger className="h-10 bg-white">
                                      {newCondition.timePeriod ? (
                                        <span className="font-medium">{timePeriods.find(tp => tp.value === newCondition.timePeriod)?.label}</span>
                                      ) : (
                                      <SelectValue />
                                      )}
                                    </SelectTrigger>
                                    <SelectContent>
                                      {timePeriods.map((period) => (
                                        <SelectItem key={period.value} value={period.value}>
                                          <div className="flex flex-col">
                                            <span className="font-medium">{period.label}</span>
                                            <span className="text-xs text-gray-500">{period.description}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleAddCondition}
                                  disabled={!newCondition.metric || !newCondition.operator || !newCondition.value}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {editingConditionId ? "Update Kondisi" : "Simpan Kondisi"}
                                </Button>
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  onClick={handleCancelCondition}
                                >
                                  Batal
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Add Condition Button (when conditions exist) */}
                          {group.conditions.length > 0 && !showConditionForm && (
                            <Button 
                              variant="tertiary" 
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setActiveGroupId(group.id)
                                setShowConditionForm(true)
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Tambah Kondisi
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Fragment>
              ))}

              {/* Group Action Button */}
              <div className="flex justify-center">
                <Button 
                  variant="tertiary"
                  size="sm"
                  className="rounded-sm px-4 py-2"
                  onClick={handleAddGroup}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Grup
                </Button>
              </div>

              {/* Condition Summary */}
              <div className="bg-orange-50 border border-orange-200 rounded-sm p-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-orange-800">Ringkasan Kondisi:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-4 h-4 text-orange-600 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700 max-w-xs">
                        <div className="space-y-2">
                          <div className="font-medium text-white">Cara Kerjanya:</div>
                          <ul className="text-sm space-y-1">
                            <li>• Grup AND: SEMUA kondisi dalam grup harus terpenuhi</li>
                            <li>• Grup OR: SALAH SATU kondisi dalam grup harus terpenuhi</li>
                            <li>• Antar grup: SEMUA grup harus terpenuhi (THEN logic)</li>
                            <li>• Kondisi diperiksa setiap 5 menit</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                {/* Rule Summary in Programmatic Format */}
                <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 mb-3">
                  <code className="text-orange-800 font-mono text-sm">
                    {generateRuleSummary()}
                  </code>
                </div>
                
                {/* Indonesian Explanation */}
                <div className="space-y-1">
                  {generateIndonesianExplanation().map((explanation, index) => (
                    <p key={index} className="text-orange-700 text-sm">
                      {explanation}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-8 h-full overflow-y-auto">
            {/* Action Type Selection */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Tipe Aksi</Label>
                <Select value={actionType} onValueChange={setActionType} disabled={actions.length > 0}>
                  <SelectTrigger className="h-10 bg-white">
                    {actionType ? (
                        <div className="flex items-center gap-2">
                        {(() => {
                          const currentAction = actionTypes.find(action => action.value === actionType);
                          return currentAction ? (
                            <>
                              <currentAction.icon className="w-4 h-4 text-gray-700" />
                              <span className="font-medium">{currentAction.label}</span>
                            </>
                          ) : null;
                        })()}
                            </div>
                    ) : (
                      <SelectValue placeholder="Pilih tipe aksi" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <action.icon className="w-4 h-4 text-gray-700" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{action.label}</div>
                            <div className="text-xs text-gray-500">{action.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Configuration */}
            {actionType && renderActionConfiguration() && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Konfigurasi Aksi:</Label>
                  <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${actions.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                  {renderActionConfiguration()}
                </div>
              </div>
              </div>
            )}
              
            {/* Add Action Button */}
            {actionType && (
              <Button
                onClick={handleAddAction}
                disabled={!isActionValid() || actions.length > 0}
                className="w-full h-9 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Aksi
              </Button>
            )}

            {/* Telegram Notification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Aktifkan Notifikasi Telegram</Label>
                  <p className="text-xs text-gray-500 mt-1">Terima notifikasi saat aturan dipicu</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {telegramNotification ? "Aktif" : "Tidak Aktif"}
                  </span>
                  <Switch
                    checked={telegramNotification}
                    onCheckedChange={setTelegramNotification}
                  />
                </div>
              </div>
              
              {telegramNotification && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-sm text-success">
                    Notifikasi Telegram aktif. Konfigurasi pengaturan bot di halaman Settings.
                  </span>
                </div>
              )}
            </div>


            {/* Action Summary */}
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-success">Ringkasan Aksi:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-success cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white border-gray-700 max-w-xs">
                      <div className="space-y-2">
                        <div className="font-medium text-white">Cara Kerjanya:</div>
                        <ul className="text-sm space-y-1">
                          <li>• Aksi akan dijalankan saat kondisi terpenuhi</li>
                          <li>• Satu aksi per rule</li>
                          <li>• Notifikasi Telegram opsional</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {actions.length === 0 ? (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <span className="text-green-700 text-sm">Tidak ada aksi yang dikonfigurasi</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((action) => {
                    const actionTypeData = actionTypes.find(a => a.value === action.type)
                    
                    // Format action description based on type
                    let actionDescription = action.label
                    if (action.type === 'add_budget' || action.type === 'reduce_budget' || action.type === 'set_budget') {
                      actionDescription = `${action.label} - Rp ${Number(action.amount).toLocaleString()}`
                    } else if (action.type === 'start_campaign' || action.type === 'pause_campaign') {
                      actionDescription = `${action.label} (${action.campaignCount || selectedCampaigns.length} campaign${(action.campaignCount || selectedCampaigns.length) > 1 ? 's' : ''})`
                    } else if (action.type === 'duplicate_campaign') {
                      const suffix = action.suffix || '- Salinan'
                      actionDescription = `${action.label} "${suffix}" (${action.campaignCount || selectedCampaigns.length} campaign${(action.campaignCount || selectedCampaigns.length) > 1 ? 's' : ''})`
                    }
                    
                    return (
                      <div key={action.id} className="flex items-center justify-between p-3 bg-white border border-success/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          {actionTypeData?.icon && (
                            <actionTypeData.icon className="w-5 h-5 text-gray-700" />
                          )}
                          <span className="text-sm font-medium text-gray-700">
                            {actionDescription}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAction(action.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      
      case 5:
        return (
          <div className="h-full flex flex-col min-h-0">
            {/* Akun and Campaign Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 items-stretch">
              <div className="flex flex-col h-full min-h-0">
                <Label className="text-sm font-semibold text-gray-700 mb-3">
                  Pilih Akun
                  {loadingUsernames && <span className="ml-2 text-xs text-gray-500">(Memuat...)</span>}
                </Label>
                {/* Search Input */}
                <div className="relative mb-3 flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Cari akun atau email..."
                    value={searchUsername}
                    onChange={(e) => setSearchUsername(e.target.value)}
                    className="pl-9 h-10 bg-white"
                  />
                </div>
                {/* Select All Checkbox */}
                {!loadingUsernames && filteredUsernames.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-sm border border-gray-200 mb-3 flex-shrink-0">
                    <Checkbox
                      id="select-all-usernames"
                      checked={isAllFilteredSelected}
                      onCheckedChange={(checked) => handleSelectAllUsernames(checked as boolean)}
                    />
                    <Label htmlFor="select-all-usernames" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Pilih Semua {searchUsername ? `(${filteredUsernames.length} hasil)` : `(${usernamesList.length} akun)`}
                    </Label>
                  </div>
                )}
                <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto mb-3">
                  <div className="p-3 space-y-1">
                    {loadingUsernames ? (
                      <div className="text-center py-4 text-sm text-gray-500">Memuat akun...</div>
                    ) : usernamesList.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500">Tidak ada akun yang tersedia</div>
                    ) : filteredUsernames.length === 0 ? (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Tidak ada akun yang cocok dengan pencarian "{searchUsername}"
                      </div>
                    ) : (
                      filteredUsernames.map((username) => (
                      <div 
                        key={username.value} 
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-sm px-2 py-1.5 transition-colors"
                        onClick={() => {
                          if (selectedUsernames.includes(username.value)) {
                            setSelectedUsernames(selectedUsernames.filter(id => id !== username.value))
                          } else {
                            setSelectedUsernames([...selectedUsernames, username.value])
                          }
                        }}
                      >
                        <Checkbox
                          id={`username-${username.value}`}
                          checked={selectedUsernames.includes(username.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsernames([...selectedUsernames, username.value])
                            } else {
                              setSelectedUsernames(selectedUsernames.filter(id => id !== username.value))
                            }
                          }}
                        />
                        <Label htmlFor={`username-${username.value}`} className="text-sm text-gray-700 cursor-pointer">
                          {username.label}
                        </Label>
                      </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {selectedUsernames.length} akun dipilih
                    {usernamesList.length > 0 && (
                      <span className="ml-1 text-gray-400">
                        ({filteredUsernames.length} dari {usernamesList.length} akun)
                      </span>
                    )}
                  </p>
                  {searchUsername && (
                    <button
                      type="button"
                      onClick={() => setSearchUsername("")}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col h-full min-h-0">
                <Label className="text-sm font-semibold text-gray-700 mb-3">
                  Pilih Campaign
                  {loadingCampaigns && <span className="ml-2 text-xs text-gray-500">(Memuat...)</span>}
                </Label>
                {/* Filter Status Checkbox */}
                {selectedUsernames.length > 0 && !loadingCampaigns && campaignsList.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-sm border border-gray-200 mb-3 flex-shrink-0">
                    <Checkbox
                      id="filter-status-ongoing"
                      checked={campaignStatusFilter.includes('ongoing')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCampaignStatusFilter([...campaignStatusFilter, 'ongoing'])
                        } else {
                          setCampaignStatusFilter(campaignStatusFilter.filter(s => s !== 'ongoing'))
                        }
                      }}
                    />
                    <Label htmlFor="filter-status-ongoing" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Aktif
                    </Label>
                    <Checkbox
                      id="filter-status-paused"
                      checked={campaignStatusFilter.includes('paused')}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setCampaignStatusFilter([...campaignStatusFilter, 'paused'])
                        } else {
                          setCampaignStatusFilter(campaignStatusFilter.filter(s => s !== 'paused'))
                        }
                      }}
                    />
                    <Label htmlFor="filter-status-paused" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Pause
                    </Label>
                  </div>
                )}
                {/* Search Input */}
                {selectedUsernames.length > 0 && !loadingCampaigns && campaignsList.length > 0 && (
                  <div className="relative mb-3 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Cari nama campaign..."
                      value={searchCampaign}
                      onChange={(e) => setSearchCampaign(e.target.value)}
                      className="pl-9 h-10 bg-white"
                    />
                  </div>
                )}
                {selectedUsernames.length === 0 ? (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto flex flex-col items-center justify-center p-8 mb-3">
                    <FileSearch className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      Pilih akun terlebih dahulu untuk melihat campaign yang tersedia
                    </p>
                  </div>
                ) : loadingCampaigns ? (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto flex flex-col items-center justify-center p-8 mb-3">
                    <FileSearch className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">Memuat campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto flex flex-col items-center justify-center p-8 mb-3">
                    <FileSearch className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      Tidak ada campaign yang tersedia untuk akun yang dipilih
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto mb-3">
                    <div className="p-3 space-y-1">
                      {campaigns.map((campaign) => (
                        <div 
                          key={campaign.value} 
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-sm px-2 py-1.5 transition-colors"
                          onClick={() => {
                            if (selectedCampaigns.includes(campaign.value)) {
                              setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.value))
                            } else {
                              setSelectedCampaigns([...selectedCampaigns, campaign.value])
                            }
                          }}
                        >
                          <Checkbox
                            id={`campaign-${campaign.value}`}
                            checked={selectedCampaigns.includes(campaign.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedCampaigns([...selectedCampaigns, campaign.value])
                              } else {
                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.value))
                              }
                            }}
                          />
                          <span className={`w-2 h-2 rounded-full ${getCampaignStatusColor(campaign.state)}`}></span>
                          <Label htmlFor={`campaign-${campaign.value}`} className="text-sm text-gray-700 cursor-pointer flex flex-col">
                            <span>{campaign.label}</span>
                            {campaign.username && <span className="text-xs text-gray-500">{campaign.username}</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {selectedCampaigns.length} campaign dipilih
                    {campaignsList.length > 0 && (
                      <span className="ml-1 text-gray-400">
                        ({campaigns.length} dari {campaignsList.filter(c => campaignStatusFilter.includes(c.state)).length} campaign)
                      </span>
                    )}
                  </p>
                  {searchCampaign && (
                    <button
                      type="button"
                      onClick={() => setSearchCampaign("")}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      
      case 6:
        return (
          <div className="space-y-6 pb-4">
            {/* Card 1: Rule Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{ruleName || "Untitled Rule"}</h3>
                {ruleDescription && (
                  <p className="text-sm text-gray-600 mb-4">{ruleDescription}</p>
                )}
                <div className="flex flex-wrap gap-3 items-center">
                  {selectedCategory && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Kategori:</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                        {selectedCategory}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Prioritas:</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                      {priorities.find(p => p.value === selectedPriority)?.label || "Medium"}
                    </span>
                  </div>
                  {selectedInterval && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Interval:</span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                        {selectedInterval}
                      </span>
                    </div>
                  )}
                  {telegramNotification && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-success/10 text-success text-sm font-medium rounded-full flex items-center gap-2">
                        <Check className="w-3 h-3" />
                        Notifikasi Telegram
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Akun:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedUsernames.length > 0 
                          ? `${selectedUsernames.length} akun`
                          : "Tidak ada akun dipilih"
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Iklan:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedCampaigns.length > 0 
                          ? `${selectedCampaigns.length} iklan`
                          : "Tidak ada iklan dipilih"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Logic Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Logika Rule</h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="text-sm font-mono text-gray-900 leading-relaxed">
                  {generateLogicComponents()}
                </div>
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[95vh] flex flex-col p-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div>
                <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isEditMode ? "Edit Rule" : "Create Rule"}
                </DialogTitle>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {steps[currentStep - 1]?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 rounded-lg">
                <span className="text-xs sm:text-sm font-medium text-gray-600">Step {currentStep} of 6</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-0 bg-gray-50/50">
          <div className="hidden lg:flex items-center justify-between mb-2 overflow-x-auto py-0">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 mb-1 ${
                  currentStep > index + 1 
                        ? 'bg-success text-white' 
                    : currentStep === index + 1 
                        ? 'bg-primary text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                      {currentStep > index + 1 ? (
                        <Check className="w-3 h-3" />
                      ) : currentStep === index + 1 ? (
                        <StepIcon className="w-3 h-3" />
                      ) : (
                        <StepIcon className="w-3 h-3" />
                      )}
                </div>
                    <div className={`text-xs font-medium text-center ${
                    currentStep >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                      {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      currentStep > index + 1 ? 'bg-success' : 'bg-gray-200'
                  }`} />
                )}
                </Fragment>
              )
            })}
              </div>
          <div className="hidden md:flex lg:hidden items-center justify-start mb-2 overflow-x-auto py-2 gap-1">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <Fragment key={step.id}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 mb-1 ${
                      currentStep > index + 1 
                        ? 'bg-success text-white' 
                        : currentStep === index + 1 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {currentStep > index + 1 ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : currentStep === index + 1 ? (
                        <StepIcon className="w-2.5 h-2.5" />
                      ) : (
                        <StepIcon className="w-2.5 h-2.5" />
                      )}
          </div>
                    <div className={`text-[10px] font-medium text-center max-w-[60px] leading-tight ${
                      currentStep >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-3 h-0.5 ${
                      currentStep > index + 1 ? 'bg-success' : 'bg-gray-200'
                    }`} />
                  )}
                </Fragment>
              )
            })}
          </div>
          <div className="md:hidden flex items-center justify-between mb-2 px-2 py-1">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                currentStep <= 1 
                  ? 'bg-primary text-white' 
                  : 'bg-success text-white'
              }`}>
                {currentStep > 1 ? <Check className="w-3 h-3" /> : currentStep}
              </div>
              <div className="text-xs font-medium text-gray-900">
                {steps[currentStep - 1]?.title}
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {currentStep}/6
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6 py-4 sm:py-6">
          <div className="max-w-3xl mx-auto h-full overflow-y-auto">
            {renderStepContent()}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-0">
            <Button 
              variant="tertiary" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <div className="flex items-center gap-2 sm:gap-3">
              {currentStep > 1 && (
                <Button 
                  variant="tertiary"
                  onClick={handlePrevious}
                >
                  <ChevronRight className="w-4 h-4 mr-1 sm:mr-2 rotate-180" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              )}
              {currentStep < 6 ? (
                <div className="flex items-center gap-3">
                  {currentStep === 1 && (
                    <Button 
                      variant="tertiary" 
                      onClick={() => setShowTemplateModal(true)}
                      className="px-4 sm:px-6 py-2 sm:py-2.5"
                    >
                      <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Use Template</span>
                      <span className="sm:hidden">Template</span>
                    </Button>
                  )}
                  <Button 
                    onClick={handleNext} 
                    className="px-4 sm:px-6 py-2 sm:py-2.5"
                    disabled={!isStepValid}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleSave} 
                  className="px-4 sm:px-6 py-2 sm:py-2.5"
                >
                  <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{isEditMode ? "Update Rule" : "Save Rule"}</span>
                  <span className="sm:hidden">{isEditMode ? "Update" : "Save"}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Template Selection Modal */}
      <RuleTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </Dialog>
  )
}
