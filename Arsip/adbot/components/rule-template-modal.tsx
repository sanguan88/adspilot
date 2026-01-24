"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X, Clock, Eye, Zap, DollarSign, TrendingUp, Target, Star } from "lucide-react"

interface RuleTemplate {
  id: string
  title: string
  description: string
  category: string
  icon: React.ReactNode
  metrics: {
    conditions: number
    triggers: number
    actions: number
  }
}

interface RuleTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: RuleTemplate) => void
}

const ruleTemplates: RuleTemplate[] = [
  {
    id: "budget-alert",
    title: "Budget Alert",
    description: "Notify when spend exceeds limit",
    category: "Budget Management",
    icon: <DollarSign className="w-6 h-6" />,
    metrics: { conditions: 1, triggers: 1, actions: 1 }
  },
  {
    id: "roas-optimizer",
    title: "ROAS Optimizer",
    description: "Pause low ROAS campaigns",
    category: "ROAS Optimization",
    icon: <TrendingUp className="w-6 h-6" />,
    metrics: { conditions: 3, triggers: 1, actions: 2 }
  },
  {
    id: "daily-budget-manager",
    title: "Daily Budget Manager",
    description: "Set budget at specific times",
    category: "Time-based Rules",
    icon: <Clock className="w-6 h-6" />,
    metrics: { conditions: 2, triggers: 0, actions: 1 }
  },
  {
    id: "performance-monitor",
    title: "Performance Monitor",
    description: "Alert on CTR drops",
    category: "CTR Monitoring",
    icon: <Target className="w-6 h-6" />,
    metrics: { conditions: 2, triggers: 1, actions: 1 }
  },
  {
    id: "weekend-pauser",
    title: "Weekend Pauser",
    description: "Pause campaigns on weekends",
    category: "Time-based Rules",
    icon: <Star className="w-6 h-6" />,
    metrics: { conditions: 1, triggers: 0, actions: 2 }
  },
  {
    id: "scaling-rule",
    title: "Scaling Rule",
    description: "Increase budget on good performance",
    category: "Performance Optimization",
    icon: <Zap className="w-6 h-6" />,
    metrics: { conditions: 1, triggers: 1, actions: 2 }
  }
]

const categories = [
  "All",
  "Budget Management",
  "ROAS Optimization", 
  "Time-based Rules",
  "CTR Monitoring",
  "Performance Optimization"
]

export function RuleTemplateModal({ isOpen, onClose, onSelectTemplate }: RuleTemplateModalProps) {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const filteredTemplates = selectedCategory === "All" 
    ? ruleTemplates 
    : ruleTemplates.filter(template => template.category === selectedCategory)

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      const template = ruleTemplates.find(t => t.id === selectedTemplate)
      if (template) {
        onSelectTemplate(template)
        onClose()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">Choose Rule Template</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={
                selectedCategory === category
                  ? ""
                  : ""
              }
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedTemplate === template.id
                  ? "border-primary bg-primary/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedTemplate === template.id ? "bg-primary" : "bg-gray-200"
                }`}>
                  <div className={selectedTemplate === template.id ? "text-white" : "text-gray-600"}>
                    {template.icon}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  
                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{template.metrics.conditions}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{template.metrics.triggers}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>{template.metrics.actions}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="tertiary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUseTemplate}
            disabled={!selectedTemplate}
          >
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
