import { DashboardLayout } from "@/components/dashboard-layout"
import { UsageMonitoringPage } from "@/components/usage-monitoring-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function UsagePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <UsageMonitoringPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

