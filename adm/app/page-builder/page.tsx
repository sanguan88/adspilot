"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { PageBuilderEditor } from "@/components/PageBuilder/PageBuilderEditor"

export default function PageBuilderPage() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <PageBuilderEditor />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
