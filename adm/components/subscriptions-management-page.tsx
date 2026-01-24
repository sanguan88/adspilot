"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { CreditCard, Plus, Search, FileText, DollarSign, Edit, Trash2, Settings, Check, ChevronsUpDown, CheckCircle2, Megaphone } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { authenticatedFetch } from "@/lib/api-client"
import { toast } from "sonner"
import { format } from "date-fns"
import { EmptyState } from "@/components/ui/empty-state"
import { TableSkeleton } from "@/components/ui/loading-skeleton"
import { getStatusBadgeVariant } from "@/components/ui/badge-variants"
import { useConfirm } from "@/components/providers/confirmation-provider"
import { pageLayout, typography, card, standardSpacing, componentSizes, gridLayouts, summaryCard } from "@/lib/design-tokens"

interface Plan {
  id: string
  name: string
  price: number
  billingCycle: string
  durationMonths: number
  durationDays?: number
  features: any
  featuresList?: string[]
  description: string
  isActive: boolean
}

interface Subscription {
  id: string
  userId: string
  username: string
  email: string
  namaLengkap?: string | null
  planId: string
  planName: string
  transactionId?: string
  status: string
  startDate: string
  endDate?: string
  billingCycle: string
  baseAmount?: number
  ppnAmount?: number
  totalAmount?: number
  price: number // For backward compatibility, will use totalAmount if available
  autoRenew?: boolean
  userStatus?: string
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancellationReason?: string | null
  createdAt: string
  updatedAt?: string
}

interface Invoice {
  id: string
  userId: string
  username: string
  email: string
  amount: number
  planId: string
  planName: string
  status: string
  issueDate: string
  dueDate: string
  paidDate?: string
}

