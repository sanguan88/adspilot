import { DashboardLayout } from "@/components/dashboard-layout"
import { GeneralOverviewPage } from "@/components/general-overview-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function HomePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <GeneralOverviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
