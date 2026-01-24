"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'

interface CookiesHealthSummary {
    total: number
    healthy: number
    warning: number
    sync: number
    expired: number
    no_cookies: number
    never_tested: number
    needs_update: number
}

interface CookiesHealthContextType {
    expiredCount: number
    summary: CookiesHealthSummary | null
    tokos: Record<string, string> // Map of id_toko -> health status
    isBannerVisible: boolean
    setIsBannerVisible: (visible: boolean) => void
    refreshHealth: () => Promise<void>
}

const CookiesHealthContext = createContext<CookiesHealthContextType | undefined>(undefined)

export function CookiesHealthProvider({ children }: { children: React.ReactNode }) {
    const [expiredCount, setExpiredCount] = useState(0)
    const [summary, setSummary] = useState<CookiesHealthSummary | null>(null)
    const [tokos, setTokos] = useState<Record<string, string>>({})
    const [isBannerVisible, setIsBannerVisible] = useState(true)
    const pathname = usePathname()
    const { isAuthenticated } = useAuth()

    const refreshHealth = async () => {
        try {
            const response = await authenticatedFetch("/api/accounts/check-cookies-health")
            if (response.ok) {
                const result = await response.json()
                if (result.success) {
                    setExpiredCount(result.data.summary.expired || 0)
                    setSummary(result.data.summary)

                    // Create map of health statuses
                    const healthMap: Record<string, string> = {}
                    result.data.tokos.forEach((t: any) => {
                        healthMap[t.id_toko] = t.health
                    })
                    setTokos(healthMap)
                }
            }
        } catch (error) {
            console.error("Error fetching cookies health:", error)
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            refreshHealth()
            const interval = setInterval(refreshHealth, 5 * 60 * 1000)
            return () => clearInterval(interval)
        }
    }, [isAuthenticated])

    // Show banner again when pathname changes (except if going to /accounts)
    useEffect(() => {
        if (pathname !== '/accounts') {
            setIsBannerVisible(true)
        }
    }, [pathname])

    return (
        <CookiesHealthContext.Provider value={{ expiredCount, summary, tokos, isBannerVisible, setIsBannerVisible, refreshHealth }}>
            {children}
        </CookiesHealthContext.Provider>
    )
}

export function useCookiesHealth() {
    const context = useContext(CookiesHealthContext)
    if (context === undefined) {
        throw new Error('useCookiesHealth must be used within a CookiesHealthProvider')
    }
    return context
}
