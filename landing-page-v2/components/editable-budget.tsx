"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, X, Edit3, Plus, Minus } from "lucide-react"

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
  cpm: number
  roas: number
  account_username: string
  account_id: string
  account_email: string
  kode_tim: string
  nama_tim: string
  pic_akun: string
}

interface EditableBudgetProps {
  campaign: Campaign
  onBudgetChange: (action: string, campaignId: string, accountUsername: string, newBudget?: number) => Promise<boolean>
}

export function EditableBudget({ campaign, onBudgetChange }: EditableBudgetProps) {
  const [isEditing, setIsEditing] = useState(false)
  // Store budget in full rupiah value (not in thousands)
  const [budget, setBudget] = useState(Math.round(campaign.daily_budget / 100000).toString())
  const [isLoading, setIsLoading] = useState(false)

  const getMinBudget = () => {
    // Return minimum budget in full rupiah (not thousands)
    switch (campaign.objective?.toUpperCase()) {
      case "VIEW":
        return 25000
      case "GMV MAX":
        return 60000
      case "AUTO":
        return 40000
      default:
        return 25000
    }
  }

  const formatBudget = (value: string) => {
    if (value === '') return ''
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return value
    // Display with thousand separator
    return Math.round(numValue).toLocaleString('id-ID')
  }

  const parseBudget = (value: string) => {
    if (value === '') return ''
    // Remove dots (thousand separators)
    const cleanValue = value.replace(/\./g, '')
    const numValue = parseFloat(cleanValue)
    if (isNaN(numValue)) return ''
    // Return full value (no conversion)
    return Math.round(numValue).toString()
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setBudget(Math.round(campaign.daily_budget / 100000).toString())
    setIsEditing(false)
  }

  const handleSave = async () => {
    const newBudget = parseFloat(budget)
    const minBudget = getMinBudget()
    
    // Validate budget
    if (isNaN(newBudget) || newBudget < minBudget) {
      alert(`Budget minimum untuk ${campaign.objective} adalah Rp${minBudget.toLocaleString('id-ID')}`)
      return
    }

    // Validate budget: must be positive integer (no decimals)
    if (newBudget < 0 || !Number.isInteger(newBudget)) {
      alert('Budget harus berupa bilangan bulat positif')
      return
    }

    // Convert budget from rupiah to API format (multiply by 100000)
    // API expects value in format: rupiah * 100000 (e.g., 25000 * 100000 = 2500000000)
    const budgetForAPI = Math.round(newBudget * 100000)
    console.log('Budget conversion:', { input: newBudget, forAPI: budgetForAPI })

    setIsLoading(true)
    
    try {
      const success = await onBudgetChange('edit_budget', campaign.id, campaign.account_username, budgetForAPI)
      
      if (success) {
        setIsEditing(false)
      } else {
        // Revert to original value on failure
        setBudget(Math.round(campaign.daily_budget / 100000).toString())
      }
    } catch (error) {
      console.error('Error updating budget:', error)
      setBudget(Math.round(campaign.daily_budget / 100000).toString())
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleIncrement = () => {
    const currentBudget = parseFloat(budget)
    const newBudget = currentBudget + 1000 // Increment by 1000 rupiah
    setBudget(newBudget.toString())
  }

  const handleDecrement = () => {
    const currentBudget = parseFloat(budget)
    const minBudget = getMinBudget()
    const newBudget = Math.max(minBudget, currentBudget - 1000) // Decrement by 1000 rupiah
    setBudget(newBudget.toString())
  }

  if (isEditing) {
    const minBudget = getMinBudget()
    const currentBudget = parseFloat(budget)
    const isMinReached = currentBudget <= minBudget

    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleDecrement}
          disabled={isLoading || isMinReached}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <Input
          type="text"
          value={formatBudget(budget)}
          onChange={(e) => {
            const value = parseBudget(e.target.value)
            if (value === '') {
              setBudget('')
              return
            }
            const numValue = parseFloat(value)
            if (!isNaN(numValue)) {
              // Allow any positive integer (no rounding to multiple of 5)
              const rounded = Math.round(numValue)
              if (rounded >= 0) {
                setBudget(rounded.toString())
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className="w-32 h-8 text-sm text-right"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleIncrement}
          disabled={isLoading}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-1 cursor-pointer bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-sm group"
      onClick={handleEdit}
      title="Klik untuk edit budget"
    >
      <span className="text-sm font-medium">
        Rp{Math.round(campaign.daily_budget / 100000).toLocaleString('id-ID')}
      </span>
      <Edit3 className="w-3 h-3 text-primary" />
    </div>
  )
}
