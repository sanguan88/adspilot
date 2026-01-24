import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignManagementPage } from "@/components/campaign-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function CampaignsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <CampaignManagementPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}
