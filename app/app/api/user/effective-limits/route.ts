import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import {
    getUserEffectiveLimits,
    getAccountUsageCount,
    getAutomationRulesUsageCount,
    getCampaignsUsageCount
} from '@/lib/subscription-limits'

/**
 * Get user effective limits (plan + addons + override) with usage
 * GET /api/user/effective-limits
 */
export async function GET(request: NextRequest) {
    let connection = null

    try {
        // 1. Auth check
        const user = await requireActiveStatus(request)
        const userId = user.userId || (user as any).user_id

        connection = await getDatabaseConnection()

        // 2. Get effective limits (plan + addons + override)
        const limitsInfo = await getUserEffectiveLimits(connection, userId)

        // 3. Get current usage
        const [accountsUsage, rulesUsage, campaignsUsage] = await Promise.all([
            getAccountUsageCount(connection, userId),
            getAutomationRulesUsageCount(connection, userId),
            getCampaignsUsageCount(connection, userId),
        ])

        // 4. Get subscription details
        const subscriptionResult = await connection.query(
            `SELECT plan_id, start_date, end_date, status
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
            [userId]
        )

        const subscription = subscriptionResult.rows.length > 0
            ? {
                planId: subscriptionResult.rows[0].plan_id,
                startDate: subscriptionResult.rows[0].start_date,
                endDate: subscriptionResult.rows[0].end_date,
                status: subscriptionResult.rows[0].status,
            }
            : null

        connection.release()

        return NextResponse.json({
            success: true,
            data: {
                // Subscription info
                subscription,
                planId: limitsInfo.planId,
                planName: limitsInfo.planName,
                hasActiveSubscription: limitsInfo.hasActiveSubscription,

                // Limits breakdown
                planLimits: {
                    maxAccounts: limitsInfo.limits.maxAccounts - (limitsInfo.activeAddons?.reduce((sum, addon) => sum + addon.quantity, 0) || 0),
                    maxAutomationRules: limitsInfo.limits.maxAutomationRules,
                    maxCampaigns: limitsInfo.limits.maxCampaigns,
                },

                // Active addons
                activeAddons: limitsInfo.activeAddons || [],

                // Effective limits (plan + addons)
                effectiveLimits: limitsInfo.limits,

                // Current usage
                usage: {
                    accounts: accountsUsage,
                    automationRules: rulesUsage,
                    campaigns: campaignsUsage,
                },

                // Availability check
                canAddAccount: limitsInfo.limits.maxAccounts === -1 || accountsUsage < limitsInfo.limits.maxAccounts,
                canAddRule: limitsInfo.limits.maxAutomationRules === -1 || rulesUsage < limitsInfo.limits.maxAutomationRules,
                canAddCampaign: limitsInfo.limits.maxCampaigns === -1 || campaignsUsage < limitsInfo.limits.maxCampaigns,
            },
        })
    } catch (error: any) {
        if (connection) {
            connection.release()
        }

        // Handle specific auth/payment errors without 500 log noise
        if (error.message && (error.message.includes('Access denied') || error.message.includes('Payment required'))) {
            return NextResponse.json({ success: false, error: error.message }, { status: 402 })
        }

        console.error('Get effective limits error:', error)
        return NextResponse.json(
            { success: false, error: 'Terjadi kesalahan saat mengambil data limits' },
            { status: 500 }
        )
    }
}
