import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

/**
 * GET /api/plans
 * Get all active subscription plans (Public endpoint)
 * No authentication required
 */
export async function GET(request: NextRequest) {
  let connection = null

  try {
    connection = await getDatabaseConnection()

    const result = await connection.query(
      `SELECT 
        plan_id,
        name,
        description,
        price,
        original_price,
        discount_percentage,
        billing_cycle,
        duration_months,
        max_accounts,
        max_automation_rules,
        max_campaigns,
        support_level,
        features,
        is_active,
        display_order
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY display_order ASC, plan_id ASC`
    )

    const plans = result.rows.map((row: any) => ({
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      originalPrice: row.original_price ? parseFloat(row.original_price) : null,
      discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
      billingCycle: row.billing_cycle,
      durationMonths: row.duration_months,
      features: {
        maxAccounts: row.max_accounts,
        maxAutomationRules: row.max_automation_rules,
        maxCampaigns: row.max_campaigns,
        support: row.support_level,
      },
      featuresList: row.features ? (Array.isArray(row.features) ? row.features : JSON.parse(row.features)) : [],
      isActive: row.is_active,
      displayOrder: row.display_order,
    }))

    connection.release()

    return NextResponse.json({
      success: true,
      data: plans,
    })
  } catch (error: any) {
    if (connection) {
      connection.release()
    }
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil data plans',
      },
      { status: 500 }
    )
  }
}

