import { DashboardLayout } from "@/components/dashboard-layout"
import { AccountsPage } from "@/components/accounts-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function Accounts() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <AccountsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
