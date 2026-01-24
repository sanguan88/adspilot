"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { TutorialPage } from "@/components/tutorial-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function TutorialPageRoute() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <TutorialPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
