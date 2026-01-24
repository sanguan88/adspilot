"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { SettingsPage } from "@/components/settings-page"
import { ProtectedRoute } from "@/components/ProtectedRoute"

export default function SettingsPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SettingsPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

