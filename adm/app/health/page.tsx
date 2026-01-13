import { DashboardLayout } from "@/components/dashboard-layout"
import { AppHealthPage } from "@/components/app-health-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function HealthPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AppHealthPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

