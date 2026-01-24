import type { Block } from "../../types/page-builder"
import { Star } from "lucide-react"
import { Card } from "@/components/ui/card"

interface TestimonialCardProps {
    block: Block
    isPreview?: boolean
}

export function TestimonialCard({ block, isPreview = false }: TestimonialCardProps) {
    const {
        name = "Customer",
        role = "",
        avatar = "",
        content = "",
        rating = 5,
    } = block.components

    // Generate initials from name for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <Card className="p-6">
            <div className="flex items-center gap-1 mb-4">
                {[...Array(Number(rating) || 5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
            </div>
            <p className="text-muted-foreground mb-6 italic">
                "{content}"
            </p>
            <div className="flex items-center gap-3">
                {avatar ? (
                    <img
                        src={avatar as string}
                        alt={name as string}
                        className="h-12 w-12 rounded-full object-cover"
                    />
                ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {getInitials(name as string)}
                    </div>
                )}
                <div>
                    <p className="font-semibold text-foreground">{name}</p>
                    {role && <p className="text-sm text-muted-foreground">{role}</p>}
                </div>
            </div>
        </Card>
    )
}
