import { NextRequest, NextResponse } from 'next/server'
import { getDatabaseConnection } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
        display_order,
        duration_days
      FROM subscription_plans
      WHERE is_active = true
      ORDER BY display_order ASC, plan_id ASC`
    )

    const plans = result.rows.map((row: any) => {
      // Generate features list dynamically based on plan configuration
      const featuresList: string[] = []

      // 1. Duration (for trial plans)
      if (row.duration_days && row.duration_days > 0) {
        featuresList.push(`Akses ${row.duration_days} hari gratis`)
      }

      // 2. Max Accounts (Toko)
      if (row.max_accounts === -1) {
        featuresList.push('Unlimited toko Shopee')
      } else if (row.max_accounts > 0) {
        featuresList.push(`${row.max_accounts} toko Shopee`)
      }

      // 3. Max Automation Rules
      if (row.max_automation_rules === -1) {
        featuresList.push('Unlimited rules otomasi aktif')
      } else if (row.max_automation_rules > 0) {
        featuresList.push(`${row.max_automation_rules} rules otomasi aktif`)
      }

      // 4. Always include core features
      featuresList.push('Semua fitur lengkap')
      featuresList.push('Rekam Medic (teknologi BCG Matrix dari Fortune 500)')

      // 5. Support level
      const supportMap: Record<string, string> = {
        'community': 'Support via Telegram Group',
        'email': 'Support via Email',
        'priority': 'Priority Support',
        'dedicated': 'Dedicated Account Manager'
      }
      const supportText = supportMap[row.support_level] || 'Support via Telegram Group'
      featuresList.push(supportText)

      // Parse custom features from database if exists
      let customFeatures: string[] = []
      if (row.features) {
        try {
          customFeatures = Array.isArray(row.features) ? row.features : JSON.parse(row.features)
        } catch (e) {
          customFeatures = []
        }
      }

      // Merge custom features (if any) - custom features will override auto-generated ones
      const finalFeaturesList = customFeatures.length > 0 ? customFeatures : featuresList

      return {
        planId: row.plan_id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        originalPrice: row.original_price ? parseFloat(row.original_price) : null,
        discountPercentage: row.discount_percentage ? parseFloat(row.discount_percentage) : null,
        billingCycle: row.billing_cycle,
        durationMonths: row.duration_months,
        durationDays: row.duration_days,
        features: {
          maxAccounts: row.max_accounts,
          maxAutomationRules: row.max_automation_rules,
          maxCampaigns: row.max_campaigns,
          support: row.support_level,
        },
        featuresList: finalFeaturesList,
        isActive: row.is_active,
        displayOrder: row.display_order,
      }
    })

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

