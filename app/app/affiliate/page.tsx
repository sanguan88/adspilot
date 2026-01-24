import { withDatabaseConnection } from '@/lib/db'
import AffiliateClient from './affiliate-client'
import { DashboardLayout } from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/ProtectedRoute"

// Ensure this page is dynamically rendered to fetch fresh DB data
export const dynamic = 'force-dynamic'

async function getDefaultCommission() {
    try {
        return await withDatabaseConnection(async (connection) => {
            const result = await connection.query(
                "SELECT setting_value FROM affiliate_settings WHERE setting_key = 'default_commission_rate'"
            )

            const rate = result.rows[0]?.setting_value
            if (!rate) {
                return '10'
            }
            return rate
        })
    } catch (error) {
        console.error("Error fetching commission rate:", error)
        return '10' // Fallback
    }
}

export default async function AffiliatePage() {
    const commissionRate = await getDefaultCommission()

    return (
        <ProtectedRoute>
            <DashboardLayout>
                <AffiliateClient defaultCommissionRate={commissionRate} />
            </DashboardLayout>
        </ProtectedRoute>
    )
}
