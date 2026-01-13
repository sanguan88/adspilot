"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { VouchersManagementPage } from "@/components/vouchers-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function VouchersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <VouchersManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

