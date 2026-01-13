"use client"

import React, { useState, Fragment, useMemo } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Plus, X, ChevronRight, Clock, AlertTriangle, Calendar, ChevronDown, ChevronRight as ChevronRightIcon, HelpCircle, GripVertical, Trash2, Search, Check, Zap, DollarSign, Play, Pause as PauseIcon, Copy, TrendingDown, FileSearch, Target, Eye, Edit2, RefreshCw, Bell } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

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
  const [executionMode, setExecutionMode] = useState("continuous")
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [dateTimeMap, setDateTimeMap] = useState<Record<string, string[]>>({}) // Format: { "2025-12-25": ["09:00", "14:00"] }
  const [timeInput, setTimeInput] = useState("")
  const [showTimeConditions, setShowTimeConditions] = useState(false)
  const [showDaysOfWeek, setShowDaysOfWeek] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
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
    value: ""
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
  const [actionPercentage, setActionPercentage] = useState("")
  const [budgetAdjustmentType, setBudgetAdjustmentType] = useState<"amount" | "percentage">("amount")
  const [telegramNotification, setTelegramNotification] = useState(true)
  const [actions, setActions] = useState<any[]>([])
  
  // Action configuration states
  const [budgetAmount, setBudgetAmount] = useState("100.000")
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedCampaign, setSelectedCampaign] = useState("")
  const [telegramMessage, setTelegramMessage] = useState("")
  
  // Campaign and Username states
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([])
  
  // Data from API states
  const [usernamesList, setUsernamesList] = useState<Array<{value: string, label: string, nama_toko?: string}>>([])
  const [campaignsList, setCampaignsList] = useState<Array<{value: string, label: string, username?: string, state: string, campaignId?: string, accountId?: string}>>([])
  const [accountNameMap, setAccountNameMap] = useState<Record<string, string>>({}) // Map accountId (id_toko) to nama_toko
  const [loadingUsernames, setLoadingUsernames] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [searchUsername, setSearchUsername] = useState("")
  const [searchCampaign, setSearchCampaign] = useState("")
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string[]>(['ongoing', 'paused'])
  
  // Telegram status states
  const [hasTelegram, setHasTelegram] = useState<boolean | null>(null)
  const [checkingTelegram, setCheckingTelegram] = useState(false)
  

  // Reset form to default values
  const resetForm = React.useCallback(() => {
    setCurrentStep(1)
    setRuleName("")
    setRuleDescription("")
    setSelectedCategory("")
    setSelectedPriority("medium")
    setExecutionMode("continuous")
    setSelectedTimes([])
    setSelectedDays([])
    setSelectedDates([])
    setSelectedInterval("5 menit")
    setCustomInterval("")
    setRuleGroups([
      {
        id: "group-1",
        type: "IF",
        logicalOperator: "AND",
        conditions: []
      }
    ])
    setActiveGroupId("group-1")
    setActionType("")
    setActionAmount("")
    setActionPercentage("")
    setBudgetAdjustmentType("amount")
    setTelegramNotification(true)
    setActions([])
    setBudgetAmount("100.000")
    setSelectedAccount("")
    setSelectedCampaign("")
    setTelegramMessage("")
    setSelectedCampaigns([])
    setSelectedUsernames([])
    setSearchUsername("")
    setSearchCampaign("")
    setCampaignStatusFilter(['ongoing', 'paused'])
    setErrors({})
    setShowConditionForm(false)
    setEditingConditionId(null)
    setNewCondition({
      metric: "",
      operator: "",
      value: ""
    })
    setConditionGroups([])
    setShowTimeConditions(false)
    setShowDaysOfWeek(false)
    setShowIntervalSelection(false)
    setTimeInput("")
  }, [])

  // Initialize form when modal opens or mode changes
  React.useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      resetForm()
      return
    }

    // Always reset step to 1 when modal opens (for both create and edit mode)
    setCurrentStep(1)

    if (isEditMode && initialData) {
      // Load data for edit mode (but keep step at 1)
      setRuleName(initialData.name || "")
      setRuleDescription(initialData.description || "")
      setSelectedCategory(initialData.category || "")
      setSelectedPriority(initialData.priority || "medium")
      setExecutionMode(initialData.executionMode || "continuous")
      setSelectedTimes(initialData.selectedTimes || [])
      setSelectedDays(initialData.selectedDays || [])
      setSelectedDates(initialData.selectedDates ? initialData.selectedDates.map((d: string) => new Date(d)) : [])
      setDateTimeMap(initialData.dateTimeMap || {})
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
        "telegram_notification": "Notifikasi Telegram"
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
    } else {
      // Reset to default for create mode (resetForm already sets step to 1)
      resetForm()
    }
  }, [isOpen, isEditMode, initialData, resetForm])

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


  // Check telegram status when modal is opened or step 4 (actions) is opened
  React.useEffect(() => {
    if (isOpen) {
      // Check status immediately when modal opens, and again when reaching step 4
      if (currentStep === 4 || hasTelegram === null) {
        checkTelegramStatus()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isOpen])

  // Check telegram status
  const checkTelegramStatus = async () => {
    try {
      setCheckingTelegram(true)
      const response = await authenticatedFetch('/api/user/telegram-status')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Ensure we update state with boolean value
          setHasTelegram(!!result.data?.hasTelegram)
          console.log('Telegram status updated:', result.data?.hasTelegram, 'chatid:', result.data?.chatid_tele)
        } else {
          // If API returns success: false, assume no Telegram
          setHasTelegram(false)
        }
      } else {
        // If API call fails, assume no Telegram (but don't show error to user)
        setHasTelegram(false)
      }
    } catch (error) {
      console.error('Error checking telegram status:', error)
      setHasTelegram(false)
    } finally {
      setCheckingTelegram(false)
    }
  }

  // Handle setup telegram button click
  const handleSetupTelegram = async () => {
    try {
      const response = await authenticatedFetch('/api/user/setup-telegram')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data.botUrl) {
          // Open bot in new tab
          window.open(result.data.botUrl, '_blank')
          
          // Show instruction
          toast.success("Bot Telegram telah dibuka", {
            description: "Silakan kirim /start di chat bot. Sistem akan otomatis mendeteksi setelah Anda mengirim /start.",
            duration: 10000,
          })
          
          // Start polling untuk cek status setiap 3 detik
          let pollCount = 0
          const maxPolls = 20 // 20 x 3 detik = 60 detik
          const pollInterval = setInterval(async () => {
            pollCount++
            const response = await authenticatedFetch('/api/user/telegram-status')
            if (response.ok) {
              const result = await response.json()
              if (result.success && result.data.hasTelegram) {
                clearInterval(pollInterval)
                setHasTelegram(true)
                toast.success("Setup Telegram berhasil!", {
                  description: "Notifikasi Telegram telah dikonfigurasi.",
                })
              } else if (pollCount >= maxPolls) {
                clearInterval(pollInterval)
                toast.info("Setup belum selesai", {
                  description: "Silakan kirim /start di bot Telegram, lalu klik 'Cek Status' untuk memverifikasi.",
                })
              }
            }
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Error setting up telegram:', error)
      toast.error("Gagal membuka bot Telegram", {
        description: "Silakan coba lagi.",
      })
    }
  }


  // Fetch usernames from /api/accounts - fetch ALL accounts with cookies AND status_cookies aktif
  const fetchUsernames = async () => {
    try {
      setLoadingUsernames(true)
      // Fetch all accounts with cookies and status_cookies = aktif
      let allAccounts: Array<{username: string, email: string, nama_toko?: string}> = []
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
          const accounts = result.data.accounts as Array<{username: string, email: string, nama_toko?: string}>
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
      
      // Map to username options - use nama_toko as label, fallback to username if nama_toko is not available
      const usernameOptions = allAccounts.map(acc => ({
        value: acc.username,
        label: acc.nama_toko || acc.username,
        nama_toko: acc.nama_toko
      }))
      
      // Build account name map for tooltip
      const nameMap: Record<string, string> = {}
      allAccounts.forEach(acc => {
        if (acc.username && acc.nama_toko) {
          nameMap[acc.username] = acc.nama_toko
        }
      })
      setAccountNameMap(nameMap)
      
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
        const campaigns = result.data as Array<{id: string, title: string, account_username: string, state: string, account_id?: string}>
        
        // Filter only ongoing and paused campaigns, group by account
        const campaignOptions = campaigns
          .filter(c => c.state === 'ongoing' || c.state === 'paused')
          .map(c => ({
            value: c.id.toString(),
            label: c.title,
            username: c.account_username,
            state: c.state,
            campaignId: c.id.toString(),
            accountId: c.account_username || c.account_id || ''
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
    "Scheduling"
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
      // Create mapping toko-campaign untuk membedakan campaign dari toko mana
      // Format: {toko1: ["campaign1", "campaign2"], toko2: ["campaign3", "campaign4", "campaign5"]}
      const campaignAssignments: Record<string, string[]> = {}
      
      selectedCampaigns.forEach(campaignId => {
        const campaign = campaignsList.find(c => c.value === campaignId)
        if (campaign?.username) {
          if (!campaignAssignments[campaign.username]) {
            campaignAssignments[campaign.username] = []
          }
          campaignAssignments[campaign.username].push(campaignId)
        }
      })
      
      const ruleData = {
        id: isEditMode && initialData ? initialData.id : Date.now().toString(),
        name: ruleName,
        description: ruleDescription,
        category: selectedCategory,
        priority: selectedPriority,
        executionMode: executionMode,
        selectedTimes,
        selectedDays,
        selectedDates: selectedDates.map(d => format(d, 'yyyy-MM-dd')),
        dateTimeMap: dateTimeMap, // Format: { "2025-12-25": ["09:00", "14:00"] }
        selectedInterval: selectedInterval,
        customInterval: customInterval,
        ruleGroups,
        conditionGroups,
        actions,
        telegramNotification,
        campaignIds: selectedCampaigns,
        usernames: selectedUsernames,
        campaignAssignments, // Mapping toko-campaign
        status: isEditMode ? (initialData?.status || "draft") : "draft",
        createdAt: isEditMode && initialData ? initialData.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      onSave(ruleData)
      onClose()
    }
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

  const handleAddDate = (date: Date | undefined) => {
    if (!date) {
      console.log('⚠️ handleAddDate called with undefined date')
      return
    }
    const dateString = format(date, 'yyyy-MM-dd')
    const dateExists = selectedDates.some(d => format(d, 'yyyy-MM-dd') === dateString)
    if (!dateExists) {
      const newDates = [...selectedDates, date]
      setSelectedDates(newDates)
      // Initialize empty times array for new date
      setDateTimeMap(prev => ({
        ...prev,
        [dateString]: []
      }))
      console.log('✅ Date added:', dateString, 'Total dates:', newDates.length, 'DateTimeMap keys:', Object.keys({...dateTimeMap, [dateString]: []}))
    } else {
      console.log('⚠️ Date already exists:', dateString)
    }
    // Close popover after a short delay to allow state update
    setTimeout(() => {
      setDatePickerOpen(false)
    }, 200)
  }

  const handleRemoveDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    setSelectedDates(selectedDates.filter(d => format(d, 'yyyy-MM-dd') !== dateString))
    // Remove date from time map
    setDateTimeMap(prev => {
      const newMap = { ...prev }
      delete newMap[dateString]
      return newMap
    })
  }

  const handleAddTimeToDate = (dateString: string, time: string) => {
    if (!time || !dateString) return
    setDateTimeMap(prev => {
      const currentTimes = prev[dateString] || []
      if (!currentTimes.includes(time)) {
        return {
          ...prev,
          [dateString]: [...currentTimes, time]
        }
      }
      return prev
    })
  }

  const handleRemoveTimeFromDate = (dateString: string, time: string) => {
    setDateTimeMap(prev => {
      const currentTimes = prev[dateString] || []
      return {
        ...prev,
        [dateString]: currentTimes.filter(t => t !== time)
      }
    })
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
      
      // Validasi minimal 5 menit (300 detik)
      if (seconds < 300) {
        toast.error("Interval minimal adalah 5 menit (300 detik)")
        return
      }
      
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
            ? { ...group, conditions: group.conditions.map((c: any) => 
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
        value: ""
      })
      setShowConditionForm(false)
    }
  }
  
  const handleEditCondition = (conditionId: string, groupId: string) => {
    // Find the condition
    const group = ruleGroups.find(g => g.id === groupId)
    const condition = group?.conditions.find((c: any) => c.id === conditionId)
    
    if (condition) {
      // Set form values
      setNewCondition({
        metric: condition.metric,
        operator: condition.operator,
        value: condition.value
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
      value: ""
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
      
      const conditionStrings = group.conditions.map((condition: any) => {
        const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
        const operator = operators.find(op => op.value === condition.operator)?.label || condition.operator
        
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
    
    const explanations: string[] = []
    
    ruleGroups.forEach((group, groupIndex) => {
      if (group.conditions.length === 0) return
      
      const conditionExplanations = group.conditions.map((condition: any) => {
        const metric = metrics.find(m => m.value === condition.metric)?.label || condition.metric
        const operator = operators.find(op => op.value === condition.operator)?.label || condition.operator
        
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
        
        return `Jika ${metric} ${indonesianOperator} ${condition.value}`
      })
      
      if (conditionExplanations.length === 1) {
        explanations.push(conditionExplanations[0])
      } else {
        const connector = group.logicalOperator === "AND" ? "dan" : "atau"
        explanations.push(conditionExplanations.join(` ${connector} `))
      }
    })
    
    // Add "Kemudian" for subsequent groups
    const result: string[] = []
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
          case "telegram_notification":
            actionText = `  Notifikasi Telegram: "${action.message || 'Pesan kosong'}"`
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
              <Badge key={`conn-${groupIndex}-${idx}`} variant={group.logicalOperator === "AND" ? "default" : "secondary"} className={`mx-1 font-bold ${group.logicalOperator === "AND" ? "!bg-success/20 !text-success border-0 rounded-none" : "!bg-warning/20 !text-warning border-0 rounded-none"}`}>
                {connector.trim()}
              </Badge>
            )
          }
          conditionParts.push(<span key={`metric-${groupIndex}-${idx}`}>{condition.metric}</span>)
          conditionParts.push(<span key={`op-${groupIndex}-${idx}`} className="text-primary font-bold"> {condition.operator} </span>)
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
              <Badge variant={nextGroup.type === "AND" ? "default" : "secondary"} className={`px-3 py-1 font-bold ${nextGroup.type === "AND" ? "!bg-success/20 !text-success border-0 rounded-none" : "!bg-warning/20 !text-warning border-0 rounded-none"}`}>
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
          case "telegram_notification":
            actionElement = (
              <div key={`action-${actionIndex}`} className="ml-2">
                Notifikasi Telegram: <span className="font-bold">"{action.message || 'Pesan kosong'}"</span>
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
        if (budgetAdjustmentType === "amount") {
          if (actionAmount && validateAmount(actionAmount)) {
            actionData.amount = actionAmount
            actionData.adjustmentType = "amount"
            isValid = true
          }
        } else {
          if (actionPercentage && validatePercentage(actionPercentage)) {
            actionData.percentage = actionPercentage
            actionData.adjustmentType = "percentage"
            isValid = true
          }
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
      
      case "telegram_notification":
        if (telegramMessage && telegramMessage.trim().length > 0) {
          actionData.message = telegramMessage.trim()
          isValid = true
        }
        break
    }

    if (isValid) {
      setActions([...actions, actionData])
      // Reset form based on action type
      if (actionType === "add_budget" || actionType === "reduce_budget") {
        setActionAmount("")
        setActionPercentage("")
        setBudgetAdjustmentType("amount")
      } else if (actionType === "set_budget") {
        setBudgetAmount("100.000")
      } else if (actionType === "start_campaign" || actionType === "pause_campaign") {
        // No need to reset - campaigns are selected in Step 5
      } else if (actionType === "telegram_notification") {
        setTelegramMessage("")
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

  const validatePercentage = (percentage: string) => {
    const numPercentage = Number(percentage)
    return !isNaN(numPercentage) && numPercentage > 0 && numPercentage <= 100
  }

  const renderActionConfiguration = () => {
    switch (actionType) {
      case "add_budget":
      case "reduce_budget":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-2 block">Tipe Penyesuaian</Label>
              <RadioGroup
                value={budgetAdjustmentType}
                onValueChange={(value: "amount" | "percentage") => {
                  setBudgetAdjustmentType(value)
                  setActionAmount("")
                  setActionPercentage("")
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount" id="adjustment-amount" />
                  <Label htmlFor="adjustment-amount" className="text-sm font-normal cursor-pointer">
                    Jumlah Tetap (Rp)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="adjustment-percentage" />
                  <Label htmlFor="adjustment-percentage" className="text-sm font-normal cursor-pointer">
                    Persentase (%)
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {budgetAdjustmentType === "amount" ? (
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
            ) : (
              <div>
                <Label className="text-xs font-medium text-gray-600 mb-1 block">Persentase (%)</Label>
                <Input
                  type="number"
                  value={actionPercentage}
                  onChange={(e) => setActionPercentage(e.target.value)}
                  placeholder="Masukkan persentase (contoh: 10)"
                  className="h-10 bg-white"
                  min="0"
                  max="100"
                />
                <div className="mt-2 text-xs text-gray-500">
                  Contoh: 10 (untuk menambah/mengurangi 10% dari budget saat ini)
                </div>
              </div>
            )}
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

      case "telegram_notification":
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1 block">Pesan Telegram</Label>
              <Textarea
                value={telegramMessage}
                onChange={(e) => setTelegramMessage(e.target.value)}
                placeholder="Masukkan pesan yang akan dikirim ke Telegram..."
                className="min-h-[120px] bg-white resize-none"
              />
              <div className="mt-2 text-xs text-gray-500">
                Pesan ini akan dikirim ke Telegram saat rule terpicu. Anda bisa menggunakan variabel seperti {'{ruleName}'}, {'{time}'}, {'{action}'}, dll.
              </div>
            </div>
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
        if (budgetAdjustmentType === "amount") {
          return actionAmount && validateAmount(actionAmount)
        } else {
          return actionPercentage && validatePercentage(actionPercentage)
        }
      case "set_budget":
        return budgetAmount && !isNaN(Number(budgetAmount.replace(/\./g, '')))
      case "start_campaign":
      case "pause_campaign":
        // Valid without additional config - campaigns selected in Step 5
        return true
      case "telegram_notification":
        return telegramMessage && telegramMessage.trim().length > 0
      default:
        return false
    }
  }

  const metrics = [
    { value: "broad_gmv", label: "GMV", unit: "Rp (Rupiah)", description: "Gross Merchandise Value" },
    { value: "broad_order", label: "Pesanan", unit: "(tanpa unit)", description: "Jumlah pesanan" },
    { value: "broad_roi", label: "ROAS", unit: "(tanpa unit)", description: "Return on Ad Spend" },
    { value: "acos", label: "ACOS", unit: "% (Persen)", description: "Persentase Biaya Iklan" },
    { value: "click", label: "Klik", unit: "(tanpa unit)", description: "Jumlah klik" },
    { value: "cost", label: "Spend", unit: "Rp (Rupiah)", description: "Total ad spend" },
    { value: "cpc", label: "CPS", unit: "Rp (Rupiah)", description: "Cost per sales" },
    { value: "ctr", label: "CTR", unit: "% (Persen)", description: "Click Through Rate" },
    { value: "impression", label: "Impresi", unit: "(tanpa unit)", description: "Jumlah impresi iklan" },
    { value: "view", label: "View", unit: "(tanpa unit)", description: "Jumlah view" },
    { value: "cpm", label: "CPM", unit: "Rp (Rupiah)", description: "Cost per 1000 impresi (spend / impresi * 1000)" },
    { value: "saldo", label: "Saldo", unit: "Rp (Rupiah)", description: "Saldo iklan toko (ad balance)" }
  ]

  const operators = [
    { value: "greater_than", label: "Lebih dari (>)", description: "Nilai lebih dari" },
    { value: "less_than", label: "Kurang dari (<)", description: "Nilai kurang dari" },
    { value: "greater_equal", label: "Lebih dari atau sama dengan (>=)", description: "Nilai lebih dari atau sama dengan" },
    { value: "less_equal", label: "Kurang dari atau sama dengan (<=)", description: "Nilai kurang dari atau sama dengan" },
    { value: "equal", label: "Sama dengan (=)", description: "Nilai sama dengan" },
    { value: "not_equal", label: "Tidak sama dengan (!=)", description: "Nilai tidak sama dengan" }
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
      value: "telegram_notification",
      label: "Notifikasi Telegram",
      icon: Bell,
      description: "Kirim notifikasi ke Telegram dengan pesan custom"
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

  // Handle select all campaigns
  const handleSelectAllCampaigns = (checked: boolean) => {
    if (checked) {
      // Select all filtered campaigns
      const allFilteredValues = campaigns.map((c: any) => c.value)
      // Merge dengan yang sudah dipilih sebelumnya (yang tidak ada di filtered list)
      const existingSelected = selectedCampaigns.filter(
        (campaign: string) => !campaigns.find((c: any) => c.value === campaign)
      )
      setSelectedCampaigns([...existingSelected, ...allFilteredValues])
    } else {
      // Deselect all filtered campaigns
      setSelectedCampaigns(selectedCampaigns.filter(
        (campaign: string) => !campaigns.find((c: any) => c.value === campaign)
      ))
    }
  }

  const isAllFilteredCampaignsSelected = React.useMemo(() => {
    if (campaigns.length === 0) return false
    return campaigns.every((campaign: any) => selectedCampaigns.includes(campaign.value))
  }, [campaigns, selectedCampaigns])

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
                    <p className="text-sm text-destructive mt-1">{errors.ruleName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">
                    Category *
                  </Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className={`h-9 bg-white ${errors.category ? "border-destructive" : ""}`}>
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
                    <p className="text-sm text-destructive mt-1">{errors.category}</p>
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDaysOfWeek(!showDaysOfWeek)
                    }}
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

                  {/* Tanggal Tertentu */}
                  <div 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-sm cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      setShowDatePicker(!showDatePicker)
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Tanggal Tertentu (Opsional)</span>
                    </div>
                    {showDatePicker ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                  </div>

                  {showDatePicker && (
                    <div 
                      className="p-3 border border-gray-200 rounded-sm space-y-3"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div>
                        <Label className="text-sm font-medium text-gray-700 mb-2 block">Pilih Tanggal:</Label>
                        <Popover 
                          open={datePickerOpen} 
                          onOpenChange={(open) => {
                            setDatePickerOpen(open)
                          }}
                          modal={true}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                setDatePickerOpen(!datePickerOpen)
                              }}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {selectedDates.length > 0 
                                ? `${selectedDates.length} tanggal dipilih`
                                : "Pilih tanggal"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-0" 
                            align="start"
                            onInteractOutside={(e) => {
                              e.preventDefault()
                            }}
                            onEscapeKeyDown={(e) => {
                              e.preventDefault()
                            }}
                          >
                            <div 
                              className="p-2"
                              onClick={(e) => {
                                // Prevent clicks inside calendar from bubbling
                                e.stopPropagation()
                              }}
                            >
                              <CalendarComponent
                                mode="multiple"
                                selected={selectedDates}
                                onSelect={(dates: Date[] | undefined) => {
                                  if (!dates) {
                                    setSelectedDates([])
                                    setDateTimeMap({})
                                    return
                                  }
                                  
                                  const currentDateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'))
                                  const newDateStrings = dates.map(d => format(d, 'yyyy-MM-dd'))
                                  
                                  const addedDates = dates.filter(d => {
                                    const dateString = format(d, 'yyyy-MM-dd')
                                    return !currentDateStrings.includes(dateString)
                                  })
                                  
                                  const removedDates = selectedDates.filter(d => {
                                    const dateString = format(d, 'yyyy-MM-dd')
                                    return !newDateStrings.includes(dateString)
                                  })
                                  
                                  setSelectedDates(dates)
                                  
                                  if (addedDates.length > 0) {
                                    setDateTimeMap(prev => {
                                      const newMap = { ...prev }
                                      addedDates.forEach(date => {
                                        const dateString = format(date, 'yyyy-MM-dd')
                                        if (!newMap[dateString]) {
                                          newMap[dateString] = []
                                        }
                                      })
                                      return newMap
                                    })
                                    setTimeout(() => {
                                      setDatePickerOpen(false)
                                    }, 200)
                                  }
                                  
                                  if (removedDates.length > 0) {
                                    setDateTimeMap(prev => {
                                      const newMap = { ...prev }
                                      removedDates.forEach(date => {
                                        const dateString = format(date, 'yyyy-MM-dd')
                                        delete newMap[dateString]
                                      })
                                      return newMap
                                    })
                                  }
                                }}
                                locale={id}
                                initialFocus
                                disabled={(date) => {
                                  const today = new Date()
                                  today.setHours(0, 0, 0, 0)
                                  const dateToCheck = new Date(date)
                                  dateToCheck.setHours(0, 0, 0, 0)
                                  return dateToCheck < today
                                }}
                              />
                              <div className="mt-2 pt-2 border-t text-xs text-gray-500 text-center">
                                Klik tanggal untuk menambah. Popover akan tertutup otomatis.
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>


                      {selectedDates.length > 0 && (
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-gray-700 mb-2 block">Tanggal Terpilih & Waktu Eksekusi:</Label>
                          {selectedDates.map((date, index) => {
                            const dateString = format(date, 'yyyy-MM-dd')
                            const times = dateTimeMap[dateString] || []
                            const isPast = new Date(dateString) < new Date(format(new Date(), 'yyyy-MM-dd'))
                            
                            return (
                              <div key={`date-${dateString}-${index}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="font-medium text-gray-900">
                                      {format(date, 'dd MMM yyyy', { locale: id })}
                                    </span>
                                    {isPast && (
                                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Sudah lewat</span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveDate(date)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Time Input for this date */}
                                <div className="mt-2 space-y-2">
                                  <Label className="text-xs font-medium text-gray-600">Waktu Eksekusi:</Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="time"
                                      value={timeInput}
                                      onChange={(e) => setTimeInput(e.target.value)}
                                      className="w-32 text-sm"
                                      placeholder="HH:MM"
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        if (timeInput) {
                                          handleAddTimeToDate(dateString, timeInput)
                                          setTimeInput("")
                                        }
                                      }}
                                      disabled={!timeInput || times.includes(timeInput)}
                                      className="bg-primary hover:bg-primary/90 text-white text-xs"
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Tambah
                                    </Button>
                                  </div>
                                  
                                  {/* Quick time buttons */}
                                  <div className="flex gap-1 flex-wrap">
                                    {['09:00', '12:00', '15:00', '18:00', '21:00'].map((quickTime) => (
                                      <Button
                                        key={quickTime}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddTimeToDate(dateString, quickTime)}
                                        disabled={times.includes(quickTime)}
                                        className="text-xs h-7 px-2"
                                      >
                                        {quickTime}
                                      </Button>
                                    ))}
                                  </div>
                                  
                                  {/* Display selected times */}
                                  {times.length > 0 && (
                                    <div className="mt-2">
                                      <div className="flex flex-wrap gap-1">
                                        {times.map((time, timeIndex) => (
                                          <div key={timeIndex} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                                            <Clock className="w-3 h-3" />
                                            <span>{time}</span>
                                            <button
                                              onClick={() => handleRemoveTimeFromDate(dateString, time)}
                                              className="text-primary hover:text-primary/80 ml-1"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {times.length === 0 && (
                                    <p className="text-xs text-gray-500 italic">Belum ada waktu eksekusi dipilih untuk tanggal ini</p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
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
                            min="300"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleSetCustomInterval}
                            disabled={!customInterval || isNaN(Number(customInterval)) || parseInt(customInterval) < 300}
                            className="bg-gray-500 hover:bg-gray-600 text-white"
                          >
                            Set
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Saat ini: {selectedInterval}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Minimal: 300 detik (5 menit)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ringkasan Jadwal Aturan - Hidden when Critical Mode is active */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-gray-900">Ringkasan Jadwal Aturan</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 min-w-[60px]">Mode:</span>
                    <span className="text-gray-900">
                      {executionMode === "continuous" ? "Terus Menerus (24/7)" : executionMode === "specific" ? "Waktu Tertentu" : "Berdasarkan Interval"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600 min-w-[60px]">Interval:</span>
                    <span className="text-gray-900">{executionMode === "interval" ? selectedInterval : "5 menit"}</span>
                  </div>
                  {executionMode === "specific" && selectedTimes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600 min-w-[60px]">Waktu:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedTimes.map((time, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0.5 h-5">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {executionMode === "specific" && selectedDays.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-600 min-w-[60px]">Hari:</span>
                      <div className="flex flex-wrap gap-1">
                        {selectedDays.map(day => {
                          const dayLabel = daysOfWeek.find(d => d.id === day)?.label
                          return dayLabel ? (
                            <Badge key={day} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-1.5 py-0.5 h-5">
                              {dayLabel}
                            </Badge>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  {executionMode === "specific" && selectedDates.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="font-medium text-gray-600 min-w-[60px] pt-0.5">Tanggal & Waktu:</span>
                      <div className="flex-1 space-y-1.5">
                        {selectedDates.map((date, idx) => {
                          const dateString = format(date, 'yyyy-MM-dd')
                          const times = dateTimeMap[dateString] || []
                          return (
                            <div key={idx} className="bg-white border border-gray-200 rounded p-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span className="font-medium text-gray-900 text-xs">{format(date, 'dd MMM yyyy', { locale: id })}</span>
                              </div>
                              {times.length > 0 ? (
                                <div className="flex flex-wrap gap-1 ml-5">
                                  {times.map((time, timeIdx) => (
                                    <Badge key={timeIdx} variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0.5 h-5">
                                      <Clock className="w-3 h-3 mr-0.5" />
                                      {time}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic text-xs ml-5">Belum ada waktu dipilih</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
                          {group.conditions.map((condition: any, index: number) => {
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
                                <div className="px-3 py-1 bg-success/10 text-success rounded-full text-sm font-medium">
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
                                        ? { ...g, conditions: g.conditions.filter((_: any, i: number) => i !== index) }
                                        : g
                                    ))
                                  }}
                                    disabled={showConditionForm}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
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
                              <div className="grid grid-cols-3 gap-3 mb-3">
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
                {checkingTelegram ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Memeriksa...</span>
                  </div>
                ) : hasTelegram === false || hasTelegram === null ? (
                  <Button
                    onClick={handleSetupTelegram}
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    Setup Telegram
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {telegramNotification ? "Aktif" : "Tidak Aktif"}
                    </span>
                    <Switch
                      checked={telegramNotification}
                      onCheckedChange={setTelegramNotification}
                    />
                  </div>
                )}
              </div>
              
              {hasTelegram === false || hasTelegram === null ? (
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div className="flex-1">
                    <span className="text-sm text-warning font-medium block">
                      Telegram belum dikonfigurasi
                    </span>
                    <span className="text-xs text-gray-600 mt-1 block">
                      Klik tombol "Setup Telegram" untuk mengkonfigurasi notifikasi Telegram.
                    </span>
                  </div>
                </div>
              ) : telegramNotification && (
                <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-success">
                      Notifikasi Telegram aktif. Notifikasi akan dikirim ke chat Telegram Anda.
                    </span>
                    <Button
                      onClick={checkTelegramStatus}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Cek Status
                    </Button>
                  </div>
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
                <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                  <span className="text-success text-sm">Tidak ada aksi yang dikonfigurasi</span>
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
                    } else if (action.type === 'telegram_notification') {
                      actionDescription = `${action.label}: "${action.message || 'Pesan kosong'}"`
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
                      <div className="space-y-1">
                        {filteredUsernames.map((username) => {
                          const handleToggle = () => {
                            const isSelected = selectedUsernames.includes(username.value)
                            
                            if (isSelected) {
                              const newSelection = selectedUsernames.filter(id => id !== username.value)
                              setSelectedUsernames(newSelection)
                            } else {
                              const newSelection = [...selectedUsernames, username.value]
                              setSelectedUsernames(newSelection)
                            }
                          }
                          
                          return (
                            <div 
                              key={username.value} 
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-sm px-2 py-1.5 transition-colors group border border-transparent hover:border-gray-300 rounded-md"
                              onClick={(e) => {
                                // Prevent double toggle when clicking checkbox directly
                                const target = e.target as HTMLElement
                                const isCheckbox = target.closest('button') || target.getAttribute('role') === 'checkbox' || target.closest('[role="checkbox"]')
                                
                                if (isCheckbox) {
                                  return
                                }
                                
                                // Prevent default behavior that might trigger native checkbox
                                e.preventDefault()
                                e.stopPropagation()
                                
                                handleToggle()
                              }}
                              onMouseDown={(e) => {
                                // Prevent default on mousedown to prevent label behavior
                                const target = e.target as HTMLElement
                                if (!target.closest('button') && target.getAttribute('role') !== 'checkbox' && !target.closest('[role="checkbox"]')) {
                                  e.preventDefault()
                                }
                              }}
                            >
                              <Checkbox
                                id={`username-${username.value}`}
                                checked={selectedUsernames.includes(username.value)}
                                onCheckedChange={(checked) => {
                                  // Use functional update to ensure we have the latest state
                                  setSelectedUsernames(prev => {
                                    if (checked) {
                                      if (prev.includes(username.value)) {
                                        return prev
                                      }
                                      const newSelection = [...prev, username.value]
                                      return newSelection
                                    } else {
                                      const newSelection = prev.filter(id => id !== username.value)
                                      return newSelection
                                    }
                                  })
                                }}
                                className="group-hover:border-primary flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                }}
                              />
                              <div 
                                className="text-sm text-gray-700 cursor-pointer flex-1 select-none"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  e.preventDefault()
                                  handleToggle()
                                }}
                              >
                                {username.label}
                              </div>
                            </div>
                          )
                        })}
                      </div>
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
                  Pilih Iklan
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
                {/* Select All Campaigns Checkbox */}
                {selectedUsernames.length > 0 && !loadingCampaigns && campaigns.length > 0 && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-sm border border-gray-200 mb-3 flex-shrink-0">
                    <Checkbox
                      id="select-all-campaigns"
                      checked={isAllFilteredCampaignsSelected}
                      onCheckedChange={(checked) => handleSelectAllCampaigns(checked as boolean)}
                    />
                    <Label htmlFor="select-all-campaigns" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Pilih Semua {searchCampaign ? `(${campaigns.length} hasil)` : `(${campaigns.length} iklan)`}
                    </Label>
                  </div>
                )}
                {/* Search Input */}
                {selectedUsernames.length > 0 && !loadingCampaigns && campaignsList.length > 0 && (
                  <div className="relative mb-3 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Cari nama iklan..."
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
                      Pilih akun terlebih dahulu untuk melihat iklan yang tersedia
                    </p>
                  </div>
                ) : loadingCampaigns ? (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto flex flex-col items-center justify-center p-8 mb-3">
                    <FileSearch className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">Memuat iklan...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto flex flex-col items-center justify-center p-8 mb-3">
                    <FileSearch className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500 text-center">
                      Tidak ada iklan yang tersedia untuk akun yang dipilih
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 border border-gray-300 rounded-sm bg-white overflow-y-auto mb-3">
                    <div className="p-3 space-y-1">
                      {campaigns.map((campaign) => {
                        const accountId = campaign.accountId || campaign.username || ''
                        const namaToko = accountNameMap[accountId] || campaign.username || accountId || 'Unknown'
                        const campaignId = campaign.campaignId || campaign.value
                        const tooltipText = `${campaign.label}\n${namaToko} | ID Iklan: ${campaignId}`
                        
                        const handleToggle = () => {
                          const isSelected = selectedCampaigns.includes(campaign.value)
                          
                          if (isSelected) {
                            const newSelection = selectedCampaigns.filter(id => id !== campaign.value)
                            setSelectedCampaigns(newSelection)
                          } else {
                            const newSelection = [...selectedCampaigns, campaign.value]
                            setSelectedCampaigns(newSelection)
                          }
                        }
                        
                        return (
                          <div 
                            key={campaign.value} 
                            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-sm px-2 py-1.5 transition-colors border border-transparent hover:border-gray-300 rounded-md"
                            onClick={(e) => {
                              // Prevent double toggle when clicking checkbox directly
                              const target = e.target as HTMLElement
                              const isCheckbox = target.closest('button') || target.getAttribute('role') === 'checkbox' || target.closest('[role="checkbox"]')
                              
                              if (isCheckbox) {
                                return
                              }
                              
                              // Prevent default behavior that might trigger native checkbox
                              e.preventDefault()
                              e.stopPropagation()
                              
                              handleToggle()
                            }}
                            onMouseDown={(e) => {
                              // Prevent default on mousedown to prevent label behavior
                              const target = e.target as HTMLElement
                              if (!target.closest('button') && target.getAttribute('role') !== 'checkbox' && !target.closest('[role="checkbox"]')) {
                                e.preventDefault()
                              }
                            }}
                          >
                            <Checkbox
                              id={`campaign-${campaign.value}`}
                              checked={selectedCampaigns.includes(campaign.value)}
                              onCheckedChange={(checked) => {
                                // Use functional update to ensure we have the latest state
                                setSelectedCampaigns(prev => {
                                  if (checked) {
                                    if (prev.includes(campaign.value)) {
                                      return prev
                                    }
                                    const newSelection = [...prev, campaign.value]
                                    return newSelection
                                  } else {
                                    const newSelection = prev.filter(id => id !== campaign.value)
                                    return newSelection
                                  }
                                })
                              }}
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                              }}
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getCampaignStatusColor(campaign.state)}`}></span>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs px-1.5 py-0 h-5 ${
                                          campaign.state === 'ongoing' 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : campaign.state === 'paused'
                                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                            : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}
                                      >
                                        {campaign.state === 'ongoing' ? 'Aktif' : campaign.state === 'paused' ? 'Pause' : campaign.state}
                                      </Badge>
                                    </div>
                                    <div className="text-sm text-gray-700 cursor-pointer block truncate select-none">
                                      {campaign.label}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="whitespace-pre-line">{tooltipText}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center flex-shrink-0">
                  <p className="text-xs text-gray-500">
                    {selectedCampaigns.length} iklan dipilih
                    {campaignsList.length > 0 && (
                      <span className="ml-1 text-gray-400">
                        ({campaigns.length} dari {campaignsList.filter(c => campaignStatusFilter.includes(c.state)).length} iklan)
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
                      <span className="text-xs text-gray-600">Interval:</span>
                      <span className="px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
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
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-2">Akun yang Dipilih ({selectedUsernames.length}):</span>
                      {selectedUsernames.length > 0 ? (
                        <div className="space-y-2">
                          {selectedUsernames.map((username) => {
                            const accountData = usernamesList.find(u => u.value === username)
                            return (
                              <div key={username} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">
                                  {accountData?.label || username}
                      </span>
                                {accountData?.nama_toko && accountData.nama_toko !== username && (
                                  <span className="text-xs text-gray-500">({username})</span>
                                )}
                    </div>
                            )
                          })}
                    </div>
                      ) : (
                        <span className="text-sm text-gray-500">Tidak ada akun dipilih</span>
                      )}
                  </div>
                    <div>
                      <span className="text-xs text-gray-500 font-medium block mb-2">Iklan yang Dipilih ({selectedCampaigns.length}):</span>
                      {selectedCampaigns.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedCampaigns.map((campaignId) => {
                            const campaignData = campaignsList.find(c => c.value === campaignId)
                            return (
                              <div key={campaignId} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                <span className={`w-2 h-2 rounded-full ${getCampaignStatusColor(campaignData?.state || '')}`}></span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 truncate">
                                    {campaignData?.label || campaignId}
                </div>
                                  {campaignData?.username && (
                                    <div className="text-xs text-gray-500">
                                      Akun: {usernamesList.find(u => u.value === campaignData.username)?.label || campaignData.username}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Tidak ada iklan dipilih</span>
                      )}
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
                <DialogDescription className="text-xs sm:text-sm text-gray-500 mt-1">
                  {steps[currentStep - 1]?.title}
                </DialogDescription>
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
                <Button 
                  onClick={handleNext} 
                  className="px-4 sm:px-6 py-2 sm:py-2.5"
                  disabled={!isStepValid}
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-4 h-4 ml-1 sm:ml-2" />
                </Button>
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

    </Dialog>
  )
}
