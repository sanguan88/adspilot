"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TutorialsManagementPage } from "@/components/tutorials-management-page"
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function TutorialsPage() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <TutorialsManagementPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
