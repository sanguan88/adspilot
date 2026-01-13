import { DashboardLayout } from "@/components/dashboard-layout"
import { OrdersManagementPage } from "@/components/orders-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <OrdersManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

