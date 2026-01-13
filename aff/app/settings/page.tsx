"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPage } from "../../components/settings-page"

export default function SettingsPageRoute() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <SettingsPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
