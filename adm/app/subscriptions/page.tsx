import { DashboardLayout } from "@/components/dashboard-layout"
import { SubscriptionsManagementPage } from "@/components/subscriptions-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function SubscriptionsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SubscriptionsManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

