import { DashboardLayout } from "@/components/dashboard-layout"
import { LicensesManagementPage } from "@/components/licenses-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function LicensesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LicensesManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

