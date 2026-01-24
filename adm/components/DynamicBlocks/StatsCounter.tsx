import type { Block } from "@/types/page-builder"

interface StatsCounterProps {
    block: Block
    isPreview?: boolean
}

export function StatsCounter({ block, isPreview = false }: StatsCounterProps) {
    const {
        value = "0",
        suffix = "",
        label = "Label",
        icon = "📊",
    } = block.components

    return (
        <div className="text-center p-6">
            <div className="text-4xl mb-2">{icon}</div>
            <div className="text-4xl font-bold text-blue-600">
                {value}{suffix}
            </div>
            <div className="text-gray-600 mt-2">{label}</div>
        </div>
    )
}
