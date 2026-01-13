"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    variant?: "default" | "destructive"
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Continue",
    cancelText = "Cancel",
    variant = "default",
}: ConfirmationModalProps) {
    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
            <DialogPrimitive.Portal>
                {/* Overlay with high z-index and STOP PROPAGATION to prevent parent close */}
                <DialogPrimitive.Overlay
                    className="fixed inset-0 z-[9998] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Content with high z-index and STOP PROPAGATION */}
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
                        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
                        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
                        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
                        "sm:rounded-lg"
                    )}
                    onPointerDownOutside={(e) => {
                        e.preventDefault()
                    }}
                    onInteractOutside={(e) => {
                        e.preventDefault()
                    }}
                    // Stop propagation to prevent parent modals from thinking this is an "outside click"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onEscapeKeyDown={(e) => {
                        e.preventDefault()
                        onClose()
                    }}
                >
                    <div className="flex flex-col space-y-2 text-center sm:text-left">
                        <DialogPrimitive.Title className="text-lg font-semibold">
                            {title}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-sm text-muted-foreground whitespace-pre-line">
                            {description}
                        </DialogPrimitive.Description>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose()
                            }}
                        >
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            variant={variant === "destructive" ? "destructive" : "default"}
                            onClick={(e) => {
                                e.stopPropagation()
                                onConfirm()
                            }}
                            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
