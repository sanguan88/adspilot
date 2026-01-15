"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { GeneralOverviewPage } from "@/components/general-overview-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return null
  }

  // Redirect to external landing page for unauthenticated users
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.replace(process.env.NEXT_PUBLIC_LANDING_PAGE_URL || '/auth/login')
    }
    return null
  }

  // CRITICAL: Only redirect for pending SUBSCRIPTION payments
  // Addon pending payments should NOT block access
  // Status 'pending_payment' means user has pending subscription, not addon
  if (user?.status_user === 'pending_payment') {
    // Use window.location for immediate redirect (can't use router in render)
    if (typeof window !== 'undefined') {
      window.location.replace('/dashboard/payment-status')
    }
    return null
  }

  // Show dashboard for authenticated users with active status
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <GeneralOverviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
