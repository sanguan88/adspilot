import { DashboardLayout } from "@/components/dashboard-layout"
import { BankMutationsPage } from "@/components/bank-mutations-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function BankMutations() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <BankMutationsPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
