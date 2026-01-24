"use client"

import { Card } from "@/components/ui/card"
import type { Block } from "@/types/page-builder"
import { Star } from "lucide-react"

interface TestimonialCardProps {
    block: Block
    isPreview?: boolean
}

export function TestimonialCard({ block, isPreview = false }: TestimonialCardProps) {
    const {
        name = "John Doe",
        role = "CEO at Company",
        avatar = "",
        rating = 5,
        content = "This product is amazing!",
    } = block.components

    const ratingNumber = typeof rating === 'string' ? parseInt(rating, 10) : rating as number

    // Avatar can be initials (like "BS") or image URL
    const isUrl = typeof avatar === 'string' && (avatar.startsWith('http') || avatar.startsWith('/'))

    return (
        <Card className="p-6 h-full flex flex-col">
            {/* Rating Stars */}
            <div className="flex items-center gap-1 mb-4">
                {[...Array(ratingNumber)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
            </div>

            {/* Content */}
            <p className="text-muted-foreground mb-6 italic flex-grow">
                "{content as string}"
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 mt-auto">
                {isUrl ? (
                    <img
                        src={avatar as string}
                        alt={name as string}
                        className="h-12 w-12 rounded-full object-cover"
                    />
                ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {avatar as string || (name as string).split(' ').map(n => n[0]).join('')}
                    </div>
                )}
                <div>
                    <p className="font-semibold text-foreground">{name as string}</p>
                    <p className="text-sm text-muted-foreground">{role as string}</p>
                </div>
            </div>
        </Card>
    )
}
