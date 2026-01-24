import { DashboardLayout } from "@/components/dashboard-layout"
import { AutomationsPage } from "@/components/automations-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function AutomationsRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AutomationsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
