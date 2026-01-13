import { DashboardLayout } from "@/components/dashboard-layout"
import { PaymentSettingsPage } from "@/components/payment-settings-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function PaymentSettingsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <PaymentSettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

