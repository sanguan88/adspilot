"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Filter, Plus, MoreHorizontal, BarChart3, Loader2, AlertCircle, X, Play, Pause, Square, Ban, PlayCircle, PauseCircle, CheckCircle, RefreshCw, CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CampaignMetrics } from "./campaign-metrics"
import { AccountTable } from "./account-table"
import { EditableBudget } from "./editable-budget"

interface Campaign {
  id: string
  title: string
  state: 'ongoing' | 'paused' | 'ended' | 'unknown'
  daily_budget: number
  cost: number
  impression: number
  view: number
  broad_order: number
  broad_gmv: number
  objective: string
  spend_percentage: number
  cpc: number
  conversion_rate: number
  cpm: number
  roas: number
  account_username: string
  account_id: string
  account_email: string
  kode_tim: string
  nama_tim: string
  pic_akun: string
}

interface CampaignsResponse {
  success: boolean
  data: Campaign[]
  meta: {
    start_time: string
    end_time: string
    total_campaigns: number
    active_campaigns: number
    paused_campaigns: number
    ended_campaigns: number
    total_spend: number
    total_budget: number
    total_gmv: number
  }
  error?: string
}

export function CampaignManagementPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("ongoing")
  const [selectedObjective, setSelectedObjective] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    title: '',
    objective: 'max_gmv_roi_two',
    daily_budget: '',
    account_username: '',
    roas: ''
  })
  const [connectedAccounts, setConnectedAccounts] = useState<{username: string, nama_tim: string}[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  
  const [dateRange, setDateRange] = useState(() => {
    // Set default to today (always current date)
    const today = new Date()
    
    // Use toLocaleDateString to avoid timezone issues
    const todayStr = today.toLocaleDateString('en-CA') // Returns YYYY-MM-DD format
    
    return {
      startTime: todayStr, // today
      endTime: todayStr // today
    }
  })
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [showAccountTable, setShowAccountTable] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  // Function to fetch campaigns data from Shopee API
  const fetchCampaigns = async (startTime: string, endTime: string, accountIds?: string[]) => {
    try {
      setLoading(true)
      setError(null)
      
      let url = `/api/campaigns/shopee?start_time=${startTime}&end_time=${endTime}`
      if (accountIds && accountIds.length > 0) {
        url += `&account_ids=${accountIds.join(',')}`
      }
      
      const response = await authenticatedFetch(url)
      
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result: CampaignsResponse = await response.json()
      
      if (result.success) {
        setCampaigns(result.data)
      } else {
        setError(result.error || 'Failed to fetch campaigns data')
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Function to fetch summary data
  const fetchSummaryData = async (accountIds: string[], startTime: string, endTime: string) => {
    if (accountIds.length === 0) {
      setSummaryData(null)
      return
    }

    try {
      setSummaryLoading(true)
      const url = `/api/campaigns/summary?account_ids=${accountIds.join(',')}&start_time=${startTime}&end_time=${endTime}`
      const response = await authenticatedFetch(url)
      
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()
      
      if (result.success) {
        setSummaryData(result.data)
        
        // Auto-update to database after fetching summary data
        await updateSummaryToDatabase(accountIds, startTime, endTime)
      } else {
        console.error('Error fetching summary data:', result.error)
        setSummaryData(null)
      }
    } catch (err) {
      console.error('Error fetching summary data:', err)
      setSummaryData(null)
    } finally {
      setSummaryLoading(false)
    }
  }

  // Function to update summary data to database
  const updateSummaryToDatabase = async (accountIds: string[], startTime: string, endTime: string) => {
    try {
      const response = await authenticatedFetch('/api/campaigns/update-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_ids: accountIds,
          start_time: startTime,
          end_time: endTime
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Summary data updated to database successfully')
      } else {
        console.error('Error updating summary to database:', data.error)
      }
    } catch (error) {
      console.error('Error updating summary to database:', error)
    }
  }

  // Load campaigns only when accounts are selected
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
      fetchSummaryData(selectedAccountIds, dateRange.startTime, dateRange.endTime)
    } else {
      // Clear campaigns when no accounts selected
      setCampaigns([])
      setSummaryData(null)
      setLoading(false)
    }
  }, [selectedAccountIds])

  // Refetch campaigns when date range changes (only if accounts are selected)
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
      fetchSummaryData(selectedAccountIds, dateRange.startTime, dateRange.endTime)
    }
  }, [dateRange.startTime, dateRange.endTime])

  // Auto-refresh campaigns every 5 minutes (only if accounts are selected)
  useEffect(() => {
    if (selectedAccountIds.length === 0) {
      return // Don't start auto-refresh if no accounts selected
    }

    const interval = setInterval(() => {
      if (!loading && selectedAccountIds.length > 0) {
        fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
        fetchSummaryData(selectedAccountIds, dateRange.startTime, dateRange.endTime)
      }
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [dateRange.startTime, dateRange.endTime, selectedAccountIds, loading])

  // Function to handle date range change
  const handleDateRangeChange = () => {
    // Validate dates
    const today = new Date().toISOString().split('T')[0]
    const startDate = new Date(dateRange.startTime)
    const endDate = new Date(dateRange.endTime)
    const todayDate = new Date(today)
    
    // Ensure end date is not more than 1 day in the future
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]
    const tomorrowDate = new Date(tomorrowString)
    
    if (endDate > tomorrowDate) {
      setDateRange(prev => ({ ...prev, endTime: today }))
      return
    }
    
    // Ensure start date is not after end date
    if (startDate > endDate) {
      setDateRange(prev => ({ ...prev, startTime: dateRange.endTime }))
      return
    }
    
    fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
  }

  // Function to handle manual refresh
  const handleRefresh = async () => {
    if (selectedAccountIds.length === 0) {
      return // Don't refresh if no accounts selected
    }

    try {
      setRefreshing(true)
      setError(null)
      
      // Refresh both campaigns and summary data
      await Promise.all([
        fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds),
        fetchSummaryData(selectedAccountIds, dateRange.startTime, dateRange.endTime)
      ])
    } catch (err) {
      console.error('Error refreshing data:', err)
      setError('Error refreshing data. Please try again.')
    } finally {
      setRefreshing(false)
    }
  }

  // Function to handle account selection
  const handleAccountSelect = (accountIds: string[]) => {
    setSelectedAccountIds(accountIds)
  }

  // Function to toggle account table visibility
  const handleToggleAccountTable = () => {
    setShowAccountTable(!showAccountTable)
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.account_username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === "all" || campaign.state === selectedStatus
    const matchesObjective = selectedObjective === "all" || campaign.objective === selectedObjective
    return matchesSearch && matchesStatus && matchesObjective
  })

  // Pagination logic
  const totalFilteredCampaigns = filteredCampaigns.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex)
  
  // Calculate total pages
  const calculatedTotalPages = Math.ceil(totalFilteredCampaigns / itemsPerPage)
  
  // Update pagination states when filtered campaigns change
  useEffect(() => {
    setTotalRecords(totalFilteredCampaigns)
    setTotalPages(calculatedTotalPages)
    
    // Reset to page 1 if current page is greater than total pages
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalFilteredCampaigns, calculatedTotalPages, currentPage])

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatus, selectedObjective])


  const getStatusColor = (state: string) => {
    switch (state) {
      case "ongoing":
        return "bg-success/10 text-success"
      case "paused":
        return "bg-warning/10 text-warning"
      case "ended":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusText = (state: string) => {
    switch (state) {
      case "ongoing":
        return "Active"
      case "paused":
        return "Paused"
      case "ended":
        return "Ended"
      default:
        return "Unknown"
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case "ongoing":
        return <PlayCircle className="w-5 h-5 text-success" />
      case "paused":
        return <PauseCircle className="w-5 h-5 text-warning" />
      case "ended":
        return <CheckCircle className="w-5 h-5 text-gray-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const getObjectiveColor = (objective: string) => {
    switch (objective?.toUpperCase()) {
      case "AUTO":
        return "text-info"
      case "GMV MAX":
        return "text-success"
      case "CUSTOM":
        return "text-warning"
      default:
        return "text-gray-600"
    }
  }

  // Function to fetch connected accounts (status_cookies = 'aktif')
  const fetchConnectedAccounts = async () => {
    try {
      const response = await authenticatedFetch('/api/accounts?filter_cookies=connected&limit=1000')
      
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        throw new Error('Unauthorized')
      }
      const result = await response.json()
      
      if (result.success && result.data?.accounts) {
        const connected = result.data.accounts.map((account: any) => ({
          username: account.username,
          nama_tim: account.nama_tim
        }))
        setConnectedAccounts(connected)
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error)
    }
  }

  // Function to handle create campaign modal
  const handleCreateCampaign = async () => {
    await fetchConnectedAccounts()
    setShowCreateModal(true)
    setCreateFormData({
      title: '',
      objective: 'max_gmv_roi_two',
      daily_budget: '',
      account_username: selectedAccountIds.length > 0 ? campaigns.find(c => selectedAccountIds.includes(c.account_id))?.account_username || '' : '',
      roas: ''
    })
  }

  const handleCloseCreateModal = () => {
    setShowCreateModal(false)
    setCreateFormData({
      title: '',
      objective: 'max_gmv_roi_two',
      daily_budget: '',
      account_username: '',
      roas: ''
    })
  }

  const handleCreateFormChange = (field: string, value: string) => {
    setCreateFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCreateCampaignSubmit = async () => {
    if (!createFormData.title || !createFormData.daily_budget || !createFormData.account_username) {
      alert('Semua field harus diisi!')
      return
    }

    // Validate ROAS for GMV MAX objective
    if (createFormData.objective === 'max_gmv_roi_two' && !createFormData.roas) {
      alert('ROAS harus diisi untuk objective GMV MAX!')
      return
    }

    const budget = parseFloat(createFormData.daily_budget)
    if (isNaN(budget) || budget <= 0) {
      alert('Budget harus lebih dari 0')
      return
    }

    if (budget % 5 !== 0) {
      alert('Budget harus kelipatan Rp5.000')
      return
    }

    // Validate ROAS value
    if (createFormData.objective === 'max_gmv_roi_two' && createFormData.roas) {
      const roas = parseFloat(createFormData.roas)
      if (isNaN(roas) || roas <= 0) {
        alert('ROAS harus lebih dari 0')
        return
      }
    }

    try {
      // Convert budget to API format (multiply by 100000)
      const budgetForAPI = budget * 100000
      
      const response = await authenticatedFetch('/api/campaigns/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_campaign',
          title: createFormData.title,
          objective: createFormData.objective,
          daily_budget: budgetForAPI,
          account_username: createFormData.account_username,
          roas: createFormData.objective === 'max_gmv_roi_two' ? parseFloat(createFormData.roas) * 100000 : undefined
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert('Campaign berhasil dibuat!')
        handleCloseCreateModal()
        // Refresh campaigns data
        await fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert('Error creating campaign: ' + error)
    }
  }

  // Function to perform campaign actions
  const performCampaignAction = async (action: string, campaignId: string, accountUsername: string, newBudget?: number) => {
    const actionKey = `${action}-${campaignId}`
    
    try {
      console.log('Performing campaign action:', { action, campaignId, accountUsername, newBudget })
      
      // Set loading state
      setActionLoading(prev => ({ ...prev, [actionKey]: true }))
      
      const response = await authenticatedFetch('/api/campaigns/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          campaign_id: campaignId,
          account_username: accountUsername,
          new_budget: newBudget
        })
      })

      const result = await response.json()
      console.log('Campaign action response:', result)
      
      if (result.success) {
        // Refresh campaigns data
        await fetchCampaigns(dateRange.startTime, dateRange.endTime, selectedAccountIds)
        return true
      } else {
        console.error('Campaign action failed:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error performing campaign action:', error)
      return false
    } finally {
      // Clear loading state
      setActionLoading(prev => ({ ...prev, [actionKey]: false }))
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-8 min-h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Campaign Management</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>Auto-refresh ON</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm lg:text-base">
              Kelola dan pantau performa kampanye iklan Shopee Anda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing || loading || selectedAccountIds.length === 0}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCreateCampaign}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Selection Table */}
          <AccountTable
            onAccountSelect={handleAccountSelect}
            selectedAccountIds={selectedAccountIds}
            showTable={showAccountTable}
            onToggleShowTable={handleToggleAccountTable}
          />
          {/* Filters and Search */}
          <Card className="!p-0">
            <div className="flex items-center gap-4 mb-4 p-6 pb-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search ads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ongoing">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedObjective} onValueChange={setSelectedObjective}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Objectives</SelectItem>
                  <SelectItem value="GMV MAX">GMV MAX</SelectItem>
                  <SelectItem value="AUTO">AUTO</SelectItem>
                  <SelectItem value="VIEW">VIEW</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Start:</label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-36 justify-start text-left font-normal",
                        !dateRange.startTime && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.startTime ? (
                        format(new Date(dateRange.startTime + 'T00:00:00'), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.startTime ? new Date(dateRange.startTime + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const selectedDate = format(date, 'yyyy-MM-dd')
                          const today = format(new Date(), 'yyyy-MM-dd')
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          const tomorrowString = format(tomorrow, 'yyyy-MM-dd')
                          
                          if (selectedDate > tomorrowString) {
                            setDateRange(prev => ({ ...prev, startTime: today }))
                          } else {
                            setDateRange(prev => ({ ...prev, startTime: selectedDate }))
                          }
                          setStartDateOpen(false)
                        }
                      }}
                      disabled={(date) => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        return date > tomorrow
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">End:</label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-36 justify-start text-left font-normal",
                        !dateRange.endTime && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.endTime ? (
                        format(new Date(dateRange.endTime + 'T00:00:00'), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.endTime ? new Date(dateRange.endTime + 'T00:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const selectedDate = format(date, 'yyyy-MM-dd')
                          const today = format(new Date(), 'yyyy-MM-dd')
                          const tomorrow = new Date()
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          const tomorrowString = format(tomorrow, 'yyyy-MM-dd')
                          
                          if (selectedDate > tomorrowString) {
                            setDateRange(prev => ({ ...prev, endTime: today }))
                          } else {
                            setDateRange(prev => ({ ...prev, endTime: selectedDate }))
                          }
                          setEndDateOpen(false)
                        }
                      }}
                      disabled={(date) => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        return date > tomorrow
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button 
                onClick={handleDateRangeChange}
                disabled={loading || refreshing}
                size="sm"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Apply Filter
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing || loading || selectedAccountIds.length === 0}
                title="Refresh data"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <div className="flex items-center gap-3 px-6 pb-6">
              {selectedAccountIds.length > 0 ? (
                <>
                  <Badge variant="secondary">{filteredCampaigns.length} campaigns</Badge>
                  <Badge variant="secondary">{filteredCampaigns.filter((campaign) => campaign.state === "ongoing").length} active</Badge>
              <Badge variant="secondary">
                    Rp{Math.round(filteredCampaigns.reduce((sum, campaign) => sum + campaign.cost, 0) / 100000).toLocaleString('id-ID')} total spend
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {selectedAccountIds.length} akun dipilih
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                  Pilih akun untuk melihat campaign
                </Badge>
              )}
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="p-4 border-destructive/20 bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error loading campaigns:</span>
                <span>{error}</span>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <Card className="p-8">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading campaigns...</span>
              </div>
            </Card>
          )}

          {/* Campaign Metrics Overview */}
          {selectedAccountIds.length > 0 && (
          <CampaignMetrics
              campaigns={paginatedCampaigns.map((campaign) => ({
                id: campaign.id,
                name: campaign.title,
                status: campaign.state === 'ongoing' ? 'active' : campaign.state === 'paused' ? 'paused' : 'ended',
                objective: campaign.objective,
                budget: campaign.daily_budget,
                spend: campaign.cost,
                sales: campaign.broad_gmv,
                roas: campaign.roas,
                adBalance: campaign.daily_budget - campaign.cost, // Calculate remaining balance
                impressions: campaign.impression,
                clicks: campaign.view,
                conversions: campaign.broad_order,
                cpc: campaign.cpm,
                startDate: '',
                endDate: '',
              adSets: [],
            }))}
              loading={loading || summaryLoading}
              error={error}
              summaryData={summaryData}
          />
          )}

          {/* Campaign List */}
          {!loading && !error && (
          <Card className="!p-0">
              {selectedAccountIds.length === 0 ? (
                <div className="text-center py-8 px-6 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">Pilih Akun Terlebih Dahulu</p>
                  <p className="text-sm">Gunakan tabel akun di atas untuk memilih akun yang ingin dilihat campaign-nya</p>
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-8 px-6 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No campaigns found</p>
                  <p className="text-sm">Try adjusting your filters or date range</p>
                </div>
              ) : (
                <>
            <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-center py-3 px-4 font-medium text-sm">STATUS</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">CAMPAIGN</th>
                        <th className="text-left py-3 px-4 font-medium text-sm">OBJECTIVE</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">BUDGET</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">SPEND</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">SPEND (%)</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">IMPRESSIONS</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">VIEW</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">PESANAN</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">CONVERSION RATE</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">CPS</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">CPM</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">SALES</th>
                        <th className="text-right py-3 px-4 font-medium text-sm">ROAS</th>
                        <th className="text-center py-3 px-4 font-medium text-sm">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                      {paginatedCampaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center">
                              {getStatusIcon(campaign.state)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                        <div>
                              <h4 className="font-medium text-sm">{campaign.title}</h4>
                              <small className="text-xs text-gray-400">{campaign.account_username}</small>
                        </div>
                      </td>
                          <td className="py-3 px-4 text-sm">
                            <span className={getObjectiveColor(campaign.objective)}>
                              {campaign.objective}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium">
                            <EditableBudget
                              campaign={campaign}
                              onBudgetChange={performCampaignAction}
                            />
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            Rp{Math.round(campaign.cost / 100000).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.spend_percentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.impression.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.view.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.broad_order.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.conversion_rate.toFixed(2)}%
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            Rp{Math.round(campaign.cpc / 100000).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            Rp{Math.round(campaign.cpm / 100000).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            Rp{Math.round(campaign.broad_gmv / 100000).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right text-sm">
                            {campaign.roas.toFixed(2)}
                      </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {campaign.state === 'ongoing' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-warning"
                                    onClick={() => performCampaignAction('pause', campaign.id, campaign.account_username)}
                                    disabled={actionLoading[`pause-${campaign.id}`]}
                                    title="Pause Campaign"
                                  >
                                    {actionLoading[`pause-${campaign.id}`] ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Pause className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => performCampaignAction('stop', campaign.id, campaign.account_username)}
                                    disabled={actionLoading[`stop-${campaign.id}`]}
                                    title="Stop Campaign"
                                  >
                                    {actionLoading[`stop-${campaign.id}`] ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                              {campaign.state === 'paused' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-success"
                                    onClick={() => performCampaignAction('resume', campaign.id, campaign.account_username)}
                                    disabled={actionLoading[`resume-${campaign.id}`]}
                                    title="Resume Campaign"
                                  >
                                    {actionLoading[`resume-${campaign.id}`] ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => performCampaignAction('stop', campaign.id, campaign.account_username)}
                                    disabled={actionLoading[`stop-${campaign.id}`]}
                                    title="Stop Campaign"
                                  >
                                    {actionLoading[`stop-${campaign.id}`] ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                              {campaign.state === 'ended' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  disabled
                                  title="No Actions Available"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Menampilkan {startIndex + 1} sampai {Math.min(endIndex, totalRecords)} dari {totalRecords} campaign
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={5}>5 per halaman</option>
                    <option value={10}>10 per halaman</option>
                    <option value={20}>20 per halaman</option>
                    <option value={50}>50 per halaman</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1"
                  >
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNumber)}
                        className="px-3 py-1"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
                </>
              )}
          </Card>
        )}

        {/* Create Campaign Modal */}
        <Dialog open={showCreateModal} onOpenChange={handleCloseCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="campaign-title">Campaign Title</Label>
              <Input
                id="campaign-title"
                type="text"
                value={createFormData.title}
                onChange={(e) => handleCreateFormChange('title', e.target.value)}
                placeholder="Enter campaign title"
              />
            </div>

            <div>
              <Label htmlFor="objective">Objective</Label>
              <Select value={createFormData.objective} onValueChange={(value) => handleCreateFormChange('objective', value)}>
                <SelectTrigger id="objective">
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
              <Label htmlFor="daily-budget">Daily Budget (Rp)</Label>
              <Input
                id="daily-budget"
                type="number"
                value={createFormData.daily_budget}
                onChange={(e) => handleCreateFormChange('daily_budget', e.target.value)}
                placeholder="Enter daily budget (in thousands)"
                min="5"
                step="5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Budget harus kelipatan Rp5.000
              </p>
            </div>

            {createFormData.objective === 'max_gmv_roi_two' && (
              <div>
                <Label htmlFor="roas">Target ROAS <span className="text-destructive">*</span></Label>
                <Input
                  id="roas"
                  type="number"
                  value={createFormData.roas}
                  onChange={(e) => handleCreateFormChange('roas', e.target.value)}
                  placeholder="Enter target ROAS (e.g., 2.5)"
                  min="0.1"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ROAS diperlukan untuk objective GMV MAX
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="account-username">Account Username (Connected Only)</Label>
              <Select value={createFormData.account_username} onValueChange={(value) => handleCreateFormChange('account_username', value)}>
                <SelectTrigger id="account-username">
                  <SelectValue placeholder="Select Connected Account" />
                </SelectTrigger>
                <SelectContent>
                  {connectedAccounts.map((account) => (
                    <SelectItem key={account.username} value={account.username}>
                      {account.username} ({account.nama_tim})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Hanya menampilkan akun dengan status cookies "Connected"
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="tertiary" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaignSubmit}>
              Create Campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  )
}
