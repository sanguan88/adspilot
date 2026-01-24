import { NextRequest, NextResponse } from 'next/server'
import { PoolClient } from 'pg'
import { getDatabaseConnection } from '@/lib/db'
import { getAdminUser } from '@/lib/auth-helper'
import { SUBSCRIPTION_PLANS, Plan } from '@/app/api/subscriptions/plans/storage'
import { logAudit, AuditActions, ResourceTypes, getIpAddress, getUserAgent } from '@/lib/audit-logger'

// Helper functions (similar to adbot/lib/subscription-limits.ts)
async function getUserSubscriptionLimits(connection: PoolClient, userId: string) {
  try {
    const subscriptionResult = await connection.query(
      `SELECT plan_id FROM subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    )

    let plan: Plan | undefined
    if (subscriptionResult.rows.length > 0) {
      const planId = subscriptionResult.rows[0].plan_id
      plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
    }

    if (!plan) {
      return {
        planId: 'free',
        planName: 'Free Plan (Default)',
        limits: {
          maxAccounts: 1,
          maxAutomationRules: 3,
          maxCampaigns: -1, // Unlimited by default
        },
      }
    }

    return {
      planId: plan.id,
      planName: plan.name,
      limits: {
        maxAccounts: plan.features.maxAccounts,
        maxAutomationRules: plan.features.maxAutomationRules,
        maxCampaigns: plan.features.maxCampaigns,
      },
    }
  } catch (error) {
    console.error('Error fetching subscription limits:', error)
    return {
      planId: 'free',
      planName: 'Free Plan (Fallback)',
      limits: {
        maxAccounts: 1,
        maxAutomationRules: 3,
        maxCampaigns: -1, // Unlimited by default
      },
    }
  }
}

async function getAccountUsageCount(connection: PoolClient, userId: string): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(*) as count FROM data_toko WHERE user_id = $1 AND status_toko = 'active'`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

async function getAutomationRulesUsageCount(connection: PoolClient, userId: string): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(*) as count FROM data_rules WHERE user_id = $1 AND status = 'active'`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

async function getCampaignsUsageCount(connection: PoolClient, userId: string): Promise<number> {
  const result = await connection.query(
    `SELECT COUNT(DISTINCT campaign_id) as count FROM data_produk WHERE user_id = $1`,
    [userId]
  )
  return parseInt(result.rows[0]?.count || '0', 10)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { userId } = await params
    connection = await getDatabaseConnection()

    // Get subscription limits (includes override if exists)
    const subscriptionInfo = await getUserSubscriptionLimits(connection, userId)

    // Check for custom overrides in database
    const overrideResult = await connection.query(
      `SELECT max_accounts, max_automation_rules, max_campaigns 
       FROM user_limits_override WHERE user_id = $1`,
      [userId]
    )

    // Apply overrides
    if (overrideResult.rows.length > 0) {
      const override = overrideResult.rows[0]

      if (override.max_accounts !== null) {
        subscriptionInfo.limits.maxAccounts = override.max_accounts
      }
      if (override.max_automation_rules !== null) {
        subscriptionInfo.limits.maxAutomationRules = override.max_automation_rules
      }
      if (override.max_campaigns !== null) {
        subscriptionInfo.limits.maxCampaigns = override.max_campaigns
      }
    }

    // Get usage counts
    const accountsUsage = await getAccountUsageCount(connection, userId)
    const rulesUsage = await getAutomationRulesUsageCount(connection, userId)
    const campaignsUsage = await getCampaignsUsageCount(connection, userId)

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
  } catch (error: any) {
    console.error('Error fetching user limits:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data limits',
      },
      { status: error.status || 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let connection: PoolClient | null = null

  try {
    const adminUser = await getAdminUser(request)
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    const { userId } = await params
    const body = await request.json()

    const { maxAccounts, maxAutomationRules, maxCampaigns } = body

    // Validate input
    if (
      maxAccounts !== undefined && maxAccounts !== null &&
      (typeof maxAccounts !== 'number' || (maxAccounts < -1 || maxAccounts === 0))
    ) {
      return NextResponse.json(
        { success: false, error: 'maxAccounts harus -1 (unlimited) atau angka >= 1' },
        { status: 400 }
      )
    }

    if (
      maxAutomationRules !== undefined && maxAutomationRules !== null &&
      (typeof maxAutomationRules !== 'number' || (maxAutomationRules < -1 || maxAutomationRules === 0))
    ) {
      return NextResponse.json(
        { success: false, error: 'maxAutomationRules harus -1 (unlimited) atau angka >= 1' },
        { status: 400 }
      )
    }

    if (
      maxCampaigns !== undefined && maxCampaigns !== null &&
      (typeof maxCampaigns !== 'number' || (maxCampaigns < -1 || maxCampaigns === 0))
    ) {
      return NextResponse.json(
        { success: false, error: 'maxCampaigns harus -1 (unlimited) atau angka >= 1' },
        { status: 400 }
      )
    }

    connection = await getDatabaseConnection()

    // Check if override entry exists
    const existingResult = await connection.query(
      `SELECT id FROM user_limits_override WHERE user_id = $1`,
      [userId]
    )

    const adminUserId = adminUser.userId || 'admin'

    if (existingResult.rows.length > 0) {
      // Update existing override
      await connection.query(
        `UPDATE user_limits_override 
         SET max_accounts = $1,
             max_automation_rules = $2,
             max_campaigns = $3,
             updated_at = NOW(),
             updated_by = $4
         WHERE user_id = $5`,
        [
          maxAccounts !== undefined ? maxAccounts : null,
          maxAutomationRules !== undefined ? maxAutomationRules : null,
          maxCampaigns !== undefined ? maxCampaigns : null,
          adminUserId,
          userId,
        ]
      )
    } else {
      // Create new override entry
      await connection.query(
        `INSERT INTO user_limits_override 
         (user_id, max_accounts, max_automation_rules, max_campaigns, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $5)`,
        [
          userId,
          maxAccounts !== undefined ? maxAccounts : null,
          maxAutomationRules !== undefined ? maxAutomationRules : null,
          maxCampaigns !== undefined ? maxCampaigns : null,
          adminUserId,
        ]
      )
    }

    // Return updated limits
    const updatedResult = await connection.query(
      `SELECT max_accounts, max_automation_rules, max_campaigns 
       FROM user_limits_override 
       WHERE user_id = $1`,
      [userId]
    )

    const override = updatedResult.rows[0]

    // Log Audit
    await logAudit({
      userId: adminUser.userId,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      action: AuditActions.USER_LIMITS_UPDATE,
      resourceType: ResourceTypes.USER,
      resourceId: userId,
      description: `Updated custom limits for user ${userId}`,
      newValues: {
        maxAccounts: override?.max_accounts,
        maxAutomationRules: override?.max_automation_rules,
        maxCampaigns: override?.max_campaigns
      },
      ipAddress: getIpAddress(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json({
      success: true,
      message: 'Custom limits override berhasil disimpan',
      data: {
        userId,
        limits: {
          maxAccounts: override?.max_accounts ?? null,
          maxAutomationRules: override?.max_automation_rules ?? null,
          maxCampaigns: override?.max_campaigns ?? null,
        },
      },
    })
  } catch (error: any) {
    console.error('Error updating user limits:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengupdate limits',
      },
      { status: error.status || 500 }
    )
  } finally {
    if (connection) {
      connection.release()
    }
  }
}

