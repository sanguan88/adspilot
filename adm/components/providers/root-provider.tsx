"use client"

import { AuthProvider } from '@/contexts/AuthContext'
import { ConfirmationProvider } from '@/components/providers/confirmation-provider'
import { Toaster } from '@/components/ui/sonner'

export function RootProvider({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ConfirmationProvider>
                {children}
            </ConfirmationProvider>
            <Toaster />
        </AuthProvider>
    )
}
