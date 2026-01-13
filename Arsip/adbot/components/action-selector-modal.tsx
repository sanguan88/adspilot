"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Play,
  Pause,
  Copy,
  Trash2,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  Search,
} from "lucide-react"

interface ActionSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAction: (actionType: string) => void
}

const actionCategories = [
  {
    name: "GENERAL",
    actions: [
      {
        id: "start",
        name: "Start",
        icon: Play,
        description: "Start paused campaigns, ad sets, or ads",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        id: "pause",
        name: "Pause",
        icon: Pause,
        description: "Pause active campaigns, ad sets, or ads",
        color: "text-warning",
        bgColor: "bg-warning/10",
      },
      {
        id: "delete",
        name: "Delete",
        icon: Trash2,
        description: "Delete campaigns, ad sets, or ads",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
      {
        id: "duplicate",
        name: "Duplicate",
        icon: Copy,
        description: "Duplicate ad sets when conditions performed. Duplication might work with delays.",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        id: "notify",
        name: "Notify",
        icon: Bell,
        description: "Send notifications when conditions are met",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
      },
      {
        id: "extend_end_date",
        name: "Extend the end date",
        icon: Calendar,
        description: "Extend campaign or ad set end date",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
    ],
  },
  {
    name: "BUDGET",
    actions: [
      {
        id: "increase_budget",
        name: "Increase budget",
        icon: TrendingUp,
        description: "Increase campaign or ad set budget",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        id: "decrease_budget",
        name: "Decrease budget",
        icon: TrendingDown,
        description: "Decrease campaign or ad set budget",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
      {
        id: "set_budget",
        name: "Set budget",
        icon: DollarSign,
        description: "Set specific budget amount",
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        id: "scale_budget_by_target",
        name: "Scale budget by target",
        icon: Target,
        description: "Scale budget based on performance targets",
        color: "text-secondary",
        bgColor: "bg-secondary/10",
      },
    ],
  },
  {
    name: "BID",
    actions: [
      {
        id: "increase_bid",
        name: "Increase bid",
        icon: TrendingUp,
        description: "Increase bid amounts",
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        id: "decrease_bid",
        name: "Decrease bid",
        icon: TrendingDown,
        description: "Decrease bid amounts",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
    ],
  },
]

export function ActionSelectorModal({ isOpen, onClose, onSelectAction }: ActionSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = actionCategories.map((category) => ({
    ...category,
    actions: category.actions.filter(
      (action) =>
        action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  }))

  const handleActionSelect = (actionId: string) => {
    onSelectAction(actionId)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Action</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Action Categories */}
          <div className="space-y-6">
            {filteredCategories.map((category) => (
              <div key={category.name}>
                {category.actions.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">{category.name}</h3>
                    <div className="grid grid-cols-1 gap-2">
                      {category.actions.map((action) => (
                        <Button
                          key={action.id}
                          variant="ghost"
                          className="h-auto p-4 justify-start hover:bg-gray-50"
                          onClick={() => handleActionSelect(action.id)}
                        >
                          <div className="flex items-center gap-4 w-full">
                            <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                              <action.icon className={`w-5 h-5 ${action.color}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <div className="font-medium text-gray-900">{action.name}</div>
                              <div className="text-sm text-gray-500">{action.description}</div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredCategories.every((category) => category.actions.length === 0) && (
            <div className="text-center py-8">
              <p className="text-gray-500">No actions found matching your search.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
