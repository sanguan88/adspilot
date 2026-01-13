"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CommissionsPage } from "@/components/commissions-page"

export default function CommissionsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <CommissionsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

