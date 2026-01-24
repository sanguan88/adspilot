"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, MoreHorizontal, Play, Settings, Folder, Zap, Target, TrendingUp, Package, ShoppingBag, Wrench, Cog } from "lucide-react"
import { Input } from "@/components/ui/input"
import { RuleList } from "./rule-list"
import { RuleMetricsDashboard } from "./rule-metrics-dashboard"
import { RuleCreationModal } from "./rule-creation-modal"
import { MultiStepRuleModal as AdvancedRuleCreationModal } from "./multi-step-rule-modal"

const ruleCategories = [
  {
    id: 1,
    name: "Training",
    icon: Target,
    rules: 0,
    description: "Training campaigns and optimization",
  },
  {
    id: 2,
    name: "Top Of Funnel",
    icon: TrendingUp,
    rules: 3,
    description: "Awareness and reach campaigns",
  },
  {
    id: 3,
    name: "Middle Of Funnel",
    icon: Package,
    rules: 5,
    description: "Consideration and engagement",
  },
  {
    id: 4,
    name: "Bottom Of Funnel",
    icon: ShoppingBag,
    rules: 8,
    description: "Conversion and sales campaigns",
  },
  {
    id: 5,
    name: "Demo Rules",
    icon: Wrench,
    rules: 2,
    description: "Sample automation rules",
  },
  {
    id: 6,
    name: "Account Management",
    icon: Cog,
    rules: 12,
    description: "Account-level optimizations",
  },
]

export function AutomatedRulesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isAdvancedRuleModalOpen, setIsAdvancedRuleModalOpen] = useState(false)

  const handleCategoryClick = (categoryId: string, categoryName: string) => {
    setSelectedCategory(categoryId)
  }

  const handleBackToOverview = () => {
    setSelectedCategory(null)
  }

  const handleCreateRule = () => {
    setIsRuleModalOpen(true)
  }

  const handleCreateAdvancedRule = () => {
    setIsAdvancedRuleModalOpen(true)
  }

  const handleSaveRule = (rule: any) => {
    console.log("Saving rule:", rule)
    // Here you would typically save the rule to your backend
  }

  if (selectedCategory) {
    const category = ruleCategories.find((c) => c.id.toString() === selectedCategory)
    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToOverview}>
                ← Back to Overview
              </Button>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <h1 className="text-lg font-semibold text-gray-900">{category?.name} Rules</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 bg-transparent">
                Save draft
              </Button>
              <Button size="sm" className="h-8">
                Set live
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <RuleList categoryId={selectedCategory} categoryName={category?.name} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Automated Rules</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 bg-transparent">
              Save draft
            </Button>
            <Button size="sm" className="h-8">
              Set live
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="max-w-6xl">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview" className="text-sm">
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm">
                Analytics
              </TabsTrigger>
              <TabsTrigger value="all-rules" className="text-sm">
                All Rules
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Search and Filters */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <Input
                    placeholder="Check out our examples of automated rules and start experimenting..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-8 bg-transparent">
                  <Filter className="w-3 h-3 mr-1" />
                  All rules
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-transparent">
                  Active
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-transparent">
                  Triggered
                </Button>
                <Button variant="outline" size="sm" className="h-8 bg-transparent">
                  All ad accounts
                </Button>
              </div>

              {/* Rule Categories */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                    Strategies
                  </Badge>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    Custom metrics
                  </Badge>
                  <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20 text-xs">
                    Custom timeframes
                  </Badge>
                </div>

                {ruleCategories.map((category) => (
                  <Card
                    key={category.id}
                    className="p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleCategoryClick(category.id.toString(), category.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Folder className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <category.icon className="w-4 h-4" />
                            <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
                            {category.rules > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {category.rules}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add New Rule Buttons */}
              <div className="mt-6 space-y-2">
                <Button
                  onClick={handleCreateRule}
                  className="w-full h-10 border-2 border-dashed border-gray-300 bg-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-400 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Automation Rule
                </Button>
                <Button
                  onClick={handleCreateAdvancedRule}
                  variant="outline"
                  className="w-full h-8 border-primary/20 text-primary hover:bg-primary/10 bg-transparent text-sm"
                >
                  <Settings className="w-3 h-3 mr-2" />
                  Create Advanced Rule with Condition Builder
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <RuleMetricsDashboard />
            </TabsContent>

            <TabsContent value="all-rules">
              <RuleList />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Rule Creation Modals */}
      <RuleCreationModal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} onSave={handleSaveRule} />
      <AdvancedRuleCreationModal
        isOpen={isAdvancedRuleModalOpen}
        onClose={() => setIsAdvancedRuleModalOpen(false)}
        onSave={handleSaveRule}
      />
    </div>
  )
}
