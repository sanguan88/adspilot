"use client"

import { useState, useEffect } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, ChevronDown, AlertCircle, Loader2 } from "lucide-react"

interface Account {
  id: string
  name: string
  status: "active" | "inactive" | "error"
  spend: number
  campaigns: number
  lastSync: string
}

interface MultiAccountSelectorProps {
  isCollapsed: boolean
}

export function MultiAccountSelector({ isCollapsed }: MultiAccountSelectorProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch real data from API
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const response = await authenticatedFetch('/api/accounts-simple?limit=100')
        
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          throw new Error('Unauthorized')
        }
        const data = await response.json()
        
        if (data.success && data.data.accounts) {
          const mappedAccounts: Account[] = data.data.accounts.map((acc: any) => ({
            id: acc.id_affiliate || acc.username || '',
            name: acc.username || 'Unknown',
            status: acc.cookie_status === 'connected' ? 'active' as const : 
                   acc.cookie_status === 'disconnected' ? 'error' as const : 'inactive' as const,
            spend: acc.performa_data?.total_biaya_iklan || 0,
            campaigns: 0, // Will be populated from campaigns API if needed
            lastSync: acc.last_affiliate_sync || acc.updated_at || 'Never'
          }))
          setAccounts(mappedAccounts)
          
          // Auto-select first 2 active accounts if available
          const activeIds = mappedAccounts
            .filter(acc => acc.status === 'active')
            .slice(0, 2)
            .map(acc => acc.id)
          if (activeIds.length > 0) {
            setSelectedAccounts(activeIds)
          }
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  const getStatusIcon = (status: Account["status"]) => {
    switch (status) {
      case "active":
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case "inactive":
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />
    }
  }

  const selectedAccountsData = accounts.filter((acc) => selectedAccounts.includes(acc.id))
  const totalSpend = selectedAccountsData.reduce((sum, acc) => sum + acc.spend, 0)
  const totalCampaigns = selectedAccountsData.reduce((sum, acc) => sum + acc.campaigns, 0)

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => (prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id]))
  }

  if (isCollapsed) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="w-6 h-6 p-0 mx-auto">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center relative">
              <span className="text-xs text-white font-medium">S</span>
              {selectedAccounts.length > 1 && (
                <Badge className="absolute -top-0.5 -right-0.5 w-3 h-3 p-0 bg-warning border-0">
                  {selectedAccounts.length}
                </Badge>
              )}
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Manage Accounts</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <AccountList accounts={accounts} selectedAccounts={selectedAccounts} toggleAccount={toggleAccount} />
          )}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full p-2 h-auto justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded flex items-center justify-center relative">
              <span className="text-xs text-white font-medium">S</span>
              {selectedAccounts.length > 1 && (
                <Badge className="absolute -top-0.5 -right-0.5 w-3 h-3 p-0 bg-warning border-0">
                  {selectedAccounts.length}
                </Badge>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-gray-900 truncate">
                {loading ? 'Loading...' : selectedAccounts.length === 1
                  ? selectedAccountsData[0]?.name
                  : selectedAccounts.length > 0
                  ? `${selectedAccounts.length} accounts selected`
                  : 'No accounts selected'}
              </p>
              <p className="text-xs text-gray-500">
                Rp{totalSpend.toLocaleString()} • {totalCampaigns} campaigns
              </p>
            </div>
          </div>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Manage Accounts</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <AccountList accounts={accounts} selectedAccounts={selectedAccounts} toggleAccount={toggleAccount} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AccountList({
  accounts,
  selectedAccounts,
  toggleAccount,
}: {
  accounts: Account[]
  selectedAccounts: string[]
  toggleAccount: (id: string) => void
}) {
  const getStatusIcon = (status: Account["status"]) => {
    switch (status) {
      case "active":
        return <div className="w-2 h-2 bg-green-500 rounded-full" />
      case "inactive":
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
      case "error":
        return <AlertCircle className="w-3 h-3 text-red-500" />
    }
  }

  return (
    <div className="space-y-2">
      {accounts.map((account) => (
        <div key={account.id} className="flex items-center justify-between p-2 border rounded-lg">
          <div className="flex items-center gap-2">
            {getStatusIcon(account.status)}
            <div>
              <p className="text-xs font-medium">{account.name}</p>
              <p className="text-xs text-gray-500">
                Rp{account.spend.toLocaleString()} • {account.campaigns} campaigns • {account.lastSync}
              </p>
            </div>
          </div>
          <Switch checked={selectedAccounts.includes(account.id)} onCheckedChange={() => toggleAccount(account.id)} />
        </div>
      ))}

      <Button className="w-full justify-start gap-2 bg-transparent h-8" variant="outline" size="sm">
        <Plus className="w-3 h-3" />
        Add New Account
      </Button>
    </div>
  )
}
