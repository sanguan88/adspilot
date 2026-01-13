"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authenticatedFetch } from '@/lib/api-client'
import { useAuth } from './AuthContext'

interface Subscription {
    id: number
    planId: string
    planName: string
    status: string
    startDate: string
    endDate: string
    autoRenew: boolean
}

interface SubscriptionContextType {
    subscription: Subscription | null
    isLoading: boolean
    remainingDays: number | null
    totalDays: number | null
    progressPercentage: number
    refreshSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth()
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [remainingDays, setRemainingDays] = useState<number | null>(null)
    const [totalDays, setTotalDays] = useState<number | null>(null)
    const [progressPercentage, setProgressPercentage] = useState<number>(0)

    const fetchSubscription = async () => {
        if (!isAuthenticated) {
            setSubscription(null)
            setRemainingDays(null)
            setTotalDays(null)
            setProgressPercentage(0)
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            const response = await authenticatedFetch('/api/user/subscription')
            const data = await response.json()

            if (data.success && data.data && data.data.current) {
                const sub = data.data.current
                setSubscription(sub)

                const start = new Date(sub.startDate)
                const end = new Date(sub.endDate)
                const now = new Date()

                // Total duration in days
                const totalTime = end.getTime() - start.getTime()
                const totalD = Math.ceil(totalTime / (1000 * 60 * 60 * 24))
                setTotalDays(totalD)

                // Remaining days
                const diffTime = end.getTime() - now.getTime()
                const remDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                const finalRemDays = remDays > 0 ? remDays : 0
                setRemainingDays(finalRemDays)

                // Progress (Remaining / Total)
                const progress = totalD > 0 ? (finalRemDays / totalD) * 100 : 0
                setProgressPercentage(Math.min(Math.max(progress, 0), 100))
            } else {
                setSubscription(null)
                setRemainingDays(null)
                setTotalDays(null)
                setProgressPercentage(0)
            }
        } catch (error) {
            console.error('Error fetching subscription in context:', error)
            setSubscription(null)
            setRemainingDays(null)
            setTotalDays(null)
            setProgressPercentage(0)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSubscription()
    }, [isAuthenticated])

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                isLoading,
                remainingDays,
                totalDays,
                progressPercentage,
                refreshSubscription: fetchSubscription
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    )
}

export function useSubscription() {
    const context = useContext(SubscriptionContext)
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider')
    }
    return context
}
