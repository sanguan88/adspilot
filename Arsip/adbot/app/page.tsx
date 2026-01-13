"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { GeneralOverviewPage } from "@/components/general-overview-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { LandingPage } from "@/components/landing-page"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2 } from "lucide-react"

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage />
  }

  // CRITICAL: Redirect pending_payment users immediately
  // This prevents any rendering of protected content
  if (user?.status_user === 'pending_payment') {
    // Use window.location for immediate redirect (can't use router in render)
    if (typeof window !== 'undefined') {
      window.location.replace('/dashboard/payment-status')
    }
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
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
