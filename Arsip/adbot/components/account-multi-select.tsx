"use client"

import { useState, useEffect, useMemo } from "react"
import { authenticatedFetch } from '@/lib/api-client'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Users, Check, ChevronDown, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Account {
  id: string
  username: string
  nama_toko?: string
  email?: string
  cookie_status: "connected" | "no_cookies" | "checking" | "disconnected"
  performa_data?: {
    total_gmv?: number
  }
}

interface AccountMultiSelectProps {
  selectedAccountIds: string[]
  onAccountSelect: (selectedAccountIds: string[]) => void
  placeholder?: string
}

export function AccountMultiSelect({
  selectedAccountIds,
  onAccountSelect,
  placeholder = "Pilih toko..."
}: AccountMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          page: '1',
          limit: '1000',
          filter_cookies: 'connected' // Only show connected accounts
        })
        
        const response = await authenticatedFetch(`/api/accounts?${params.toString()}`)
        
        if (response.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
          return
        }
        
        const data = await response.json()
        
        if (data.success && data.data?.accounts) {
          setAccounts(data.data.accounts)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [])

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts
    
    const query = searchQuery.toLowerCase()
    return accounts.filter(account => 
      account.nama_toko?.toLowerCase().includes(query) ||
      account.username?.toLowerCase().includes(query) ||
      account.email?.toLowerCase().includes(query)
    )
  }, [accounts, searchQuery])

  // Get selected account names
  const selectedAccounts = useMemo(() => {
    return accounts.filter(acc => {
      const accountId = acc.id || acc.username
      return selectedAccountIds.includes(accountId)
    })
  }, [accounts, selectedAccountIds])

  const handleToggleAccount = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onAccountSelect(selectedAccountIds.filter(id => id !== accountId))
    } else {
      onAccountSelect([...selectedAccountIds, accountId])
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredAccounts
        .map(acc => acc.id || acc.username)
        .filter(id => id && id !== 'null' && id !== 'undefined')
      onAccountSelect(allIds)
    } else {
      onAccountSelect([])
    }
  }

  const handleRemoveAccount = (accountId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onAccountSelect(selectedAccountIds.filter(id => id !== accountId))
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount && amount !== 0) return 'Rp 0'
    if (amount >= 1000000000) return `Rp ${(amount / 1000000000).toFixed(1)}M`
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}jt`
    if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(1)}k`
    return `Rp ${amount.toLocaleString()}`
  }

  const allFilteredSelected = filteredAccounts.length > 0 && 
    filteredAccounts.every(acc => {
      const accountId = acc.id || acc.username
      return selectedAccountIds.includes(accountId)
    })

  return (
    <div className="flex flex-row items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between min-h-10 h-auto py-2"
            asChild={false}
          >
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {selectedAccounts.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">
                    {selectedAccounts.length} {selectedAccounts.length === 1 ? 'toko' : 'toko'} dipilih
                  </span>
                </>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Cari toko..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Memuat toko...</span>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Tidak ada toko ditemukan</p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {/* Select All */}
                <CommandItem
                  onSelect={() => handleSelectAll(!allFilteredSelected)}
                  className="cursor-pointer"
                >
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                    className="mr-2"
                  />
                  <span className="font-medium">Pilih Semua ({filteredAccounts.length})</span>
                </CommandItem>
                
                {/* Account List */}
                {filteredAccounts.map((account) => {
                  const accountId = account.id || account.username
                  const isSelected = selectedAccountIds.includes(accountId)
                  
                  return (
                    <CommandItem
                      key={accountId}
                      onSelect={() => handleToggleAccount(accountId)}
                      className="cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleAccount(accountId)}
                        className="mr-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">
                            {account.nama_toko || account.username}
                          </span>
                          {account.performa_data?.total_gmv && (
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                              {formatCurrency(account.performa_data.total_gmv)}
                            </span>
                          )}
                        </div>
                        {account.email && (
                          <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="ml-2 h-4 w-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    
    {/* Selected Accounts Badges - Outside Button to avoid nested button */}
    {selectedAccounts.length > 0 && selectedAccounts.length <= 3 && (
      <div className="flex flex-row items-center gap-1 flex-nowrap">
        {selectedAccounts.map((account) => {
          const accountId = account.id || account.username
          return (
            <Badge
              key={accountId}
              variant="tertiary"
              className="text-xs px-2 py-0.5 shrink-0"
            >
              {account.nama_toko || account.username}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemoveAccount(accountId, e)
                }}
                className="ml-1.5 rounded-full hover:bg-muted-foreground/20 cursor-pointer inline-flex items-center justify-center"
                aria-label={`Remove ${account.nama_toko || account.username}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )
        })}
      </div>
    )}
    </div>
  )
}

