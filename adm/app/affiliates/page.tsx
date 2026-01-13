import { DashboardLayout } from "@/components/dashboard-layout"
import { AffiliatesManagementPage } from "@/components/affiliates-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function AffiliatesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AffiliatesManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