export function SubscriptionsManagementPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planFormData, setPlanFormData] = useState({
    name: "",
    price: "",
    billingCycleType: "monthly", // "monthly", "yearly", or "daily"
    billingCycleDuration: "1", // "1", "3", "6" for monthly
    durationDays: "", // for daily
    description: "",
    features: {
      maxAccounts: "",
      maxAutomationRules: "",
      maxCampaigns: "",
      support: "community",
    },
    featuresList: [] as string[],
    isActive: true,
  })

  // Subscription Limits Dialog State
  const [isSubscriptionLimitsDialogOpen, setIsSubscriptionLimitsDialogOpen] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [subscriptionLimitsData, setSubscriptionLimitsData] = useState<{
    planName: string
    limits: { maxAccounts: number; maxAutomationRules: number; maxCampaigns: number }
    usage: { accounts: number; automationRules: number; campaigns: number }
  } | null>(null)
  const [subscriptionLimitsFormData, setSubscriptionLimitsFormData] = useState({
    maxAccounts: "",
    maxAutomationRules: "",
    maxCampaigns: "",
  })
  const [subscriptionLimitsLoading, setSubscriptionLimitsLoading] = useState(false)

  // Edit Subscription Dialog State
  const [isEditSubscriptionDialogOpen, setIsEditSubscriptionDialogOpen] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [subscriptionFormData, setSubscriptionFormData] = useState({
    planId: "",
    status: "",
    startDate: "",
    endDate: "",
    billingCycle: "",
    autoRenew: false,
  })
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  // Add Subscription State
  const [isAddSubscriptionDialogOpen, setIsAddSubscriptionDialogOpen] = useState(false)
  const [usersList, setUsersList] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [addSubscriptionFormData, setAddSubscriptionFormData] = useState({
    userId: "",
    planId: "",
    status: "active",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    totalAmount: "",
    billingCycle: "monthly",
  })
  const [isUserSearchPopoverOpen, setIsUserSearchPopoverOpen] = useState(false)
  const [userSearchTerm, setUserSearchTerm] = useState("")

  // Promo Banner State
  const [promoBanner, setPromoBanner] = useState({
    isEnabled: true,
    badgeText: "",
    title: "",
    description: "",
    ctaText: "",
  })
  const [promoBannerLoading, setPromoBannerLoading] = useState(false)

  const confirm = useConfirm()

  useEffect(() => {
    fetchData()
    fetchPromoBanner()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch plans
      const plansRes = await authenticatedFetch("/api/subscriptions/plans")
      const plansData = await plansRes.json()
      if (plansData.success) {
        setPlans(plansData.data)
      }

      // Fetch subscriptions
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      const subsRes = await authenticatedFetch(`/api/subscriptions?${params.toString()}`)
      const subsData = await subsRes.json()
      if (subsData.success) {
        setSubscriptions(subsData.data.subscriptions)
      }

      // Fetch invoices
      const invRes = await authenticatedFetch("/api/subscriptions/invoices")
      const invData = await invRes.json()
      if (invData.success) {
        setInvoices(invData.data.invoices)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const fetchPromoBanner = async () => {
    try {
      setPromoBannerLoading(true)
      const res = await authenticatedFetch("/api/promo-banner")
      const data = await res.json()
      if (data.success) {
        setPromoBanner(data.data)
      }
    } catch (error) {
      console.error("Error fetching promo banner:", error)
    } finally {
      setPromoBannerLoading(false)
    }
  }

  const handleSavePromoBanner = async () => {
    try {
      setPromoBannerLoading(true)
      const res = await authenticatedFetch("/api/promo-banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoBanner),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Promo banner berhasil disimpan")
      } else {
        toast.error(data.error || "Gagal menyimpan promo banner")
      }
    } catch (error) {
      console.error("Error saving promo banner:", error)
      toast.error("Terjadi kesalahan saat menyimpan promo banner")
    } finally {
      setPromoBannerLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    return getStatusBadgeVariant(status)
  }

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        sub.username.toLowerCase().includes(searchLower) ||
        sub.email.toLowerCase().includes(searchLower) ||
        sub.planName.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const filteredInvoices = invoices.filter((inv) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        inv.username.toLowerCase().includes(searchLower) ||
        inv.email.toLowerCase().includes(searchLower) ||
        inv.id.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setPlanFormData({
      name: "",
      price: "",
      billingCycleType: "monthly",
      billingCycleDuration: "1",
      durationDays: "",
      description: "",
      features: {
        maxAccounts: "",
        maxAutomationRules: "",
        maxCampaigns: "",
        support: "community",
      },
      featuresList: [],
      isActive: true,
    })
    setIsPlanDialogOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    // Parse billingCycle: "monthly", "yearly", "1", "3", "6"
    const isYearly = plan.billingCycle === "yearly"
    const isDaily = plan.durationDays && plan.durationDays > 0
    const billingCycleType = isYearly ? "yearly" : (isDaily ? "daily" : "monthly")
    const billingCycleDuration = isYearly ? "1" : (plan.billingCycle === "monthly" || isDaily ? "1" : plan.billingCycle)

    setPlanFormData({
      name: plan.name,
      price: plan.price.toString(),
      billingCycleType,
      billingCycleDuration,
      durationDays: plan.durationDays ? plan.durationDays.toString() : "",
      description: plan.description,
      features: {
        maxAccounts: plan.features.maxAccounts === -1 ? "unlimited" : plan.features.maxAccounts.toString(),
        maxAutomationRules: plan.features.maxAutomationRules === -1 ? "unlimited" : plan.features.maxAutomationRules.toString(),
        maxCampaigns: plan.features.maxCampaigns === -1 ? "unlimited" : plan.features.maxCampaigns.toString(),
        support: plan.features.support,
      },
      featuresList: plan.featuresList || [],
      isActive: plan.isActive,
    })
    setIsPlanDialogOpen(true)
  }

  const handleDeletePlan = async (planId: string) => {
    const confirmed = await confirm({
      title: "Hapus Plan?",
      description: `Apakah Anda yakin ingin menghapus plan ini?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive"
    })

    if (!confirmed) {
      return
    }

    try {
      const response = await authenticatedFetch(`/api/subscriptions/plans/${planId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Plan berhasil dihapus")
        fetchData()
      } else {
        toast.error(data.error || "Gagal menghapus plan")
      }
    } catch (error) {
      console.error("Error deleting plan:", error)
      toast.error("Terjadi kesalahan saat menghapus plan")
    }
  }

  const handleEditSubscription = async (subscription: Subscription) => {
    try {
      setEditingSubscription(subscription)
      setSubscriptionLoading(true)
      setIsEditSubscriptionDialogOpen(true)

      // Fetch subscription details
      const response = await authenticatedFetch(`/api/subscriptions/${subscription.id}`)
      const data = await response.json()

      if (data.success) {
        const sub = data.data
        setSubscriptionFormData({
          planId: sub.planId || "",
          status: sub.status || "",
          startDate: sub.startDate ? format(new Date(sub.startDate), "yyyy-MM-dd") : "",
          endDate: sub.endDate ? format(new Date(sub.endDate), "yyyy-MM-dd") : "",
          billingCycle: sub.billingCycle || "",
          autoRenew: sub.autoRenew || false,
        })
      } else {
        toast.error(data.error || "Gagal memuat data subscription")
        setIsEditSubscriptionDialogOpen(false)
      }
    } catch (error) {
      console.error("Error fetching subscription:", error)
      toast.error("Terjadi kesalahan saat memuat data subscription")
      setIsEditSubscriptionDialogOpen(false)
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleSaveSubscription = async () => {
    if (!editingSubscription) return

    try {
      setSubscriptionLoading(true)

      const payload: any = {}
      if (subscriptionFormData.planId) payload.planId = subscriptionFormData.planId
      if (subscriptionFormData.status) payload.status = subscriptionFormData.status
      if (subscriptionFormData.startDate) payload.startDate = subscriptionFormData.startDate
      if (subscriptionFormData.endDate) payload.endDate = subscriptionFormData.endDate
      if (subscriptionFormData.billingCycle) payload.billingCycle = subscriptionFormData.billingCycle
      payload.autoRenew = subscriptionFormData.autoRenew

      const response = await authenticatedFetch(`/api/subscriptions/${editingSubscription.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Subscription berhasil diupdate")
        setIsEditSubscriptionDialogOpen(false)
        setEditingSubscription(null)
        setSubscriptionFormData({
          planId: "",
          status: "",
          startDate: "",
          endDate: "",
          billingCycle: "",
          autoRenew: false,
        })
        fetchData()
      } else {
        toast.error(data.error || "Gagal mengupdate subscription")
      }
    } catch (error) {
      console.error("Error saving subscription:", error)
      toast.error("Terjadi kesalahan saat menyimpan subscription")
    } finally {
      setSubscriptionLoading(false)
    }
  }

  const handleEditSubscriptionLimits = async (subscription: Subscription) => {
    try {
      setSelectedSubscription(subscription)
      setSubscriptionLimitsLoading(true)
      setIsSubscriptionLimitsDialogOpen(true)

      const response = await authenticatedFetch(`/api/users/${subscription.userId}/limits`)
      const data = await response.json()

      if (data.success) {
        setSubscriptionLimitsData(data.data)
        setSubscriptionLimitsFormData({
          maxAccounts: data.data.limits.maxAccounts === -1 ? "unlimited" : data.data.limits.maxAccounts.toString(),
          maxAutomationRules: data.data.limits.maxAutomationRules === -1 ? "unlimited" : data.data.limits.maxAutomationRules.toString(),
          maxCampaigns: data.data.limits.maxCampaigns === -1 ? "unlimited" : data.data.limits.maxCampaigns.toString(),
        })
      } else {
        toast.error(data.error || "Gagal memuat data limits")
        setIsSubscriptionLimitsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error fetching subscription limits:", error)
      toast.error("Terjadi kesalahan saat memuat data limits")
      setIsSubscriptionLimitsDialogOpen(false)
    } finally {
      setSubscriptionLimitsLoading(false)
    }
  }

  const handleSaveSubscriptionLimits = async () => {
    if (!selectedSubscription) return

    try {
      setSubscriptionLimitsLoading(true)

      const payload: any = {}
      if (subscriptionLimitsFormData.maxAccounts === "unlimited") {
        payload.maxAccounts = -1
      } else if (subscriptionLimitsFormData.maxAccounts !== "") {
        payload.maxAccounts = parseInt(subscriptionLimitsFormData.maxAccounts)
      }

      if (subscriptionLimitsFormData.maxAutomationRules === "unlimited") {
        payload.maxAutomationRules = -1
      } else if (subscriptionLimitsFormData.maxAutomationRules !== "") {
        payload.maxAutomationRules = parseInt(subscriptionLimitsFormData.maxAutomationRules)
      }

      if (subscriptionLimitsFormData.maxCampaigns === "unlimited") {
        payload.maxCampaigns = -1
      } else if (subscriptionLimitsFormData.maxCampaigns !== "") {
        payload.maxCampaigns = parseInt(subscriptionLimitsFormData.maxCampaigns)
      }

      const response = await authenticatedFetch(`/api/users/${selectedSubscription.userId}/limits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Limits berhasil diupdate")
        setIsSubscriptionLimitsDialogOpen(false)
        setSelectedSubscription(null)
        setSubscriptionLimitsData(null)
        setSubscriptionLimitsFormData({
          maxAccounts: "",
          maxAutomationRules: "",
          maxCampaigns: "",
        })
      } else {
        toast.error(data.error || "Gagal mengupdate limits")
      }
    } catch (error) {
      console.error("Error saving subscription limits:", error)
      toast.error("Terjadi kesalahan saat menyimpan limits")
    } finally {
      setSubscriptionLimitsLoading(false)
    }
  }

  const handleSavePlan = async () => {
    try {
      // Combine billingCycleType and billingCycleDuration into billingCycle
      const billingCycle = planFormData.billingCycleType === "yearly"
        ? "yearly"
        : (planFormData.billingCycleType === "daily" ? "daily" : planFormData.billingCycleDuration)

      // Calculate durationMonths and durationDays
      const durationMonths = planFormData.billingCycleType === "yearly"
        ? 12
        : (planFormData.billingCycleType === "daily" ? 0 : parseInt(planFormData.billingCycleDuration) || 1)

      const durationDays = planFormData.billingCycleType === "daily"
        ? parseInt(planFormData.durationDays) || 1
        : 0

      const payload: any = {
        name: planFormData.name,
        price: parseInt(planFormData.price) || 0,
        billingCycle,
        durationMonths,
        durationDays,
        description: planFormData.description,
        features: {
          maxAccounts: planFormData.features.maxAccounts === "unlimited" ? -1 : parseInt(planFormData.features.maxAccounts) || 0,
          maxAutomationRules: planFormData.features.maxAutomationRules === "unlimited" ? -1 : parseInt(planFormData.features.maxAutomationRules) || 0,
          maxCampaigns: planFormData.features.maxCampaigns === "unlimited" ? -1 : parseInt(planFormData.features.maxCampaigns) || 0,
          support: planFormData.features.support || "community",
          featuresList: planFormData.featuresList || [],
        },
        isActive: planFormData.isActive,
      }

      let response
      if (editingPlan) {
        response = await authenticatedFetch(`/api/subscriptions/plans/${editingPlan.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        response = await authenticatedFetch("/api/subscriptions/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      const data = await response.json()

      if (data.success) {
        toast.success(editingPlan ? "Plan berhasil diupdate" : "Plan berhasil dibuat")
        setIsPlanDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Gagal menyimpan plan")
      }
    } catch (error) {
      console.error("Error saving plan:", error)
      toast.error("Terjadi kesalahan saat menyimpan plan")
    }
  }

  const fetchUsersForSelection = async () => {
    try {
      setUsersLoading(true)
      const response = await authenticatedFetch("/api/users?limit=100")
      const data = await response.json()
      if (data.success) {
        setUsersList(data.data.users)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setUsersLoading(false)
    }
  }

  const handleAddSubscription = () => {
    setAddSubscriptionFormData({
      userId: "",
      planId: plans[0]?.id || "",
      status: "active",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
      totalAmount: "",
      billingCycle: "monthly",
    })
    setIsAddSubscriptionDialogOpen(true)
    fetchUsersForSelection()
  }

  const handleSaveNewSubscription = async () => {
    if (!addSubscriptionFormData.userId || !addSubscriptionFormData.planId) {
      toast.error("User dan Plan harus dipilih")
      return
    }

    try {
      setSubscriptionLoading(true)
      const response = await authenticatedFetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addSubscriptionFormData),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Subscription berhasil dibuat")
        setIsAddSubscriptionDialogOpen(false)
        fetchData()
      } else {
        toast.error(data.error || "Gagal membuat subscription")
      }
    } catch (error) {
      console.error("Error creating subscription:", error)
      toast.error("Terjadi kesalahan saat membuat subscription")
    } finally {
      setSubscriptionLoading(false)
    }
  }

  return (
    <div className={pageLayout.container}>
      <div className={pageLayout.content}>
        {/* Header */}
        <div className={pageLayout.header}>
          <div>
            <h1 className={pageLayout.headerTitle}>Subscription & Billing</h1>
            <p className={pageLayout.headerDescription}>
              Kelola plans, subscriptions, dan billing
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={gridLayouts.stats3}>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <CreditCard className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Active Subscriptions</p>
                <p className={summaryCard.value}>
                  {subscriptions.filter((s) => s.status === "active").length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <DollarSign className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Revenue (MRR)</p>
                <p className={summaryCard.value}>
                  {formatPrice(
                    subscriptions
                      .filter((s) => s.status === "active")
                      .reduce((sum, s) => sum + s.price, 0)
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className={summaryCard.container}>
            <CardContent className={summaryCard.content}>
              <div className={summaryCard.layoutVertical}>
                <FileText className={summaryCard.iconTop} />
                <p className={summaryCard.label}>Total Invoices</p>
                <p className={summaryCard.value}>{invoices.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="promo-banner">Promo Banner</TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subscription Plans</CardTitle>
                  <Button onClick={handleCreatePlan}>
                    <Plus className="w-4 h-4" />
                    Tambah Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Card key={i} className="h-64">
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <div className="h-6 bg-muted animate-pulse rounded" />
                            <div className="h-8 bg-muted animate-pulse rounded" />
                            <div className="h-4 bg-muted animate-pulse rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : plans.length === 0 ? (
                  <EmptyState
                    icon={<CreditCard className="w-12 h-12" />}
                    title="No plans found"
                    description="Create your first subscription plan to get started"
                    action={{
                      label: "Tambah Plan",
                      onClick: handleCreatePlan
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {plans.map((plan) => (
                      <Card key={plan.id} className="relative flex flex-col h-full hover:shadow-md transition-shadow overflow-hidden group">
                        {/* Action Buttons - Absolute positioned in top-right corner */}
                        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                            className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm hover:bg-background border shadow-sm"
                            title="Edit Plan"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive bg-background/80 backdrop-blur-sm hover:bg-background border shadow-sm"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                        <CardHeader className="pb-3 pr-20 sm:pr-16">
                          <div className="flex flex-col gap-2 w-full">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg sm:text-xl mb-2 pr-12 sm:pr-0">{plan.name}</CardTitle>
                              <div className="flex items-baseline gap-1 flex-wrap">
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold">
                                  {formatPrice(plan.price)}
                                </span>
                                <span className={`text-xs sm:text-sm ${typography.muted} whitespace-nowrap`}>
                                  /{plan.durationDays && plan.durationDays > 0 ? `${plan.durationDays} hari` : plan.billingCycle === "yearly" ? "tahun" : plan.billingCycle === "1" ? "bulan" : plan.billingCycle === "3" ? "3 bulan" : plan.billingCycle === "6" ? "6 bulan" : plan.billingCycle === "monthly" ? "bulan" : plan.billingCycle}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col pt-0">
                          <p className={`${typography.muted} text-sm mb-4 line-clamp-2`}>{plan.description}</p>
                          <div className="space-y-2 text-sm flex-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Accounts:</span>
                              <span className="font-medium">{plan.features.maxAccounts === -1 ? "Unlimited" : plan.features.maxAccounts}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rules:</span>
                              <span className="font-medium">{plan.features.maxAutomationRules === -1 ? "Unlimited" : plan.features.maxAutomationRules}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Campaigns:</span>
                              <span className="font-medium">{plan.features.maxCampaigns === -1 ? "Unlimited" : plan.features.maxCampaigns}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Support:</span>
                              <span className="font-medium capitalize">{plan.features.support}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            {plan.isActive ? (
                              <Badge className="bg-success/10 text-success border-success/20">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subscriptions</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={handleAddSubscription} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Tambah Subscription
                    </Button>
                    <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search subscriptions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : filteredSubscriptions.length === 0 ? (
                  <EmptyState
                    icon={<CreditCard className="w-12 h-12" />}
                    title="No subscriptions found"
                    description={
                      search || statusFilter
                        ? "Try adjusting your filters or search terms"
                        : "No subscriptions have been created yet"
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Expire Date</TableHead>
                        <TableHead>Billing Cycle</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.username}</div>
                              <div className={typography.muted}>{sub.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{sub.planName}</TableCell>
                          <TableCell>{formatPrice(sub.totalAmount || sub.price)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(sub.status)}>
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(sub.startDate), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            {sub.endDate ? format(new Date(sub.endDate), "dd MMM yyyy") : "-"}
                          </TableCell>
                          <TableCell className="capitalize">{sub.billingCycle}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSubscription(sub)}
                                title="Edit Subscription"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSubscriptionLimits(sub)}
                                title="Edit Limits"
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoices</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search invoices..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableSkeleton rows={5} columns={7} />
                ) : filteredInvoices.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="w-12 h-12" />}
                    title="No invoices found"
                    description={
                      search
                        ? "Try adjusting your search terms"
                        : "No invoices have been generated yet"
                    }
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.username}</div>
                              <div className={typography.muted}>{invoice.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{invoice.planName}</TableCell>
                          <TableCell>{formatPrice(invoice.amount)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(invoice.status)}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.issueDate), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.dueDate), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Promo Banner Tab */}
          <TabsContent value="promo-banner">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5" />
                      Promo Banner Settings
                    </CardTitle>
                    <p className={typography.mutedSmall}>Kelola konten promo banner di landing page section #harga</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="promo-enabled">Aktif</Label>
                    <Switch
                      id="promo-enabled"
                      checked={promoBanner.isEnabled}
                      onCheckedChange={(checked) => setPromoBanner({ ...promoBanner, isEnabled: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {promoBannerLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <Label>Badge Text</Label>
                      <Input
                        value={promoBanner.badgeText}
                        onChange={(e) => setPromoBanner({ ...promoBanner, badgeText: e.target.value })}
                        placeholder="e.g., SOFT LAUNCHING - EARLY BIRD 50% OFF"
                      />
                      <p className={`${typography.mutedSmall} mt-1`}>Teks badge kecil di atas judul</p>
                    </div>
                    <div>
                      <Label>Judul Promo</Label>
                      <Input
                        value={promoBanner.title}
                        onChange={(e) => setPromoBanner({ ...promoBanner, title: e.target.value })}
                        placeholder="e.g., Promo Icip-icip 7 Hari - Hanya Sampai 28 Februari 2026!"
                      />
                    </div>
                    <div>
                      <Label>Deskripsi</Label>
                      <textarea
                        className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                        value={promoBanner.description}
                        onChange={(e) => setPromoBanner({ ...promoBanner, description: e.target.value })}
                        placeholder="e.g., Dapatkan akses GRATIS semua fitur selama 7 hari untuk user baru..."
                      />
                    </div>
                    <div>
                      <Label>CTA Text (kotak kuning)</Label>
                      <Input
                        value={promoBanner.ctaText}
                        onChange={(e) => setPromoBanner({ ...promoBanner, ctaText: e.target.value })}
                        placeholder="e.g., Gunakan kesempatan trial 7 hari sebelum promo berakhir..."
                      />
                    </div>
                    <div className="pt-4 border-t flex justify-end">
                      <Button onClick={handleSavePromoBanner} disabled={promoBannerLoading}>
                        Simpan Perubahan
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Plan Dialog */}
        <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit Plan" : "Tambah Plan Baru"}
              </DialogTitle>
              <DialogDescription>
                {editingPlan
                  ? "Update informasi subscription plan"
                  : "Buat subscription plan baru untuk aplikasi"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className={gridLayouts.formGrid}>
                <div>
                  <Label>Plan Name *</Label>
                  <Input
                    value={planFormData.name}
                    onChange={(e) =>
                      setPlanFormData({ ...planFormData, name: e.target.value })
                    }
                    placeholder="e.g., Free, Basic, Pro"
                    required
                  />
                </div>
                <div>
                  <Label>Price (IDR) *</Label>
                  <Input
                    type="number"
                    value={planFormData.price}
                    onChange={(e) =>
                      setPlanFormData({ ...planFormData, price: e.target.value })
                    }
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Billing Cycle Type *</Label>
                  <Select
                    value={planFormData.billingCycleType}
                    onValueChange={(value) =>
                      setPlanFormData({
                        ...planFormData,
                        billingCycleType: value,
                        billingCycleDuration: value === "yearly" ? "1" : planFormData.billingCycleDuration
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Harian</SelectItem>
                      <SelectItem value="monthly">Bulan</SelectItem>
                      <SelectItem value="yearly">Tahun</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {planFormData.billingCycleType === "daily" && (
                  <div>
                    <Label>Durasi (Hari) *</Label>
                    <Input
                      type="number"
                      value={planFormData.durationDays}
                      onChange={(e) =>
                        setPlanFormData({ ...planFormData, durationDays: e.target.value })
                      }
                      placeholder="e.g., 7"
                      required
                    />
                  </div>
                )}

                {planFormData.billingCycleType === "monthly" && (
                  <div>
                    <Label>Durasi (Bulan) *</Label>
                    <Select
                      value={planFormData.billingCycleDuration}
                      onValueChange={(value) =>
                        setPlanFormData({ ...planFormData, billingCycleDuration: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Bulan</SelectItem>
                        <SelectItem value="3">3 Bulan</SelectItem>
                        <SelectItem value="6">6 Bulan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={planFormData.description}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, description: e.target.value })
                  }
                  placeholder="e.g., Perfect for getting started"
                />
              </div>

              <div className="border-t pt-4">
                <Tabs defaultValue="limits" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="limits">Limits</TabsTrigger>
                    <TabsTrigger value="fitur">Fitur Landing Page</TabsTrigger>
                  </TabsList>

                  {/* Limits Tab */}
                  <TabsContent value="limits" className="space-y-4 mt-4">
                    {/* Max Accounts */}
                    <div>
                      <Label>Maximum Toko/Store *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={planFormData.features.maxAccounts === "unlimited" || planFormData.features.maxAccounts === "" ? "" : planFormData.features.maxAccounts}
                          onChange={(e) => {
                            const value = e.target.value
                            setPlanFormData({
                              ...planFormData,
                              features: {
                                ...planFormData.features,
                                maxAccounts: value === "" ? "" : value,
                              },
                            })
                          }}
                          placeholder="10"
                          disabled={planFormData.features.maxAccounts === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-accounts"
                            checked={planFormData.features.maxAccounts === "unlimited"}
                            onCheckedChange={(checked) => {
                              setPlanFormData({
                                ...planFormData,
                                features: {
                                  ...planFormData.features,
                                  maxAccounts: checked ? "unlimited" : "",
                                },
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-accounts" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className={`${typography.mutedSmall} mt-1`}>Maximum number of stores/toko user can add</p>
                    </div>

                    {/* Max Automation Rules */}
                    <div>
                      <Label>Maximum Automation Rules (Active) *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={planFormData.features.maxAutomationRules === "unlimited" || planFormData.features.maxAutomationRules === "" ? "" : planFormData.features.maxAutomationRules}
                          onChange={(e) => {
                            const value = e.target.value
                            setPlanFormData({
                              ...planFormData,
                              features: {
                                ...planFormData.features,
                                maxAutomationRules: value === "" ? "" : value,
                              },
                            })
                          }}
                          placeholder="20"
                          disabled={planFormData.features.maxAutomationRules === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-rules"
                            checked={planFormData.features.maxAutomationRules === "unlimited"}
                            onCheckedChange={(checked) => {
                              setPlanFormData({
                                ...planFormData,
                                features: {
                                  ...planFormData.features,
                                  maxAutomationRules: checked ? "unlimited" : "",
                                },
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-rules" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className={`${typography.mutedSmall} mt-1`}>Maximum number of active automation rules</p>
                    </div>

                    {/* Max Campaigns */}
                    <div>
                      <Label>Maximum Campaigns *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={planFormData.features.maxCampaigns === "unlimited" || planFormData.features.maxCampaigns === "" ? "" : planFormData.features.maxCampaigns}
                          onChange={(e) => {
                            const value = e.target.value
                            setPlanFormData({
                              ...planFormData,
                              features: {
                                ...planFormData.features,
                                maxCampaigns: value === "" ? "" : value,
                              },
                            })
                          }}
                          placeholder="100"
                          disabled={planFormData.features.maxCampaigns === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-campaigns"
                            checked={planFormData.features.maxCampaigns === "unlimited"}
                            onCheckedChange={(checked) => {
                              setPlanFormData({
                                ...planFormData,
                                features: {
                                  ...planFormData.features,
                                  maxCampaigns: checked ? "unlimited" : "",
                                },
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-campaigns" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className={`${typography.mutedSmall} mt-1`}>Maximum number of unique campaigns user can sync</p>
                    </div>

                    {/* Support Type */}
                    <div>
                      <Label>Support Level *</Label>
                      <Select
                        value={planFormData.features.support}
                        onValueChange={(value) =>
                          setPlanFormData({
                            ...planFormData,
                            features: {
                              ...planFormData.features,
                              support: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="community">Community</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="dedicated">Dedicated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  {/* Fitur Tab */}
                  <TabsContent value="fitur" className="mt-4">
                    <p className={`${typography.mutedSmall} mb-3`}>
                      Daftar fitur yang akan ditampilkan pada pricing card di landing page
                    </p>
                    <div className="space-y-2">
                      {planFormData.featuresList.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <Input
                            value={feature}
                            onChange={(e) => {
                              const newList = [...planFormData.featuresList]
                              newList[index] = e.target.value
                              setPlanFormData({ ...planFormData, featuresList: newList })
                            }}
                            placeholder="Contoh: Akses 1 bulan penuh"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                            onClick={() => {
                              const newList = planFormData.featuresList.filter((_, i) => i !== index)
                              setPlanFormData({ ...planFormData, featuresList: newList })
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setPlanFormData({
                            ...planFormData,
                            featuresList: [...planFormData.featuresList, ""]
                          })
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Fitur
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label>Active Status</Label>
                  <p className={typography.mutedSmall}>
                    Plan akan tersedia untuk subscription jika aktif
                  </p>
                </div>
                <Switch
                  checked={planFormData.isActive}
                  onCheckedChange={(checked) =>
                    setPlanFormData({ ...planFormData, isActive: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPlanDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSavePlan}>
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Dialog */}
        <Dialog open={isEditSubscriptionDialogOpen} onOpenChange={setIsEditSubscriptionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Subscription</DialogTitle>
              <DialogDescription>
                {editingSubscription && `Edit subscription untuk ${editingSubscription.username}`}
              </DialogDescription>
            </DialogHeader>

            {subscriptionLoading && !editingSubscription ? (
              <div className="py-8 text-center">Loading...</div>
            ) : (
              <div className="space-y-4">
                {/* Plan Selection */}
                <div>
                  <Label htmlFor="planId">Plan *</Label>
                  <Select
                    value={subscriptionFormData.planId}
                    onValueChange={(value) =>
                      setSubscriptionFormData({ ...subscriptionFormData, planId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.filter(p => p.isActive).map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {formatPrice(plan.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={subscriptionFormData.status}
                    onValueChange={(value) =>
                      setSubscriptionFormData({ ...subscriptionFormData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={subscriptionFormData.startDate}
                    onChange={(e) =>
                      setSubscriptionFormData({ ...subscriptionFormData, startDate: e.target.value })
                    }
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={subscriptionFormData.endDate}
                    onChange={(e) =>
                      setSubscriptionFormData({ ...subscriptionFormData, endDate: e.target.value })
                    }
                  />
                </div>

                {/* Billing Cycle */}
                <div>
                  <Label htmlFor="billingCycle">Billing Cycle</Label>
                  <Select
                    value={subscriptionFormData.billingCycle}
                    onValueChange={(value) =>
                      setSubscriptionFormData({ ...subscriptionFormData, billingCycle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto Renew */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoRenew"
                    checked={subscriptionFormData.autoRenew}
                    onCheckedChange={(checked) =>
                      setSubscriptionFormData({ ...subscriptionFormData, autoRenew: checked })
                    }
                  />
                  <Label htmlFor="autoRenew" className="cursor-pointer">
                    Auto Renew
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditSubscriptionDialogOpen(false)}
                disabled={subscriptionLoading}
              >
                Batal
              </Button>
              <Button onClick={handleSaveSubscription} disabled={subscriptionLoading}>
                {subscriptionLoading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Subscription Limits Dialog */}
        <Dialog open={isSubscriptionLimitsDialogOpen} onOpenChange={setIsSubscriptionLimitsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Subscription Limits</DialogTitle>
              <DialogDescription>
                {selectedSubscription && `Atur custom limits untuk ${selectedSubscription.username} (${selectedSubscription.planName})`}
              </DialogDescription>
            </DialogHeader>

            {subscriptionLimitsLoading && !subscriptionLimitsData ? (
              <div className="py-8 text-center">Loading...</div>
            ) : subscriptionLimitsData ? (
              <div className="space-y-6">
                {/* Current Plan Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">Plan Saat Ini</div>
                  <div className="text-lg font-semibold">{subscriptionLimitsData.planName}</div>
                </div>

                {/* Current Usage */}
                <div>
                  <div className="text-base font-semibold mb-3">Current Usage</div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3">
                      <div className="text-2xl font-bold">{subscriptionLimitsData.usage.accounts}</div>
                      <div className="text-sm text-gray-600">Toko/Store</div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-2xl font-bold">{subscriptionLimitsData.usage.automationRules}</div>
                      <div className="text-sm text-gray-600">Active Rules</div>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="text-2xl font-bold">{subscriptionLimitsData.usage.campaigns}</div>
                      <div className="text-sm text-gray-600">Campaigns</div>
                    </div>
                  </div>
                </div>

                {/* Limits Form */}
                <div className="border-t pt-4">
                  <div className="text-base font-semibold mb-3">Custom Limits Override</div>
                  <div className="space-y-4">
                    {/* Max Accounts */}
                    <div>
                      <Label>Maximum Toko/Store *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={subscriptionLimitsFormData.maxAccounts === "unlimited" ? "" : subscriptionLimitsFormData.maxAccounts}
                          onChange={(e) => {
                            const value = e.target.value
                            setSubscriptionLimitsFormData({
                              ...subscriptionLimitsFormData,
                              maxAccounts: value === "" ? "" : value,
                            })
                          }}
                          placeholder="10"
                          disabled={subscriptionLimitsFormData.maxAccounts === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-accounts-sub"
                            checked={subscriptionLimitsFormData.maxAccounts === "unlimited"}
                            onCheckedChange={(checked) => {
                              setSubscriptionLimitsFormData({
                                ...subscriptionLimitsFormData,
                                maxAccounts: checked ? "unlimited" : subscriptionLimitsData.limits.maxAccounts === -1 ? "" : subscriptionLimitsData.limits.maxAccounts.toString(),
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-accounts-sub" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {subscriptionLimitsData.limits.maxAccounts === -1 ? "Unlimited" : subscriptionLimitsData.limits.maxAccounts}
                      </p>
                    </div>

                    {/* Max Automation Rules */}
                    <div>
                      <Label>Maximum Automation Rules (Active) *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={subscriptionLimitsFormData.maxAutomationRules === "unlimited" ? "" : subscriptionLimitsFormData.maxAutomationRules}
                          onChange={(e) => {
                            const value = e.target.value
                            setSubscriptionLimitsFormData({
                              ...subscriptionLimitsFormData,
                              maxAutomationRules: value === "" ? "" : value,
                            })
                          }}
                          placeholder="20"
                          disabled={subscriptionLimitsFormData.maxAutomationRules === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-rules-sub"
                            checked={subscriptionLimitsFormData.maxAutomationRules === "unlimited"}
                            onCheckedChange={(checked) => {
                              setSubscriptionLimitsFormData({
                                ...subscriptionLimitsFormData,
                                maxAutomationRules: checked ? "unlimited" : subscriptionLimitsData.limits.maxAutomationRules === -1 ? "" : subscriptionLimitsData.limits.maxAutomationRules.toString(),
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-rules-sub" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {subscriptionLimitsData.limits.maxAutomationRules === -1 ? "Unlimited" : subscriptionLimitsData.limits.maxAutomationRules}
                      </p>
                    </div>

                    {/* Max Campaigns */}
                    <div>
                      <Label>Maximum Campaigns *</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={subscriptionLimitsFormData.maxCampaigns === "unlimited" ? "" : subscriptionLimitsFormData.maxCampaigns}
                          onChange={(e) => {
                            const value = e.target.value
                            setSubscriptionLimitsFormData({
                              ...subscriptionLimitsFormData,
                              maxCampaigns: value === "" ? "" : value,
                            })
                          }}
                          placeholder="100"
                          disabled={subscriptionLimitsFormData.maxCampaigns === "unlimited"}
                          className="flex-1"
                          min="1"
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="unlimited-campaigns-sub"
                            checked={subscriptionLimitsFormData.maxCampaigns === "unlimited"}
                            onCheckedChange={(checked) => {
                              setSubscriptionLimitsFormData({
                                ...subscriptionLimitsFormData,
                                maxCampaigns: checked ? "unlimited" : subscriptionLimitsData.limits.maxCampaigns === -1 ? "" : subscriptionLimitsData.limits.maxCampaigns.toString(),
                              })
                            }}
                          />
                          <Label htmlFor="unlimited-campaigns-sub" className="cursor-pointer">
                            Unlimited
                          </Label>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {subscriptionLimitsData.limits.maxCampaigns === -1 ? "Unlimited" : subscriptionLimitsData.limits.maxCampaigns}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSubscriptionLimitsDialogOpen(false)}
                disabled={subscriptionLimitsLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSubscriptionLimits}
                disabled={subscriptionLimitsLoading}
              >
                {subscriptionLimitsLoading ? "Saving..." : "Save Limits"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Subscription Dialog */}
        <Dialog open={isAddSubscriptionDialogOpen} onOpenChange={setIsAddSubscriptionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Tambah Subscription Manual</DialogTitle>
              <DialogDescription>
                Assign plan ke user secara manual tanpa melalui payment gateway.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* User Selection with Search - Custom Implementation */}
              <div className="flex flex-col gap-2 relative">
                <Label htmlFor="user-selection">User *</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari username atau email..."
                      className="pl-9"
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value)
                        setIsUserSearchPopoverOpen(true)
                      }}
                      onFocus={() => setIsUserSearchPopoverOpen(true)}
                    />
                  </div>

                  {isUserSearchPopoverOpen && (
                    <>
                      {/* Invisible overlay to close on click outside, but stay within Dialog */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserSearchPopoverOpen(false)}
                      />
                      <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg max-h-[250px] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100">
                        {usersList
                          .filter(user =>
                            user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                          )
                          .length > 0 ? (
                          usersList
                            .filter(user =>
                              user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                            )
                            .map((user) => (
                              <div
                                key={user.userId}
                                className={cn(
                                  "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                                  addSubscriptionFormData.userId === user.userId && "bg-accent/50"
                                )}
                                onClick={() => {
                                  setAddSubscriptionFormData({
                                    ...addSubscriptionFormData,
                                    userId: user.userId,
                                  })
                                  setUserSearchTerm(`${user.username} (${user.email})`)
                                  setIsUserSearchPopoverOpen(false)
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{user.username}</span>
                                  <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                                {addSubscriptionFormData.userId === user.userId && (
                                  <Check className="h-4 w-4 text-primary" />
                                )}
                              </div>
                            ))
                        ) : (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            User tidak ditemukan.
                          </div>
                        )
                        }
                      </div>
                    </>
                  )}
                </div>
                {!addSubscriptionFormData.userId && !isUserSearchPopoverOpen && (
                  <p className="text-[10px] text-destructive">Wajib memilih user.</p>
                )}
              </div>

              {/* Plan Selection */}
              <div>
                <Label htmlFor="add-sub-plan">Plan *</Label>
                <Select
                  value={addSubscriptionFormData.planId}
                  onValueChange={(value) => {
                    const selectedPlan = plans.find(p => p.id === value);
                    setAddSubscriptionFormData({
                      ...addSubscriptionFormData,
                      planId: value,
                      totalAmount: selectedPlan ? selectedPlan.price.toString() : ""
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.isActive).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatPrice(plan.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <Label htmlFor="add-sub-status">Status *</Label>
                  <Select
                    value={addSubscriptionFormData.status}
                    onValueChange={(value) =>
                      setAddSubscriptionFormData({ ...addSubscriptionFormData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Billing Cycle */}
                <div>
                  <Label htmlFor="add-sub-cycle">Billing Cycle</Label>
                  <Select
                    value={addSubscriptionFormData.billingCycle}
                    onValueChange={(value) =>
                      setAddSubscriptionFormData({ ...addSubscriptionFormData, billingCycle: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <Label htmlFor="add-sub-start">Start Date *</Label>
                  <Input
                    id="add-sub-start"
                    type="date"
                    value={addSubscriptionFormData.startDate}
                    onChange={(e) =>
                      setAddSubscriptionFormData({ ...addSubscriptionFormData, startDate: e.target.value })
                    }
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label htmlFor="add-sub-end">End Date (optional)</Label>
                  <Input
                    id="add-sub-end"
                    type="date"
                    value={addSubscriptionFormData.endDate}
                    onChange={(e) =>
                      setAddSubscriptionFormData({ ...addSubscriptionFormData, endDate: e.target.value })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 tracking-tight">KOSONGKAN untuk menghitung otomatis berdasarkan durasi plan.</p>
                </div>
              </div>

              {/* Total Amount */}
              <div>
                <Label htmlFor="add-sub-amount">Total Amount (Rp) *</Label>
                <Input
                  id="add-sub-amount"
                  type="number"
                  value={addSubscriptionFormData.totalAmount}
                  onChange={(e) =>
                    setAddSubscriptionFormData({ ...addSubscriptionFormData, totalAmount: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddSubscriptionDialogOpen(false)}
                disabled={subscriptionLoading}
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveNewSubscription}
                disabled={subscriptionLoading || !addSubscriptionFormData.userId || !addSubscriptionFormData.planId}
              >
                {subscriptionLoading ? "Memproses..." : "Tambah Subscription"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
