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

