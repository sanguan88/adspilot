import { DashboardLayout } from "@/components/dashboard-layout"
import { RekamMedicPage } from "@/components/rekam-medic-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function RekamMedicPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <RekamMedicPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

