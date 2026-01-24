import type { Block } from "../../types/page-builder"

interface LogoGridProps {
    block: Block
    isPreview?: boolean
}

export function LogoGrid({ block, isPreview = false }: LogoGridProps) {
    const { logos = [] } = block.components

    const logosArray = Array.isArray(logos)
        ? logos
        : typeof logos === 'string'
            ? logos.split(',').map(l => l.trim()).filter(Boolean)
            : []

    return (
        <div className="grid grid-cols-3 gap-6 items-center">
            {logosArray.map((logo, index) => (
                <img
                    key={index}
                    src={logo as string}
                    alt={`Logo ${index + 1}`}
                    className="h-12 object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
            ))}
        </div>
    )
}
