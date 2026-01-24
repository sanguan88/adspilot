import { DashboardLayout } from "@/components/dashboard-layout"
import { DashboardOverviewPage } from "@/components/dashboard-overview-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function HomePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DashboardOverviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

