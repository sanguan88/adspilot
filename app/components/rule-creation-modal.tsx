"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, ChevronDown, Info, AlertTriangle, Zap } from "lucide-react"

interface RuleCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rule: any) => void
}

export function RuleCreationModal({ isOpen, onClose, onSave }: RuleCreationModalProps) {
  const [ruleName, setRuleName] = useState("")
  const [ruleDescription, setRuleDescription] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [conditions, setConditions] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])
  const [schedule, setSchedule] = useState({
    frequency: "continuous",
    timeframe: "every-30-minutes",
  })

  const accounts = [
    { id: "1", name: "RevealBot A", status: "active" },
    { id: "2", name: "RevealBot B", status: "active" },
    { id: "3", name: "RevealBot C", status: "paused" },
  ]

  const categories = [
    "Account Management",
    "Top Of Funnel",
    "Middle Of Funnel",
    "Bottom Of Funnel",
    "Training",
    "Demo Rules",
  ]

  const handleSave = () => {
    const newRule = {
      name: ruleName,
      description: ruleDescription,
      accounts: selectedAccounts,
      category: selectedCategory,
      conditions,
      actions,
      schedule,
      status: "draft",
    }
    onSave(newRule)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Create Automation Rule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rule-name">Rule Name</Label>
                <Input
                  id="rule-name"
                  placeholder="Enter rule name..."
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="rule-description">Description (Optional)</Label>
                <Textarea
                  id="rule-description"
                  placeholder="Describe what this rule does..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Account Selection */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Ad Account</h3>
              <Badge variant="secondary" className="text-xs">
                Select up to 5 ad accounts you want to manage
              </Badge>
            </div>

            <div className="space-y-3">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="RevealBot A" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${account.status === "active" ? "bg-success" : "bg-gray-500"}`}
                        />
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Account Metrics Display */}
              <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">N/A</div>
                  <div className="text-xs text-gray-600">Average metrics for the selected ad accounts</div>
                  <div className="text-xs text-gray-600">Last 30 days</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">N/A</div>
                  <div className="text-xs text-gray-600">Cost per result</div>
                  <div className="text-xs text-gray-600">Purchase ROAS</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">N/A</div>
                  <div className="text-xs text-gray-600">Results</div>
                  <div className="text-xs text-gray-600">Add to cart</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">N/A</div>
                  <div className="text-xs text-gray-600">Cost</div>
                  <div className="text-xs text-gray-600">Impressions</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Info className="w-4 h-4" />
                <span>
                  Is this information about metrics useful for you?{" "}
                  <a href="#" className="text-primary hover:underline">
                    Send us feedback
                  </a>
                </span>
              </div>
            </div>
          </Card>

          {/* Filter Section */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Filter</h3>
            <p className="text-sm text-gray-600 mb-4">Apply rule to campaigns, ad sets, or ads. Learn more</p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  All ads
                </Button>
                <span className="text-sm text-gray-600">Ad set status is active</span>
                <Button variant="ghost" size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <Button variant="ghost" size="sm" className="text-primary">
                + Add filter group
              </Button>

              <div className="text-sm text-gray-600">
                <span className="font-medium">Estimated reach:</span> 4 ad sets
              </div>
            </div>
          </Card>

          {/* Task Section */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Task</h3>

            <div className="space-y-4">
              {/* Task Type Selection */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <span className="font-medium text-foreground">Notify</span>
              </div>

              {/* Task Configuration */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Metric</Label>
                    <Select defaultValue="spend">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spend">Spend</SelectItem>
                        <SelectItem value="ctr">CTR</SelectItem>
                        <SelectItem value="cpc">CPC</SelectItem>
                        <SelectItem value="conversions">Conversions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Select defaultValue="today">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="last-7-days">Last 7 days</SelectItem>
                        <SelectItem value="last-30-days">Last 30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Threshold</Label>
                    <Input placeholder="Rp0" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="text-primary">
                    + Condition
                  </Button>
                  <Button variant="ghost" size="sm" className="text-primary">
                    + Group
                  </Button>
                </div>
              </div>

              <Button variant="ghost" size="sm" className="text-primary">
                + Add task
              </Button>

              <div className="text-sm text-gray-600">
                <span className="font-medium">Browse templates</span>
              </div>
            </div>
          </Card>

          {/* Schedule Section */}
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Schedule</h3>
            <p className="text-sm text-gray-600 mb-4">How frequently do you want the rule to run?</p>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Run every 30 minutes
                </Button>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>

              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-warning">The action has no settings</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                Preview
              </Button>
              <Button variant="ghost" size="sm">
                Description
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="tertiary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!ruleName}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
