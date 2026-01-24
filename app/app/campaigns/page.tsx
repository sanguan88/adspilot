import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { CampaignManagementPage } from "@/components/campaign-management-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function CampaignsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <CampaignManagementPage />
        </Suspense>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
