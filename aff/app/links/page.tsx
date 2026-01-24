"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MyLinksPage } from "@/components/my-links-page"

export default function LinksPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <MyLinksPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

