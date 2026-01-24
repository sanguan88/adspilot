import { DashboardLayout } from "@/components/dashboard-layout"
import { UsersManagementPage } from "@/components/users-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function UsersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <UsersManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

