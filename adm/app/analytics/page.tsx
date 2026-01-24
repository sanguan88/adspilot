import { DashboardLayout } from "@/components/dashboard-layout"
import { AnalyticsPage } from "@/components/analytics-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function AnalyticsPageRoute() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <AnalyticsPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
