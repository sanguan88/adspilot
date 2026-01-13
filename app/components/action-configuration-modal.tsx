"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  Zap,
  Info,
} from "lucide-react"

interface ActionConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (action: any) => void
  actionType: string
}

const actionTypes = [
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
    description: "Duplicate ad sets when conditions performed",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    id: "notify",
    name: "Notify",
    icon: Bell,
    description: "Send notifications when conditions are met",
    color: "text-info",
    bgColor: "bg-info/10",
  },
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
    color: "text-info",
    bgColor: "bg-info/10",
  },
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
  {
    id: "extend_end_date",
    name: "Extend the end date",
    icon: Calendar,
    description: "Extend campaign or ad set end date",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
]

export function ActionConfigurationModal({ isOpen, onClose, onSave, actionType }: ActionConfigurationModalProps) {
  const [actionConfig, setActionConfig] = useState<any>({
    frequency: "once_a_day",
    originalAdSetAction: "keep",
    duplicateName: "- Copy",
    appendNumber: false,
    showExistingReactions: true,
    budgetAmount: "",
    budgetType: "percentage",
    bidAmount: "",
    bidType: "percentage",
    notificationMessage: "",
    extendDays: "7",
  })

  const currentAction = actionTypes.find((action) => action.id === actionType)

  const handleSave = () => {
    onSave({
      type: actionType,
      config: actionConfig,
    })
    onClose()
  }

  const renderActionSpecificConfig = () => {
    switch (actionType) {
      case "duplicate":
        return (
          <div className="space-y-6">
            {/* Frequency */}
            <div>
              <Label className="text-base font-medium">Frequency</Label>
              <p className="text-sm text-gray-600 mb-3">How often should this action be performed?</p>
              <div className="flex items-center gap-2">
                <Button
                  variant={actionConfig.frequency === "once_a_day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActionConfig({ ...actionConfig, frequency: "once_a_day" })}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Once a day
                </Button>
              </div>
            </div>

            {/* Original Ad Set */}
            <div>
              <Label className="text-base font-medium">Original ad set</Label>
              <p className="text-sm text-gray-600 mb-3">What should happen to the original ad set?</p>
              <RadioGroup
                value={actionConfig.originalAdSetAction}
                onValueChange={(value) => setActionConfig({ ...actionConfig, originalAdSetAction: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pause" id="pause" />
                  <Label htmlFor="pause">Pause</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="keep" />
                  <Label htmlFor="keep">Keep</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Duplicate Name */}
            <div>
              <Label className="text-base font-medium">Append to duplicate's name</Label>
              <Input
                value={actionConfig.duplicateName}
                onChange={(e) => setActionConfig({ ...actionConfig, duplicateName: e.target.value })}
                placeholder="- Copy"
                className="mt-2"
              />
            </div>

            {/* Additional Options */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="append-number"
                  checked={actionConfig.appendNumber}
                  onCheckedChange={(checked) => setActionConfig({ ...actionConfig, appendNumber: checked })}
                />
                <Label htmlFor="append-number" className="text-sm">
                  Append the number of duplicate
                </Label>
                <Info className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-reactions"
                  checked={actionConfig.showExistingReactions}
                  onCheckedChange={(checked) => setActionConfig({ ...actionConfig, showExistingReactions: checked })}
                />
                <Label htmlFor="show-reactions" className="text-sm">
                  Show existing reactions, comments and shares on new ads
                </Label>
                <Info className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        )

      case "increase_budget":
      case "decrease_budget":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Budget Adjustment</Label>
              <p className="text-sm text-gray-600 mb-3">
                How much should the budget be {actionType === "increase_budget" ? "increased" : "decreased"}?
              </p>
              <div className="flex items-center gap-3">
                <Select
                  value={actionConfig.budgetType}
                  onValueChange={(value) => setActionConfig({ ...actionConfig, budgetType: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="amount">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={actionConfig.budgetAmount}
                  onChange={(e) => setActionConfig({ ...actionConfig, budgetAmount: e.target.value })}
                  placeholder={actionConfig.budgetType === "percentage" ? "20" : "100"}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "set_budget":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Budget Amount</Label>
              <p className="text-sm text-gray-600 mb-3">Set the specific budget amount</p>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">$</span>
                <Input
                  value={actionConfig.budgetAmount}
                  onChange={(e) => setActionConfig({ ...actionConfig, budgetAmount: e.target.value })}
                  placeholder="1000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "increase_bid":
      case "decrease_bid":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Bid Adjustment</Label>
              <p className="text-sm text-gray-600 mb-3">
                How much should the bid be {actionType === "increase_bid" ? "increased" : "decreased"}?
              </p>
              <div className="flex items-center gap-3">
                <Select
                  value={actionConfig.bidType}
                  onValueChange={(value) => setActionConfig({ ...actionConfig, bidType: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="amount">$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={actionConfig.bidAmount}
                  onChange={(e) => setActionConfig({ ...actionConfig, bidAmount: e.target.value })}
                  placeholder={actionConfig.bidType === "percentage" ? "15" : "0.50"}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )

      case "notify":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Notification Message</Label>
              <p className="text-sm text-gray-600 mb-3">Customize the notification message (optional)</p>
              <Textarea
                value={actionConfig.notificationMessage}
                onChange={(e) => setActionConfig({ ...actionConfig, notificationMessage: e.target.value })}
                placeholder="Rule triggered: High spend detected on campaign..."
                rows={3}
              />
            </div>
          </div>
        )

      case "extend_end_date":
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Extension Period</Label>
              <p className="text-sm text-gray-600 mb-3">How many days should the end date be extended?</p>
              <div className="flex items-center gap-3">
                <Input
                  value={actionConfig.extendDays}
                  onChange={(e) => setActionConfig({ ...actionConfig, extendDays: e.target.value })}
                  placeholder="7"
                  className="w-24"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              {currentAction && <currentAction.icon className="w-6 h-6 text-gray-400" />}
            </div>
            <p className="text-gray-600">No additional configuration required for this action.</p>
          </div>
        )
    }
  }

  if (!currentAction) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-8 h-8 ${currentAction.bgColor} rounded-lg flex items-center justify-center`}>
              <currentAction.icon className={`w-5 h-5 ${currentAction.color}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{currentAction.name}</h2>
              <p className="text-sm text-gray-600 font-normal">{currentAction.description}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {renderActionSpecificConfig()}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button variant="tertiary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
