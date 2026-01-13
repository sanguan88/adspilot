"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { PixelsPage } from "../../components/pixels-page"

export default function PixelsPageRoute() {
    return (
        <ProtectedRoute>
            <DashboardLayout>
                <PixelsPage />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
