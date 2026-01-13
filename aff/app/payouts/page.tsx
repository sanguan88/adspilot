"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PayoutsPage } from "@/components/payouts-page"

export default function PayoutsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PayoutsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

