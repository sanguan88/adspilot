"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { ReferralsPage } from "@/components/referrals-page"

export default function ReferralsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ReferralsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

