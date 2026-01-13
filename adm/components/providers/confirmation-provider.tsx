"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"

interface ConfirmOptions {
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
}

interface ConfirmationContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined)

export function ConfirmationProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [options, setOptions] = useState<ConfirmOptions>({
        title: "Are you sure?",
        description: "This action cannot be undone.",
    })
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null)

    const confirm = (newOptions: ConfirmOptions): Promise<boolean> => {
        setOptions(newOptions)
        setIsOpen(true)
        return new Promise((resolve) => {
            setResolver(() => resolve)
        })
    }

    const handleConfirm = () => {
        setIsOpen(false)
        // Delay resolution slightly to let Radix finish focus restoration
        // Increased to 100ms to be safe against freeze bugs
        setTimeout(() => {
            resolver?.(true)
            setResolver(null)
        }, 100)
    }

    const handleCancel = () => {
        setIsOpen(false)
        // Delay resolution slightly to let Radix finish focus restoration
        // Increased to 100ms to be safe against freeze bugs
        setTimeout(() => {
            resolver?.(false)
            setResolver(null)
        }, 100)
    }

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            <ConfirmationModal
                isOpen={isOpen}
                onClose={handleCancel}
                onConfirm={handleConfirm}
                title={options.title}
                description={options.description}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                variant={options.variant}
            />
        </ConfirmationContext.Provider>
    )
}

export function useConfirm() {
    const context = useContext(ConfirmationContext)
    if (context === undefined) {
        throw new Error("useConfirm must be used within a ConfirmationProvider")
    }
    return context.confirm
}
