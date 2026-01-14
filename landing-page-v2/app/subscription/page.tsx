"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SubscriptionPage } from "@/components/subscription-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function SubscriptionPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SubscriptionPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

