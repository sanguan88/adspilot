"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SubscriptionPage } from "@/components/subscription-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

export default function SubscriptionPageRoute() {
  const { user, isLoading } = useAuth()

  // CRITICAL: Redirect pending_payment users immediately
  useEffect(() => {
    if (!isLoading && user?.status_user === 'pending_payment') {
      if (typeof window !== 'undefined') {
        window.location.replace('/dashboard/payment-status')
      }
    }
  }, [user, isLoading])

  // Show loading while checking or redirecting
  if (isLoading || user?.status_user === 'pending_payment') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SubscriptionPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

