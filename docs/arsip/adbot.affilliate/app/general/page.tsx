import { DashboardLayout } from "@/components/dashboard-layout"
import { GeneralOverviewPage } from "@/components/general-overview-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function GeneralPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <GeneralOverviewPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
