import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { requireActiveStatus } from '@/lib/auth'
import { getUserSubscriptionLimits, getAccountUsageCount, getAutomationRulesUsageCount, getCampaignsUsageCount } from '@/lib/subscription-limits'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  let connection: PoolClient | null = null

  try {
    const user = await requireActiveStatus(request)
    connection = await getDatabaseConnection()

    // Get subscription limits
    const subscriptionInfo = await getUserSubscriptionLimits(connection, user.userId)
    
    // Get usage counts
    const accountsUsage = await getAccountUsageCount(connection, user.userId)
    const rulesUsage = await getAutomationRulesUsageCount(connection, user.userId)
    const campaignsUsage = await getCampaignsUsageCount(connection, user.userId)

    return NextResponse.json({
      success: true,
      data: {
        planId: subscriptionInfo.planId,
        planName: subscriptionInfo.planName,
        limits: subscriptionInfo.limits,
        usage: {
          accounts: accountsUsage,
          automationRules: rulesUsage,
          campaigns: campaignsUsage,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching subscription limits:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil data limits',
      },
      { status: 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

