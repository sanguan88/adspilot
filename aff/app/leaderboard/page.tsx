"use client"

import { ProtectedRoute } from "@/components/ProtectedRoute"
import { DashboardLayout } from "@/components/dashboard-layout"
import { LeaderboardPage } from "@/components/leaderboard-page"

export default function LeaderboardPageRoute() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LeaderboardPage />
      </DashboardLayout>
    </ProtectedRoute>
  )
}

