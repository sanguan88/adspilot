import { DashboardLayout } from "@/components/dashboard-layout"
import { ReportsPage } from "@/components/reports-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function ReportsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <ReportsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

