"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SectionType, SECTION_TYPE_LABELS } from "@/types/page-builder"
import {
    Zap, Star, DollarSign, MessageSquare, HelpCircle, BarChart3, Users, Megaphone,
    AlertTriangle, Play, Activity, ListOrdered, Target, LayoutTemplate
} from "lucide-react"

const SECTION_TYPES: { type: SectionType; label: string; icon: any; description: string }[] = [
    { type: 'hero', label: 'Hero Section', icon: Zap, description: 'Large banner with headline, video, and CTA' },
    { type: 'hook', label: 'Hook Section (Pain Points)', icon: AlertTriangle, description: 'Pain points dan masalah yang dialami' },
    { type: 'video-demo', label: 'Video Demo', icon: Play, description: 'Video demo dengan heading' },
    { type: 'features', label: 'Features', icon: Star, description: 'Grid of feature cards' },
    { type: 'rekam-medic', label: 'Rekam Medic', icon: Activity, description: 'BCG Matrix super feature showcase' },
    { type: 'testimonials', label: 'Testimonials', icon: MessageSquare, description: 'Customer reviews grid' },
    { type: 'how-it-works', label: 'How It Works', icon: ListOrdered, description: 'Step-by-step process' },
    { type: 'pricing', label: 'Pricing', icon: DollarSign, description: 'Pricing plans (dynamic from API)' },
    { type: 'faq', label: 'FAQ', icon: HelpCircle, description: 'Frequently asked questions' },
    { type: 'final-cta', label: 'Final CTA', icon: Target, description: 'Full-width conversion CTA' },
    { type: 'footer', label: 'Footer', icon: LayoutTemplate, description: 'Website footer with links' },
    { type: 'cta', label: 'CTA Banner', icon: Megaphone, description: 'Simple CTA banner' },
    { type: 'stats', label: 'Statistics', icon: BarChart3, description: 'Number counters grid' },
    { type: 'logos', label: 'Logo Grid', icon: Users, description: 'Company/partner logos' },
]

interface SectionTypeSelectorProps {
    open: boolean
    onClose: () => void
    onSelect: (type: SectionType) => void
}

export function SectionTypeSelector({ open, onClose, onSelect }: SectionTypeSelectorProps) {
    const handleSelect = (type: SectionType) => {
        onSelect(type)
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Section</DialogTitle>
                    <DialogDescription>
                        Pilih tipe section untuk ditambahkan ke landing page
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                    {SECTION_TYPES.map(({ type, label, icon: Icon, description }) => (
                        <Button
                            key={type}
                            variant="outline"
                            className="h-auto flex-col items-start p-4 hover:bg-accent hover:border-primary"
                            onClick={() => handleSelect(type)}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-5 w-5 text-primary" />
                                <span className="font-semibold text-left">{label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground text-left">
                                {description}
                            </p>
                        </Button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
