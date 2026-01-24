import { cn } from "@/lib/utils"

interface HighlightTextProps {
    children: React.ReactNode
    className?: string
}

export function HighlightText({ children, className }: HighlightTextProps) {
    return (
        <span
            className={cn(
                "relative inline-block",
                "text-foreground",
                className
            )}
            style={{
                backgroundImage: "linear-gradient(to bottom, transparent 70%, #fef08a 70%, #fef08a 100%)",
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
            }}
        >
            {children}
        </span>
    )
}

// Helper function to parse text with **highlight** syntax
export function parseHighlightText(text: string): React.ReactNode[] {
    if (!text) return []

    const parts = text.split(/(\*\*[^*]+\*\*)/g)

    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            const highlightedText = part.slice(2, -2)
            return <HighlightText key={index}>{highlightedText}</HighlightText>
        }
        return part
    })
}
